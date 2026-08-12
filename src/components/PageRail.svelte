<script lang="ts">
  import { PAPER_OPTIONS } from '../lib/constants';
  import { BACKGROUND_IMAGE_ACCEPT } from '../lib/backgroundImage';
  import type { BoardBackground, LineStyle } from '../lib/types';
  import Icon from './Icon.svelte';

  export let lineStyle: LineStyle;
  export let pageColour: string;
  export let backgroundImage: BoardBackground | null;
  export let backgroundOpacity: number;
  export let backgroundLoading: boolean;
  export let backgroundError: string;
  export let onOpenGuide: () => void;
  export let onExport: () => void;
  export let onBackgroundSelected: (file: File) => void;
  export let onRemoveBackground: () => void;

  let backgroundInput: HTMLInputElement;

  function pickBackground(): void {
    if (backgroundLoading) return;
    backgroundInput.value = '';
    backgroundInput.click();
  }

  function handleBackgroundInput(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) onBackgroundSelected(file);
  }
</script>

<aside class="page-rail" aria-label="Page tools">
  <button class="page-tool" on:click={onOpenGuide}>
    <span class="tool-icon"><Icon name="type" /></span>
    <span><strong>Type a guide</strong><small>Add text to trace</small></span>
  </button>

  <div class="page-group">
    <span class="rail-heading">Page lines</span>
    <div class="line-options">
      <button class:active={lineStyle === 'ruled'} on:click={() => (lineStyle = 'ruled')} aria-label="Ruled lines"><i class="line-icon ruled"></i></button>
      <button class:active={lineStyle === 'dotted'} on:click={() => (lineStyle = 'dotted')} aria-label="Dotted lines"><i class="line-icon dotted"></i></button>
      <button class:active={lineStyle === 'grid'} on:click={() => (lineStyle = 'grid')} aria-label="Grid"><i class="line-icon grid"></i></button>
      <button class:active={lineStyle === 'blank'} on:click={() => (lineStyle = 'blank')} aria-label="Blank page"><i class="line-icon blank"></i></button>
    </div>
  </div>

  <div class="page-group">
    <span class="rail-heading">Paper</span>
    <div class="paper-options">
      {#each PAPER_OPTIONS as paper}
        <button
          class:active={pageColour === paper.value}
          style={`--paper-swatch:${paper.value}`}
          on:click={() => (pageColour = paper.value)}
          aria-label={paper.name}
          title={paper.name}
        ></button>
      {/each}
    </div>
  </div>

  <div class="page-group">
    <span class="rail-heading">Background</span>
    <input
      bind:this={backgroundInput}
      type="file"
      accept={BACKGROUND_IMAGE_ACCEPT}
      on:change={handleBackgroundInput}
      hidden
    />
    {#if backgroundImage}
      <div class="background-card">
        <img class="background-thumb" src={backgroundImage.src} alt="" />
        <div class="background-meta">
          <span class="background-name" title={backgroundImage.name}>{backgroundImage.name}</span>
          <div class="background-buttons">
            <button on:click={pickBackground} disabled={backgroundLoading}>
              {backgroundLoading ? 'Adding…' : 'Replace'}
            </button>
            <button class="remove" on:click={onRemoveBackground}>Remove</button>
          </div>
        </div>
      </div>
      <label class="fade-control">
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
    {:else}
      <button class="background-add" on:click={pickBackground} disabled={backgroundLoading}>
        <Icon name="image" />
        {backgroundLoading ? 'Adding…' : 'Add an image'}
      </button>
      <p class="background-hint">or drop / paste one onto the board</p>
    {/if}
    {#if backgroundError}
      <p class="background-error" role="status">{backgroundError}</p>
    {/if}
  </div>

  <button class="page-tool export-tool" on:click={onExport}>
    <span class="tool-icon"><Icon name="download" /></span>
    <span><strong>Save board</strong><small>Download a PNG</small></span>
  </button>
</aside>

<style>
  .page-rail {
    min-height: 0;
    padding: 14px;
    overflow: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-panel);
  }
  .page-tool {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    text-align: left;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--paper);
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .page-tool:hover { border-color: var(--ink); }
  .tool-icon {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 8px;
    background: #f0ede4;
    color: var(--ink);
  }
  .page-tool strong, .page-tool small { display: block; }
  .page-tool strong { font-size: 12px; }
  .page-tool small { color: var(--muted); margin-top: 3px; font-size: 10px; }
  .page-group { margin-top: 18px; }
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
  .line-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
  .line-options button {
    min-height: 38px;
    padding: 6px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    background: var(--paper);
    border-radius: 8px;
    cursor: pointer;
  }
  .line-options button:hover { border-color: var(--ink); }
  .line-options button.active { border-color: var(--ink); background: var(--ink); }
  .line-icon { width: 24px; height: 22px; border-radius: 3px; background-color: #fff; display: block; }
  .line-icon.ruled { background-image: repeating-linear-gradient(to bottom, transparent 0 5px, #6e92ae 6px 7px); }
  .line-icon.dotted { background-image: radial-gradient(#6e92ae 1px, transparent 1.2px); background-size: 5px 7px; }
  .line-icon.grid { background-image: linear-gradient(#8ca7ba 1px,transparent 1px),linear-gradient(90deg,#8ca7ba 1px,transparent 1px); background-size: 7px 7px; }
  .line-icon.blank { border: 1px solid var(--line); }
  .paper-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .paper-options button {
    aspect-ratio: 1;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper-swatch);
    cursor: pointer;
  }
  .paper-options button:hover { border-color: var(--ink); }
  .paper-options button.active { box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--ink); }

  .background-add {
    width: 100%;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1.5px dashed #c6c0b1;
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }
  .background-add:hover:not(:disabled) { border-color: var(--ink); background: var(--paper); }
  .background-add:disabled { opacity: 0.55; cursor: wait; }
  .background-hint { margin: 6px 2px 0; color: var(--muted); font-size: 10px; text-align: center; }
  .background-card {
    display: flex;
    gap: 10px;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--paper);
  }
  .background-thumb {
    width: 52px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--line);
    flex: 0 0 auto;
  }
  .background-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .background-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 10px;
  }
  .background-buttons { display: flex; gap: 6px; }
  .background-buttons button {
    flex: 1;
    min-height: 26px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #fff;
    font-size: 10px;
    font-weight: 650;
    cursor: pointer;
  }
  .background-buttons button:hover { border-color: var(--ink); }
  .background-buttons .remove { color: #b0492f; }
  .fade-control {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
  }
  .fade-control input { width: 100%; accent-color: var(--ink); }
  .background-error { margin: 8px 2px 0; color: #b0492f; font-size: 10px; }

  .export-tool { margin-top: 20px; }

  @media (max-width: 900px) {
    .page-rail { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .page-group, .export-tool { margin-top: 0; }
  }
  @media (max-width: 620px) {
    .page-rail { grid-template-columns: 1fr 1fr; padding: 10px; }
    .page-tool { padding: 8px; }
    .paper-options { gap: 4px; }
  }
</style>
