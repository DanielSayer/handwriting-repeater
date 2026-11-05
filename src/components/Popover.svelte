<script lang="ts">
  import { tick } from 'svelte';

  export let open: boolean;
  export let label: string;
  export let onClose: () => void;
  export let align: 'start' | 'end' = 'start';
  export let placement: 'below' | 'above' = 'below';
  export let width = 300;

  let root: HTMLElement;
  let panel: HTMLElement | undefined;

  $: if (open) void focusPanel();

  async function focusPanel(): Promise<void> {
    await tick();
    panel
      ?.querySelector<HTMLElement>('input, textarea, button[aria-pressed="true"], button')
      ?.focus({ preventScroll: true });
  }

  function closeAndRefocus(): void {
    onClose();
    root.querySelector<HTMLElement>('[aria-expanded]')?.focus();
  }

  function handlePointer(event: PointerEvent): void {
    if (open && !root.contains(event.target as Node)) onClose();
  }

  function handleKey(event: KeyboardEvent): void {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      closeAndRefocus();
    }
  }
</script>

<svelte:document on:pointerdown={handlePointer} on:keydown={handleKey} />

<div class="anchor" bind:this={root}>
  <slot name="trigger" />
  {#if open}
    <div
      class={`popover ${align} ${placement}`}
      role="dialog"
      aria-label={label}
      bind:this={panel}
      style={`--pop-width:${width}px`}
    >
      <slot />
    </div>
  {/if}
</div>

<style>
  .anchor {
    position: relative;
    display: inline-flex;
  }
  .popover {
    position: absolute;
    z-index: 30;
    width: min(var(--pop-width), calc(100vw - 24px));
    padding: 14px;
    border-radius: 16px;
    background: #fff;
    box-shadow: var(--shadow-pop);
    color: var(--text);
  }
  .below {
    top: calc(100% + 8px);
  }
  .above {
    bottom: calc(100% + 10px);
  }
  .start {
    left: 0;
  }
  .end {
    right: 0;
  }
</style>
