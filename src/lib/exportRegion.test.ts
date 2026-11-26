import { describe, expect, it } from 'vitest';
import {
  contentRegion,
  exportSize,
  intersectRects,
  strokeBounds,
  unionRects
} from './exportRegion';
import type { BoardStroke } from './types';

const bounds = { x: -1440, y: -840, width: 3840, height: 2240 };
const page = { x: 0, y: 0, width: 960, height: 560 };

function stroke(points: [number, number][], width = 10): BoardStroke {
  return {
    id: String(points),
    colour: '#000000',
    width,
    opacity: 1,
    points: points.map(([x, y]) => ({ x, y }))
  };
}

describe('strokeBounds', () => {
  it('includes half the stroke width around every point', () => {
    expect(
      strokeBounds([
        stroke([
          [0, 0],
          [100, 50]
        ]),
        stroke(
          [
            [-50, 200],
            [0, 200]
          ],
          4
        )
      ])
    ).toEqual({
      x: -52,
      y: -5,
      width: 157,
      height: 207
    });
  });

  it('returns null with no strokes', () => {
    expect(strokeBounds([])).toBeNull();
  });
});

describe('rect helpers', () => {
  it('unions present rects', () => {
    expect(
      unionRects([
        null,
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: -5, width: 5, height: 5 }
      ])
    ).toEqual({ x: 0, y: -5, width: 25, height: 15 });
    expect(unionRects([undefined, null])).toBeNull();
  });

  it('intersects rects', () => {
    expect(
      intersectRects({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })
    ).toEqual({ x: 5, y: 5, width: 5, height: 5 });
    expect(
      intersectRects({ x: 0, y: 0, width: 1, height: 1 }, { x: 5, y: 5, width: 1, height: 1 })
    ).toBeNull();
  });
});

describe('contentRegion', () => {
  it('pads large content', () => {
    expect(contentRegion([{ x: 0, y: 0, width: 1000, height: 600 }], bounds, page)).toEqual({
      x: -32,
      y: -32,
      width: 1064,
      height: 664
    });
  });

  it('centres small content in a minimum-size region', () => {
    expect(contentRegion([{ x: 100, y: 100, width: 20, height: 20 }], bounds, page)).toEqual({
      x: -130,
      y: -30,
      width: 480,
      height: 280
    });
  });

  it('stays inside the board', () => {
    const region = contentRegion([{ x: 2390, y: 1390, width: 10, height: 10 }], bounds, page);
    expect(region.x + region.width).toBe(2400);
    expect(region.y + region.height).toBe(1400);
  });

  it('falls back when there is no content', () => {
    expect(contentRegion([null], bounds, page)).toBe(page);
  });
});

describe('exportSize', () => {
  it('keeps the page at its usual size', () => {
    expect(exportSize(page)).toEqual({ width: 960, height: 560 });
  });

  it('limits tall regions by height', () => {
    expect(exportSize({ x: 0, y: 0, width: 300, height: 1200 })).toEqual({
      width: 240,
      height: 960
    });
  });
});
