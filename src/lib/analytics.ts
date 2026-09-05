import type { PostHog } from 'posthog-js';
import type { LineStyle, PenType } from './types';

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

let client: PostHog | undefined;
let initialization: Promise<void> | undefined;
const pendingEvents: Array<(posthog: PostHog) => void> = [];

export function initAnalytics(): Promise<void> {
  if (initialization) return initialization;

  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();

  if (!apiKey) {
    return Promise.resolve();
  }

  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  initialization = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(apiKey, {
        api_host: apiHost,
        defaults: '2026-05-30',
        autocapture: false,
        capture_pageview: true,
        disable_session_recording: true,
        person_profiles: 'never',
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*'
        }
      });
      client = posthog;
      pendingEvents.splice(0).forEach((capture) => safelyCapture(capture, posthog));
    })
    .catch(() => {
      // Analytics is optional, including when the SDK request is blocked or offline.
      pendingEvents.length = 0;
      initialization = undefined;
    });
  return initialization;
}

function enqueue(capture: (posthog: PostHog) => void): void {
  if (!import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim()) return;
  if (client) safelyCapture(capture, client);
  else if (pendingEvents.length < 50) pendingEvents.push(capture);
}

function safelyCapture(capture: (posthog: PostHog) => void, posthog: PostHog): void {
  try {
    capture(posthog);
  } catch {
    // Telemetry failure must never interrupt drawing or export.
  }
}

export function captureEvent<EventName extends keyof AnalyticsEvents>(
  event: EventName,
  properties: AnalyticsEvents[EventName]
): void {
  enqueue((posthog) => posthog.capture(event, properties));
}

export function captureException(error: unknown, flow: 'background_add' | 'gif_export'): void {
  // Do not send arbitrary error messages, which can contain filenames or URLs.
  void error;
  enqueue((posthog) => posthog.captureException(new Error(`${flow} failed`), { flow }));
}
