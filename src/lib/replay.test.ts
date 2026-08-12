import { describe, expect, it } from 'vitest';
import {
  createReplaySchedule,
  playbackRateForSpeed,
  replayDuration,
  strokeReplayProgress
} from './replay';
import type { BoardStroke, Point } from './types';

function stroke(points: Point[]): BoardStroke {
  return {
    id: 'stroke',
    colour: '#000000',
    width: 4,
    opacity: 1,
    points
  };
}

describe('playbackRateForSpeed', () => {
  it('adds slower rates while preserving the existing slider positions', () => {
    expect(playbackRateForSpeed(-1)).toBeCloseTo(0.25);
    expect(playbackRateForSpeed(0)).toBeCloseTo(0.3536);
    expect(playbackRateForSpeed(1)).toBeCloseTo(0.5);
    expect(playbackRateForSpeed(3)).toBe(1);
    expect(playbackRateForSpeed(5)).toBe(2);
  });
});

describe('createReplaySchedule', () => {
  it('returns no timings for an empty board', () => {
    expect(createReplaySchedule([], 1)).toEqual([]);
  });

  it('preserves recorded stroke timing and applies playback speed', () => {
    const schedule = createReplaySchedule(
      [
        stroke([
          { x: 0, y: 0, elapsedMs: 0 },
          { x: 1, y: 1, elapsedMs: 800 }
        ]),
        stroke([
          { x: 0, y: 0, elapsedMs: 0 },
          { x: 1, y: 0, elapsedMs: 400 }
        ])
      ],
      2
    );

    expect(schedule).toEqual([
      { delaySeconds: 0, durationSeconds: 0.4 },
      { delaySeconds: 0.4, durationSeconds: 0.2 }
    ]);
    expect(replayDuration(schedule)).toBeCloseTo(0.6);
  });
});

describe('strokeReplayProgress', () => {
  it('maps recorded timing to distance travelled along the stroke', () => {
    const recordedStroke = stroke([
      { x: 0, y: 0, elapsedMs: 0 },
      { x: 0.25, y: 0, elapsedMs: 500 },
      { x: 1, y: 0, elapsedMs: 1000 }
    ]);

    expect(
      strokeReplayProgress(recordedStroke, { delaySeconds: 0, durationSeconds: 1 }, 0.5)
    ).toBeCloseTo(0.25);
  });

  it('clamps progress before and after a stroke', () => {
    const legacyStroke = stroke([
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]);
    const timing = { delaySeconds: 1, durationSeconds: 2 };

    expect(strokeReplayProgress(legacyStroke, timing, 0)).toBe(0);
    expect(strokeReplayProgress(legacyStroke, timing, 4)).toBe(1);
  });
});
