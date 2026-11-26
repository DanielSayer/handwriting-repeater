import { describe, expect, it } from 'vitest';
import {
  boardToScreen,
  cameraTransform,
  centreCamera,
  cssTransform,
  screenToBoard
} from './camera';

const bounds = { x: 0, y: 0, width: 960, height: 560 };
const viewport = { width: 480, height: 280 };

describe('camera', () => {
  it('fits the centred board exactly at zoom 1', () => {
    const transform = cameraTransform(centreCamera(bounds, 1), viewport, 0.5);
    expect(transform).toEqual({ scale: 0.5, translateX: 0, translateY: 0 });
    expect(boardToScreen({ x: 960, y: 560 }, transform)).toEqual({ x: 480, y: 280 });
  });

  it('zooms around the camera centre', () => {
    const transform = cameraTransform(centreCamera(bounds, 2), viewport, 0.5);
    expect(boardToScreen({ x: 480, y: 280 }, transform)).toEqual({ x: 240, y: 140 });
    expect(boardToScreen({ x: 0, y: 0 }, transform)).toEqual({ x: -240, y: -140 });
  });

  it('round trips between screen and board space', () => {
    const transform = cameraTransform({ x: 1200, y: -300, zoom: 1.5 }, viewport, 0.5);
    const point = { x: 123, y: 456 };
    const result = screenToBoard(boardToScreen(point, transform), transform);
    expect(result.x).toBeCloseTo(point.x);
    expect(result.y).toBeCloseTo(point.y);
  });

  it('formats a CSS transform with a top-left origin', () => {
    expect(cssTransform({ scale: 2, translateX: -10, translateY: 5 })).toBe(
      'translate(-10px, 5px) scale(2)'
    );
    expect(cssTransform({ scale: 2, translateX: -10, translateY: 5 }, { x: -100, y: 50 })).toBe(
      'translate(-210px, 105px) scale(2)'
    );
  });
});
