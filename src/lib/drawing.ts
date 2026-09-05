import type { GuideRow, Point } from './types';

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

export function pointFromPointer(event: PointerEvent, element: SVGSVGElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
  };
}

export function smoothPath(points: Point[], width: number, height: number): string {
  if (points.length === 0) return '';

  const scaled = points.map((point) => ({ x: point.x * width, y: point.y * height }));
  if (scaled.length === 1) return `M ${scaled[0].x} ${scaled[0].y}`;

  let path = `M ${scaled[0].x} ${scaled[0].y}`;
  for (let index = 1; index < scaled.length - 1; index += 1) {
    const midX = (scaled[index].x + scaled[index + 1].x) / 2;
    const midY = (scaled[index].y + scaled[index + 1].y) / 2;
    path += ` Q ${scaled[index].x} ${scaled[index].y} ${midX} ${midY}`;
  }

  const last = scaled.at(-1)!;
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
