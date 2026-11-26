import { BACKGROUND_IMAGE_ACCEPT, MAX_BACKGROUND_FILE_SIZE, containRect } from './backgroundImage';
import { PAGE_RECT } from './constants';
import type { BoardBackground } from './types';

// Loaded on demand: only needed when a picture is added.
const MAX_BACKGROUND_DIMENSION = 1600;

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be opened.'));
    image.src = src;
  });
}
