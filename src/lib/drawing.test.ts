import { describe, expect, it } from 'vitest';
import { createGuideRows, smoothPath } from './drawing';

describe('smoothPath', () => {
  it('returns an empty path when there are no points', () => {
    expect(smoothPath([], 100, 50)).toBe('');
  });

  it('scales a single point to the board dimensions', () => {
    expect(smoothPath([{ x: 0.25, y: 0.5 }], 200, 100)).toBe('M 50 50');
  });

  it('builds a smoothed path that finishes at the final point', () => {
    expect(
      smoothPath(
        [
          { x: 0, y: 0 },
          { x: 0.5, y: 1 },
          { x: 1, y: 0 }
        ],
        100,
        100
      )
    ).toBe('M 0 0 Q 50 100 75 50 L 100 0');
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
});
