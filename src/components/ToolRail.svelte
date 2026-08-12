<script lang="ts">
  import { INK_COLOURS } from '../lib/constants';
  import type { PenType } from '../lib/types';
  import Icon from './Icon.svelte';

  export let penType: PenType;
  export let penSize: number;
  export let penColour: string;
  export let traceMode: boolean;
  export let loopMode: boolean;
</script>

<aside class="tool-rail" aria-label="Pen tools">
  <div class="rail-section">
    <span class="rail-heading">Ink</span>
    <div class="segmented" aria-label="Pen type">
      <button class:active={penType === 'marker'} on:click={() => (penType = 'marker')} title="Marker" aria-label="Marker pen">
        <Icon name="marker" size={20} />
      </button>
      <button class:active={penType === 'pencil'} on:click={() => (penType = 'pencil')} title="Pencil" aria-label="Pencil">
        <Icon name="pencil" size={20} />
      </button>
    </div>
  </div>

  <div class="rail-section">
    <span class="rail-heading">Size</span>
    <div class="size-options">
      {#each [3, 6, 10] as size}
        <button
          class:active={penSize === size}
          on:click={() => (penSize = size)}
          aria-label={`${size === 3 ? 'Small' : size === 6 ? 'Medium' : 'Large'} pen`}
        ><span style={`width:${size + 3}px;height:${size + 3}px`}></span></button>
      {/each}
    </div>
  </div>

  <div class="rail-section">
    <span class="rail-heading">Colour</span>
    <div class="colour-grid">
      {#each INK_COLOURS as colour}
        <button
          class:active={penColour === colour}
          style={`--swatch:${colour}`}
          on:click={() => (penColour = colour)}
          aria-label={`Use ${colour} ink`}
        ></button>
      {/each}
    </div>
  </div>

  <div class="rail-section mode-section">
    <span class="rail-heading">Modes</span>
    <button class="mode-button" class:active={traceMode} on:click={() => (traceMode = !traceMode)}>
      <Icon name="trace" /><span>Trace</span>
    </button>
    <button class="mode-button" class:active={loopMode} on:click={() => (loopMode = !loopMode)}>
      <Icon name="loop" /><span>Loop</span>
    </button>
  </div>
</aside>

<style>
  .tool-rail {
    min-height: 0;
    padding: 14px 12px;
    overflow: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-panel);
  }
  .rail-section + .rail-section { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px; }
  .rail-heading {
    display: block;
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 10px;
    line-height: 1;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .segmented { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .segmented button, .size-options button {
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    background: var(--paper);
    border-radius: 8px;
    min-height: 38px;
    cursor: pointer;
  }
  .segmented button:hover, .size-options button:hover { border-color: var(--ink); }
  .segmented button.active, .size-options button.active {
    color: #fff;
    border-color: var(--ink);
    background: var(--ink);
  }
  .size-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
  .size-options span { display: block; border-radius: 50%; background: currentColor; }
  .colour-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
  .colour-grid button {
    aspect-ratio: 1;
    border: 0;
    border-radius: 50%;
    background: var(--swatch);
    box-shadow: inset 0 0 0 1px rgba(30, 36, 48, 0.12);
    cursor: pointer;
  }
  .colour-grid button:hover { transform: scale(1.06); }
  .colour-grid button.active { box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--ink); }
  .mode-section { display: grid; gap: 7px; }
  .mode-section .rail-heading { grid-column: 1 / -1; }
  .mode-button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: 1px solid var(--line);
    background: var(--paper);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
    color: var(--ink);
  }
  .mode-button:hover { border-color: var(--ink); }
  .mode-button.active { background: var(--ink); border-color: var(--ink); color: #fff; }

  @media (max-width: 620px) {
    .tool-rail { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 9px; }
    .rail-section + .rail-section { border: 0; margin: 0; padding: 0; }
    .mode-section { grid-template-columns: 1fr 1fr; }
  }
</style>
