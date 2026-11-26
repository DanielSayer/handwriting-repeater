import type { Point, Rect } from './types';

/** What the board viewport shows: the board point at its centre, and a zoom factor. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

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
