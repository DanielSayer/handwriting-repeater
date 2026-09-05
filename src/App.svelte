<script lang="ts">
  import { onMount, tick } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import BoardCanvas from './components/BoardCanvas.svelte';
  import BoardPersistence from './components/BoardPersistence.svelte';
  import GuideDialog from './components/GuideDialog.svelte';
  import PageRail from './components/PageRail.svelte';
  import PlaybackBar from './components/PlaybackBar.svelte';
  import ToolRail from './components/ToolRail.svelte';
  import TimerDialog from './components/TimerDialog.svelte';
  import { captureEvent, captureException } from './lib/analytics';
  import { DEFAULT_BOARD_STATE } from './lib/constants';
  import { prepareBackgroundImage } from './lib/backgroundImage';
  import {
    createReplaySchedule,
    playbackRateForSpeed,
    replayDuration as getReplayDuration
  } from './lib/replay';
  import type {
    BoardBackground,
    BoardStroke,
    LineStyle,
    PenType,
    PersistedBoardState
  } from './lib/types';

  let strokes: BoardStroke[] = [];
  let backgroundImage: BoardBackground | null = DEFAULT_BOARD_STATE.backgroundImage;
  let backgroundOpacity = DEFAULT_BOARD_STATE.backgroundOpacity;
  let backgroundLoading = false;
  let backgroundError = '';
  let backgroundRequest = 0;
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
  let timerDialogOpen = false;
  let timer: { startedAt: number; durationMinutes: number } | null = null;
  let exporting = false;
  let exportError = '';

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
  onMount(() => {
    return () => {
      stopReplay();
      backgroundRequest += 1;
    };
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
    if (!strokes.length) {
      captureEvent('drawing_started', {
        pen_type: penType,
        has_background: backgroundImage !== null,
        has_guide: Boolean(guideText)
      });
    }
    strokes = [...strokes, stroke];
    redoStack = [];
  }

  function undo(): void {
    stopReplay();
    const stroke = strokes.at(-1);
    if (!stroke) return;
    redoStack = [...redoStack, stroke];
    strokes = strokes.slice(0, -1);
  }

  function redo(): void {
    stopReplay();
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
    replayNonce += 1;
    replaying = false;
  }

  async function replay(automaticLoop = false): Promise<void> {
    if (!strokes.length) {
      return;
    }

    stopReplay();
    const nonce = replayNonce;
    await tick();
    if (nonce !== replayNonce || !strokes.length) return;
    replaying = true;
    if (!automaticLoop) {
      captureEvent('replay_started', {
        stroke_count: strokes.length,
        duration_seconds: replayDuration,
        playback_rate: playbackRate,
        loop_enabled: loopMode,
        trace_enabled: traceMode
      });
    }

    replayTimer = setTimeout(
      () => {
        replaying = false;
        if (loopMode) void replay(true);
      },
      replayDuration * 1000 + 80
    );
  }

  function placeGuide(text: string, rows: number, size: number): void {
    const hadGuide = Boolean(guideText);
    guideText = text;
    repeatCount = Math.max(1, Math.min(8, rows));
    guideSize = size;
    guideDialogOpen = false;
    if (text) {
      captureEvent('guide_placed', {
        repeat_count: repeatCount,
        guide_size: guideSize
      });
    } else if (hadGuide) {
      captureEvent('guide_removed', {});
    }
  }

  function reportBackgroundSelectionError(message: string): void {
    backgroundError = message;
    captureEvent('background_add_failed', { file_type: 'rejected' });
  }

  async function setBackground(file: File): Promise<void> {
    const request = ++backgroundRequest;
    backgroundLoading = true;
    backgroundError = '';

    try {
      const image = await prepareBackgroundImage(file);
      if (request !== backgroundRequest) return;
      backgroundImage = image;
      captureEvent('background_added', { file_type: file.type });
    } catch (error) {
      if (request !== backgroundRequest) return;
      backgroundError = error instanceof Error ? error.message : 'That image could not be added.';
      captureEvent('background_add_failed', { file_type: file.type });
      captureException(error, 'background_add');
    } finally {
      if (request === backgroundRequest) backgroundLoading = false;
    }
  }

  function removeBackground(): void {
    backgroundRequest += 1;
    backgroundLoading = false;
    backgroundImage = null;
    backgroundError = '';
  }

  async function exportBoard(): Promise<void> {
    if (exporting) return;
    exporting = true;
    exportError = '';

    const options = {
      strokes,
      backgroundImage,
      backgroundOpacity,
      boardWidth,
      boardHeight,
      pageColour,
      lineStyle,
      guideText,
      repeatCount,
      guideSize,
      playbackRate,
      traceMode
    };
    try {
      const { downloadBoardGif } = await import('./lib/downloadBoard');
      await downloadBoardGif(options);
      captureEvent('gif_exported', {
        stroke_count: strokes.length,
        line_style: lineStyle,
        has_background: backgroundImage !== null,
        has_guide: Boolean(guideText),
        trace_enabled: traceMode,
        playback_rate: playbackRate
      });
    } catch (error) {
      exportError = 'The GIF could not be created. Try again with a shorter replay.';
      captureEvent('gif_export_failed', {
        stroke_count: strokes.length,
        has_background: backgroundImage !== null
      });
      captureException(error, 'gif_export');
    } finally {
      exporting = false;
    }
  }

  function startTimer(durationMinutes: number): void {
    timer = { startedAt: Date.now(), durationMinutes };
    timerDialogOpen = false;
    captureEvent('timer_started', { duration_minutes: durationMinutes });
  }

  function cancelTimer(): void {
    timer = null;
  }

  function handleTimerAction(): void {
    if (timer) cancelTimer();
    else timerDialogOpen = true;
  }
</script>

<svelte:head>
  <title>Repeat: Handwriting Practice and Replay Tool</title>
</svelte:head>

<div class="app-shell">
  <AppHeader />
  <BoardPersistence state={persistedState} onRestore={restoreBoard} />
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
      timerActive={timer !== null}
      onUndo={undo}
      onRedo={redo}
      onClear={clearBoard}
      onTimerClick={handleTimerAction}
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
        {timer}
        onStrokeComplete={addStroke}
        onResize={(width, height) => {
          boardWidth = width;
          boardHeight = height;
        }}
        onBackgroundSelected={(file) => void setBackground(file)}
        onBackgroundError={reportBackgroundSelectionError}
      />
      <PlaybackBar
        bind:zoom
        bind:speed
        {replaying}
        canReplay={strokes.length > 0}
        onReplay={() => void replay()}
        onStop={stopReplay}
      />
    </section>

    <PageRail
      bind:lineStyle
      bind:pageColour
      bind:backgroundOpacity
      {backgroundImage}
      {backgroundLoading}
      {backgroundError}
      {exporting}
      {exportError}
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

{#if timerDialogOpen}
  <TimerDialog onClose={() => (timerDialogOpen = false)} onStart={startTimer} />
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

  @media (max-width: 1199px) {
    .app-shell {
      min-height: 100vh;
      height: auto;
    }
    .workspace {
      min-height: calc(100vh - 60px);
      grid-template-columns: 104px minmax(0, 1fr);
    }
    .board-column {
      min-height: 0;
      align-self: center;
      grid-template-rows: auto auto;
    }
  }
  @media (max-width: 620px) {
    .workspace {
      grid-template-columns: 1fr;
      padding: 10px;
      gap: 10px;
    }
    .board-column {
      grid-row: 2;
    }
  }
</style>
