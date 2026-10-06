<script lang="ts">
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import { GUIDE_FONTS, guideFontFamily, loadGuideFont, type GuideFontId } from '../lib/guideFonts';

  export let guideText: string;
  export let repeatCount: number;
  export let guideSize: number;
  export let guideFont: GuideFontId;
  export let onClose: () => void;
  export let onPlace: (text: string, rows: number, size: number) => void;

  let draftText = guideText;
  let draftRepeatCount: number | undefined = repeatCount;
  let error = '';
  let draftGuideSize = guideSize;
  let loadedFont: GuideFontId | null = null;
  let fontError = false;
  let requestedFont: GuideFontId | null = null;
  $: fontReady = loadedFont === guideFont;
  $: void requestFont(guideFont);

  async function requestFont(font: GuideFontId): Promise<void> {
    requestedFont = font;
    fontError = false;
    try {
      await loadGuideFont(font);
      if (requestedFont === font) loadedFont = font;
    } catch {
      if (requestedFont === font) fontError = true;
    }
  }

  function placeGuide(): void {
    if (!fontReady) return;
    if (
      !Number.isInteger(draftRepeatCount) ||
      !draftRepeatCount ||
      draftRepeatCount < 1 ||
      draftRepeatCount > 8
    ) {
      error = 'Enter a whole number of rows between 1 and 8.';
      return;
    }
    if (!draftText.trim()) {
      error = 'Enter some text to practise.';
      return;
    }
    if (draftText.trim().split(/\r?\n/).length * draftRepeatCount > 8) {
      error = 'Use up to 8 lines in total, including repeats.';
      return;
    }
    onPlace(draftText.trim(), draftRepeatCount, draftGuideSize);
  }

  function removeGuide(): void {
    onPlace('', repeatCount, draftGuideSize);
  }
</script>

<Modal labelId="guide-title" width={540} {onClose}>
  <div class="text-panel ph-no-capture">
    <div class="panel-header">
      <h2 id="guide-title">{guideText ? 'Edit guide text' : 'Type something to practise'}</h2>
      <button on:click={onClose} aria-label="Close text panel"
        ><Icon name="close" size={16} /></button
      >
    </div>
    <label class="field-label" for="guide-copy">Words or sentence</label>
    <textarea
      id="guide-copy"
      rows="3"
      bind:value={draftText}
      placeholder="The quick brown fox…"
      style={`font-family:${guideFontFamily(guideFont)}`}></textarea>
    <div class="form-grid">
      <label>
        <span>Repeat count</span>
        <input type="number" min="1" max="8" bind:value={draftRepeatCount} />
      </label>
      <label>
        <span>Font</span>
        <select bind:value={guideFont}>
          {#each GUIDE_FONTS as font (font.id)}
            <option value={font.id}>{font.label}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="guide-preview" aria-label="Guide text preview">
      {#if fontError}
        <p class="font-status" role="alert">
          This font could not load. <button on:click={() => requestFont(guideFont)}>Retry</button>
        </p>
      {:else if !fontReady}
        <p class="font-status" role="status">Loading font…</p>
      {:else}
        <span
          style={`font-family:${guideFontFamily(guideFont)};font-size:clamp(20px, 4vw, ${Math.min(draftGuideSize, 54)}px)`}
          >{draftText || 'The quick brown fox…'}</span
        >
      {/if}
    </div>
    <p class="placement-hint">Move and resize your guide on the board after placing it.</p>
    {#if error}<p role="alert">{error}</p>{/if}
    <div class="preset-row">
      <span>Try a preset</span>
      <button on:click={() => (draftText = 'a b c d e f g')}>Alphabet</button>
      <button on:click={() => (draftText = '1 2 3 4 5')}>Numbers</button>
      <button on:click={() => (draftText = 'The quick brown fox')}>Sentence</button>
    </div>
    <div class="panel-actions">
      {#if guideText}<button class="secondary" on:click={removeGuide}>Remove guide</button>{/if}
      <button class="primary" on:click={placeGuide} disabled={!fontReady}
        >{guideText ? 'Apply and adjust' : 'Place on board'}</button
      >
    </div>
  </div>
</Modal>

<style>
  .font-status {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .font-status button {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 5px 10px;
    background: var(--panel);
    color: var(--ink);
    cursor: pointer;
  }
  .panel-actions .primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .guide-preview {
    margin-top: 16px;
    min-height: 92px;
    max-height: 180px;
    overflow: auto;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper);
  }
  .guide-preview span {
    font-family: var(--hand);
    color: #8f9aa6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .placement-hint {
    color: var(--muted);
    font-size: 12px;
  }
  .placement-hint {
    margin: 10px 0 0;
  }
  select:disabled {
    opacity: 0.65;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }
  .panel-header h2 {
    margin: 0 0 18px;
    font: 700 22px var(--hand);
    letter-spacing: -0.01em;
    transform: rotate(-0.5deg);
  }
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
  .panel-header > button:hover {
    background: #f0ede4;
    color: var(--ink);
  }
  .field-label,
  .form-grid span,
  .preset-row > span {
    display: block;
    margin-bottom: 6px;
    color: var(--muted);
    font: 700 12px var(--hand);
    letter-spacing: 0.02em;
  }
  textarea,
  input,
  select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper);
    color: var(--ink);
  }
  textarea:focus,
  input:focus,
  select:focus {
    border-color: var(--ink);
    outline: none;
  }
  textarea {
    resize: vertical;
    padding: 12px;
    font: 20px var(--hand);
  }
  .form-grid {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) minmax(0, 2fr);
    gap: 14px;
    margin-top: 14px;
  }
  .form-grid input,
  .form-grid select {
    height: 40px;
    padding: 0 10px;
  }
  .form-grid select {
    appearance: none;
    padding: 0 36px 0 12px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23253044' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }
  .preset-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 16px;
  }
  .preset-row > span {
    margin: 0 5px 0 0;
  }
  .preset-row button {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    padding: 6px 12px;
    font-size: 11px;
    cursor: pointer;
  }
  .preset-row button:hover {
    border-color: var(--ink);
  }
  .panel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    margin-top: 22px;
  }
  .panel-actions button {
    min-height: 40px;
    border-radius: var(--radius);
    padding: 0 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .panel-actions .secondary {
    border: 1px solid var(--line);
    background: #fff;
  }
  .panel-actions .secondary:hover {
    border-color: var(--ink);
  }
  .panel-actions .primary {
    border: 1px solid var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .panel-actions .primary:hover {
    filter: brightness(1.15);
  }

  @media (max-width: 620px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
