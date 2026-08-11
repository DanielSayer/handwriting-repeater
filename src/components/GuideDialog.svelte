<script lang="ts">
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
      <div>
        <span class="eyebrow">TRACE GUIDE</span>
        <h2 id="guide-title">Type something to practise</h2>
      </div>
      <button on:click={onClose} aria-label="Close text panel">×</button>
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
      <button class="primary" on:click={placeGuide}>Place on board <span>→</span></button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(24, 36, 61, 0.28); backdrop-filter: blur(3px); }
  .text-panel { width: min(560px, 100%); padding: 24px; border: 1px solid #c8c1b4; border-radius: 23px 18px 26px 20px; background-color: #fbf9f3; background-image: radial-gradient(#ded9cf 0.8px, transparent 0.8px); background-size: 16px 16px; box-shadow: 0 26px 60px rgba(24,36,61,.24); }
  .panel-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
  .eyebrow { color: #c1533c; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
  .panel-header h2 { margin: 5px 0 20px; font-size: 24px; letter-spacing: -0.03em; }
  .panel-header > button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #e9e5dc; font-size: 22px; cursor: pointer; }
  .field-label, .form-grid span, .preset-row > span { display: block; margin-bottom: 6px; color: #69717e; font-size: 11px; font-weight: 700; }
  textarea, input, select { width: 100%; border: 1px solid #cfc9bd; border-radius: 10px; background: #fffdf8; color: var(--ink); }
  textarea { resize: vertical; padding: 12px; font: 20px "Comic Sans MS", "Segoe Print", cursive; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .form-grid input, .form-grid select { height: 40px; padding: 0 10px; }
  .preset-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 17px; }
  .preset-row > span { margin: 0 5px 0 0; }
  .preset-row button { border: 1px dashed #a9a296; border-radius: 999px; background: #f7f3e8; padding: 6px 10px; font-size: 11px; cursor: pointer; }
  .panel-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 24px; }
  .panel-actions button { min-height: 42px; border-radius: 11px; padding: 0 15px; font-weight: 750; cursor: pointer; }
  .panel-actions .secondary { border: 1px solid #cfc9bd; background: #fffdf8; }
  .panel-actions .primary { border: 1px solid var(--ink); background: var(--ink); color: white; box-shadow: 3px 3px 0 #aaa397; }
  .panel-actions .primary span { margin-left: 8px; }

  @media (max-width: 620px) {
    .text-panel { padding: 19px; }
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
