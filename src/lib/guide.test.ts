import { describe, expect, it } from 'vitest';
import { constrainGuide } from './guide';

const metrics = { lines: ['a', 'a'], width: 100, ascent: 30, descent: 10 };
const layout = { x: 0, y: 0, rowSpacing: 50 };

describe('constrainGuide', () => {
  it('keeps the guide block inside the default board', () => {
    expect(constrainGuide({ ...layout, x: 9999, y: 9999 }, metrics)).toEqual({
      ...layout,
      x: 2300,
      y: 1340
    });
  });

  it('respects offset bounds', () => {
    const bounds = { x: -500, y: 100, width: 300, height: 200 };
    expect(constrainGuide({ ...layout, x: -9999, y: -9999 }, metrics, bounds)).toEqual({
      ...layout,
      x: -500,
      y: 130
    });
    expect(constrainGuide({ ...layout, x: 9999, y: 9999 }, metrics, bounds)).toEqual({
      ...layout,
      x: -300,
      y: 240
    });
  });
});
