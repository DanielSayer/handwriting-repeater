<script lang="ts">
  import { onMount } from 'svelte';
  import Dropzone from 'svelte-file-dropzone';
  import StrokeLayer from './StrokeLayer.svelte';
  import Icon from './Icon.svelte';
  import TimerWidget from './TimerWidget.svelte';
  import { BACKGROUND_IMAGE_ACCEPT, MAX_BACKGROUND_FILE_SIZE } from '../lib/backgroundImage';
  import { BOARD_ASPECT_RATIO, BOARD_HEIGHT, BOARD_WIDTH } from '../lib/constants';
  import { fitBoardToViewport, pointFromPointer, smoothPath } from '../lib/drawing';
  import { clamp, guideMetrics, guideBounds, guideBaselines, constrainGuide } from '../lib/guide';
  import { guideFontFamily, loadGuideFont, type GuideFontId } from '../lib/guideFonts';
  import type {
    BoardBackground,
    BoardStroke,
    GuideLayout,
    LineStyle,
    PenType,
    Point
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
  export let zoom: number;
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
  export let onResize: (width: number, height: number) => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onBackgroundError: (message: string) => void;

  let svg: SVGSVGElement;
  let boardStage: HTMLDivElement;
  let viewportWidth = BOARD_WIDTH;
  let viewportHeight = BOARD_HEIGHT;
  let currentStroke: BoardStroke | null = null;
  let currentStrokeStartedAt = 0;
  let drawing = false;
  let activePointer: number | null = null;
  let pendingPoints: Point[] = [];
  let strokeFrame: number | undefined;
  let backgroundDragActive = false;
  let resizeAnimationFrame: number | undefined;
  let measureContext: CanvasRenderingContext2D | null = null;
  let loadedFont: GuideFontId | null = null;
  let fontError = false;
  let requestedFont: GuideFontId | null = null;
  let guideGesture: {
    pointer: number;
    x: number;
    y: number;
    layout: GuideLayout;
    size: number;
    scale: boolean;
    bounds: { x: number; y: number; width: number; height: number };
  } | null = null;

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
  $: paperSize = fitBoardToViewport(viewportWidth, viewportHeight, BOARD_ASPECT_RATIO);
  $: handleSize = Math.max(24, (32 * BOARD_WIDTH) / Math.max(1, paperSize.width * zoom));

  onMount(() => {
    measureContext = document.createElement('canvas').getContext('2d');
    const measureViewport = (): void => {
      const rect = boardStage.getBoundingClientRect();
      viewportWidth = rect.width;
      viewportHeight = rect.height;
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
    onResize(BOARD_WIDTH, BOARD_HEIGHT);
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

  function startStroke(event: PointerEvent): void {
    svg.focus({ preventScroll: true });
    if (editingGuide) {
      startGuideGesture(event);
      return;
    }
    if (event.button !== 0 || replaying || activePointer !== null) return;
    activePointer = event.pointerId;
    svg.setPointerCapture(event.pointerId);
    drawing = true;
    currentStrokeStartedAt = event.timeStamp;
    currentStroke = {
      id: crypto.randomUUID(),
      colour: penColour,
      width: penSize,
      opacity: penType === 'pencil' ? 0.55 : 1,
      points: [{ ...pointFromPointer(event, svg), elapsedMs: 0 }]
    };
  }

  function moveStroke(event: PointerEvent): void {
    if (guideGesture) {
      moveGuideGesture(event);
      return;
    }
    if (!drawing || !currentStroke || event.pointerId !== activePointer) return;
    const coalescedEvents = event.getCoalescedEvents?.();
    const pointerEvents = coalescedEvents?.length ? coalescedEvents : [event];
    pendingPoints.push(
      ...pointerEvents.map((pointerEvent) => ({
        ...pointFromPointer(pointerEvent, svg),
        elapsedMs: Math.max(0, pointerEvent.timeStamp - currentStrokeStartedAt)
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
    drawing = false;
    const pointer = activePointer;
    activePointer = null;
    if (pointer !== null && svg?.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (event.pointerId === guideGesture?.pointer) {
      guideLayout = guideGesture.layout;
      guideSize = guideGesture.size;
      cancelGuideGesture();
    }
    if (event.pointerId === activePointer) cancelStroke();
  }

  function endStroke(event: PointerEvent): void {
    if (event.pointerId === guideGesture?.pointer) {
      cancelGuideGesture();
      return;
    }
    if (!drawing || !currentStroke || event.pointerId !== activePointer) return;
    flushStroke();
    activePointer = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);

    if (currentStroke.points.length === 1) {
      if (event.pointerType === 'mouse') {
        currentStroke = null;
        drawing = false;
        return;
      }
      const point = currentStroke.points[0];
      currentStroke.points = [
        point,
        {
          x: point.x >= 1 ? point.x - 0.0001 : point.x + 0.0001,
          y: point.y >= 1 ? point.y - 0.0001 : point.y + 0.0001,
          elapsedMs: Math.max(16, event.timeStamp - currentStrokeStartedAt)
        }
      ];
    }

    onStrokeComplete(currentStroke);
    currentStroke = null;
    drawing = false;
  }

  function cancelGuideGesture(): void {
    const pointer = guideGesture?.pointer;
    guideGesture = null;
    if (pointer !== undefined && svg?.hasPointerCapture(pointer))
      svg.releasePointerCapture(pointer);
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
      (BOARD_WIDTH - 16) / nextMetrics.width,
      (BOARD_HEIGHT - 16) / (nextMetrics.ascent + nextMetrics.descent + count * nextSpacing)
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
    if (event.button !== 0 || replaying || guideGesture || !guideLayout || !bounds || !action)
      return;
    event.preventDefault();
    const point = pointFromPointer(event, svg);
    guideGesture = {
      pointer: event.pointerId,
      x: point.x * BOARD_WIDTH,
      y: point.y * BOARD_HEIGHT,
      layout: { ...guideLayout },
      size: guideSize,
      scale: action === 'scale',
      bounds: { ...bounds }
    };
    svg.setPointerCapture(event.pointerId);
  }

  function moveGuideGesture(event: PointerEvent): void {
    const gesture = guideGesture;
    if (!gesture || event.pointerId !== gesture.pointer || !metrics) return;
    const point = pointFromPointer(event, svg);
    const dx = point.x * BOARD_WIDTH - gesture.x;
    const dy = point.y * BOARD_HEIGHT - gesture.y;
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

<div class="canvas-workspace" class:font-error={fontError}>
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
        style={`width:${paperSize.width * Math.min(zoom, 1)}px;height:${paperSize.height * Math.min(zoom, 1)}px`}
      >
        <div
          class={`paper lines-${lineStyle}`}
          style={`--paper:${pageColour};--zoom:${(paperSize.width / BOARD_WIDTH) * zoom};width:${BOARD_WIDTH}px;height:${BOARD_HEIGHT}px`}
        >
          {#if backgroundImage}
            <img
              class="background-image"
              src={backgroundImage.src}
              alt=""
              style={`opacity:${backgroundOpacity}`}
            />
          {/if}
          <div class="paper-grain"></div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions (the drawing application handles pointer gestures, keyboard guide adjustment and clipboard paste) -->
          <svg
            class="drawing-layer"
            bind:this={svg}
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            tabindex="0"
            aria-label={editingGuide
              ? 'Guide editor. Arrow keys move, plus and minus resize, Escape finishes editing.'
              : 'Handwriting canvas. Paste an image to use it as a background.'}
            role="application"
            on:pointerdown={startStroke}
            on:pointermove={moveStroke}
            on:pointerup={endStroke}
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
              letter-spacing={guideSize * 0.05}
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
                  stroke="var(--ink)"
                  stroke-width="1.5"
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
                  fill="var(--ink)"
                  stroke="var(--paper)"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                  style="cursor:nwse-resize"
                />
              </g>
            {/if}
            {#if currentStroke}
              <path
                d={smoothPath(currentStroke.points, BOARD_WIDTH, BOARD_HEIGHT)}
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
            <div class="empty-prompt" aria-hidden="true">
              <Icon name="marker" size={30} />
              <p>Write something here</p>
              <small>Draw, drop an image, or paste one with Ctrl+V</small>
            </div>
          {/if}
          {#if backgroundDragActive}
            <div class="drop-prompt" aria-hidden="true">
              <strong>Drop image to trace</strong>
              <span>PNG, JPEG, or WebP</span>
            </div>
          {/if}
        </div>
      </div>
      {#if timer}
        <TimerWidget startedAt={timer.startedAt} durationMinutes={timer.durationMinutes} />
      {/if}
    </div>
  </Dropzone>
</div>

<style>
  .canvas-workspace {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .canvas-workspace.font-error {
    grid-template-rows: auto minmax(0, 1fr);
  }
  .font-warning {
    margin: 0 0 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .font-warning button {
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 5px 10px;
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
    overflow: hidden;
    border: 1.5px solid var(--line);
    border-radius: 14px 18px 13px 16px;
    background: #e2ddd0;
    box-shadow: var(--shadow-panel);
  }
  :global(.canvas-dropzone) {
    min-height: 0;
    display: grid;
  }
  .background-drag-active {
    border-color: var(--ink);
    box-shadow: 0 0 0 3px rgba(30, 36, 48, 0.15);
  }
  .paper {
    --paper: #fffdf7;
    --zoom: 1;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(var(--zoom));
    transform-origin: center;
    overflow: hidden;
    background-color: var(--paper);
    touch-action: none;
    cursor: crosshair;
    outline: none;
    box-shadow: inset 0 0 0 1px rgba(37, 48, 68, 0.04);
  }
  .drawing-layer:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
  }
  .background-image {
    position: absolute;
    z-index: 1;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }
  .paper-grain {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
    opacity: 0.23;
    background-image: radial-gradient(#9e9a8f 0.55px, transparent 0.7px);
    background-size: 7px 7px;
  }
  .paper.lines-ruled {
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0 72px,
      #b8d4e7 73px 75px,
      transparent 76px 92px
    );
  }
  .paper.lines-dotted {
    background-image: radial-gradient(circle, #a8c9df 1.5px, transparent 1.8px);
    background-size: 16px 92px;
    background-position: 0 73px;
  }
  .paper.lines-grid {
    background-image:
      linear-gradient(#cfdfeb 1px, transparent 1px),
      linear-gradient(90deg, #cfdfeb 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .drawing-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .drawing-layer {
    z-index: 4;
    user-select: none;
  }
  .empty-prompt {
    position: absolute;
    z-index: 3;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    text-align: center;
    color: #9aa0a8;
    pointer-events: none;
  }
  .empty-prompt p {
    margin: 10px 0 4px;
    font: 25px var(--hand);
    color: #65707c;
    transform: rotate(-1deg);
  }
  .empty-prompt small {
    font-size: 11px;
  }
  .drop-prompt {
    position: absolute;
    z-index: 6;
    inset: 18px;
    display: grid;
    place-content: center;
    gap: 5px;
    border: 2px dashed var(--ink);
    border-radius: var(--radius-lg);
    background: rgba(255, 253, 247, 0.92);
    color: var(--ink);
    text-align: center;
    pointer-events: none;
  }
  .drop-prompt strong {
    font-size: 18px;
  }
  .drop-prompt span {
    font-size: 11px;
    color: var(--muted);
  }

  @media (max-width: 1199px) {
    :global(.canvas-dropzone) {
      aspect-ratio: 12 / 7;
    }
  }
</style>
