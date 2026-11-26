import type { GuideRow, Point, Rect } from './types';

export function fitBoardToViewport(
  viewportWidth: number,
  viewportHeight: number,
  aspectRatio: number
): { width: number; height: number } {
  const displayWidth = Math.min(viewportWidth, viewportHeight * aspectRatio);
  const displayHeight = displayWidth / aspectRatio;

  return {
    width: displayWidth,
    height: displayHeight
  };
}

/** Map a pointer to the SVG's viewBox (board pixels), clamped to `bounds`. */
export function pointFromPointer(
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  element: SVGSVGElement,
  bounds: Rect
): Point {
  const rect = element.getBoundingClientRect();
  const box = element.viewBox.baseVal;
  return {
    x: clamp(
      box.x + ((event.clientX - rect.left) / rect.width) * box.width,
      bounds.x,
      bounds.x + bounds.width
    ),
    y: clamp(
      box.y + ((event.clientY - rect.top) / rect.height) * box.height,
      bounds.y,
      bounds.y + bounds.height
    )
  };
}

export function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  if (points.length === 1) return path;

  for (let index = 1; index < points.length - 1; index += 1) {
    const midX = (points[index].x + points[index + 1].x) / 2;
    const midY = (points[index].y + points[index + 1].y) / 2;
    path += ` Q ${points[index].x} ${points[index].y} ${midX} ${midY}`;
  }

  const last = points.at(-1)!;
  return `${path} L ${last.x} ${last.y}`;
}

export function createGuideRows(text: string, count: number): GuideRow[] {
  if (!text) return [];
  const safeCount = Number.isFinite(count) ? clamp(Math.round(count), 1, 8) : 1;
  return Array.from({ length: safeCount }, (_, index) => ({
    id: index,
    text,
    topPercent: 18 + index * (64 / Math.max(1, safeCount - 1))
  }));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
