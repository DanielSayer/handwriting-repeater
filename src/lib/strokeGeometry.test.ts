import { describe, expect, it } from 'vitest';
import { segmentAt, strokeGeometry } from './strokeGeometry';
import { strokeReplayProgress } from './replay';

describe('stroke geometry', () => {
  it('reuses geometry across replay frames and releases ownership to the point array', () => {
    const points = [
      { x: 0, y: 0, elapsedMs: 0 },
      { x: 0.3, y: 0.4, elapsedMs: 100 }
    ];
    expect(strokeGeometry(points).length).toBe(0.5);
    expect(strokeGeometry(points)).toBe(strokeGeometry(points));
    expect(strokeGeometry([...points])).not.toBe(strokeGeometry(points));
  });

  it('finds the earliest endpoint across repeated timestamps', () => {
    const values = [0, 10, 10, 20, 30];
    expect(segmentAt(values.length, (index) => values[index], 10)).toBe(1);
    expect(segmentAt(values.length, (index) => values[index], 11)).toBe(3);
  });

  it('preserves pauses within a recorded stroke', () => {
    const stroke = {
      id: 'pause',
      colour: '#000000',
      width: 3,
      opacity: 1,
      points: [
        { x: 0, y: 0, elapsedMs: 0 },
        { x: 0.5, y: 0, elapsedMs: 100 },
        { x: 0.5, y: 0, elapsedMs: 900 },
        { x: 1, y: 0, elapsedMs: 1000 }
      ]
    };
    expect(strokeReplayProgress(stroke, { delaySeconds: 0, durationSeconds: 1 }, 0.5)).toBe(0.5);
    expect(strokeReplayProgress(stroke, { delaySeconds: 0, durationSeconds: 1 }, 0.95)).toBeCloseTo(
      0.75
    );
  });

  it('rejects negative or decreasing recorded timestamps', () => {
    expect(
      strokeGeometry([
        { x: 0, y: 0, elapsedMs: -1 },
        { x: 1, y: 0, elapsedMs: 1 }
      ]).recorded
    ).toBe(false);
    expect(
      strokeGeometry([
        { x: 0, y: 0, elapsedMs: 2 },
        { x: 1, y: 0, elapsedMs: 1 }
      ]).recorded
    ).toBe(false);
  });
});
