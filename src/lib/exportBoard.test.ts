import { describe, expect, it } from 'vitest';
import { GIFEncoder } from 'gifenc';
import { createGifFramePlan, partialStrokePoints } from './exportBoard';
import type { BoardStroke } from './types';

const stroke: BoardStroke = {
  id: 'stroke-1',
  colour: '#172138',
  width: 5,
  opacity: 1,
  points: [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 }
  ]
};

describe('createGifFramePlan', () => {
  it('creates one still frame for an empty replay', () => {
    expect(createGifFramePlan(0)).toEqual([{ elapsedSeconds: 0, delayMs: 100 }]);
  });

  it('preserves the replay duration and finishes just after the final stroke', () => {
    const frames = createGifFramePlan(1);

    expect(frames).toHaveLength(14);
    expect(frames[0].elapsedSeconds).toBe(0);
    expect(frames.at(-1)!.elapsedSeconds).toBeCloseTo(1.001);
    expect(frames[0].delayMs).toBe(77);
  });

  it('caps long exports without changing their elapsed duration', () => {
    const frames = createGifFramePlan(120);

    expect(frames).toHaveLength(180);
    expect(frames.at(-1)!.elapsedSeconds).toBeCloseTo(120.001);
    expect(frames[0].delayMs).toBe(670);
  });
});

describe('partialStrokePoints', () => {
  it('returns no path before the stroke starts', () => {
    expect(partialStrokePoints(stroke, 0)).toEqual([]);
  });

  it('interpolates through the active segment by travelled distance', () => {
    expect(partialStrokePoints(stroke, 0.5)).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.25 }
    ]);
  });

  it('returns the full stroke after replay completes', () => {
    expect(partialStrokePoints(stroke, 1)).toBe(stroke.points);
  });
});

describe('GIF encoding', () => {
  it('writes an animated GIF with no repeat extension', () => {
    const gif = GIFEncoder();
    const palette = [
      [255, 255, 255],
      [0, 0, 0]
    ];

    gif.writeFrame(new Uint8Array([0, 0, 0, 0]), 2, 2, {
      palette,
      delay: 80,
      repeat: -1
    });
    gif.writeFrame(new Uint8Array([1, 1, 1, 1]), 2, 2, { delay: 80, repeat: -1 });
    gif.finish();

    const bytes = gif.bytes();
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('GIF89a');
    expect(countByteSequence(bytes, [0x21, 0xf9, 0x04])).toBe(2);
    expect(findAscii(bytes, 'NETSCAPE2.0')).toBe(false);
  });
});

function countByteSequence(bytes: Uint8Array, sequence: number[]): number {
  let matches = 0;
  for (let index = 0; index <= bytes.length - sequence.length; index += 1) {
    if (sequence.every((byte, offset) => bytes[index + offset] === byte)) matches += 1;
  }
  return matches;
}

function findAscii(bytes: Uint8Array, text: string): boolean {
  const sequence = Array.from(text, (character) => character.charCodeAt(0));
  return countByteSequence(bytes, sequence) > 0;
}
