<script lang="ts">
  import { onMount } from 'svelte';
  import { createGuideRows, pointFromPointer, smoothPath } from '../lib/drawing';
  import type { BoardStroke, LineStyle, PenType } from '../lib/types';

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
  export let status: string;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let canClear: boolean;
  export let onStrokeComplete: (stroke: BoardStroke) => void;
  export let onResize: (width: number, height: number) => void;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onClear: () => void;

  let svg: SVGSVGElement;
  let boardShell: HTMLDivElement;
  let boardWidth = 960;
  let boardHeight = 560;
  let currentStroke: BoardStroke | null = null;
  let drawing = false;

  $: guideRows = createGuideRows(guideText, repeatCount);

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      boardWidth = Math.max(320, entry.contentRect.width);
      boardHeight = Math.max(360, entry.contentRect.height);
      onResize(boardWidth, boardHeight);
    });
    observer.observe(boardShell);
    return () => observer.disconnect();
  });

  function startStroke(event: PointerEvent): void {
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
      const point = currentStroke.points[0];
      currentStroke.points = [point, { x: point.x + 0.0001, y: point.y + 0.0001 }];
    }

    onStrokeComplete(currentStroke);
    currentStroke = null;
    drawing = false;
  }
</script>

<div class="board-topline">
  <p><span class="status-dot"></span>{drawing ? 'Writing…' : status}</p>
  <div class="history-actions">
    <button on:click={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo">↶</button>
    <button on:click={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">↷</button>
    <button class="clear-action" on:click={onClear} disabled={!canClear}>Clear</button>
  </div>
</div>

<div class="board-viewport" class:trace-active={traceMode}>
  <div
    class={`paper lines-${lineStyle}`}
    style={`--paper:${pageColour};--zoom:${zoom}`}
    bind:this={boardShell}
  >
    <div class="paper-grain"></div>
    <div class="guide-layer" aria-hidden="true">
      {#each guideRows as row (row.id)}
        <span style={`top:${row.topPercent}%;font-size:${guideSize}px`}>{row.text}</span>
      {/each}
    </div>
    <svg
      class="drawing-layer"
      bind:this={svg}
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      aria-label="Handwriting canvas"
      role="img"
      on:pointerdown={startStroke}
      on:pointermove={moveStroke}
      on:pointerup={endStroke}
      on:pointercancel={endStroke}
    >
      {#key replayNonce}
        <g class:replaying>
          {#each strokes as stroke, index (stroke.id)}
            <path
              d={smoothPath(stroke.points, boardWidth, boardHeight)}
              fill="none"
              stroke={stroke.colour}
              stroke-width={stroke.width}
              stroke-opacity={traceMode && !drawing ? Math.min(stroke.opacity, 0.25) : stroke.opacity}
              stroke-linecap="round"
              stroke-linejoin="round"
              pathLength="1"
              style={`--delay:${index * (replayDuration / Math.max(1, strokes.length))}s;--duration:${Math.max(0.35, replayDuration / Math.max(1, strokes.length) + 0.35)}s`}
            />
          {/each}
        </g>
      {/key}
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
    {#if !strokes.length && !guideText}
      <div class="empty-prompt" aria-hidden="true">
        <span>✎</span>
        <p>Write something here</p>
        <small>Mouse, touch, and stylus all work</small>
      </div>
    {/if}
  </div>
</div>

<style>
  .board-topline { display: flex; justify-content: space-between; align-items: center; padding: 0 8px; }
  .board-topline p { margin: 0; color: #697282; font-size: 12px; }
  .status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: var(--green); }
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
  }
  .paper-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.23; background-image: radial-gradient(#9e9a8f 0.55px, transparent 0.7px); background-size: 7px 7px; }
  .paper.lines-ruled { background-image: repeating-linear-gradient(to bottom, transparent 0 72px, #b8d4e7 73px 75px, transparent 76px 92px); }
  .paper.lines-dotted { background-image: radial-gradient(circle, #a8c9df 1.5px, transparent 1.8px); background-size: 16px 92px; background-position: 0 73px; }
  .paper.lines-grid { background-image: linear-gradient(#cfdfeb 1px, transparent 1px), linear-gradient(90deg, #cfdfeb 1px, transparent 1px); background-size: 48px 48px; }
  .drawing-layer, .guide-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
  .drawing-layer { z-index: 3; }
  .guide-layer { z-index: 2; pointer-events: none; }
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
  .empty-prompt { position: absolute; z-index: 1; inset: 0; display: grid; place-content: center; text-align: center; color: #98a0a4; pointer-events: none; }
  .empty-prompt > span { font-size: 38px; transform: rotate(-10deg); }
  .empty-prompt p { margin: 7px 0 3px; font: 26px "Comic Sans MS", "Segoe Print", cursive; color: #747d84; }
  .empty-prompt small { font-size: 11px; }
  .replaying path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-stroke var(--duration) ease-out var(--delay) forwards; }
  @keyframes draw-stroke { to { stroke-dashoffset: 0; } }
</style>
