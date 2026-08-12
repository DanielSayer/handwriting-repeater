<script lang="ts">
  import { onMount, tick } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import BoardCanvas from './components/BoardCanvas.svelte';
  import GuideDialog from './components/GuideDialog.svelte';
  import PageRail from './components/PageRail.svelte';
  import PlaybackBar from './components/PlaybackBar.svelte';
  import ToolRail from './components/ToolRail.svelte';
  import { DEFAULT_BOARD_STATE } from './lib/constants';
  import { prepareBackgroundImage } from './lib/backgroundImage';
  import { downloadBoardPng } from './lib/exportBoard';
  import {
    createReplaySchedule,
    playbackRateForSpeed,
    replayDuration as getReplayDuration
  } from './lib/replay';
  import { loadBoard, saveBoard } from './lib/storage';
  import type {
    BoardBackground,
    BoardStroke,
    LineStyle,
    PenType,
    PersistedBoardState
  } from './lib/types';

  let hydrated = false;
  let strokes: BoardStroke[] = [];
  let backgroundImage: BoardBackground | null = DEFAULT_BOARD_STATE.backgroundImage;
  let backgroundOpacity = DEFAULT_BOARD_STATE.backgroundOpacity;
  let backgroundLoading = false;
  let backgroundError = '';
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

  $: playbackRate = playbackRateForSpeed(speed);
  $: replayDuration = getReplayDuration(createReplaySchedule(strokes, playbackRate));
  $: persistedState = {
    strokes,
    backgroundImage,
    backgroundOpacity,
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
  $: if (hydrated) {
    try {
      saveBoard(persistedState);
    } catch {
      /* Large browser-local boards may exceed the storage quota. */
    }
  }

  onMount(() => {
    try {
      const saved = loadBoard();
      if (saved) restoreBoard(saved);
    } catch {
      /* Invalid saved data falls back to the default board. */
    }
    hydrated = true;
    return () => clearTimeout(replayTimer);
  });

  function restoreBoard(saved: Partial<PersistedBoardState>): void {
    strokes = saved.strokes ?? strokes;
    backgroundImage = saved.backgroundImage ?? backgroundImage;
    backgroundOpacity = saved.backgroundOpacity ?? backgroundOpacity;
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
  }

  function undo(): void {
    const stroke = strokes.at(-1);
    if (!stroke) return;
    redoStack = [...redoStack, stroke];
    strokes = strokes.slice(0, -1);
  }

  function redo(): void {
    const stroke = redoStack.at(-1);
    if (!stroke) return;
    strokes = [...strokes, stroke];
    redoStack = redoStack.slice(0, -1);
  }

  function clearBoard(): void {
    if (!strokes.length && !guideText) return;
    strokes = [];
    redoStack = [];
    guideText = '';
    stopReplay();
  }

  function stopReplay(): void {
    clearTimeout(replayTimer);
    replaying = false;
  }

  async function replay(): Promise<void> {
    if (!strokes.length) {
      return;
    }

    stopReplay();
    await tick();
    replayNonce += 1;
    replaying = true;

    replayTimer = setTimeout(
      () => {
        replaying = false;
        if (loopMode) void replay();
      },
      replayDuration * 1000 + 80
    );
  }

  function placeGuide(text: string, rows: number, size: number): void {
    guideText = text;
    repeatCount = Math.max(1, Math.min(8, rows));
    guideSize = size;
    guideDialogOpen = false;
  }

  async function setBackground(file: File): Promise<void> {
    backgroundLoading = true;
    backgroundError = '';

    try {
      backgroundImage = await prepareBackgroundImage(file);
    } catch (error) {
      backgroundError = error instanceof Error ? error.message : 'That image could not be added.';
    } finally {
      backgroundLoading = false;
    }
  }

  function removeBackground(): void {
    backgroundImage = null;
    backgroundError = '';
  }

  async function exportBoard(): Promise<void> {
    try {
      await downloadBoardPng({
        strokes,
        backgroundImage,
        backgroundOpacity,
        boardWidth,
        boardHeight,
        pageColour,
        lineStyle,
        guideText,
        repeatCount,
        guideSize
      });
    } catch {
      /* Export is best-effort when browser canvas APIs are unavailable. */
    }
  }
</script>

<svelte:head>
  <title>Repeat — handwriting whiteboard</title>
</svelte:head>

<div class="app-shell">
  <AppHeader />
  <main class="workspace">
    <ToolRail
      bind:penType
      bind:penSize
      bind:penColour
      bind:traceMode
      bind:loopMode
      canUndo={strokes.length > 0}
      canRedo={redoStack.length > 0}
      canClear={strokes.length > 0 || Boolean(guideText)}
      onUndo={undo}
      onRedo={redo}
      onClear={clearBoard}
    />

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
        {playbackRate}
        {guideText}
        {repeatCount}
        {guideSize}
        {backgroundImage}
        {backgroundOpacity}
        onStrokeComplete={addStroke}
        onResize={(width, height) => {
          boardWidth = width;
          boardHeight = height;
        }}
        onBackgroundSelected={(file) => void setBackground(file)}
        onBackgroundError={(message) => (backgroundError = message)}
      />
      <PlaybackBar bind:zoom bind:speed {replaying} onReplay={replay} onStop={stopReplay} />
    </section>

    <PageRail
      bind:lineStyle
      bind:pageColour
      bind:backgroundOpacity
      {backgroundImage}
      {backgroundLoading}
      {backgroundError}
      onOpenGuide={() => (guideDialogOpen = true)}
      onExport={exportBoard}
      onBackgroundSelected={(file) => void setBackground(file)}
      onRemoveBackground={removeBackground}
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
    background-color: var(--desk);
    background-image:
      radial-gradient(#d5cebd 1px, transparent 1.2px),
      linear-gradient(104deg, transparent 49.8%, rgba(255, 255, 255, 0.28) 50%, transparent 50.2%);
    background-size:
      24px 24px,
      180px 180px;
  }
  .workspace {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr) 224px;
    gap: 16px;
    padding: 16px;
  }
  .board-column {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 12px;
  }

  @media (min-width: 1400px) {
    .workspace {
      grid-template-columns: 208px minmax(0, 1fr) 272px;
      gap: 20px;
      padding: 20px;
    }
    .board-column {
      gap: 16px;
    }
  }

  @media (max-width: 900px) {
    .app-shell {
      min-height: 100vh;
      height: auto;
    }
    .workspace {
      min-height: calc(100vh - 60px);
      grid-template-columns: 104px minmax(0, 1fr);
    }
    .board-column {
      min-height: 620px;
    }
  }
  @media (max-width: 620px) {
    .workspace {
      grid-template-columns: 1fr;
      padding: 10px;
      gap: 10px;
    }
    .board-column {
      min-height: 570px;
      grid-row: 2;
    }
  }
</style>
