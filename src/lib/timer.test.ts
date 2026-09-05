import { describe, expect, it } from 'vitest';
import { getTimerSnapshot, TIMER_MINUTE_MS } from './timer';

describe('getTimerSnapshot', () => {
  it('starts every duration as a full circle', () => {
    expect(getTimerSnapshot(1_000, 5, 1_000)).toEqual({
      remainingMs: 5 * TIMER_MINUTE_MS,
      remainingMinutes: 5,
      progress: 1
    });
  });

  it('counts down as a proportion of the chosen duration', () => {
    const snapshot = getTimerSnapshot(0, 5, 2.5 * TIMER_MINUTE_MS);

    expect(snapshot.remainingMinutes).toBe(3);
    expect(snapshot.progress).toBe(0.5);
  });

  it('always rounds positive remaining time up to the next minute', () => {
    expect(getTimerSnapshot(0, 5, 31_000).remainingMinutes).toBe(5);
    expect(getTimerSnapshot(0, 5, 4 * TIMER_MINUTE_MS + 59_000).remainingMinutes).toBe(1);
  });

  it('shows zero minutes once no time remains', () => {
    expect(getTimerSnapshot(0, 5, 5 * TIMER_MINUTE_MS).remainingMinutes).toBe(0);
  });

  it('stops at zero after the timer finishes', () => {
    expect(getTimerSnapshot(0, 1, 2 * TIMER_MINUTE_MS)).toEqual({
      remainingMs: 0,
      remainingMinutes: 0,
      progress: 0
    });
  });
});
