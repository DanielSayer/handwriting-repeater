import type { BoardStroke } from './types';

export interface StrokeReplayTiming {
  delaySeconds: number;
  durationSeconds: number;
}

export function createReplaySchedule(
  strokes: BoardStroke[],
  totalDurationSeconds: number
): StrokeReplayTiming[] {
  if (strokes.length === 0) return [];

  const weights = strokes.map(strokeLength);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let elapsedSeconds = 0;

  return weights.map((weight) => {
    const durationSeconds = totalDurationSeconds * (weight / totalWeight);
    const timing = { delaySeconds: elapsedSeconds, durationSeconds };
    elapsedSeconds += durationSeconds;
    return timing;
  });
}

function strokeLength(stroke: BoardStroke): number {
  let length = 0;
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return Math.max(0.01, length);
}
