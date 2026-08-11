<script lang="ts">
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
    <span>{replaying ? '■' : '▶'}</span>
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
    padding: 12px 18px 0;
  }
  label { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 10px; color: #697282; font-size: 11px; }
  input[type="range"] { width: 100%; accent-color: var(--ink); }
  .rewrite-button {
    min-width: 150px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 2px solid #c14e34;
    border-radius: 13px 11px 15px 10px;
    background: var(--accent);
    color: #fff;
    box-shadow: 3px 4px 0 #9f3d28;
    font-weight: 800;
    cursor: pointer;
    transform: rotate(-0.4deg);
  }
  .rewrite-button:active { transform: translate(2px, 2px); box-shadow: 1px 2px 0 #9f3d28; }

  @media (max-width: 620px) {
    .playback-bar { grid-template-columns: 1fr; gap: 8px; padding-inline: 4px; }
    label { display: none; }
  }
</style>
