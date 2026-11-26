import { describe, expect, it } from 'vitest';
import {
  boardToScreen,
  cameraTransform,
  centreCamera,
  clampCamera,
  clampZoom,
  cssTransform,
  nextZoomLevel,
  panCamera,
  sameCamera,
  screenToBoard,
  zoomCameraAt
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

describe('camera navigation', () => {
  const board = { x: -1440, y: -840, width: 3840, height: 2240 };

  it('steps through zoom levels', () => {
    expect(nextZoomLevel(1, 1)).toBe(1.25);
    expect(nextZoomLevel(1, -1)).toBe(0.75);
    expect(nextZoomLevel(1.1, -1)).toBe(1);
    expect(nextZoomLevel(4, 1)).toBe(4);
    expect(nextZoomLevel(0.25, -1)).toBe(0.25);
  });

  it('clamps zoom and recovers from invalid values', () => {
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(0)).toBe(0.25);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('pans opposite to the drag in board space', () => {
    expect(panCamera({ x: 0, y: 0, zoom: 2 }, 100, -50, 0.5)).toEqual({ x: -100, y: 50, zoom: 2 });
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const camera = { x: 480, y: 280, zoom: 1 };
    const cursor = { x: 100, y: 60 };
    const before = screenToBoard(cursor, cameraTransform(camera, viewport, 0.5));
    const next = zoomCameraAt(camera, cursor, 2, viewport, 0.5);
    const after = screenToBoard(cursor, cameraTransform(next, viewport, 0.5));
    expect(next.zoom).toBe(2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('stops the view a margin past the board edge', () => {
    // At zoom 1 and base scale 0.5 the viewport shows 960x560 board pixels; a 48px margin is 96.
    expect(clampCamera({ x: -9999, y: 9999, zoom: 1 }, viewport, 0.5, board)).toEqual({
      x: -1440 - 96 + 480,
      y: 1400 + 96 - 280,
      zoom: 1
    });
  });

  it('centres the board when it is smaller than the viewport', () => {
    expect(clampCamera({ x: 2000, y: 0, zoom: 0.25 }, viewport, 0.25, board)).toEqual({
      x: 480,
      y: 280,
      zoom: 0.25
    });
  });

  it('leaves an in-range camera unchanged', () => {
    const camera = { x: 100, y: 200, zoom: 1.5 };
    expect(sameCamera(clampCamera(camera, viewport, 0.5, board), camera)).toBe(true);
  });
});
