<script lang="ts">
  import Icon from './Icon.svelte';

  export let guideText: string;
  export let repeatCount: number;
  export let guideSize: number;
  export let onClose: () => void;
  export let onPlace: (text: string, rows: number, size: number) => void;

  let draftText = guideText;
  let draftRepeatCount = repeatCount;
  let draftGuideSize = guideSize;

  function placeGuide(): void {
    onPlace(draftText.trim(), draftRepeatCount, draftGuideSize);
  }

  function removeGuide(): void {
    onPlace('', draftRepeatCount, draftGuideSize);
  }
</script>

<div class="modal-backdrop">
  <div class="text-panel" role="dialog" aria-modal="true" aria-labelledby="guide-title">
    <div class="panel-header">
      <h2 id="guide-title">Type something to practise</h2>
      <button on:click={onClose} aria-label="Close text panel"><Icon name="close" size={16} /></button>
    </div>
    <label class="field-label" for="guide-copy">Words or sentence</label>
    <textarea id="guide-copy" rows="3" bind:value={draftText} placeholder="The quick brown fox…"></textarea>
    <div class="form-grid">
      <label>
        <span>Rows</span>
        <input type="number" min="1" max="8" bind:value={draftRepeatCount} />
      </label>
      <label>
        <span>Text size</span>
        <select bind:value={draftGuideSize}>
          <option value={32}>Small</option>
          <option value={42}>Medium</option>
          <option value={54}>Large</option>
        </select>
      </label>
    </div>
    <div class="preset-row">
      <span>Try a preset</span>
      <button on:click={() => (draftText = 'a b c d e f g')}>Alphabet</button>
      <button on:click={() => (draftText = '1 2 3 4 5')}>Numbers</button>
      <button on:click={() => (draftText = 'The quick brown fox')}>Sentence</button>
    </div>
    <div class="panel-actions">
      {#if guideText}<button class="secondary" on:click={removeGuide}>Remove guide</button>{/if}
      <button class="primary" on:click={placeGuide}>Place on board</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(30, 36, 48, 0.32); backdrop-filter: blur(2px); }
  .text-panel { width: min(540px, 100%); padding: 22px; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--panel); box-shadow: 0 24px 60px rgba(30, 36, 48, 0.25); }
  .panel-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
  .panel-header h2 { margin: 0 0 18px; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
  .panel-header > button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .panel-header > button:hover { background: #f0ede4; color: var(--ink); }
  .field-label, .form-grid span, .preset-row > span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  textarea, input, select { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--ink); }
  textarea:focus, input:focus, select:focus { border-color: var(--ink); outline: none; }
  textarea { resize: vertical; padding: 12px; font: 20px var(--hand); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .form-grid input, .form-grid select { height: 40px; padding: 0 10px; }
  .preset-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
  .preset-row > span { margin: 0 5px 0 0; }
  .preset-row button {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    padding: 6px 12px;
    font-size: 11px;
    cursor: pointer;
  }
  .preset-row button:hover { border-color: var(--ink); }
  .panel-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }
  .panel-actions button { min-height: 40px; border-radius: var(--radius); padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .panel-actions .secondary { border: 1px solid var(--line); background: #fff; }
  .panel-actions .secondary:hover { border-color: var(--ink); }
  .panel-actions .primary { border: 1px solid var(--ink); background: var(--ink); color: #fff; }
  .panel-actions .primary:hover { filter: brightness(1.15); }

  @media (max-width: 620px) {
    .text-panel { padding: 18px; }
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
