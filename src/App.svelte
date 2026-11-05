<script lang="ts">
  import { onMount, tick } from 'svelte';
  import BoardCanvas from './components/BoardCanvas.svelte';
  import BoardPersistence from './components/BoardPersistence.svelte';
  import GuideDialog from './components/GuideDialog.svelte';
  import Icon from './components/Icon.svelte';
  import TopBar from './components/TopBar.svelte';
  import Tray from './components/Tray.svelte';
  import { captureEvent, captureException } from './lib/analytics';
  import { DEFAULT_BOARD_STATE, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './lib/constants';
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
  let guideLayout = DEFAULT_BOARD_STATE.guideLayout;
  let guideFont = DEFAULT_BOARD_STATE.guideFont;
  let editingGuide = false;
  let boardWidth = 960;
  let boardHeight = 560;
  let replaying = false;
  let replayNonce = 0;
  let replayTimer: ReturnType<typeof setTimeout> | undefined;
  let guideDialogOpen = false;
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
    guideSize,
    guideLayout,
    guideFont
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
    guideLayout = saved.guideLayout ?? null;
    guideFont = saved.guideFont ?? guideFont;
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
    editingGuide = false;
    guideLayout = null;
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
    editingGuide = false;
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
    if (!hadGuide)
      guideLayout = {
        x: 67.2,
        y: 74,
        rowSpacing: lineStyle === 'grid' ? 48 : 92
      };
    editingGuide = Boolean(text);
    if (!text) guideLayout = null;
    stopReplay();
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
      guideLayout,
      guideFont,
      playbackRate,
      traceMode,
      loopMode
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
    captureEvent('timer_started', { duration_minutes: durationMinutes });
  }

  function cancelTimer(): void {
    timer = null;
  }

  function changeZoom(direction: 1 | -1): void {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + direction * ZOOM_STEP));
  }
</script>

<svelte:head>
  <title>Handwriting Repeater: Practise, Trace &amp; Replay</title>
</svelte:head>

<div class="app-shell">
  <TopBar
    bind:lineStyle
    bind:pageColour
    bind:backgroundOpacity
    {backgroundImage}
    {backgroundLoading}
    {backgroundError}
    hasGuide={Boolean(guideText)}
    timerActive={timer !== null}
    {exporting}
    canExport={strokes.length > 0}
    onOpenGuide={() => (guideDialogOpen = true)}
    onBackgroundSelected={(file) => void setBackground(file)}
    onRemoveBackground={removeBackground}
    onStartTimer={startTimer}
    onCancelTimer={cancelTimer}
    onExport={exportBoard}
  />
  <BoardPersistence state={persistedState} onRestore={restoreBoard} />
  <main class="wrap">
    <div class="unit">
      <section class="frame" aria-label="Whiteboard">
        <div class="board">
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
            bind:guideSize
            bind:guideLayout
            {guideFont}
            bind:editingGuide
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
          {#if editingGuide}
            <div class="guide-edit" role="status">
              <Icon name="move" size={18} />
              <span>Drag to move. Drag the corner to resize.</span>
              <button class="btn sel" on:click={() => (editingGuide = false)}>Done</button>
            </div>
          {/if}
          <div class="zoom" role="group" aria-label="Zoom">
            <button
              class="btn icon"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              on:click={() => changeZoom(-1)}><Icon name="minus" size={18} /></button
            >
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button
              class="btn icon"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              on:click={() => changeZoom(1)}><Icon name="plus" size={18} /></button
            >
          </div>
        </div>
      </section>
      <div class="lip" aria-hidden="true"></div>
      <Tray
        bind:penType
        bind:penSize
        bind:penColour
        bind:traceMode
        bind:loopMode
        bind:speed
        canUndo={strokes.length > 0}
        canRedo={redoStack.length > 0}
        canClear={strokes.length > 0 || Boolean(guideText)}
        canReplay={strokes.length > 0}
        {replaying}
        onUndo={undo}
        onRedo={redo}
        onClear={clearBoard}
        onReplay={() => void replay()}
        onStop={stopReplay}
      />
    </div>
  </main>
  {#if exportError}
    <div class="toast" role="alert">
      <span>{exportError}</span>
      <button class="btn icon" aria-label="Dismiss" on:click={() => (exportError = '')}
        ><Icon name="close" size={18} /></button
      >
    </div>
  {/if}
</div>

{#if guideDialogOpen}
  <GuideDialog
    bind:guideFont
    {guideText}
    {repeatCount}
    {guideSize}
    onClose={() => (guideDialogOpen = false)}
    onPlace={placeGuide}
    onAdjust={() => {
      guideDialogOpen = false;
      stopReplay();
      editingGuide = true;
    }}
  />
{/if}

<style>
  .app-shell {
    height: 100vh;
    display: grid;
    grid-template-rows: 56px minmax(0, 1fr);
    padding: 0 16px 12px;
    background: var(--wall);
  }
  /* Fit the framed 12:7 board plus its 72px lip and tray into the space that is left. */
  .wrap {
    min-height: 0;
    display: grid;
    place-items: center;
    container-type: size;
  }
  .unit {
    --w: min(calc(100cqw - 16px), calc((100cqh - 14px - 72px) * 12 / 7));
    width: calc(var(--w) + 16px);
  }
  .frame {
    padding: 8px 8px 6px;
    border-radius: 12px 12px 3px 3px;
    background: linear-gradient(#dce1e6, #c4cbd3);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      inset 0 -1px 0 rgba(0, 0, 0, 0.08),
      0 1px 2px rgba(29, 36, 51, 0.14),
      0 8px 24px rgba(29, 36, 51, 0.08);
  }
  .board {
    position: relative;
    width: var(--w);
    aspect-ratio: 12 / 7;
    display: grid;
  }
  .lip {
    height: 8px;
    margin: 0 -6px;
    border-radius: 0 0 4px 4px;
    background: linear-gradient(#b9c1ca, #d3d9df);
    box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.18);
  }
  .zoom {
    position: absolute;
    z-index: 8;
    right: 12px;
    bottom: 12px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
    color: var(--muted);
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .zoom span {
    min-width: 42px;
    text-align: center;
  }
  .guide-edit {
    position: absolute;
    z-index: 8;
    top: 12px;
    left: 50%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 4px 4px 14px;
    border-radius: 14px;
    background: #fff;
    box-shadow: var(--shadow-pop);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    transform: translateX(-50%);
  }
  .toast {
    position: fixed;
    z-index: 40;
    top: 64px;
    left: 50%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 4px 4px 16px;
    border-radius: 14px;
    background: var(--ink);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    box-shadow: var(--shadow-pop);
    transform: translateX(-50%);
  }
  .toast .btn {
    color: #fff;
  }
  .toast .btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  @media (max-width: 959px) {
    .app-shell {
      height: auto;
      min-height: 100vh;
      padding: 0 8px 12px;
    }
    .wrap {
      container-type: normal;
      align-content: start;
    }
    .unit,
    .board {
      width: 100%;
    }
    .guide-edit span {
      display: none;
    }
  }
  @media (max-width: 559px) {
    .zoom {
      display: none;
    }
  }
</style>
