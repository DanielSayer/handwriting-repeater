import type { Rect } from './types';

export const BACKGROUND_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const MAX_BACKGROUND_FILE_SIZE = 15 * 1024 * 1024;

/** Smallest picture side while resizing, in board pixels. */
export const MIN_BACKGROUND_SIZE = 32;

/** Largest rect with the image's aspect ratio that fits in `frame`, centred (object-fit: contain). */
export function containRect(width: number, height: number, frame: Rect): Rect {
  const scale = Math.min(frame.width / width, frame.height / height);
  const fitted = { width: width * scale, height: height * scale };
  return {
    x: frame.x + (frame.width - fitted.width) / 2,
    y: frame.y + (frame.height - fitted.height) / 2,
    ...fitted
  };
}

/** Move a rect, keeping it inside `bounds`. */
export function moveRect(rect: Rect, dx: number, dy: number, bounds: Rect): Rect {
  return {
    ...rect,
    x: clamp(rect.x + dx, bounds.x, bounds.x + bounds.width - rect.width),
    y: clamp(rect.y + dy, bounds.y, bounds.y + bounds.height - rect.height)
  };
}

/** Scale a rect about its top-left corner, keeping its aspect ratio and staying inside `bounds`. */
export function scaleRect(rect: Rect, factor: number, bounds: Rect): Rect {
  const minimum = MIN_BACKGROUND_SIZE / Math.min(rect.width, rect.height);
  const maximum = Math.min(
    (bounds.x + bounds.width - rect.x) / rect.width,
    (bounds.y + bounds.height - rect.y) / rect.height
  );
  const scale = clamp(Number.isFinite(factor) ? factor : 1, minimum, Math.max(minimum, maximum));
  return { ...rect, width: rect.width * scale, height: rect.height * scale };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
