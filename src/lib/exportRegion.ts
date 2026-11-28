import type { BoardStroke, Rect } from './types';

/** Which part of the board a GIF shows. */
export type ExportArea = 'content' | 'view';

const CONTENT_PADDING = 32;
/** Content smaller than this is centred in a region this size, so a few letters are not blown up. */
const MIN_CONTENT_SIZE = { width: 480, height: 280 };
/** How far the replay pen reaches up and right of its nib, shadow included. */
const PEN_REACH = { top: 72, right: 60 };

export function strokeBounds(strokes: BoardStroke[]): Rect | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const stroke of strokes) {
    const half = stroke.width / 2;
    for (const point of stroke.points) {
      left = Math.min(left, point.x - half);
      top = Math.min(top, point.y - half);
      right = Math.max(right, point.x + half);
      bottom = Math.max(bottom, point.y + half);
    }
  }
  return Number.isFinite(left)
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : null;
}

/** Grow stroke bounds so the replay pen, drawn up and right of the nib, is not clipped. */
export function withPenReach(rect: Rect | null): Rect | null {
  if (!rect) return null;
  const top = Math.max(0, PEN_REACH.top - CONTENT_PADDING);
  const right = Math.max(0, PEN_REACH.right - CONTENT_PADDING);
  return { x: rect.x, y: rect.y - top, width: rect.width + right, height: rect.height + top };
}

const boundsCache = new WeakMap<BoardStroke, Rect | null>();

/** Strokes whose box touches `rect`. Used to replay only what is on screen. */
export function strokesInRect(strokes: BoardStroke[], rect: Rect): BoardStroke[] {
  return strokes.filter((stroke) => {
    let box = boundsCache.get(stroke);
    if (box === undefined) {
      box = strokeBounds([stroke]);
      boundsCache.set(stroke, box);
    }
    return box !== null && rectsTouch(box, rect);
  });
}

function rectsTouch(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}

export function unionRects(rects: (Rect | null | undefined)[]): Rect | null {
  const present = rects.filter((rect): rect is Rect => Boolean(rect));
  if (!present.length) return null;
  const left = Math.min(...present.map((rect) => rect.x));
  const top = Math.min(...present.map((rect) => rect.y));
  const right = Math.max(...present.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...present.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function intersectRects(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > left && bottom > top
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : null;
}

/** Padded box around everything on the board, kept inside `bounds`. Falls back to `fallback`. */
export function contentRegion(
  rects: (Rect | null | undefined)[],
  bounds: Rect,
  fallback: Rect
): Rect {
  const content = unionRects(rects);
  if (!content) return fallback;
  const width = Math.max(MIN_CONTENT_SIZE.width, content.width + CONTENT_PADDING * 2);
  const height = Math.max(MIN_CONTENT_SIZE.height, content.height + CONTENT_PADDING * 2);
  const centreX = content.x + content.width / 2;
  const centreY = content.y + content.height / 2;
  return (
    intersectRects({ x: centreX - width / 2, y: centreY - height / 2, width, height }, bounds) ??
    fallback
  );
}

/** GIF pixel size for a region: its longest side becomes `maxSide`. */
export function exportSize(region: Rect, maxSide = 960): { width: number; height: number } {
  const scale = maxSide / Math.max(region.width, region.height);
  return {
    width: Math.max(1, Math.round(region.width * scale)),
    height: Math.max(1, Math.round(region.height * scale))
  };
}
