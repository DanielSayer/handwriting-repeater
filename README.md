# Repeat

[![CI](https://github.com/DanielSayer/handwriting-repeater/actions/workflows/ci.yml/badge.svg)](https://github.com/DanielSayer/handwriting-repeater/actions/workflows/ci.yml)

A private, browser-local handwriting whiteboard. Draw naturally, add practice guides, trace an image, replay strokes at their original pace, and export a one-loop animated GIF.

[Open Repeat](https://www.handwriting-repeater.com/)

## Features

- Marker and pencil tools with adjustable colour and width
- Undo, redo, clear, zoom, and configurable paper guides
- Handwriting prompts repeated across the page for practice
- PNG, JPEG, or WebP tracing backgrounds with adjustable opacity
- Stroke replay with speed control and optional looping
- Browser-local persistence and animated GIF export
- Responsive layouts for desktop, tablet, and mobile
- Branded large-card previews when a deployed link is shared

Repeat has no backend. Board content and imported images stay in the browser's local storage unless the user exports a GIF. Optional PostHog analytics records anonymous feature use, but never guide text, handwriting paths, filenames, or imported images. Session replay is disabled.

## Local development

Requirements:

- Node.js 22.12 or newer
- pnpm 9.5

```sh
pnpm install
pnpm dev
```

Vite prints the local address when the development server starts.

PostHog is optional. Copy `.env.example` to `.env.local` and set `VITE_PUBLIC_POSTHOG_KEY` to enable analytics. `VITE_PUBLIC_POSTHOG_HOST` defaults to the US PostHog Cloud host. Without a key, the SDK is not loaded. With a key, analytics starts after the first paint and queues early feature events.

## Quality checks

```sh
pnpm check         # Svelte and TypeScript diagnostics
pnpm lint          # ESLint
pnpm test          # Vitest unit tests
pnpm format:check  # Prettier verification
pnpm build         # Production bundle
pnpm ci            # Run every CI check in sequence
```

Run `pnpm format` to apply the repository's formatting rules. Pull requests and pushes to `main` run the full suite in GitHub Actions. Dependabot checks npm packages weekly and GitHub Actions monthly.

## Production deployment

Repeat builds to a static site and can be hosted by any service that serves static files.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Use `dist` as the publish directory. No environment variables, server functions, or rewrite rules are required. The preview command is for checking the production build locally; use the hosting provider's static file server in production.

Recommended deployment settings:

| Setting                    | Value                                   |
| -------------------------- | --------------------------------------- |
| Node.js                    | 22.12 or newer                          |
| Package manager            | pnpm 9.5                                |
| Install command            | `pnpm install --frozen-lockfile`        |
| Build command              | `pnpm build`                            |
| Publish directory          | `dist`                                  |
| `VITE_PUBLIC_POSTHOG_KEY`  | Optional PostHog project token          |
| `VITE_PUBLIC_POSTHOG_HOST` | Optional, defaults to the US Cloud host |

## Project structure

```text
src/
├── components/  # Svelte interface and drawing-board components
├── lib/         # Drawing, replay, persistence, image, and export logic
├── App.svelte   # Application state and component composition
└── app.css      # Global design tokens and base styles
public/          # Icons, web app manifest, and crawler policy
```

## Privacy and storage

Saved boards use the browser's local storage. Clearing site data removes them, and storage is not shared across browsers or devices. Large tracing images are resized before storage, but a browser may still reject a board if its site-storage quota is exhausted. A visible warning reports save failures. Saves wait for a 300 ms pause in edits, run at least every two seconds during continuous edits, and flush when the page is hidden or closed. An abrupt browser or device crash can still lose the latest unsaved edits.

When configured, PostHog records page views and the explicit events below. Automatic control capture is disabled. Custom events cover drawing starts, replay, guides, background imports, GIF exports, timers, and failures. Guide text, paths, filenames, image data, and raw error messages are excluded from event payloads. The app creates anonymous IDs only and disables person profiles and session replay.

## Performance and code review

See [the September 2026 audit](docs/performance-audit-2026-09-05.md) for measurements, fixed bugs, component boundaries, regression coverage, and remaining limits. GIF encoding runs in an on-demand worker where OffscreenCanvas is available, with a main-thread fallback for older browsers.
