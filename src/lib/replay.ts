import type { BoardStroke } from './types';

export interface StrokeReplayTiming {
  delaySeconds: number;
  durationSeconds: number;
}

const LEGACY_REPLAY_DURATION_SECONDS = 2.65;
const MINIMUM_STROKE_DURATION_SECONDS = 0.04;

export function createReplaySchedule(
  strokes: BoardStroke[],
  playbackRate: number
): StrokeReplayTiming[] {
  if (strokes.length === 0) return [];

  const safePlaybackRate = Math.max(0.1, playbackRate);
  const legacyStrokeLengths = strokes.map((stroke) => hasRecordedTiming(stroke) ? 0 : strokeLength(stroke));
  const totalLegacyLength = legacyStrokeLengths.reduce((sum, length) => sum + length, 0);
  let elapsedSeconds = 0;

  return strokes.map((stroke, index) => {
    const recordedDurationMs = stroke.points.at(-1)?.elapsedMs;
    const naturalDurationSeconds = hasRecordedTiming(stroke)
      ? recordedDurationMs! / 1000
      : LEGACY_REPLAY_DURATION_SECONDS * (legacyStrokeLengths[index] / totalLegacyLength);
    const durationSeconds = Math.max(
      MINIMUM_STROKE_DURATION_SECONDS / safePlaybackRate,
      naturalDurationSeconds / safePlaybackRate
    );
    const timing = { delaySeconds: elapsedSeconds, durationSeconds };
    elapsedSeconds += durationSeconds;
    return timing;
  });
}

export function replayDuration(schedule: StrokeReplayTiming[]): number {
  const lastTiming = schedule.at(-1);
  return lastTiming ? lastTiming.delaySeconds + lastTiming.durationSeconds : 0;
}

export function strokeReplayProgress(
  stroke: BoardStroke,
  timing: StrokeReplayTiming,
  elapsedSeconds: number
): number {
  const linearProgress = clamp(
    (elapsedSeconds - timing.delaySeconds) / timing.durationSeconds,
    0,
    1
  );
  if (!hasRecordedTiming(stroke) || linearProgress === 0 || linearProgress === 1) {
    return linearProgress;
  }

  const recordedDurationMs = stroke.points.at(-1)!.elapsedMs!;
  const targetElapsedMs = linearProgress * recordedDurationMs;
  const distances = cumulativeDistances(stroke);
  const totalDistance = distances.at(-1) ?? 0;
  if (totalDistance <= 0) return linearProgress;

  for (let index = 1; index < stroke.points.length; index += 1) {
    const currentElapsedMs = stroke.points[index].elapsedMs!;
    if (targetElapsedMs > currentElapsedMs) continue;

    const previousElapsedMs = stroke.points[index - 1].elapsedMs!;
    const segmentDurationMs = currentElapsedMs - previousElapsedMs;
    const segmentProgress = segmentDurationMs > 0
      ? clamp((targetElapsedMs - previousElapsedMs) / segmentDurationMs, 0, 1)
      : 1;
    const distance = distances[index - 1]
      + (distances[index] - distances[index - 1]) * segmentProgress;
    return distance / totalDistance;
  }

  return 1;
}

function hasRecordedTiming(stroke: BoardStroke): boolean {
  if (stroke.points.length < 2) return false;

  let previousElapsedMs = -1;
  for (const point of stroke.points) {
    if (
      typeof point.elapsedMs !== 'number'
      || !Number.isFinite(point.elapsedMs)
      || point.elapsedMs < previousElapsedMs
    ) return false;
    previousElapsedMs = point.elapsedMs;
  }

  return previousElapsedMs > 0;
}

function cumulativeDistances(stroke: BoardStroke): number[] {
  const distances = [0];
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    distances.push(
      distances[index - 1] + Math.hypot(current.x - previous.x, current.y - previous.y)
    );
  }
  return distances;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
