import { PAGE_RECT } from './constants';
import type { BoardBackground, Rect } from './types';

export const BACKGROUND_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const MAX_BACKGROUND_FILE_SIZE = 15 * 1024 * 1024;

const MAX_BACKGROUND_DIMENSION = 1600;
/** Smallest picture side while resizing, in board pixels. */
export const MIN_BACKGROUND_SIZE = 32;

export async function prepareBackgroundImage(file: File): Promise<BoardBackground> {
  if (!BACKGROUND_IMAGE_ACCEPT.split(',').includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  }

  if (file.size > MAX_BACKGROUND_FILE_SIZE) {
    throw new Error('Choose an image smaller than 15 MB.');
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(
      1,
      MAX_BACKGROUND_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot prepare the image.');
    context.drawImage(image, 0, 0, width, height);

    const webp = canvas.toDataURL('image/webp', 0.86);
    const src = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.86);

    return {
      src,
      name: file.name || 'Pasted image',
      rect: containRect(width, height, PAGE_RECT)
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be opened.'));
    image.src = src;
  });
}
