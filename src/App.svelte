<script lang="ts">
  import { onMount, tick } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import BoardCanvas from './components/BoardCanvas.svelte';
  import GuideDialog from './components/GuideDialog.svelte';
  import PageRail from './components/PageRail.svelte';
  import PlaybackBar from './components/PlaybackBar.svelte';
  import ToolRail from './components/ToolRail.svelte';
  import { DEFAULT_BOARD_STATE } from './lib/constants';
  import { downloadBoardPng } from './lib/exportBoard';
  import { loadBoard, saveBoard } from './lib/storage';
  import type { BoardStroke, LineStyle, PenType, PersistedBoardState } from './lib/types';

  let hydrated = false;
  let strokes: BoardStroke[] = [];
  let redoStack: BoardStroke[] = [];
  let penColour = DEFAULT_BOARD_STATE.penColour;
  let penSize = DEFAULT_BOARD_STATE.penSize;
  let penType: PenType = DEFAULT_BOARD_STATE.penType;
  let pageColour = DEFAULT_BOARD_STATE.pageColour;
  let lineStyle: LineStyle = DEFAULT_BOARD_STATE.lineStyle;
  let zoom = DEFAULT_BOARD_STATE.zoom;
  let speed = DEFAULT_BOARD_STATE.speed;
  let loopMode = DEFAULT_BOARD_STATE.loopMode;
  let traceMode = DEFAULT_BOARD_STATE.traceMode;
  let guideText = DEFAULT_BOARD_STATE.guideText;
  let repeatCount = DEFAULT_BOARD_STATE.repeatCount;
  let guideSize = DEFAULT_BOARD_STATE.guideSize;
  let boardWidth = 960;
  let boardHeight = 560;
  let replaying = false;
  let replayNonce = 0;
  let replayTimer: ReturnType<typeof setTimeout> | undefined;
  let guideDialogOpen = false;
  let status = 'Ready to write';

  $: replayDuration = Math.max(0.7, 4.6 - speed * 0.65);
  $: persistedState = {
    strokes,
    penColour,
    penSize,
    penType,
    pageColour,
    lineStyle,
    zoom,
    speed,
    loopMode,
    traceMode,
    guideText,
    repeatCount,
    guideSize
  } satisfies PersistedBoardState;
  $: if (hydrated) saveBoard(persistedState);

  onMount(() => {
    try {
      const saved = loadBoard();
      if (saved) restoreBoard(saved);
    } catch {
      status = 'Started a fresh board';
    }
    hydrated = true;
    return () => clearTimeout(replayTimer);
  });

  function restoreBoard(saved: Partial<PersistedBoardState>): void {
    strokes = saved.strokes ?? strokes;
    penColour = saved.penColour ?? penColour;
    penSize = saved.penSize ?? penSize;
    penType = saved.penType ?? penType;
    pageColour = saved.pageColour ?? pageColour;
    lineStyle = saved.lineStyle ?? lineStyle;
    zoom = saved.zoom ?? zoom;
    speed = saved.speed ?? speed;
    loopMode = saved.loopMode ?? loopMode;
    traceMode = saved.traceMode ?? traceMode;
    guideText = saved.guideText ?? guideText;
    repeatCount = saved.repeatCount ?? repeatCount;
    guideSize = saved.guideSize ?? guideSize;
  }

  function addStroke(stroke: BoardStroke): void {
    strokes = [...strokes, stroke];
    redoStack = [];
    status = 'Saved in this browser';
  }

  function undo(): void {
    const stroke = strokes.at(-1);
    if (!stroke) return;
    redoStack = [...redoStack, stroke];
    strokes = strokes.slice(0, -1);
    status = 'Last stroke undone';
  }

  function redo(): void {
    const stroke = redoStack.at(-1);
    if (!stroke) return;
    strokes = [...strokes, stroke];
    redoStack = redoStack.slice(0, -1);
    status = 'Stroke restored';
  }

  function clearBoard(): void {
    if (!strokes.length && !guideText) return;
    strokes = [];
    redoStack = [];
    guideText = '';
    stopReplay();
    status = 'Board cleared';
  }

  function stopReplay(): void {
    clearTimeout(replayTimer);
    replaying = false;
  }

  async function replay(): Promise<void> {
    if (!strokes.length) {
      status = 'Add a few strokes first';
      return;
    }

    stopReplay();
    await tick();
    replayNonce += 1;
    replaying = true;
    status = loopMode ? 'Looping your handwriting' : 'Replaying your handwriting';

    replayTimer = setTimeout(() => {
      replaying = false;
      if (loopMode) void replay();
      else status = 'Replay complete';
    }, replayDuration * 1000 + 320);
  }

  function placeGuide(text: string, rows: number, size: number): void {
    guideText = text;
    repeatCount = Math.max(1, Math.min(8, rows));
    guideSize = size;
    guideDialogOpen = false;
    status = guideText ? 'Guide placed — trace away' : 'Guide removed';
  }

  function exportBoard(): void {
    try {
      downloadBoardPng({
        strokes,
        boardWidth,
        boardHeight,
        pageColour,
        lineStyle,
        guideText,
        repeatCount,
        guideSize
      });
      status = 'PNG saved locally';
    } catch {
      status = 'This browser could not save the board';
    }
  }
</script>

<svelte:head>
  <title>Repeat — handwriting whiteboard</title>
</svelte:head>

<div class="app-shell">
  <AppHeader />
  <main class="workspace">
    <ToolRail bind:penType bind:penSize bind:penColour bind:traceMode bind:loopMode />

    <section class="board-column" aria-label="Drawing workspace">
      <BoardCanvas
        {strokes}
        {penColour}
        {penSize}
        {penType}
        {pageColour}
        {lineStyle}
        {zoom}
        {traceMode}
        {replaying}
        {replayNonce}
        {replayDuration}
        {guideText}
        {repeatCount}
        {guideSize}
        {status}
        canUndo={strokes.length > 0}
        canRedo={redoStack.length > 0}
        canClear={strokes.length > 0 || Boolean(guideText)}
        onStrokeComplete={addStroke}
        onResize={(width, height) => { boardWidth = width; boardHeight = height; }}
        onUndo={undo}
        onRedo={redo}
        onClear={clearBoard}
      />
      <PlaybackBar bind:zoom bind:speed {replaying} onReplay={replay} onStop={stopReplay} />
    </section>

    <PageRail
      bind:lineStyle
      bind:pageColour
      onOpenGuide={() => (guideDialogOpen = true)}
      onExport={exportBoard}
    />
  </main>
</div>

{#if guideDialogOpen}
  <GuideDialog
    {guideText}
    {repeatCount}
    {guideSize}
    onClose={() => (guideDialogOpen = false)}
    onPlace={placeGuide}
  />
{/if}

<style>
  .app-shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f4f1e8;
    background-image: radial-gradient(#d4cfc3 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .workspace {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: 144px minmax(0, 1fr) 210px;
    gap: 14px;
    padding: 14px;
  }
  .board-column {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr) 66px;
  }

  @media (max-width: 900px) {
    .app-shell { min-height: 100vh; height: auto; }
    .workspace { min-height: calc(100vh - 78px); grid-template-columns: 94px minmax(0, 1fr); }
    .board-column { min-height: 620px; }
  }
  @media (max-width: 620px) {
    .workspace { grid-template-columns: 1fr; padding: 9px; gap: 9px; }
    .board-column { min-height: 570px; grid-row: 2; }
  }
</style>
