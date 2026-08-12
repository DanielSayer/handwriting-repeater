<script lang="ts">
  import Icon from './Icon.svelte';

  export let zoom: number;
  export let speed: number;
  export let replaying: boolean;
  export let onReplay: () => void;
  export let onStop: () => void;
</script>

<div class="playback-bar">
  <label>
    <span>Zoom</span>
    <input type="range" min="0.8" max="1.25" step="0.05" bind:value={zoom} />
  </label>
  <button class="rewrite-button" on:click={replaying ? onStop : onReplay}>
    <Icon name={replaying ? 'stop' : 'play'} size={15} />
    {replaying ? 'Stop' : 'Rewrite'}
  </button>
  <label>
    <span>Write speed</span>
    <input type="range" min="1" max="5" step="1" bind:value={speed} />
  </label>
</div>

<style>
  .playback-bar {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) auto minmax(120px, 1fr);
    align-items: center;
    gap: 20px;
    padding: 10px 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-panel);
  }
  label {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  input[type="range"] { width: 100%; accent-color: var(--ink); }
  .rewrite-button {
    min-width: 150px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: filter 0.15s ease, transform 0.1s ease;
  }
  .rewrite-button:hover { filter: brightness(1.06); }
  .rewrite-button:active { transform: translateY(1px); }

  @media (max-width: 620px) {
    .playback-bar { grid-template-columns: 1fr; gap: 8px; }
    label { display: none; }
  }
</style>
