export const TIMER_MINUTE_MS = 60_000;

export interface TimerSnapshot {
  remainingMs: number;
  remainingMinutes: number;
  progress: number;
}

export function getTimerSnapshot(
  startedAt: number,
  durationMinutes: number,
  now: number
): TimerSnapshot {
  const durationMs = Math.max(0, durationMinutes) * TIMER_MINUTE_MS;
  const elapsedMs = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, durationMs - elapsedMs);

  return {
    remainingMs,
    remainingMinutes: Math.round(remainingMs / TIMER_MINUTE_MS),
    progress: durationMs === 0 ? 0 : remainingMs / durationMs
  };
}
