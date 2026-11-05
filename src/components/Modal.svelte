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
    width: min(var(--dialog-width), calc(100% - 32px));
    max-height: calc(100% - 32px);
    padding: 20px;
    border: 0;
    border-radius: 18px;
    background: #fff;
    color: var(--text);
    box-shadow: 0 24px 60px rgba(29, 36, 51, 0.24);
  }
  dialog::backdrop {
    background: rgba(29, 36, 51, 0.32);
  }
  @media (max-width: 620px) {
    dialog {
      padding: 16px;
    }
  }
</style>
