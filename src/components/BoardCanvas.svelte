<script lang="ts">
  import { onMount } from 'svelte';
  import Dropzone from 'svelte-file-dropzone';
  import StrokeLayer from './StrokeLayer.svelte';
  import TimerWidget from './TimerWidget.svelte';
  import { BACKGROUND_IMAGE_ACCEPT, MAX_BACKGROUND_FILE_SIZE } from '../lib/backgroundImage';
  import { BOARD_BOUNDS, PAGE_ASPECT_RATIO, PAGE_RECT } from '../lib/constants';
  import {
    cameraTransform,
    clampCamera,
    cssTransform,
    sameCamera,
    type Camera
  } from '../lib/camera';
  import { fitBoardToViewport, pointFromPointer, smoothPath } from '../lib/drawing';
  import { clamp, guideMetrics, guideBounds, guideBaselines, constrainGuide } from '../lib/guide';
  import {
    guideFontFamily,
    guideLetterSpacing,
    loadGuideFont,
    type GuideFontId
  } from '../lib/guideFonts';
  import type {
    BoardBackground,
    BoardStroke,
    GuideLayout,
    LineStyle,
    PenType,
    Point,
    Rect
  } from '../lib/types';

  interface BackgroundDropDetail {
    acceptedFiles: File[];
    fileRejections: unknown[];
  }

  export let strokes: BoardStroke[];
  export let penColour: string;
  export let penSize: number;
  export let penType: PenType;
  export let pageColour: string;
  export let lineStyle: LineStyle;
  /** Bound: pan and zoom gestures update it; it is clamped to the board here. */
  export let camera: Camera;
  export let traceMode: boolean;
  export let replaying: boolean;
  export let replayNonce: number;
  export let playbackRate: number;
  export let guideText: string;
  export let guideFont: GuideFontId;
  export let repeatCount: number;
  export let guideSize: number;
  export let guideLayout: GuideLayout | null;
  export let editingGuide: boolean;
  export let backgroundImage: BoardBackground | null;
  export let backgroundOpacity: number;
  export let timer: { startedAt: number; durationMinutes: number } | null;
  export let onStrokeComplete: (stroke: BoardStroke) => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onBackgroundError: (message: string) => void;

  let svg: SVGSVGElement;
  let boardStage: HTMLDivElement;
  let viewportWidth = PAGE_RECT.width;
  let viewportHeight = PAGE_RECT.height;
  // Camera clamping waits for the real viewport size so a restored view is not disturbed.
  let measured = false;
  let currentStroke: BoardStroke | null = null;
  let pendingPoints: Point[] = [];
  let strokeFrame: number | undefined;
  let backgroundDragActive = false;
  let resizeAnimationFrame: number | undefined;
  let measureContext: CanvasRenderingContext2D | null = null;
  let loadedFont: GuideFontId | null = null;
  let fontError = false;
  let requestedFont: GuideFontId | null = null;
  /** The single pointer gesture in progress. Other pointers are ignored until it ends. */
  type Gesture =
    | { kind: 'stroke'; pointer: number; startedAt: number }
    | {
        kind: 'guide';
        pointer: number;
        x: number;
        y: number;
        layout: GuideLayout;
        size: number;
        scale: boolean;
        bounds: Rect;
      };
  let gesture: Gesture | null = null;

  $: if (guideText && measureContext) requestFont(guideFont);
  $: fontReady = loadedFont === guideFont;
  $: if (editingGuide && !fontReady) requestFont(guideFont);
  $: metrics =
    measureContext && fontReady
      ? guideMetrics(measureContext, guideText, repeatCount, guideSize, guideFont)
      : null;
  $: guideRows = metrics ? guideBaselines(guideText, repeatCount, guideLayout, metrics) : [];
  $: bounds = metrics && guideLayout ? guideBounds(metrics, guideLayout) : null;
  $: if (editingGuide && fontReady && measureContext && guideText && repeatCount) editGuide();
  $: if (editingGuide || replaying) cancelStroke();
  $: if (!editingGuide || replaying) cancelGuideGesture();
  // Zoom 1 fits the original page to the stage. The board extends beyond it on every side.
  $: viewport = { width: viewportWidth, height: viewportHeight };
  $: baseScale =
    fitBoardToViewport(viewportWidth, viewportHeight, PAGE_ASPECT_RATIO).width / PAGE_RECT.width;
  $: if (measured) {
    const clamped = clampCamera(camera, viewport, baseScale, BOARD_BOUNDS);
    if (!sameCamera(clamped, camera)) camera = clamped;
  }
  $: transform = cameraTransform(camera, viewport, baseScale);
  // Page position inside the paper element, which starts at the board's top-left corner.
  const pageInPaper = `left:${PAGE_RECT.x - BOARD_BOUNDS.x}px;top:${PAGE_RECT.y - BOARD_BOUNDS.y}px;width:${PAGE_RECT.width}px;height:${PAGE_RECT.height}px`;
  $: handleSize = Math.max(24, 32 / Math.max(Number.EPSILON, transform.scale));

  onMount(() => {
    measureContext = document.createElement('canvas').getContext('2d');
    const measureViewport = (): void => {
      const rect = boardStage.getBoundingClientRect();
      viewportWidth = rect.width;
      viewportHeight = rect.height;
      measured = rect.width > 0 && rect.height > 0;
    };
    const measureOnNextFrame = (): void => {
      if (resizeAnimationFrame !== undefined) cancelAnimationFrame(resizeAnimationFrame);
      resizeAnimationFrame = requestAnimationFrame(measureViewport);
    };
    const observer = new ResizeObserver(measureViewport);

    observer.observe(boardStage);
    window.addEventListener('resize', measureOnNextFrame);
    document.addEventListener('fullscreenchange', measureOnNextFrame);
    measureViewport();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureOnNextFrame);
      document.removeEventListener('fullscreenchange', measureOnNextFrame);
      if (resizeAnimationFrame !== undefined) cancelAnimationFrame(resizeAnimationFrame);
      cancelStroke();
      cancelGuideGesture();
    };
  });

  async function requestFont(font: GuideFontId): Promise<void> {
    requestedFont = font;
    fontError = false;
    try {
      await loadGuideFont(font);
      if (requestedFont === font) loadedFont = font;
    } catch {
      if (requestedFont === font) fontError = true;
    }
  }

  function handlePointerDown(event: PointerEvent): void {
    svg.focus({ preventScroll: true });
    if (gesture) return;
    if (editingGuide) startGuideGesture(event);
    else startStroke(event);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (event.pointerId !== gesture?.pointer) return;
    if (gesture.kind === 'guide') moveGuideGesture(event, gesture);
    else moveStroke(event, gesture.startedAt);
  }

  function handlePointerUp(event: PointerEvent): void {
    if (event.pointerId !== gesture?.pointer) return;
    if (gesture.kind === 'guide') endGesture();
    else endStroke(event, gesture.startedAt);
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (event.pointerId !== gesture?.pointer) return;
    if (gesture.kind === 'guide') {
      guideLayout = gesture.layout;
      guideSize = gesture.size;
      endGesture();
    } else cancelStroke();
  }

  function beginGesture(event: PointerEvent, next: Gesture): void {
    gesture = next;
    svg.setPointerCapture(event.pointerId);
  }

  /** Clear the gesture before releasing capture so `lostpointercapture` sees no gesture. */
  function endGesture(): void {
    const pointer = gesture?.pointer;
    gesture = null;
    if (pointer !== undefined && svg?.hasPointerCapture(pointer))
      svg.releasePointerCapture(pointer);
  }

  function startStroke(event: PointerEvent): void {
    if (event.button !== 0 || replaying) return;
    beginGesture(event, { kind: 'stroke', pointer: event.pointerId, startedAt: event.timeStamp });
    currentStroke = {
      id: crypto.randomUUID(),
      colour: penColour,
      width: penSize,
      opacity: penType === 'pencil' ? 0.55 : 1,
      points: [{ ...pointFromPointer(event, svg, BOARD_BOUNDS), elapsedMs: 0 }]
    };
  }

  function moveStroke(event: PointerEvent, startedAt: number): void {
    if (!currentStroke) return;
    const coalescedEvents = event.getCoalescedEvents?.();
    const pointerEvents = coalescedEvents?.length ? coalescedEvents : [event];
    pendingPoints.push(
      ...pointerEvents.map((pointerEvent) => ({
        ...pointFromPointer(pointerEvent, svg, BOARD_BOUNDS),
        elapsedMs: Math.max(0, pointerEvent.timeStamp - startedAt)
      }))
    );
    strokeFrame ??= requestAnimationFrame(flushStroke);
  }

  function flushStroke(): void {
    if (strokeFrame !== undefined) cancelAnimationFrame(strokeFrame);
    strokeFrame = undefined;
    if (currentStroke && pendingPoints.length) {
      currentStroke = { ...currentStroke, points: [...currentStroke.points, ...pendingPoints] };
    }
    pendingPoints = [];
  }

  function cancelStroke(): void {
    if (strokeFrame !== undefined) cancelAnimationFrame(strokeFrame);
    strokeFrame = undefined;
    pendingPoints = [];
    currentStroke = null;
    if (gesture?.kind === 'stroke') endGesture();
  }

  function endStroke(event: PointerEvent, startedAt: number): void {
    flushStroke();
    endGesture();
    const stroke = currentStroke;
    currentStroke = null;
    if (!stroke) return;

    if (stroke.points.length === 1) {
      if (event.pointerType === 'mouse') return;
      // Nudge a tap into a tiny segment so it renders as a dot, staying inside the board.
      const point = stroke.points[0];
      const nudge = 0.1;
      stroke.points = [
        point,
        {
          x: point.x >= BOARD_BOUNDS.x + BOARD_BOUNDS.width ? point.x - nudge : point.x + nudge,
          y: point.y >= BOARD_BOUNDS.y + BOARD_BOUNDS.height ? point.y - nudge : point.y + nudge,
          elapsedMs: Math.max(16, event.timeStamp - startedAt)
        }
      ];
    }

    onStrokeComplete(stroke);
  }

  function cancelGuideGesture(): void {
    if (gesture?.kind === 'guide') endGesture();
  }

  function updateGuide(size: number, spacing: number): void {
    if (!guideLayout || !measureContext) return;
    const requestedSize = clamp(size, 12, 160);
    let nextSpacing = clamp(spacing, 16, 160);
    let nextMetrics = guideMetrics(
      measureContext,
      guideText,
      repeatCount,
      requestedSize,
      guideFont
    );
    const count = nextMetrics.lines.length - 1;
    const fit = Math.min(
      1,
      (BOARD_BOUNDS.width - 16) / nextMetrics.width,
      (BOARD_BOUNDS.height - 16) / (nextMetrics.ascent + nextMetrics.descent + count * nextSpacing)
    );
    guideSize = Math.max(12, requestedSize * fit);
    nextSpacing = Math.max(16, nextSpacing * fit);
    nextMetrics = guideMetrics(measureContext, guideText, repeatCount, guideSize, guideFont);
    guideLayout = constrainGuide({ ...guideLayout, rowSpacing: nextSpacing }, nextMetrics);
  }

  function editGuide(): void {
    if (!metrics) return;
    guideLayout ??= {
      x: guideRows[0]?.x ?? 67,
      y: guideRows[0]?.y ?? 74,
      rowSpacing: repeatCount > 1 ? 358.4 / (repeatCount - 1) : 92
    };
    updateGuide(guideSize, guideLayout.rowSpacing);
    editingGuide = true;
  }

  function startGuideGesture(event: PointerEvent): void {
    const action = (event.target as SVGElement).dataset.guideAction;
    if (event.button !== 0 || replaying || !guideLayout || !bounds || !action) return;
    event.preventDefault();
    const point = pointFromPointer(event, svg, BOARD_BOUNDS);
    beginGesture(event, {
      kind: 'guide',
      pointer: event.pointerId,
      x: point.x,
      y: point.y,
      layout: { ...guideLayout },
      size: guideSize,
      scale: action === 'scale',
      bounds: { ...bounds }
    });
  }

  function moveGuideGesture(
    event: PointerEvent,
    gesture: Extract<Gesture, { kind: 'guide' }>
  ): void {
    if (!metrics) return;
    const point = pointFromPointer(event, svg, BOARD_BOUNDS);
    const dx = point.x - gesture.x;
    const dy = point.y - gesture.y;
    if (gesture.scale) {
      const { width, height } = gesture.bounds;
      const scale = Math.max(
        0.1,
        1 + (dx * width + dy * height) / (width * width + height * height)
      );
      guideLayout = { ...gesture.layout };
      updateGuide(gesture.size * scale, gesture.layout.rowSpacing * scale);
      // Keep the top-left corner anchored while the baseline follows the new font size.
      if (measureContext && guideLayout) {
        const next = guideMetrics(measureContext, guideText, repeatCount, guideSize, guideFont);
        guideLayout = constrainGuide({ ...guideLayout, y: gesture.bounds.y + next.ascent }, next);
      }
    } else {
      guideLayout = constrainGuide(
        { ...gesture.layout, x: gesture.layout.x + dx, y: gesture.layout.y + dy },
        metrics
      );
    }
  }

  function guideKeyboard(event: KeyboardEvent): void {
    if (!editingGuide || !guideLayout || !metrics) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      editingGuide = false;
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      guideLayout = constrainGuide(
        { ...guideLayout, x: guideLayout.x + direction[0], y: guideLayout.y + direction[1] },
        metrics
      );
    } else if (event.key === '+' || event.key === '-') {
      event.preventDefault();
      updateGuide(guideSize + (event.key === '+' ? step : -step), guideLayout.rowSpacing);
    }
  }

  function handleBackgroundDrop(event: CustomEvent<BackgroundDropDetail>): void {
    backgroundDragActive = false;
    const file = event.detail.acceptedFiles[0];

    if (file) {
      onBackgroundSelected(file);
      return;
    }

    if (event.detail.fileRejections.length) {
      onBackgroundError('Choose one PNG, JPEG, or WebP image smaller than 15 MB.');
    }
  }

  function handleCanvasPaste(event: ClipboardEvent): void {
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();

    if (!file) return;
    event.preventDefault();
    onBackgroundSelected(file);
  }
</script>

<div class="canvas-workspace">
  {#if fontError}
    <p class="font-warning" role="status">
      The guide font could not load. <button on:click={() => requestFont(guideFont)}>Retry</button>
    </p>
  {/if}
  <Dropzone
    accept={BACKGROUND_IMAGE_ACCEPT}
    maxSize={MAX_BACKGROUND_FILE_SIZE}
    multiple={false}
    noClick={true}
    noKeyboard={true}
    disableDefaultStyles={true}
    containerClasses="canvas-dropzone"
    on:drop={handleBackgroundDrop}
    on:dragenter={() => (backgroundDragActive = true)}
    on:dragleave={() => (backgroundDragActive = false)}
    role="presentation"
    tabindex="-1"
  >
    <div class="board-stage ph-no-capture" bind:this={boardStage}>
      <div
        class="board-viewport"
        class:trace-active={traceMode}
        class:background-drag-active={backgroundDragActive}
      >
        <div
          class={`paper lines-${lineStyle}`}
          style={`--paper:${pageColour};--origin-x:${PAGE_RECT.x - BOARD_BOUNDS.x}px;--origin-y:${PAGE_RECT.y - BOARD_BOUNDS.y}px;transform:${cssTransform(transform, BOARD_BOUNDS)};width:${BOARD_BOUNDS.width}px;height:${BOARD_BOUNDS.height}px`}
        >
          {#if backgroundImage}
            <img
              class="background-image"
              src={backgroundImage.src}
              alt=""
              style={`${pageInPaper};opacity:${backgroundOpacity}`}
            />
          {/if}
          <div class="sheen"></div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions (the drawing application handles pointer gestures, keyboard guide adjustment and clipboard paste) -->
          <svg
            class="drawing-layer"
            bind:this={svg}
            viewBox={`${BOARD_BOUNDS.x} ${BOARD_BOUNDS.y} ${BOARD_BOUNDS.width} ${BOARD_BOUNDS.height}`}
            tabindex="0"
            aria-label={editingGuide
              ? 'Guide editor. Arrow keys move, plus and minus resize, Escape finishes editing.'
              : 'Handwriting canvas. Paste an image to use it as a background.'}
            role="application"
            on:pointerdown={handlePointerDown}
            on:pointermove={handlePointerMove}
            on:pointerup={handlePointerUp}
            on:pointercancel={handlePointerCancel}
            on:lostpointercapture={handlePointerCancel}
            on:paste={handleCanvasPaste}
            on:keydown={guideKeyboard}
          >
            <g
              aria-hidden="true"
              pointer-events="none"
              fill={traceMode ? '#8f9aa6' : '#a7b0b8'}
              opacity={traceMode ? 0.78 : 0.62}
              font-family={guideFontFamily(guideFont)}
              font-size={guideSize}
              letter-spacing={guideLetterSpacing(guideFont, guideSize)}
            >
              {#each guideRows as row, index (index)}
                <text x={row.x} y={row.y} xml:space="preserve">{row.text}</text>
              {/each}
            </g>
            <StrokeLayer {strokes} {traceMode} {replaying} {replayNonce} {playbackRate} />
            {#if editingGuide && bounds}
              <g aria-hidden="true" class="guide-selection">
                <rect
                  data-guide-action="move"
                  x={bounds.x - 5}
                  y={bounds.y - 5}
                  width={bounds.width + 10}
                  height={bounds.height + 10}
                  fill="transparent"
                  stroke="var(--blue)"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                  stroke-dasharray="5 3"
                  style="cursor:move"
                />
                <rect
                  data-guide-action="scale"
                  x={bounds.x + bounds.width - handleSize}
                  y={bounds.y + bounds.height - handleSize}
                  width={handleSize}
                  height={handleSize}
                  rx="5"
                  fill="var(--blue)"
                  stroke="#fff"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                  style="cursor:nwse-resize"
                />
              </g>
            {/if}
            {#if currentStroke}
              <path
                d={smoothPath(currentStroke.points)}
                fill="none"
                stroke={currentStroke.colour}
                stroke-width={currentStroke.width}
                stroke-opacity={currentStroke.opacity}
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {/if}
          </svg>
          {#if !strokes.length && !guideText && !backgroundImage}
            <div class="empty-prompt" aria-hidden="true" style={pageInPaper}>
              <p>Start writing anywhere</p>
              <small>Or drop a picture here to trace it</small>
            </div>
          {/if}
        </div>
        {#if backgroundDragActive}
          <div class="drop-prompt" aria-hidden="true">
            <strong>Drop the picture to trace it</strong>
            <span>PNG, JPEG, or WebP</span>
          </div>
        {/if}
      </div>
      {#if timer}
        <TimerWidget startedAt={timer.startedAt} durationMinutes={timer.durationMinutes} />
      {/if}
    </div>
  </Dropzone>
</div>

<style>
  .canvas-workspace {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .font-warning {
    position: absolute;
    z-index: 12;
    top: 10px;
    left: 50%;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 6px 6px 6px 14px;
    border-radius: 12px;
    background: #fff;
    box-shadow: var(--shadow-pop);
    color: var(--text);
    font-size: 14px;
    transform: translateX(-50%);
  }
  .font-warning button {
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 9px;
    background: var(--blue);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
  .guide-selection {
    touch-action: none;
  }
  .board-stage {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .board-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 5px;
    background: #e9ecef;
    touch-action: none;
  }
  .board-viewport:has(.drawing-layer:focus-visible) {
    outline: 3px solid var(--blue);
    outline-offset: -3px;
  }
  :global(.canvas-dropzone) {
    min-height: 0;
    display: grid;
  }
  .background-drag-active {
    box-shadow: 0 0 0 3px var(--blue);
  }
  .paper {
    --paper: #fcfdfd;
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    overflow: hidden;
    background-color: var(--paper);
    touch-action: none;
    cursor: crosshair;
    outline: none;
  }
  .drawing-layer:focus-visible {
    outline: none;
  }
  .background-image {
    position: absolute;
    z-index: 1;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }
  /* Faint gloss and inner edge so the surface reads as a whiteboard, not paper. */
  .sheen {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.55) 0%,
      rgba(255, 255, 255, 0) 45%,
      rgba(0, 0, 0, 0.018) 100%
    );
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.07),
      inset 0 2px 4px rgba(0, 0, 0, 0.06);
  }
  /* Line patterns are tiled from the page origin (--origin-*) so they line up with the page. */
  .paper.lines-ruled {
    background-image: linear-gradient(
      to bottom,
      transparent 0 72px,
      #b8d4e7 73px 75px,
      transparent 76px 92px
    );
    background-size: 100% 92px;
    background-position: 0 var(--origin-y);
  }
  .paper.lines-dotted {
    background-image: radial-gradient(circle, #a8c9df 1.5px, transparent 1.8px);
    background-size: 16px 92px;
    background-position: var(--origin-x) calc(var(--origin-y) + 73px);
  }
  .paper.lines-grid {
    background-image:
      linear-gradient(#cfdfeb 1px, transparent 1px),
      linear-gradient(90deg, #cfdfeb 1px, transparent 1px);
    background-size: 48px 48px;
    background-position: var(--origin-x) var(--origin-y);
  }
  .drawing-layer {
    position: absolute;
    z-index: 4;
    inset: 0;
    width: 100%;
    height: 100%;
    user-select: none;
  }
  .empty-prompt {
    position: absolute;
    z-index: 3;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 6px;
    text-align: center;
    pointer-events: none;
  }
  .empty-prompt p {
    margin: 0;
    padding: 2px 10px;
    border-radius: 6px;
    background: var(--paper);
    color: #6b7382;
    font-size: 24px;
    font-weight: 600;
  }
  .empty-prompt small {
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--paper);
    color: #7a8291;
    font-size: 16px;
  }
  .drop-prompt {
    position: absolute;
    z-index: 6;
    inset: 18px;
    display: grid;
    place-content: center;
    gap: 6px;
    border: 3px dashed var(--blue);
    border-radius: 14px;
    background: rgba(243, 247, 254, 0.94);
    color: var(--ink);
    text-align: center;
    pointer-events: none;
  }
  .drop-prompt strong {
    font-size: 26px;
  }
  .drop-prompt span {
    color: var(--muted);
    font-size: 16px;
  }

  @media (max-width: 959px) {
    :global(.canvas-dropzone) {
      aspect-ratio: 12 / 7;
    }
  }
</style>
