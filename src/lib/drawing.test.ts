import { describe, expect, it } from 'vitest';
import { createGuideRows, fitBoardToViewport, pointFromPointer, smoothPath } from './drawing';

describe('fitBoardToViewport', () => {
  it('preserves the board aspect ratio when the viewport gets wider', () => {
    expect(fitBoardToViewport(1200, 560, 12 / 7)).toEqual({
      width: 960,
      height: 560
    });
  });

  it('preserves the board aspect ratio when the viewport gets taller', () => {
    expect(fitBoardToViewport(960, 800, 12 / 7)).toEqual({
      width: 960,
      height: 560
    });
  });

  it('fits a narrow mobile viewport', () => {
    expect(fitBoardToViewport(360, 560, 12 / 7)).toEqual({
      width: 360,
      height: 210
    });
  });
});

describe('smoothPath', () => {
  it('returns an empty path when there are no points', () => {
    expect(smoothPath([])).toBe('');
  });

  it('moves to a single point', () => {
    expect(smoothPath([{ x: 50, y: 50 }])).toBe('M 50 50');
  });

  it('builds a smoothed path that finishes at the final point', () => {
    expect(
      smoothPath([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 }
      ])
    ).toBe('M 0 0 Q 50 100 75 50 L 100 0');
  });
});

describe('pointFromPointer', () => {
  const svg = {
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 480, height: 280 }),
    viewBox: { baseVal: { x: 0, y: 0, width: 960, height: 560 } }
  } as unknown as SVGSVGElement;
  const bounds = { x: 0, y: 0, width: 960, height: 560 };

  it('maps screen coordinates into viewBox pixels', () => {
    expect(pointFromPointer({ clientX: 340, clientY: 120 }, svg, bounds)).toEqual({
      x: 480,
      y: 140
    });
  });

  it('clamps points outside the bounds', () => {
    expect(pointFromPointer({ clientX: 0, clientY: 9999 }, svg, bounds)).toEqual({
      x: 0,
      y: 560
    });
  });
});

describe('createGuideRows', () => {
  it('returns no rows for empty guide text', () => {
    expect(createGuideRows('', 4)).toEqual([]);
  });

  it('rounds and clamps the requested row count', () => {
    expect(createGuideRows('abc', 20)).toHaveLength(8);
    expect(createGuideRows('abc', 1.4)).toEqual([{ id: 0, text: 'abc', topPercent: 18 }]);
  });
  it('recovers from a cleared or non-finite row input', () => {
    expect(createGuideRows('abc', Number.NaN)).toHaveLength(1);
    expect(createGuideRows('abc', Infinity)).toHaveLength(1);
  });
});
