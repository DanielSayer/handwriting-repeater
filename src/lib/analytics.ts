import posthog from 'posthog-js';
import type { LineStyle, PenType } from './types';

const POSTHOG_KEY_VARIABLE = 'VITE_PUBLIC_POSTHOG_KEY';
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

interface AnalyticsEvents {
  drawing_started: {
    pen_type: PenType;
    has_background: boolean;
    has_guide: boolean;
  };
  replay_started: {
    stroke_count: number;
    duration_seconds: number;
    playback_rate: number;
    loop_enabled: boolean;
    trace_enabled: boolean;
  };
  guide_placed: {
    repeat_count: number;
    guide_size: number;
  };
  guide_removed: Record<string, never>;
  background_added: {
    file_type: string;
  };
  background_add_failed: {
    file_type: string;
  };
  gif_exported: {
    stroke_count: number;
    line_style: LineStyle;
    has_background: boolean;
    has_guide: boolean;
    trace_enabled: boolean;
    playback_rate: number;
  };
  gif_export_failed: {
    stroke_count: number;
    has_background: boolean;
  };
  timer_started: {
    duration_minutes: number;
  };
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;

  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.error(
        `${POSTHOG_KEY_VARIABLE} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${POSTHOG_KEY_VARIABLE} is configured`
      );
    }
    return;
  }

  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  posthog.init(apiKey, {
    api_host: apiHost,
    defaults: '2026-05-30',
    autocapture: true,
    capture_pageview: true,
    disable_session_recording: true,
    person_profiles: 'never',
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*'
    }
  });
  initialized = true;
}

export function captureEvent<EventName extends keyof AnalyticsEvents>(
  event: EventName,
  properties: AnalyticsEvents[EventName]
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function captureException(error: unknown, flow: 'background_add' | 'gif_export'): void {
  if (!initialized) return;
  posthog.captureException(error, { flow });
}
