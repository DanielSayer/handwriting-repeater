import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), captureException: vi.fn() }));
vi.mock('posthog-js', () => ({ default: posthog }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', 'test-key');
});
afterEach(() => vi.unstubAllEnvs());

it('queues early explicit events and initialises only once', async () => {
  const analytics = await import('./analytics');
  analytics.captureEvent('guide_removed', {});
  expect(posthog.capture).not.toHaveBeenCalled();
  await Promise.all([analytics.initAnalytics(), analytics.initAnalytics()]);
  expect(posthog.init).toHaveBeenCalledTimes(1);
  expect(posthog.init).toHaveBeenCalledWith(
    'test-key',
    expect.objectContaining({
      autocapture: false,
      disable_session_recording: true,
      person_profiles: 'never'
    })
  );
  expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('guide_removed', {});
});

it('does no analytics work when unconfigured', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_KEY', '');
  const analytics = await import('./analytics');
  analytics.captureEvent('guide_removed', {});
  await analytics.initAnalytics();
  expect(posthog.init).not.toHaveBeenCalled();
  expect(posthog.capture).not.toHaveBeenCalled();
});

it('does not transmit an error message containing private input', async () => {
  const analytics = await import('./analytics');
  await analytics.initAnalytics();
  analytics.captureException(new Error('private-filename.png'), 'background_add');
  expect(posthog.captureException).toHaveBeenCalledWith(new Error('background_add failed'), {
    flow: 'background_add'
  });
});

it('contains SDK failures so they do not break the board', async () => {
  posthog.init.mockImplementationOnce(() => {
    throw new Error('blocked');
  });
  const analytics = await import('./analytics');
  await expect(analytics.initAnalytics()).resolves.toBeUndefined();
  await analytics.initAnalytics();
  expect(posthog.init).toHaveBeenCalledTimes(2);
});

it('contains capture failures after initialisation', async () => {
  const analytics = await import('./analytics');
  await analytics.initAnalytics();
  posthog.capture.mockImplementationOnce(() => {
    throw new Error('storage blocked');
  });
  expect(() => analytics.captureEvent('guide_removed', {})).not.toThrow();
});
