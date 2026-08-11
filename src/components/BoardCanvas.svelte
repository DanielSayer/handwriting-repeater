<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Dropzone from 'svelte-file-dropzone';
  import AnimatedPen from './AnimatedPen.svelte';
  import { BACKGROUND_IMAGE_ACCEPT, MAX_BACKGROUND_FILE_SIZE } from '../lib/backgroundImage';
  import { createGuideRows, pointFromPointer, smoothPath } from '../lib/drawing';
  import { createReplaySchedule } from '../lib/replay';
  import type { StrokeReplayTiming } from '../lib/replay';
  import type { BoardBackground, BoardStroke, LineStyle, PenType } from '../lib/types';

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
  export let replayDuration: number;
  export let guideText: string;
  export let repeatCount: number;
  export let guideSize: number;
  export let backgroundImage: BoardBackground | null;
  export let backgroundOpacity: number;
  export let backgroundLoading: boolean;
  export let backgroundError: string;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let canClear: boolean;
  export let onStrokeComplete: (stroke: BoardStroke) => void;
  export let onResize: (width: number, height: number) => void;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onClear: () => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onRemoveBackground: () => void;

  let svg: SVGSVGElement;
  let boardShell: HTMLDivElement;
  let boardWidth = 960;
  let boardHeight = 560;
  let currentStroke: BoardStroke | null = null;
  let drawing = false;
  let replayPaths: SVGPathElement[] = [];
  let penAnimationFrame: number | undefined;
  let penVisible = false;
  let penX = 0;
  let penY = 0;
  let penRotation = -55;
  let animatedPenColour = penColour;
  let backgroundInput: HTMLInputElement | null | undefined;
  let backgroundDragActive = false;
  let localBackgroundError = '';

  $: guideRows = createGuideRows(guideText, repeatCount);
  $: replaySchedule = createReplaySchedule(strokes, replayDuration);
  $: if (replaying) void startPenAnimation(replayNonce);
  $: if (!replaying) stopPenAnimation();

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      boardWidth = Math.max(320, entry.contentRect.width);
      boardHeight = Math.max(360, entry.contentRect.height);
      onResize(boardWidth, boardHeight);
    });
    observer.observe(boardShell);
    return () => {
      observer.disconnect();
      stopPenAnimation();
    };
  });

  async function startPenAnimation(_nonce: number): Promise<void> {
    stopPenAnimation();
    await tick();

    const startedAt = performance.now();
    const frame = (timestamp: number): void => {
      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const activeIndex = findActiveStroke(elapsedSeconds);

      if (activeIndex >= 0) updatePenPosition(activeIndex, elapsedSeconds);
      else penVisible = false;

      penAnimationFrame = requestAnimationFrame(frame);
    };
    penAnimationFrame = requestAnimationFrame(frame);
  }

  function stopPenAnimation(): void {
    if (penAnimationFrame !== undefined) cancelAnimationFrame(penAnimationFrame);
    penAnimationFrame = undefined;
    penVisible = false;
  }

  function findActiveStroke(elapsedSeconds: number): number {
    for (let index = strokes.length - 1; index >= 0; index -= 1) {
      const timing = timingFor(index);
      if (
        elapsedSeconds >= timing.delaySeconds &&
        elapsedSeconds <= timing.delaySeconds + timing.durationSeconds
      ) return index;
    }
    return -1;
  }

  function updatePenPosition(index: number, elapsedSeconds: number): void {
    const path = replayPaths[index];
    const stroke = strokes[index];
    if (!path || !stroke) return;

    const timing = timingFor(index);
    const estimatedProgress = (elapsedSeconds - timing.delaySeconds) / timing.durationSeconds;
    const renderedDashOffset = Number.parseFloat(getComputedStyle(path).strokeDashoffset);
    const progress = Math.min(1, Math.max(0,
      Number.isFinite(renderedDashOffset) ? 1 - renderedDashOffset : estimatedProgress
    ));
    const length = path.getTotalLength();
    const distance = length * progress;
    const point = path.getPointAtLength(distance);
    const nearbyPoint = path.getPointAtLength(Math.min(length, distance + Math.max(1, length * 0.01)));
    const tangentAngle = Math.atan2(nearbyPoint.y - point.y, nearbyPoint.x - point.x) * (180 / Math.PI);

    penX = point.x;
    penY = point.y;
    penRotation = -55 + Math.max(-45, Math.min(45, tangentAngle)) * 0.18;
    animatedPenColour = stroke.colour;
    penVisible = true;
  }

  function timingFor(index: number): StrokeReplayTiming {
    return replaySchedule[index] ?? { delaySeconds: 0, durationSeconds: replayDuration };
  }

  function startStroke(event: PointerEvent): void {
    svg.focus({ preventScroll: true });
    if (event.button !== 0 || replaying) return;
    svg.setPointerCapture(event.pointerId);
    drawing = true;
    currentStroke = {
      id: crypto.randomUUID(),
      colour: penColour,
      width: penSize,
      opacity: penType === 'pencil' ? 0.55 : 1,
      points: [pointFromPointer(event, svg)]
    };
  }

  function moveStroke(event: PointerEvent): void {
    if (!drawing || !currentStroke) return;
    currentStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pointFromPointer(event, svg)]
    };
  }

  function endStroke(event: PointerEvent): void {
    if (!drawing || !currentStroke) return;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);

    if (currentStroke.points.length === 1) {
      if (event.pointerType === 'mouse') {
        currentStroke = null;
        drawing = false;
        return;
      }
      const point = currentStroke.points[0];
      currentStroke.points = [point, { x: point.x + 0.0001, y: point.y + 0.0001 }];
    }

    onStrokeComplete(currentStroke);
    currentStroke = null;
    drawing = false;
  }

  function openBackgroundPicker(): void {
    if (!backgroundInput || backgroundLoading) return;
    backgroundInput.value = '';
    backgroundInput.click();
  }

  function handleBackgroundDrop(event: CustomEvent<BackgroundDropDetail>): void {
    backgroundDragActive = false;
    const file = event.detail.acceptedFiles[0];

    if (file) {
      localBackgroundError = '';
      onBackgroundSelected(file);
      return;
    }

    if (event.detail.fileRejections.length) {
      localBackgroundError = 'Choose one PNG, JPEG, or WebP image smaller than 15 MB.';
    }
  }

  function handleCanvasPaste(event: ClipboardEvent): void {
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();

    if (!file) return;
    event.preventDefault();
    localBackgroundError = '';
    onBackgroundSelected(file);
  }

</script>

<div class="board-topline">
  <div class="background-actions">
    <button
      class="background-button"
      on:click={openBackgroundPicker}
      disabled={backgroundLoading}
      title="Choose an image, or drag one onto the canvas"
    >
      <span aria-hidden="true">▧</span>
      {backgroundLoading ? 'Adding…' : backgroundImage ? 'Replace background' : 'Add background'}
    </button>
    {#if backgroundImage}
      <label class="opacity-control" title="Background opacity">
        <span>Fade</span>
        <input
          type="range"
          min="0.15"
          max="1"
          step="0.05"
          bind:value={backgroundOpacity}
          aria-label="Background opacity"
        />
      </label>
      <button class="remove-background" on:click={onRemoveBackground} aria-label="Remove background" title="Remove background">×</button>
    {/if}
    {#if backgroundError || localBackgroundError}
      <span class="background-error" role="status" title={backgroundError || localBackgroundError}>Image could not be added</span>
    {/if}
  </div>
  <div class="history-actions">
    <button on:click={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo">↶</button>
    <button on:click={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">↷</button>
    <button class="clear-action" on:click={onClear} disabled={!canClear}>Clear</button>
  </div>
</div>

<Dropzone
  accept={BACKGROUND_IMAGE_ACCEPT}
  maxSize={MAX_BACKGROUND_FILE_SIZE}
  multiple={false}
  noClick={true}
  noKeyboard={true}
  disableDefaultStyles={true}
  containerClasses="canvas-dropzone"
  bind:inputElement={backgroundInput}
  on:drop={handleBackgroundDrop}
  on:dragenter={() => (backgroundDragActive = true)}
  on:dragleave={() => (backgroundDragActive = false)}
  role="presentation"
  tabindex="-1"
>
  <div class="board-viewport" class:trace-active={traceMode} class:background-drag-active={backgroundDragActive}>
    <div
      class={`paper lines-${lineStyle}`}
      style={`--paper:${pageColour};--zoom:${zoom}`}
      bind:this={boardShell}
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
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        tabindex="0"
        aria-label="Handwriting canvas. Paste an image to use it as a background."
        role="application"
        on:pointerdown={startStroke}
        on:pointermove={moveStroke}
        on:pointerup={endStroke}
        on:pointercancel={endStroke}
        on:paste={handleCanvasPaste}
      >
        {#key replayNonce}
          <g class:replaying>
            {#each strokes as stroke, index (stroke.id)}
              <path
                bind:this={replayPaths[index]}
                class="replay-path"
                d={smoothPath(stroke.points, boardWidth, boardHeight)}
                fill="none"
                stroke={stroke.colour}
                stroke-width={stroke.width}
                stroke-opacity={traceMode && !drawing ? Math.min(stroke.opacity, 0.25) : stroke.opacity}
                stroke-linecap="round"
                stroke-linejoin="round"
                pathLength="1"
                style={`--delay:${timingFor(index).delaySeconds}s;--duration:${timingFor(index).durationSeconds}s`}
              />
            {/each}
          </g>
        {/key}
        {#if penVisible}
          <AnimatedPen
            x={penX}
            y={penY}
            rotation={penRotation}
            colour={animatedPenColour}
            scale={Math.max(0.72, Math.min(1.05, boardWidth / 950))}
          />
        {/if}
        {#if currentStroke}
          <path
            d={smoothPath(currentStroke.points, boardWidth, boardHeight)}
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
          <span>✎</span>
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
</Dropzone>

<style>
  .board-topline { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 0 8px; }
  .background-actions { min-width: 0; display: flex; align-items: center; gap: 7px; }
  .background-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 9px;
    border: 1px dashed #b9b2a5;
    border-radius: 9px;
    background: #fffdf8;
    color: #4f5965;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .background-button:hover:not(:disabled) { border-color: #3569e8; color: #24589b; background: #f3f7ff; }
  .background-button:disabled { opacity: 0.55; cursor: wait; }
  .background-button > span { font-size: 16px; }
  .opacity-control { display: flex; align-items: center; gap: 5px; color: #717987; font-size: 10px; font-weight: 700; }
  .opacity-control input { width: 72px; accent-color: #3569e8; }
  .remove-background { border: 0; background: transparent; color: #8b4f43; font-size: 18px; line-height: 1; cursor: pointer; }
  .background-error { max-width: 125px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #a33f2d; font-size: 10px; }
  .history-actions { display: flex; gap: 5px; }
  .history-actions button {
    border: 0;
    background: transparent;
    min-width: 32px;
    height: 30px;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 700;
  }
  .history-actions button:hover:not(:disabled) { background: #e3dfd5; }
  .history-actions button:disabled { opacity: 0.3; cursor: default; }
  .history-actions .clear-action { color: #b34f3b; padding: 0 8px; font-size: 12px; }
  .board-viewport {
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid #ccc7bc;
    border-radius: 20px 17px 22px 16px;
    background: #d9d5cb;
    box-shadow: 0 9px 24px rgba(41, 45, 51, 0.13), inset 0 0 0 5px rgba(255,255,255,0.28);
  }
  :global(.canvas-dropzone) { min-height: 0; display: grid; }
  .background-drag-active { border-color: #3569e8; box-shadow: 0 0 0 4px rgba(53, 105, 232, 0.16); }
  .paper {
    --paper: #fffdf7;
    --zoom: 1;
    position: relative;
    width: calc(100% / var(--zoom));
    height: calc(100% / var(--zoom));
    min-width: 100%;
    min-height: 100%;
    transform: scale(var(--zoom));
    transform-origin: center;
    overflow: hidden;
    background-color: var(--paper);
    touch-action: none;
    cursor: crosshair;
    outline: none;
  }
  .drawing-layer:focus-visible { outline: 3px solid rgba(53, 105, 232, 0.5); outline-offset: -3px; }
  .background-image { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; }
  .paper-grain { position: absolute; z-index: 2; inset: 0; pointer-events: none; opacity: 0.23; background-image: radial-gradient(#9e9a8f 0.55px, transparent 0.7px); background-size: 7px 7px; }
  .paper.lines-ruled { background-image: repeating-linear-gradient(to bottom, transparent 0 72px, #b8d4e7 73px 75px, transparent 76px 92px); }
  .paper.lines-dotted { background-image: radial-gradient(circle, #a8c9df 1.5px, transparent 1.8px); background-size: 16px 92px; background-position: 0 73px; }
  .paper.lines-grid { background-image: linear-gradient(#cfdfeb 1px, transparent 1px), linear-gradient(90deg, #cfdfeb 1px, transparent 1px); background-size: 48px 48px; }
  .drawing-layer, .guide-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
  .drawing-layer { z-index: 4; }
  .guide-layer { z-index: 3; pointer-events: none; }
  .guide-layer span {
    position: absolute;
    left: 7%;
    max-width: 86%;
    overflow: hidden;
    white-space: nowrap;
    transform: translateY(-50%);
    color: #a7b0b8;
    font-family: "Comic Sans MS", "Segoe Print", cursive;
    letter-spacing: 0.05em;
    opacity: 0.62;
  }
  .trace-active .guide-layer span { color: #8f9aa6; opacity: 0.78; }
  .empty-prompt { position: absolute; z-index: 3; inset: 0; display: grid; place-content: center; text-align: center; color: #98a0a4; pointer-events: none; }
  .empty-prompt > span { font-size: 38px; transform: rotate(-10deg); }
  .empty-prompt p { margin: 7px 0 3px; font: 26px "Comic Sans MS", "Segoe Print", cursive; color: #747d84; }
  .empty-prompt small { font-size: 11px; }
  .replaying path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-stroke var(--duration) linear var(--delay) forwards; }
  .drop-prompt {
    position: absolute;
    z-index: 6;
    inset: 18px;
    display: grid;
    place-content: center;
    gap: 5px;
    border: 3px dashed #3569e8;
    border-radius: 17px;
    background: rgba(243, 247, 255, 0.92);
    color: #24589b;
    text-align: center;
    pointer-events: none;
  }
  .drop-prompt strong { font-size: 20px; }
  .drop-prompt span { font-size: 11px; }
  @keyframes draw-stroke { to { stroke-dashoffset: 0; } }

  @media (max-width: 760px) {
    .opacity-control span, .background-error { display: none; }
    .opacity-control input { width: 54px; }
    .background-button { max-width: 132px; overflow: hidden; white-space: nowrap; }
  }
</style>
