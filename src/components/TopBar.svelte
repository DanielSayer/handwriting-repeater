<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';
  import { PAPER_OPTIONS } from '../lib/constants';
  import { BACKGROUND_IMAGE_ACCEPT } from '../lib/backgroundImage';
  import type { BoardBackground, LineStyle } from '../lib/types';

  export let lineStyle: LineStyle;
  export let pageColour: string;
  export let backgroundImage: BoardBackground | null;
  export let backgroundOpacity: number;
  export let backgroundLoading: boolean;
  export let backgroundError: string;
  export let hasGuide: boolean;
  export let timerActive: boolean;
  export let exporting: boolean;
  export let canExport: boolean;
  export let onOpenGuide: () => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onRemoveBackground: () => void;
  export let onStartTimer: (minutes: number) => void;
  export let onCancelTimer: () => void;
  export let onExport: () => void;

  type Menu = 'lines' | 'paper' | 'picture' | 'timer';
  const LINE_OPTIONS: { value: LineStyle; label: string }[] = [
    { value: 'ruled', label: 'Ruled' },
    { value: 'dotted', label: 'Dots' },
    { value: 'grid', label: 'Grid' },
    { value: 'blank', label: 'Blank' }
  ];
  const TIMER_PRESETS = [1, 2, 5, 10];

  let menu: Menu | null = null;
  let fullscreen = false;
  let fullscreenSupported = false;
  let backgroundInput: HTMLInputElement;
  let customMinutes: number | undefined;
  let timerError = '';

  onMount(() => {
    fullscreenSupported = document.fullscreenEnabled;
    const sync = (): void => {
      fullscreen = document.fullscreenElement !== null;
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  });

  function toggle(next: Menu): void {
    menu = menu === next ? null : next;
    timerError = '';
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      fullscreen = document.fullscreenElement !== null;
    }
  }

  function pickBackground(): void {
    if (backgroundLoading) return;
    backgroundInput.value = '';
    backgroundInput.click();
  }

  function handleBackgroundInput(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) onBackgroundSelected(file);
  }

  function startTimer(minutes: number | undefined): void {
    if (!Number.isInteger(minutes) || (minutes ?? 0) < 1 || (minutes ?? 0) > 180) {
      timerError = 'Enter whole minutes from 1 to 180.';
      return;
    }
    onStartTimer(minutes as number);
    menu = null;
  }

  $: paperName = PAPER_OPTIONS.find((paper) => paper.value === pageColour)?.name ?? 'Custom';
</script>

<header class="topbar">
  <h1 class="logo">
    <img src="/favicon.svg" alt="" width="26" height="26" />
    <span>handwriting <b>repeater</b></span>
  </h1>

  <nav class="setup" aria-label="Board set-up">
    <button
      class="btn"
      class:tog={hasGuide}
      class:on={hasGuide}
      on:click={onOpenGuide}
      title={hasGuide ? 'Edit the guide text' : 'Type letters or words to copy'}
    >
      <Icon name="type" /><span class="lbl">Guide</span>
    </button>

    <Popover open={menu === 'lines'} label="Lines" onClose={() => (menu = null)} width={280}>
      <button
        slot="trigger"
        class="btn"
        aria-expanded={menu === 'lines'}
        aria-haspopup="dialog"
        title="Lines"
        on:click={() => toggle('lines')}
      >
        <Icon name="lines" /><span class="lbl">Lines</span>
      </button>
      <h2 class="pop-title">Lines</h2>
      <div class="opts">
        {#each LINE_OPTIONS as option (option.value)}
          <button
            class="pick opt"
            class:on={lineStyle === option.value}
            aria-pressed={lineStyle === option.value}
            on:click={() => (lineStyle = option.value)}
          >
            <span class={`thumb t-${option.value}`} style={`--c:${pageColour}`}></span>
            {option.label}
          </button>
        {/each}
      </div>
    </Popover>

    <Popover open={menu === 'paper'} label="Board colour" onClose={() => (menu = null)} width={260}>
      <button
        slot="trigger"
        class="btn"
        aria-expanded={menu === 'paper'}
        aria-haspopup="dialog"
        title={`Board colour: ${paperName}`}
        on:click={() => toggle('paper')}
      >
        <span class="chip" style={`--c:${pageColour}`}></span><span class="lbl">Board colour</span>
      </button>
      <h2 class="pop-title">Board colour</h2>
      <div class="list">
        {#each PAPER_OPTIONS as paper (paper.value)}
          <button
            class="pick bc"
            class:on={pageColour === paper.value}
            aria-pressed={pageColour === paper.value}
            on:click={() => (pageColour = paper.value)}
          >
            <span class="chip big" style={`--c:${paper.value}`}></span>{paper.name}
          </button>
        {/each}
      </div>
    </Popover>

    <Popover open={menu === 'picture'} label="Picture" onClose={() => (menu = null)} width={300}>
      <button
        slot="trigger"
        class="btn"
        class:tog={backgroundImage !== null}
        class:on={backgroundImage !== null}
        aria-expanded={menu === 'picture'}
        aria-haspopup="dialog"
        title="Add a picture to trace"
        on:click={() => toggle('picture')}
      >
        <Icon name="image" /><span class="lbl">Picture</span>
      </button>
      <h2 class="pop-title">Picture</h2>
      <input
        bind:this={backgroundInput}
        type="file"
        accept={BACKGROUND_IMAGE_ACCEPT}
        on:change={handleBackgroundInput}
        hidden
      />
      {#if backgroundImage}
        <div class="loaded">
          <img src={backgroundImage.src} alt="" />
          <span title={backgroundImage.name}>{backgroundImage.name}</span>
        </div>
        <label class="pop-label" for="picture-fade">Fade</label>
        <input
          id="picture-fade"
          type="range"
          min="0.15"
          max="1"
          step="0.05"
          bind:value={backgroundOpacity}
          aria-valuetext={`${Math.round(backgroundOpacity * 100)}% visible`}
        />
        <div class="row end">
          <button class="btn boxed" on:click={pickBackground} disabled={backgroundLoading}
            >{backgroundLoading ? 'Adding…' : 'Replace'}</button
          >
          <button class="btn boxed danger" on:click={onRemoveBackground}>Remove</button>
        </div>
      {:else}
        <button class="drop" on:click={pickBackground} disabled={backgroundLoading}>
          <Icon name="image" size={24} />
          {backgroundLoading ? 'Adding…' : 'Choose a picture'}
          <small>or drop or paste one onto the board</small>
        </button>
      {/if}
      {#if backgroundError}<p class="pop-error" role="status">{backgroundError}</p>{/if}
    </Popover>

    <Popover open={menu === 'timer'} label="Timer" onClose={() => (menu = null)} width={280}>
      <button
        slot="trigger"
        class="btn"
        class:tog={timerActive}
        class:on={timerActive}
        aria-expanded={menu === 'timer'}
        aria-haspopup="dialog"
        title="Timer"
        on:click={() => toggle('timer')}
      >
        <Icon name="timer" /><span class="lbl">Timer</span>
      </button>
      <h2 class="pop-title">Timer</h2>
      {#if timerActive}
        <p class="pop-hint">A timer is running on the board. Drag it anywhere.</p>
        <div class="row end">
          <button
            class="btn boxed danger"
            on:click={() => {
              onCancelTimer();
              menu = null;
            }}>Stop timer</button
          >
        </div>
      {:else}
        <div class="times">
          {#each TIMER_PRESETS as minutes (minutes)}
            <button class="btn boxed" on:click={() => startTimer(minutes)}>{minutes} min</button>
          {/each}
        </div>
        <form class="row" on:submit|preventDefault={() => startTimer(customMinutes)}>
          <label class="sr-only" for="timer-minutes">Minutes</label>
          <input
            id="timer-minutes"
            class="field"
            type="number"
            inputmode="numeric"
            min="1"
            max="180"
            step="1"
            placeholder="Other (min)"
            bind:value={customMinutes}
            on:input={() => (timerError = '')}
          />
          <button class="btn primary small" type="submit">Start</button>
        </form>
        {#if timerError}<p class="pop-error" role="alert">{timerError}</p>{/if}
      {/if}
    </Popover>
  </nav>

  <div class="actions">
    <button
      class="btn"
      on:click={onExport}
      disabled={exporting || !canExport}
      aria-busy={exporting}
      title="Download the replay as an animated GIF"
    >
      <Icon name="download" /><span class="lbl">{exporting ? 'Saving…' : 'Save GIF'}</span>
    </button>
    <a
      class="btn"
      href="https://tally.so/r/J9NaAz"
      target="_blank"
      rel="noopener noreferrer"
      title="Request a font, suggest a feature or report a bug (opens in a new tab)"
    >
      <Icon name="feedback" /><span class="lbl">Feedback</span>
    </a>
    <button
      class="btn icon"
      disabled={!fullscreenSupported}
      aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
      title={fullscreenSupported
        ? fullscreen
          ? 'Exit full screen'
          : 'Full screen'
        : 'Full screen is unavailable in this browser'}
      on:click={() => void toggleFullscreen()}
    >
      <Icon name={fullscreen ? 'exit-fullscreen' : 'fullscreen'} />
    </button>
  </div>
</header>

<style>
  .topbar {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 16px 0 0;
    color: var(--ink);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  .logo img {
    display: block;
  }
  .logo b {
    color: var(--blue);
    font-weight: 800;
  }
  .setup {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .chip {
    width: 18px;
    height: 18px;
    flex: none;
    border-radius: 5px;
    background: var(--c);
    box-shadow: inset 0 0 0 1.5px #b8bfc8;
  }
  .chip.big {
    width: 24px;
    height: 24px;
    border-radius: 6px;
  }
  .opts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .opt {
    display: grid;
    gap: 6px;
    justify-items: center;
    padding: 8px 6px;
    font-size: 14px;
    font-weight: 600;
  }
  .thumb {
    width: 100%;
    height: 42px;
    border-radius: 6px;
    background-color: var(--c);
    box-shadow: inset 0 0 0 1px #d6dbe1;
  }
  .t-ruled {
    background-image: repeating-linear-gradient(transparent 0 9px, #9db6d8 9px 10.5px);
  }
  .t-dotted {
    background-image: radial-gradient(#9db6d8 1.2px, transparent 1.6px);
    background-size: 7px 10px;
    background-position: 0 4px;
  }
  .t-grid {
    background-image:
      linear-gradient(#c9d6e6 1px, transparent 1px),
      linear-gradient(90deg, #c9d6e6 1px, transparent 1px);
    background-size: 10px 10px;
  }
  .list {
    display: grid;
    gap: 6px;
  }
  .bc {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    font-size: 14px;
    font-weight: 600;
  }
  .drop {
    width: 100%;
    display: grid;
    place-items: center;
    gap: 6px;
    padding: 16px;
    border: 2px dashed #b9c1cb;
    border-radius: 12px;
    background: none;
    color: var(--ink);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }
  .drop:hover:not(:disabled) {
    border-color: var(--blue);
    background: #f6f9fe;
  }
  .drop:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  .drop small {
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
  }
  .loaded {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .loaded img {
    width: 74px;
    height: 52px;
    flex: none;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }
  .loaded span {
    min-width: 0;
    overflow: hidden;
    color: var(--muted);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  .row.end {
    justify-content: flex-end;
  }
  .times {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .times .btn {
    padding: 0 6px;
    font-size: 14px;
  }
  .btn.primary.small {
    padding: 0 16px;
    font-size: 15px;
  }

  @media (max-width: 1099px) {
    .lbl {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .setup .btn,
    .actions .btn {
      padding: 0;
    }
  }
  @media (max-width: 559px) {
    .logo span {
      display: none;
    }
    .logo {
      margin-right: 6px;
    }
  }
</style>
