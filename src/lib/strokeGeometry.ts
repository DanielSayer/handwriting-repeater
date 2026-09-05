import type { Point } from './types';

interface StrokeGeometry {
  distances: number[];
  length: number;
  recorded: boolean;
}

// Completed point arrays are immutable. Weak keys release geometry after undo/clear.
const cache = new WeakMap<Point[], StrokeGeometry>();

export function strokeGeometry(points: Point[]): StrokeGeometry {
  const cached = cache.get(points);
  if (cached) return cached;
  const distances = [0];
  let previousTime = -1;
  let recorded = points.length >= 2;
  for (const [index, point] of points.entries()) {
    if (index > 0) {
      const previous = points[index - 1];
      distances.push(distances[index - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
    }
    if (
      typeof point.elapsedMs !== 'number' ||
      !Number.isFinite(point.elapsedMs) ||
      point.elapsedMs < 0 ||
      point.elapsedMs < previousTime
    )
      recorded = false;
    previousTime = point.elapsedMs ?? -1;
  }
  const result = {
    distances,
    length: distances.at(-1) ?? 0,
    recorded: recorded && previousTime > 0
  };
  cache.set(points, result);
  return result;
}

/** Find the first segment ending at or after the target. */
export function segmentAt(
  length: number,
  valueAt: (index: number) => number,
  target: number
): number {
  let low = 1;
  let high = length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (valueAt(middle) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}
