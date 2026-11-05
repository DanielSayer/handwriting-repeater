<script lang="ts">
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';
  import { INK_COLOURS, PEN_SIZES, SPEED_OPTIONS } from '../lib/constants';
  import { playbackRateForSpeed } from '../lib/replay';
  import type { PenType } from '../lib/types';

  export let penType: PenType;
  export let penSize: number;
  export let penColour: string;
  export let traceMode: boolean;
  export let loopMode: boolean;
  export let speed: number;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let canClear: boolean;
  export let canReplay: boolean;
  export let replaying: boolean;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onClear: () => void;
  export let onReplay: () => void;
  export let onStop: () => void;

  let speedOpen = false;

  $: speedLabel =
    SPEED_OPTIONS.find((option) => option.value === speed)?.label ??
    `${playbackRateForSpeed(speed).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;

  function setSpeed(value: number): void {
    speed = value;
    speedOpen = false;
    onStop();
  }
</script>

<div class="tray" role="toolbar" aria-label="Pens and replay">
  <div class="grp">
    <button class="btn icon" on:click={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo">
      <Icon name="undo" />
    </button>
    <button class="btn icon" on:click={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">
      <Icon name="redo" />
    </button>
  </div>

  <div class="grp" role="group" aria-label="Pen">
    <button
      class="btn icon"
      class:sel={penType === 'marker'}
      aria-pressed={penType === 'marker'}
      on:click={() => (penType = 'marker')}
      aria-label="Marker"
      title="Marker"
    >
      <Icon name="marker" />
    </button>
    <button
      class="btn icon"
      class:sel={penType === 'pencil'}
      aria-pressed={penType === 'pencil'}
      on:click={() => (penType = 'pencil')}
      aria-label="Pencil"
      title="Pencil"
    >
      <Icon name="pencil" />
    </button>
  </div>

  <div class="grp" role="group" aria-label="Colour">
    {#each INK_COLOURS as colour (colour.value)}
      <button
        class="cw"
        aria-pressed={penColour === colour.value}
        on:click={() => (penColour = colour.value)}
        aria-label={colour.name}
        title={colour.name}
      >
        <span class="swatch" class:on={penColour === colour.value} style={`--c:${colour.value}`}
        ></span>
      </button>
    {/each}
  </div>

  <div class="grp" role="group" aria-label="Pen size">
    {#each PEN_SIZES as size (size.value)}
      <button
        class="btn icon"
        class:sel={penSize === size.value}
        aria-pressed={penSize === size.value}
        on:click={() => (penSize = size.value)}
        aria-label={size.name}
        title={size.name}
      >
        <span class="dot" style={`--d:${size.value + 4}px`}></span>
      </button>
    {/each}
  </div>

  <button class="btn" on:click={onClear} disabled={!canClear} title="Wipe the board clean">
    <Icon name="eraser" /><span class="lbl">Wipe</span>
  </button>

  <span class="grow"></span>

  <div class="grp replay">
    <button
      class="btn tog"
      class:on={traceMode}
      aria-pressed={traceMode}
      on:click={() => (traceMode = !traceMode)}
      title="Ghost: show a faint copy of your writing while it replays"
    >
      <Icon name="ghost" /><span class="lbl">Ghost</span>
    </button>
    <button
      class="btn tog"
      class:on={loopMode}
      aria-pressed={loopMode}
      on:click={() => (loopMode = !loopMode)}
      title="Loop: keep replaying"
    >
      <Icon name="loop" /><span class="lbl">Loop</span>
    </button>
    <Popover
      open={speedOpen}
      label="Replay speed"
      onClose={() => (speedOpen = false)}
      placement="above"
      align="end"
      width={232}
    >
      <button
        slot="trigger"
        class="btn boxed"
        aria-expanded={speedOpen}
        aria-haspopup="dialog"
        aria-label={`Replay speed ${speedLabel}`}
        title="Replay speed"
        on:click={() => (speedOpen = !speedOpen)}
      >
        <Icon name="speed" />{speedLabel}<Icon name="chev" size={14} />
      </button>
      <h2 class="pop-title">Replay speed</h2>
      <div class="speeds">
        {#each SPEED_OPTIONS as option (option.value)}
          <button
            class="btn boxed"
            class:sel={speed === option.value}
            aria-pressed={speed === option.value}
            on:click={() => setSpeed(option.value)}>{option.label}</button
          >
        {/each}
      </div>
    </Popover>
    <button
      class="btn primary"
      disabled={!canReplay && !replaying}
      on:click={() => (replaying ? onStop() : onReplay())}
    >
      <Icon name={replaying ? 'stop' : 'play'} />{replaying ? 'Stop' : 'Replay'}
    </button>
  </div>
</div>

<style>
  .tray {
    position: relative;
    z-index: 20;
    left: 50%;
    width: max-content;
    min-width: calc(100% + 12px);
    max-width: calc(100vw - 16px);
    height: 64px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border-radius: 0 0 8px 8px;
    background: #f5f6f8;
    box-shadow:
      0 2px 6px rgba(29, 36, 51, 0.12),
      0 0 0 1px rgba(29, 36, 51, 0.05);
    transform: translateX(-50%);
  }
  .grp {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .replay {
    gap: 8px;
  }
  .grow {
    flex: 1;
  }
  .cw {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: none;
    cursor: pointer;
  }
  .cw:hover {
    background: var(--hover);
  }
  .swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }
  .swatch.on {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 0 0 2px #f5f6f8,
      0 0 0 4px var(--c);
  }
  .dot {
    width: var(--d);
    height: var(--d);
    border-radius: 50%;
    background: currentColor;
  }
  .speeds {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .speeds .btn {
    padding: 0;
  }

  @media (max-width: 1199px) {
    .lbl {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .tray > .btn,
    .replay .tog {
      padding: 0;
    }
  }
  @media (max-width: 959px) {
    .tray {
      left: 0;
      width: 100%;
      min-width: 0;
      max-width: none;
      height: auto;
      flex-wrap: wrap;
      justify-content: center;
      padding: 8px;
      transform: none;
    }
    .grow {
      display: none;
    }
  }
</style>
