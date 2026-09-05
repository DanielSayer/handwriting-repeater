# Performance audit and code review

Audit date: 5 September 2026. Baseline: `ef4cc6ddd39953ae73cfa2ef6393cbd75b6c2352`.

The main startup cost was optional code on the critical rendering path. PostHog and GIF encoding loaded with the board. The changes defer both, move GIF encoding into a worker, reduce repeated stroke calculations, and fix persistence and interaction bugs. The existing design and browser-local storage format remain in use.

## Measured results

These are local production-build measurements, not live-site Web Vitals or a Lighthouse score. Both builds ran in the same Chromium browser at 1280 × 720, with cache disabled, 4× CPU slowdown, 150 ms network latency, 200,000 bytes/second download, and 93,750 bytes/second upload. Each measurement used an empty saved board. PostHog network endpoints were blocked in the final comparison. Each reported paint result is the median of five reloads.

| Measurement                            |    Before |     After |                Change |
| -------------------------------------- | --------: | --------: | --------------------: |
| First paint                            |    956 ms |    684 ms |            28% faster |
| First contentful paint                 |  1,184 ms |    684 ms |            42% faster |
| Initial JavaScript, Vite output size   | 384.22 kB | 108.12 kB |           72% smaller |
| Initial JavaScript, Vite gzip estimate | 131.42 kB |  39.31 kB |           70% smaller |
| Initial CSS, Vite gzip estimate        |   5.76 kB |   5.82 kB | Essentially unchanged |

First paint measures the first painted pixels, which can just be a background. First contentful paint measures visible content. The app has no server-rendered board, so reducing the initial JavaScript directly helps content appear sooner. These results do not measure production DNS, TLS, CDN caching, low-end physical devices, or large saved-board startup.

Raw final samples, in milliseconds:

| Metric                    | Samples                      |
| ------------------------- | ---------------------------- |
| Baseline first paint      | 948, 964, 960, 956, 952      |
| Baseline contentful paint | 1168, 1172, 1184, 1192, 1184 |
| Updated first paint       | 700, 700, 684, 684, 684      |
| Updated contentful paint  | 700, 700, 684, 684, 684      |

PostHog still has a 267.54 kB chunk, downloaded after the first paint when configured. The export entry is 1.03 kB and starts a 16.42 kB worker only on request. Browsers without Worker or OffscreenCanvas support instead load a 14.82 kB renderer. These are deferred costs, not removed functionality or a claim that the total code shipped is smaller.

## Findings and fixes

| Priority | Finding and effect                                                                                                                                                                            | Improvement                                                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| High     | The initial entry statically imported PostHog and the GIF encoder. Both delayed board startup.                                                                                                | Analytics loads after a paint opportunity and idle time. GIF code loads only when exporting. Missing analytics configuration does not load the SDK or log a false application error.                                                                                                 |
| High     | GIF palette generation, drawing, and encoding ran on the main thread. Yielding once per four frames still left large blocks of work.                                                          | Added a dedicated export worker using OffscreenCanvas. The older-browser fallback yields after every frame. Canvas contexts declare frequent pixel reads. Workers terminate on success or failure.                                                                                   |
| High     | Saved JSON was asserted to be valid TypeScript data. Valid JSON containing wrong shapes, invalid numbers, or duplicate stroke IDs could break rendering or replay.                            | Validate persisted fields independently, keep valid settings, reject malformed strokes and external background URLs, and repair duplicate IDs without dropping valid strokes. Preserve the existing storage key and legacy untimed strokes.                                          |
| High     | Saves synchronously serialised the entire board on each settings change, including slider input. Quota failures were silently swallowed.                                                      | Debounce saves for 300 ms, enforce a two-second maximum wait, flush on page hiding/cleanup, and show a save-failure warning. Retain pending data after failure so later saves can recover.                                                                                           |
| Medium   | Replay repeatedly scanned recorded timing, calculated cumulative distances, measured SVG path lengths, and wrote every path's style on every frame.                                           | Cache geometry by immutable point-array identity, use binary search for timing segments, cache SVG path strings and lengths, and advance a cursor so only the active path and newly completed paths change.                                                                          |
| Medium   | Every pointermove copied and rendered the current stroke, including high-frequency device input.                                                                                              | Collect coalesced points and publish the in-progress stroke at most once per animation frame. Flush pending points before committing a stroke.                                                                                                                                       |
| Medium   | A second pointer could replace the active stroke. Pointer cancellation committed interrupted marks.                                                                                           | Track the owning pointer, ignore other pointers, discard cancelled/lost-capture strokes, and cancel pending drawing frames on replay or component destruction. Keep edge pen dots inside persisted coordinate bounds.                                                                |
| Medium   | Replay could restart after an asynchronous tick even if Stop or a history action had intervened. Speed changes also left the completion timer using the previous duration.                    | Invalidate pending starts with a generation number. Undo and redo stop replay. Speed input stops the current replay so the next run has matching timing. Empty boards disable Rewrite.                                                                                               |
| Medium   | Passing `replay` directly as a click callback supplied a MouseEvent in the `automaticLoop` parameter. Manual starts could be classified as loops and miss analytics.                          | Explicit zero-argument callbacks distinguish manual starts from automatic repeats. Early explicit events queue while the SDK loads.                                                                                                                                                  |
| Medium   | Two image imports could complete out of order, or a pending import could restore an image after Remove.                                                                                       | Use a request generation number. Only the latest request updates the image, loading state, or error. Remove invalidates pending work.                                                                                                                                                |
| Medium   | Dialogs claimed modal semantics but allowed keyboard focus to leave the dialog. The guide dialog had no Escape handling.                                                                      | Share a native `dialog` component with modal focus containment, field focus, Escape handling, scroll limits, and focus restoration to the opener.                                                                                                                                    |
| Medium   | Clearing or entering fractional/out-of-range guide rows bypassed the number input's constraints because placement was a click action.                                                         | Validate whole-number row counts before placement and show an inline error. The guide-row helper also handles non-finite values safely.                                                                                                                                              |
| Medium   | Zoom divided the paper size by the same value later used to scale it. Drawing zoom largely cancelled itself out and offset the paper. CSS guides used different coordinates from SVG strokes. | Use a fixed 960 × 560 paper coordinate space and scale the centred paper once. Strokes, guides, backgrounds, and paper lines now scale together. Zoom above 100% crops the centred board; export still includes the full board. Align exported guide text vertically with the board. |
| Medium   | Automatic control capture could collect text outside the excluded canvas, including the background filename in the page tools. Raw exception messages were also sent.                         | Disable control autocapture. Keep explicit typed feature events and page views. Send generic flow-specific exceptions, and contain SDK errors so telemetry cannot break an app action.                                                                                               |
| Low      | Selected pens, colours, paper styles, and modes were only indicated visually.                                                                                                                 | Expose pressed state on those controls.                                                                                                                                                                                                                                              |
| Low      | README still described PNG export and eager analytics setup.                                                                                                                                  | Document the actual GIF flow, optional deferred analytics, save behaviour, and this audit.                                                                                                                                                                                           |

## Component and module boundaries

| File                                     | Responsibility                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/App.svelte`                         | Board settings and orchestration of user actions, replay, image requests, and exports.            |
| `src/components/BoardCanvas.svelte`      | Pointer capture, in-progress drawing, board sizing, background drop/paste, and paper composition. |
| `src/components/StrokeLayer.svelte`      | Completed SVG paths, trace overlay, replay frames, and animated pen.                              |
| `src/components/BoardPersistence.svelte` | Storage restoration, save scheduling, page lifecycle hooks, and save warning.                     |
| `src/components/Modal.svelte`            | Shared accessible dialog lifecycle and presentation for guide/timer dialogs.                      |
| `src/lib/storage.ts`                     | Runtime validation and a testable deferred-save scheduler.                                        |
| `src/lib/strokeGeometry.ts`              | Shared cached distances, recorded-timing validation, and segment lookup.                          |
| `src/lib/replay.ts`                      | Playback schedules and timing-to-distance conversion.                                             |
| `src/lib/downloadBoard.ts`               | Worker selection, worker lifecycle, and browser download.                                         |
| `src/lib/exportBoard.worker.ts`          | Export worker message boundary.                                                                   |
| `src/lib/exportBoard.ts`                 | Canvas rendering, GIF frames, and encoding shared by worker and fallback.                         |
| `src/lib/analytics.ts`                   | Typed anonymous events, deferred SDK initialisation, bounded queue, and error isolation.          |

Completed stroke objects and point arrays must remain immutable. Geometry and path caches depend on that contract. New drawing frames replace the point array; undo, redo, and restoring a board replace collections. WeakMap keys allow removed strokes to be collected.

Exports snapshot their input before the first asynchronous import. Editing the board during encoding does not change the GIF in progress.

## Regression prevention and validation

The production build now runs `scripts/check-bundle.mjs`. It traverses the Vite manifest's static entry imports and fails if their combined gzip size exceeds 45,000 bytes. Dynamic analytics/export chunks are excluded. The script uses Node's gzip implementation, so its reported size can differ slightly from Vite's estimate. This catches an accidental eager import of an optional library in CI.

Final validation passed the full `pnpm run ci` pipeline and `git diff --check`. The local pnpm wrapper initially tried to reinstall existing dependencies; setting `pnpm_config_verify_deps_before_run=false` for the validation process allowed the installed tools to run without changing dependencies or the lockfile.

The unit suite increased from 24 to 49 passing tests across eight files. New cases cover malformed saved data, duplicate IDs, round trips, coalesced saves, maximum save delay, lifecycle flush, quota recovery, early analytics events, SDK failure isolation, sanitised exceptions, cached geometry, paused strokes, invalid timestamps, export fallback, and worker termination. Existing drawing, timing, and GIF frame tests still pass.

Browser checks used the production build and disposable local test data:

- Mouse drawing, saved strokes and guides after reload, undo and redo.
- Trace overlay, animated pen, loop replay, and Stop.
- Cleared guide-row input, valid replacement rows, initial field focus, Escape, and opener focus restoration.
- Timer creation while a GIF was still encoding. The dialog opened and accepted input during export.
- Image paste using a generated PNG fixture, image persistence, and export with the tracing background.
- Synthetic competing pointer IDs and pointer cancellation. Exactly one stroke committed for the owning pointer, and cancellation added no stroke. Native multi-touch automation was unavailable, so physical touch/stylus testing remains separate.
- Desktop and 390 × 844 mobile rendering, including the timer overlay. Zoom increased the SVG width from 824 to 1,030 pixels at 125%, while its viewport stayed 824 pixels wide. Forward and reverse Tab navigation wrapped within the guide dialog.
- GIF output header, dimensions, block structure, frame count, and trailer. A 20-stroke fixture with 2,000 points, a tracing background, guide text, and trace mode produced a valid 960 × 560, 102-frame GIF of 3,302,324 bytes. No main-thread long tasks over 50 ms were recorded during that export and timer interaction. This is one fixture, not a universal export timing guarantee.

## Reproducing the measurements

1. Build the baseline commit in a separate checkout and build the updated app with `pnpm build`.
2. Serve both production builds with Vite preview on separate ports. Use an empty board on both origins.
3. Set the same browser viewport, disable cache, and apply the CPU and network settings above. Keep analytics network blocking consistent between builds.
4. Reload five times per build. Wait for the `first-contentful-paint` entry on each load, then record both paint entries. Report the median, not the best result.
5. Run `pnpm ci` for Svelte/TypeScript, ESLint, Vitest, formatting, production build, and the bundle budget. Run `git diff --check` separately.

## Remaining limits

- This audit does not establish production LCP, INP, CLS, or field performance. Repeat the measurements after deployment before claiming a live-site speedup.
- Loading and parsing a large saved board still uses synchronous localStorage. Saving is deferred, but each final serialisation/write remains synchronous. IndexedDB is a possible next step if real boards make this measurable; it needs a storage migration and recovery design.
- Active-stroke SVG path generation still grows with the number of captured points. Frame batching and cached completed strokes reduce repeated work, but exceptionally long single strokes remain more expensive than short ones. No lossy point simplification was added.
- The older-browser GIF fallback still encodes on the main thread. The worker keeps the UI responsive on supported browsers but does not remove export CPU, memory, or file-size costs.
- Handwriting font availability varies by browser and operating system. GIFs use an available cursive system font, so text and replay appearance are not guaranteed to match pixel-for-pixel across devices.
- Keyboard users can operate controls and dialogs, but the drawing surface still requires a pointer. Native physical pen pressure, palm rejection, and device-specific coalesced events need hardware testing.
- No dependency upgrades, production configuration changes, commits, pushes, or deployment were made as part of this audit.
