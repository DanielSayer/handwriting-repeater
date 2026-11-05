<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import { GUIDE_FONTS, guideFontFamily, loadGuideFont, type GuideFontId } from '../lib/guideFonts';

  export let guideText: string;
  export let repeatCount: number;
  export let guideSize: number;
  export let guideFont: GuideFontId;
  export let onClose: () => void;
  export let onPlace: (text: string, rows: number, size: number) => void;
  export let onAdjust: () => void;

  const PRESETS = [
    { label: 'Alphabet', text: 'a b c d e f g' },
    { label: 'Numbers', text: '1 2 3 4 5' },
    { label: 'Sentence', text: 'The quick brown fox' }
  ];

  let draftText = guideText;
  let draftRepeatCount = repeatCount;
  let error = '';
  let loaded: GuideFontId[] = [];
  let failed: GuideFontId[] = [];

  $: fontReady = loaded.includes(guideFont);
  $: lineCount = Math.max(1, draftText.trim().split(/\r?\n/).length);
  $: maxRepeats = Math.max(1, Math.floor(8 / lineCount));
  $: if (draftRepeatCount > maxRepeats) draftRepeatCount = maxRepeats;

  onMount(() => {
    // Preview every font in the list; the selected one first so the textarea is ready.
    void requestFont(guideFont);
    for (const font of GUIDE_FONTS) if (font.id !== guideFont) void requestFont(font.id);
  });

  async function requestFont(font: GuideFontId): Promise<void> {
    failed = failed.filter((id) => id !== font);
    try {
      await loadGuideFont(font);
      loaded = [...loaded, font];
    } catch {
      failed = [...failed, font];
    }
  }

  function step(delta: number): void {
    draftRepeatCount = Math.min(maxRepeats, Math.max(1, draftRepeatCount + delta));
    error = '';
  }

  function placeGuide(): void {
    if (!fontReady) return;
    if (!draftText.trim()) {
      error = 'Type some letters or words to copy.';
      return;
    }
    if (lineCount * draftRepeatCount > 8) {
      error = 'Use up to 8 rows in total, including repeats.';
      return;
    }
    onPlace(draftText.trim(), draftRepeatCount, guideSize);
  }
</script>

<Modal labelId="guide-title" width={520} {onClose}>
  <div class="guide ph-no-capture">
    <div class="head">
      <h2 id="guide-title"><Icon name="type" />Guide</h2>
      <button class="btn icon" on:click={onClose} aria-label="Close"><Icon name="close" /></button>
    </div>

    <label class="pop-label first" for="guide-copy">Words to copy</label>
    <textarea
      id="guide-copy"
      class="field"
      rows="2"
      bind:value={draftText}
      on:input={() => (error = '')}
      placeholder="The quick brown fox"
      style={`font-family:${guideFontFamily(guideFont)}`}></textarea>
    <div class="chips">
      {#each PRESETS as preset (preset.label)}
        <button class="chip" on:click={() => (draftText = preset.text)}>{preset.label}</button>
      {/each}
    </div>

    <div class="repeat">
      <span class="pop-label" id="repeat-label">Rows</span>
      <div class="stepper" role="group" aria-labelledby="repeat-label">
        <button
          class="btn icon"
          aria-label="Fewer rows"
          disabled={draftRepeatCount <= 1}
          on:click={() => step(-1)}><Icon name="minus" size={18} /></button
        >
        <output aria-live="polite">{draftRepeatCount}</output>
        <button
          class="btn icon"
          aria-label="More rows"
          disabled={draftRepeatCount >= maxRepeats}
          on:click={() => step(1)}><Icon name="plus" size={18} /></button
        >
      </div>
    </div>

    <span class="pop-label" id="font-label">Font</span>
    <div class="fonts" role="group" aria-labelledby="font-label">
      {#each GUIDE_FONTS as font (font.id)}
        <button
          class="pick font"
          class:on={guideFont === font.id}
          aria-pressed={guideFont === font.id}
          on:click={() => (guideFont = font.id)}
        >
          <span>{font.label}</span>
          {#if failed.includes(font.id)}
            <small>Not loaded</small>
          {:else}
            <em
              style={`font-family:${guideFontFamily(font.id)}`}
              class:loading={!loaded.includes(font.id)}>agqt</em
            >
          {/if}
        </button>
      {/each}
    </div>
    {#if failed.includes(guideFont)}
      <p class="pop-error" role="alert">
        This font could not load.
        <button class="link" on:click={() => requestFont(guideFont)}>Try again</button>
      </p>
    {/if}
    {#if error}<p class="pop-error" role="alert">{error}</p>{/if}

    <div class="foot">
      {#if guideText}
        <button class="btn boxed" on:click={onAdjust}><Icon name="move" />Move / resize</button>
        <button class="btn boxed danger" on:click={() => onPlace('', repeatCount, guideSize)}
          ><Icon name="trash" />Remove</button
        >
      {/if}
      <button class="btn primary" on:click={placeGuide} disabled={!fontReady}
        >{guideText ? 'Update guide' : 'Put on board'}</button
      >
    </div>
  </div>
</Modal>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -6px -6px 4px 0;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--ink);
    font-size: 18px;
  }
  .pop-label.first {
    margin-top: 4px;
  }
  textarea {
    min-height: 64px;
    resize: vertical;
    font-size: 28px;
    line-height: 1.25;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .chip {
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    box-shadow: inset 0 0 0 1.5px var(--line);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .chip:hover {
    box-shadow: inset 0 0 0 1.5px #aab2bd;
  }
  .repeat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
  }
  .repeat .pop-label {
    margin: 0;
  }
  .stepper {
    display: inline-flex;
    align-items: center;
    border-radius: 11px;
    box-shadow: inset 0 0 0 1.5px var(--field);
  }
  .stepper output {
    min-width: 32px;
    color: var(--ink);
    font-size: 16px;
    font-weight: 700;
    text-align: center;
  }
  .fonts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .font {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 12px;
    font-size: 14px;
    font-weight: 600;
    text-align: left;
  }
  .font em {
    flex: none;
    color: var(--ink);
    font-size: 26px;
    font-style: normal;
    font-weight: 400;
  }
  .font em.loading {
    opacity: 0;
  }
  .font small {
    color: var(--muted);
    font-size: 13px;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--blue);
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  .foot .primary {
    margin-left: auto;
  }

  @media (max-width: 559px) {
    .fonts {
      grid-template-columns: 1fr;
    }
    .foot {
      flex-wrap: wrap;
    }
  }
</style>
