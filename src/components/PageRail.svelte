<script lang="ts">
  import { PAPER_OPTIONS } from '../lib/constants';
  import type { LineStyle } from '../lib/types';

  export let lineStyle: LineStyle;
  export let pageColour: string;
  export let onOpenGuide: () => void;
  export let onExport: () => void;
</script>

<aside class="page-rail" aria-label="Page tools">
  <button class="page-tool" on:click={onOpenGuide}>
    <span class="tool-icon">T</span>
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
        ></button>
      {/each}
    </div>
  </div>

  <button class="page-tool export-tool" on:click={onExport}>
    <span class="tool-icon">↓</span>
    <span><strong>Save board</strong><small>Download a PNG</small></span>
  </button>

  <div class="local-card">
    <span>⌁</span>
    <p><strong>Browser local</strong>Your board is stored only on this device.</p>
  </div>
</aside>

<style>
  .page-rail {
    min-height: 0;
    padding: 14px;
    overflow: auto;
    background: rgba(248, 246, 240, 0.96);
    border: 1px solid var(--line);
    border-radius: 18px 16px 20px 15px;
    box-shadow: 0 8px 24px rgba(41, 45, 51, 0.07);
  }
  .page-tool {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px;
    text-align: left;
    border: 1px solid #cfc9bd;
    border-radius: 13px 11px 15px 10px;
    background: #fffdf8;
    cursor: pointer;
    box-shadow: 2px 2px 0 #d6d0c4;
  }
  .page-tool:hover { border-color: #aaa396; transform: translateY(-1px); }
  .tool-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; background: #ffe3d9; color: #bd4d36; font-size: 19px; font-weight: 800; }
  .page-tool strong, .page-tool small { display: block; }
  .page-tool strong { font-size: 12px; }
  .page-tool small { color: #7b8290; margin-top: 3px; font-size: 10px; }
  .page-group { margin-top: 20px; }
  .rail-heading {
    display: block;
    margin-bottom: 9px;
    color: #808694;
    font-size: 10px;
    line-height: 1;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .line-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
  .line-options button { min-height: 38px; padding: 6px; display: grid; place-items: center; border: 1px solid #d3cec3; background: #fffdf8; border-radius: 10px; cursor: pointer; }
  .line-options button.active { color: #fff; border-color: var(--ink); background: var(--ink); box-shadow: 2px 2px 0 #b9b3a7; }
  .line-icon { width: 24px; height: 22px; border-radius: 3px; background-color: #fff; display: block; }
  .line-icon.ruled { background-image: repeating-linear-gradient(to bottom, transparent 0 5px, #6e92ae 6px 7px); }
  .line-icon.dotted { background-image: radial-gradient(#6e92ae 1px, transparent 1.2px); background-size: 5px 7px; }
  .line-icon.grid { background-image: linear-gradient(#8ca7ba 1px,transparent 1px),linear-gradient(90deg,#8ca7ba 1px,transparent 1px); background-size: 7px 7px; }
  .line-icon.blank { border: 1px solid #d4d0c7; }
  .paper-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .paper-options button { aspect-ratio: 1; border: 1px solid #ccc6bb; border-radius: 9px 7px 10px 8px; background: var(--paper-swatch); cursor: pointer; }
  .paper-options button.active { box-shadow: 0 0 0 2px var(--ink); border-color: #fff; }
  .export-tool { margin-top: 22px; }
  .export-tool .tool-icon { background: #dcf1ea; color: #137962; }
  .local-card { margin-top: 16px; padding: 11px; display: flex; gap: 9px; border-radius: 13px; background: #efede6; color: #777e88; }
  .local-card > span { color: var(--green); font-size: 20px; }
  .local-card p { margin: 0; font-size: 10px; line-height: 1.45; }
  .local-card strong { display: block; color: #5c646e; margin-bottom: 2px; }

  @media (max-width: 900px) {
    .page-rail { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .page-group, .export-tool, .local-card { margin-top: 0; }
    .local-card { display: none; }
  }
  @media (max-width: 620px) {
    .page-rail { grid-template-columns: 1fr 1fr; padding: 10px; }
    .page-tool { padding: 8px; }
    .paper-options { gap: 4px; }
  }
</style>
