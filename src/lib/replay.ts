import { segmentAt, strokeGeometry } from './strokeGeometry';
import type { BoardStroke } from './types';

export interface StrokeReplayTiming {
  delaySeconds: number;
  durationSeconds: number;
}

const LEGACY_REPLAY_DURATION_SECONDS = 2.65;
const MINIMUM_STROKE_DURATION_SECONDS = 0.04;

export function playbackRateForSpeed(speed: number): number {
  return 2 ** ((speed - 3) / 2);
}

export function createReplaySchedule(
  strokes: BoardStroke[],
  playbackRate: number
): StrokeReplayTiming[] {
  if (strokes.length === 0) return [];

  const safePlaybackRate = Number.isFinite(playbackRate) ? Math.max(0.1, playbackRate) : 1;
  const legacyStrokeLengths = strokes.map((stroke) =>
    hasRecordedTiming(stroke) ? 0 : strokeLength(stroke)
  );
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
  const distances = strokeGeometry(stroke.points).distances;
  const totalDistance = distances.at(-1) ?? 0;
  if (totalDistance <= 0) return linearProgress;

  const index = segmentAt(
    stroke.points.length,
    (index) => stroke.points[index].elapsedMs!,
    targetElapsedMs
  );
  const currentElapsedMs = stroke.points[index].elapsedMs!;

  const previousElapsedMs = stroke.points[index - 1].elapsedMs!;
  const segmentDurationMs = currentElapsedMs - previousElapsedMs;
  const segmentProgress =
    segmentDurationMs > 0
      ? clamp((targetElapsedMs - previousElapsedMs) / segmentDurationMs, 0, 1)
      : 1;
  const distance =
    distances[index - 1] + (distances[index] - distances[index - 1]) * segmentProgress;
  return distance / totalDistance;
}

function hasRecordedTiming(stroke: BoardStroke): boolean {
  return strokeGeometry(stroke.points).recorded;
}

function strokeLength(stroke: BoardStroke): number {
  return Math.max(0.01, strokeGeometry(stroke.points).length);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
