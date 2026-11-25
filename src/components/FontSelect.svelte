<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import {
    GUIDE_FONTS,
    GUIDE_FONT_GROUPS,
    guideFontFamily,
    type GuideFontId
  } from '../lib/guideFonts';

  export let value: GuideFontId;
  export let labelId: string;
  export let loaded: GuideFontId[];
  export let failed: GuideFontId[];
  export let onOpen: () => void = () => {};

  const listId = 'font-listbox';
  const groups = GUIDE_FONT_GROUPS.map((group) => ({
    ...group,
    fonts: GUIDE_FONTS.filter((font) => font.group === group.id)
  }));

  let open = false;
  let active = 0;
  let trigger: HTMLButtonElement;
  let list: HTMLElement | undefined;
  let panelStyle = '';

  $: selected = GUIDE_FONTS.find((font) => font.id === value) ?? GUIDE_FONTS[0];

  // The dialog scrolls, so the panel is fixed to the viewport and placed from the trigger.
  function place(): void {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 240 && above > below;
    const room = Math.max(120, Math.min(380, up ? above : below) - 6);
    panelStyle =
      `left:${rect.left}px;width:${rect.width}px;max-height:${room}px;` +
      (up ? `bottom:${window.innerHeight - rect.top + 6}px` : `top:${rect.bottom + 6}px`);
  }

  async function show(): Promise<void> {
    active = Math.max(
      0,
      GUIDE_FONTS.findIndex((font) => font.id === value)
    );
    place();
    open = true;
    onOpen();
    await tick();
    list?.focus({ preventScroll: true });
    scrollActive();
  }

  function hide(refocus = true): void {
    open = false;
    if (refocus) trigger?.focus();
  }

  function choose(index: number): void {
    value = GUIDE_FONTS[index].id;
    hide();
  }

  async function scrollActive(): Promise<void> {
    await tick();
    list?.querySelector(`#font-option-${GUIDE_FONTS[active].id}`)?.scrollIntoView({
      block: 'nearest'
    });
  }

  function move(index: number): void {
    active = Math.max(0, Math.min(GUIDE_FONTS.length - 1, index));
    void scrollActive();
  }

  function triggerKey(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      void show();
    }
  }

  function listKey(event: KeyboardEvent): void {
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(active + 1),
      ArrowUp: () => move(active - 1),
      Home: () => move(0),
      End: () => move(GUIDE_FONTS.length - 1),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => hide()
    };
    if (event.key === 'Tab') return hide(false);
    const action = keys[event.key];
    if (!action) return;
    // Escape must close only the list, not the guide dialog around it.
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  function outside(event: PointerEvent): void {
    const target = event.target as Node;
    if (open && !list?.contains(target) && !trigger.contains(target)) hide(false);
  }

  function reposition(event: Event): void {
    if (open && !list?.contains(event.target as Node)) place();
  }
</script>

<svelte:document on:pointerdown={outside} on:scroll|capture={reposition} />
<svelte:window on:resize={() => open && place()} />

<button
  bind:this={trigger}
  type="button"
  class="trigger"
  class:open
  aria-haspopup="listbox"
  aria-expanded={open}
  aria-controls={listId}
  aria-labelledby={`${labelId} font-current`}
  on:click={() => (open ? hide() : show())}
  on:keydown={triggerKey}
>
  <span id="font-current">{selected.label}</span>
  {#if failed.includes(selected.id)}
    <small>Not loaded</small>
  {:else}
    <em
      style={`font-family:${guideFontFamily(selected.id)}`}
      class:loading={!loaded.includes(selected.id)}
      aria-hidden="true">agqt</em
    >
  {/if}
  <Icon name="chev" size={18} />
</button>

{#if open}
  <div
    bind:this={list}
    id={listId}
    class="panel"
    role="listbox"
    tabindex="-1"
    aria-labelledby={labelId}
    aria-activedescendant={`font-option-${GUIDE_FONTS[active].id}`}
    style={panelStyle}
    on:keydown={listKey}
  >
    {#each groups as group (group.id)}
      <div role="group" aria-labelledby={`font-group-${group.id}`}>
        <div class="group" id={`font-group-${group.id}`}>{group.label}</div>
        {#each group.fonts as font (font.id)}
          {@const index = GUIDE_FONTS.findIndex((item) => item.id === font.id)}
          <div
            id={`font-option-${font.id}`}
            class="option"
            class:active={index === active}
            class:on={font.id === value}
            role="option"
            tabindex="-1"
            aria-selected={font.id === value}
            on:click={() => choose(index)}
            on:keydown={listKey}
            on:pointermove={() => (active = index)}
          >
            <span class="tick"
              >{#if font.id === value}<Icon name="check" size={16} />{/if}</span
            >
            <span class="name">{font.label}</span>
            {#if failed.includes(font.id)}
              <small>Not loaded</small>
            {:else}
              <em
                style={`font-family:${guideFontFamily(font.id)}`}
                class:loading={!loaded.includes(font.id)}
                aria-hidden="true">agqt</em
              >
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .trigger {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px 0 14px;
    border: 1.5px solid var(--field);
    border-radius: 10px;
    background: #fff;
    color: var(--ink);
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .trigger:hover {
    border-color: #aab2bd;
  }
  .trigger.open {
    border-color: var(--blue);
  }
  .trigger span {
    flex: 1;
  }
  .trigger :global(svg) {
    color: var(--muted);
    transition: transform 0.15s;
  }
  .trigger.open :global(svg) {
    transform: rotate(180deg);
  }
  em {
    flex: none;
    color: var(--ink);
    font-size: 26px;
    font-style: normal;
    font-weight: 400;
    line-height: 1;
  }
  em.loading {
    opacity: 0;
  }
  small {
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
  }
  .panel {
    position: fixed;
    z-index: 40;
    overflow-y: auto;
    padding: 4px 6px 6px;
    border-radius: 12px;
    background: #fff;
    box-shadow: var(--shadow-pop);
    overscroll-behavior: contain;
  }
  .panel:focus {
    outline: none;
  }
  .group {
    margin: 10px 8px 4px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .option {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px 0 6px;
    border-radius: 9px;
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .option.active {
    background: var(--hover);
  }
  .option.on {
    background: var(--blue-tint);
    box-shadow: inset 0 0 0 1.5px var(--blue);
  }
  .panel:focus-visible .option.active {
    outline: 2px solid var(--blue);
    outline-offset: -2px;
  }
  .tick {
    width: 18px;
    flex: none;
    display: inline-flex;
    color: var(--blue);
  }
  .name {
    flex: 1;
  }
</style>
