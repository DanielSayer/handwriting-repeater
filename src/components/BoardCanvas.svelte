<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Dropzone from 'svelte-file-dropzone';
  import AnimatedPen from './AnimatedPen.svelte';
  import Icon from './Icon.svelte';
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
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let canClear: boolean;
  export let onStrokeComplete: (stroke: BoardStroke) => void;
  export let onResize: (width: number, height: number) => void;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onClear: () => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onBackgroundError: (message: string) => void;

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
  let backgroundDragActive = false;

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
  <div class="board-viewport" class:trace-active={traceMode} class:background-drag-active={backgroundDragActive}>
    <div class="history-actions">
      <button on:click={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo"><Icon name="undo" /></button>
      <button on:click={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo"><Icon name="redo" /></button>
      <span class="history-divider" aria-hidden="true"></span>
      <button class="clear-action" on:click={onClear} disabled={!canClear} aria-label="Clear board" title="Clear board"><Icon name="clear" /></button>
    </div>
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
            {#if traceMode && replaying}
              <g class="trace-stroke-layer" aria-hidden="true">
                {#each strokes as stroke (stroke.id)}
                  <path
                    d={smoothPath(stroke.points, boardWidth, boardHeight)}
                    fill="none"
                    stroke="#9ca3af"
                    stroke-width={stroke.width}
                    stroke-opacity={0.42}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                {/each}
              </g>
            {/if}
            {#each strokes as stroke, index (stroke.id)}
              <path
                bind:this={replayPaths[index]}
                class="replay-path"
                d={smoothPath(stroke.points, boardWidth, boardHeight)}
                fill="none"
                stroke={stroke.colour}
                stroke-width={stroke.width}
                stroke-opacity={stroke.opacity}
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
</Dropzone>

<style>
  .board-viewport {
    position: relative;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: #e7e3d8;
    box-shadow: var(--shadow-panel);
  }
  .history-actions {
    position: absolute;
    z-index: 8;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 8px rgba(30, 36, 48, 0.08);
  }
  .history-actions button {
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    width: 32px;
    height: 32px;
    border-radius: 7px;
    cursor: pointer;
    color: var(--ink);
  }
  .history-actions button:hover:not(:disabled) { background: #f0ede4; }
  .history-actions button:disabled { opacity: 0.3; cursor: default; }
  .history-actions .clear-action { color: #b0492f; }
  .history-divider { width: 1px; height: 18px; background: var(--line); margin: 0 3px; }
  :global(.canvas-dropzone) { min-height: 0; display: grid; }
  .background-drag-active { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(30, 36, 48, 0.15); }
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
  .drawing-layer:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
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
    font-family: var(--hand);
    letter-spacing: 0.05em;
    opacity: 0.62;
  }
  .trace-active .guide-layer span { color: #8f9aa6; opacity: 0.78; }
  .empty-prompt { position: absolute; z-index: 3; inset: 0; display: grid; place-content: center; justify-items: center; text-align: center; color: #9aa0a8; pointer-events: none; }
  .empty-prompt p { margin: 10px 0 4px; font: 24px var(--hand); color: #6f7780; }
  .empty-prompt small { font-size: 11px; }
  .replaying .replay-path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-stroke var(--duration) linear var(--delay) forwards; }
  .trace-stroke-layer { pointer-events: none; }
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
  .drop-prompt strong { font-size: 18px; }
  .drop-prompt span { font-size: 11px; color: var(--muted); }
  @keyframes draw-stroke { to { stroke-dashoffset: 0; } }
</style>
