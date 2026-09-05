<script lang="ts">
  import { onMount } from 'svelte';
  import Dropzone from 'svelte-file-dropzone';
  import StrokeLayer from './StrokeLayer.svelte';
  import Icon from './Icon.svelte';
  import TimerWidget from './TimerWidget.svelte';
  import { BACKGROUND_IMAGE_ACCEPT, MAX_BACKGROUND_FILE_SIZE } from '../lib/backgroundImage';
  import { BOARD_ASPECT_RATIO, BOARD_HEIGHT, BOARD_WIDTH } from '../lib/constants';
  import {
    createGuideRows,
    fitBoardToViewport,
    pointFromPointer,
    smoothPath
  } from '../lib/drawing';
  import type { BoardBackground, BoardStroke, LineStyle, PenType, Point } from '../lib/types';

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
  export let repeatCount: number;
  export let guideSize: number;
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

  $: guideRows = createGuideRows(guideText, repeatCount);
  $: paperSize = fitBoardToViewport(viewportWidth, viewportHeight, BOARD_ASPECT_RATIO);
  $: if (replaying) cancelStroke();

  onMount(() => {
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
    };
  });

  function startStroke(event: PointerEvent): void {
    svg.focus({ preventScroll: true });
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
    if (event.pointerId === activePointer) cancelStroke();
  }

  function endStroke(event: PointerEvent): void {
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
        <div class="guide-layer" aria-hidden="true">
          {#each guideRows as row (row.id)}
            <span style={`top:${row.topPercent}%;font-size:${guideSize}px`}>{row.text}</span>
          {/each}
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (the drawing surface needs focus for clipboard paste) -->
        <svg
          class="drawing-layer"
          bind:this={svg}
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          tabindex="0"
          aria-label="Handwriting canvas. Paste an image to use it as a background."
          role="application"
          on:pointerdown={startStroke}
          on:pointermove={moveStroke}
          on:pointerup={endStroke}
          on:pointercancel={handlePointerCancel}
          on:lostpointercapture={handlePointerCancel}
          on:paste={handleCanvasPaste}
        >
          <StrokeLayer {strokes} {traceMode} {replaying} {replayNonce} {playbackRate} />
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

<style>
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
  .drawing-layer,
  .guide-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .drawing-layer {
    z-index: 4;
  }
  .guide-layer {
    z-index: 3;
    pointer-events: none;
  }
  .guide-layer span {
    position: absolute;
    left: 7%;
    max-width: 86%;
    overflow: hidden;
    white-space: nowrap;
    transform: translateY(-50%);
    color: #a7b0b8;
    font-family: var(--hand);
    letter-spacing: 0.05em;
    opacity: 0.62;
  }
  .trace-active .guide-layer span {
    color: #8f9aa6;
    opacity: 0.78;
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
