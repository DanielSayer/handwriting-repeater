import { describe, expect, it } from 'vitest';
import { containRect, moveRect, scaleRect } from './backgroundImage';

const page = { x: 0, y: 0, width: 960, height: 560 };
const bounds = { x: -100, y: -100, width: 1200, height: 800 };

describe('containRect', () => {
  it('fits a tall image to the frame height, centred horizontally', () => {
    expect(containRect(100, 200, page)).toEqual({ x: 340, y: 0, width: 280, height: 560 });
  });

  it('fits a wide image to the frame width, centred vertically', () => {
    expect(containRect(1920, 560, page)).toEqual({ x: 0, y: 140, width: 960, height: 280 });
  });
});

describe('moveRect', () => {
  const rect = { x: 0, y: 0, width: 200, height: 100 };

  it('moves by the delta', () => {
    expect(moveRect(rect, 50, -20, bounds)).toEqual({ ...rect, x: 50, y: -20 });
  });

  it('keeps the rect inside the bounds', () => {
    expect(moveRect(rect, -999, 999, bounds)).toEqual({ ...rect, x: -100, y: 600 });
  });
});

describe('scaleRect', () => {
  const rect = { x: 0, y: 0, width: 200, height: 100 };

  it('scales about the top-left corner and keeps the aspect ratio', () => {
    expect(scaleRect(rect, 1.5, bounds)).toEqual({ ...rect, width: 300, height: 150 });
  });

  it('stops at the board edge', () => {
    expect(scaleRect(rect, 100, bounds)).toEqual({ ...rect, width: 1100, height: 550 });
  });

  it('keeps a minimum size', () => {
    expect(scaleRect(rect, 0.01, bounds)).toEqual({ ...rect, width: 64, height: 32 });
  });
});
