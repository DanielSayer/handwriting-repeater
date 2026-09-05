<script lang="ts">
  import { onMount } from 'svelte';

  export let labelId: string;
  export let width = 540;
  export let onClose: () => void;
  let dialog: HTMLDialogElement;

  function containFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]')
    ).filter(
      (control) =>
        control.tabIndex >= 0 &&
        !control.hasAttribute('disabled') &&
        control.getClientRects().length > 0
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  onMount(() => {
    const opener = document.activeElement;
    dialog.showModal();
    (
      dialog.querySelector<HTMLElement>('textarea, input') ??
      dialog.querySelector<HTMLElement>('button')
    )?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  });
</script>

<dialog
  bind:this={dialog}
  aria-labelledby={labelId}
  style={`--dialog-width:${width}px`}
  on:cancel|preventDefault={onClose}
  on:keydown={containFocus}
>
  <slot />
</dialog>

<style>
  dialog {
    width: min(var(--dialog-width), calc(100% - 40px));
    max-height: calc(100% - 40px);
    padding: 22px;
    border: 1.5px solid var(--line);
    border-radius: 14px 18px 13px 17px;
    background: var(--panel);
    color: var(--ink);
    box-shadow:
      5px 6px 0 rgba(37, 48, 68, 0.12),
      0 24px 60px rgba(30, 36, 48, 0.2);
  }
  dialog::backdrop {
    background: rgba(30, 36, 48, 0.32);
    backdrop-filter: blur(2px);
  }
  @media (max-width: 620px) {
    dialog {
      padding: 18px;
    }
  }
</style>
