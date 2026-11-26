import { ZOOM_LEVELS, ZOOM_MAX, ZOOM_MIN } from './constants';
import type { Camera, Point, Rect } from './types';

export type { Camera };

export interface Size {
  width: number;
  height: number;
}

/** Board-to-screen transform: `screen = board * scale + translate`. */
export interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export function centreCamera(bounds: Rect, zoom: number): Camera {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, zoom };
}

/** `baseScale` is screen pixels per board pixel at zoom 1. */
export function cameraTransform(
  camera: Camera,
  viewport: Size,
  baseScale: number
): CameraTransform {
  const scale = baseScale * camera.zoom;
  return {
    scale,
    translateX: viewport.width / 2 - camera.x * scale,
    translateY: viewport.height / 2 - camera.y * scale
  };
}

export function boardToScreen(point: Point, transform: CameraTransform): Point {
  return {
    x: point.x * transform.scale + transform.translateX,
    y: point.y * transform.scale + transform.translateY
  };
}

export function screenToBoard(point: Point, transform: CameraTransform): Point {
  return {
    x: (point.x - transform.translateX) / transform.scale,
    y: (point.y - transform.translateY) / transform.scale
  };
}

/** CSS transform for an element whose top-left corner sits at board point `origin`. */
export function cssTransform(transform: CameraTransform, origin: Point = { x: 0, y: 0 }): string {
  const { x, y } = boardToScreen(origin, transform);
  return `translate(${x}px, ${y}px) scale(${transform.scale})`;
}

export function clampZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : 1;
}

/** Next button stop above (1) or below (-1) the current zoom. */
export function nextZoomLevel(zoom: number, direction: 1 | -1): number {
  const epsilon = 1e-6;
  const level =
    direction > 0
      ? ZOOM_LEVELS.find((stop) => stop > zoom + epsilon)
      : [...ZOOM_LEVELS].reverse().find((stop) => stop < zoom - epsilon);
  return level ?? (direction > 0 ? ZOOM_MAX : ZOOM_MIN);
}

/**
 * Keep the view on the board: at most `margin` screen pixels of backdrop may show past an edge.
 * When the board is smaller than the viewport on an axis, it is centred on that axis.
 */
export function clampCamera(
  camera: Camera,
  viewport: Size,
  baseScale: number,
  bounds: Rect,
  margin = 48
): Camera {
  const zoom = clampZoom(camera.zoom);
  const scale = baseScale * zoom;
  const axis = (value: number, start: number, size: number, screenSize: number): number => {
    const half = screenSize / 2 / scale;
    const slack = margin / scale;
    const low = start - slack + half;
    const high = start + size + slack - half;
    if (!Number.isFinite(value) || low > high) return start + size / 2;
    return Math.min(high, Math.max(low, value));
  };
  return {
    x: axis(camera.x, bounds.x, bounds.width, viewport.width),
    y: axis(camera.y, bounds.y, bounds.height, viewport.height),
    zoom
  };
}

/** Move the view by a screen-space drag delta. */
export function panCamera(camera: Camera, dx: number, dy: number, baseScale: number): Camera {
  const scale = baseScale * camera.zoom;
  return { ...camera, x: camera.x - dx / scale, y: camera.y - dy / scale };
}

/** Change zoom while keeping the board point under `screenPoint` fixed on screen. */
export function zoomCameraAt(
  camera: Camera,
  screenPoint: Point,
  zoom: number,
  viewport: Size,
  baseScale: number
): Camera {
  const anchor = screenToBoard(screenPoint, cameraTransform(camera, viewport, baseScale));
  const nextZoom = clampZoom(zoom);
  const scale = baseScale * nextZoom;
  return {
    x: anchor.x - (screenPoint.x - viewport.width / 2) / scale,
    y: anchor.y - (screenPoint.y - viewport.height / 2) / scale,
    zoom: nextZoom
  };
}

export function sameCamera(a: Camera, b: Camera): boolean {
  return a.x === b.x && a.y === b.y && a.zoom === b.zoom;
}
