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
    border: 1.5px solid var(--line);
    border-radius: 11px 16px 12px 15px;
    box-shadow: var(--shadow-panel);
  }
  label {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-family: var(--hand);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--ink);
  }
  .rewrite-button {
    min-width: 150px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 10px 13px 9px 12px;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      filter 0.15s ease,
      transform 0.1s ease;
    box-shadow: 2px 3px 0 #b94229;
  }
  .rewrite-button:hover {
    filter: brightness(1.06);
    transform: rotate(-0.5deg);
  }
  .rewrite-button:active {
    transform: translateY(1px);
  }

  @media (min-width: 1400px) {
    .playback-bar {
      gap: 24px;
      padding: 13px 20px;
    }
    label {
      gap: 12px;
      font-size: 14px;
    }
    .rewrite-button {
      min-width: 170px;
      height: 48px;
      font-size: 14px;
    }
  }

  @media (max-width: 620px) {
    .playback-bar {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    label {
      display: none;
    }
  }
</style>
