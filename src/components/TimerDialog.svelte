<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  export let onClose: () => void;
  export let onStart: (minutes: number) => void;

  let minutesInput: HTMLInputElement;
  let draftMinutes: number | undefined;
  let error = '';

  onMount(() => minutesInput.focus());

  function startTimer(): void {
    if (!Number.isInteger(draftMinutes) || (draftMinutes ?? 0) < 1) {
      error = 'Enter a whole number of minutes greater than zero.';
      return;
    }

    onStart(draftMinutes as number);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop">
  <div class="timer-panel" role="dialog" aria-modal="true" aria-labelledby="timer-title">
    <form on:submit|preventDefault={startTimer}>
      <div class="panel-header">
        <h2 id="timer-title">Add a timer</h2>
        <button type="button" on:click={onClose} aria-label="Close timer dialog">
          <Icon name="close" size={16} />
        </button>
      </div>

      <label for="timer-minutes">Minutes</label>
      <div class="minutes-field">
        <input
          id="timer-minutes"
          bind:this={minutesInput}
          bind:value={draftMinutes}
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          required
          aria-invalid={error ? 'true' : undefined}
          on:input={() => (error = '')}
        />
        <span aria-hidden="true">min</span>
      </div>
      {#if error}<p class="field-error" role="alert">{error}</p>{/if}

      <div class="panel-actions">
        <button type="button" class="secondary" on:click={onClose}>Cancel</button>
        <button type="submit" class="primary">Start timer</button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    z-index: 50;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(30, 36, 48, 0.32);
    backdrop-filter: blur(2px);
  }
  .timer-panel {
    width: min(420px, 100%);
    padding: 22px;
    border: 1.5px solid var(--line);
    border-radius: 14px 18px 13px 17px;
    background: var(--panel);
    box-shadow:
      5px 6px 0 rgba(37, 48, 68, 0.12),
      0 24px 60px rgba(30, 36, 48, 0.2);
  }
  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
  }
  h2 {
    margin: 0;
    font: 700 22px var(--hand);
    letter-spacing: -0.01em;
    transform: rotate(-0.5deg);
  }
  .panel-header button {
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
  .panel-header button:hover {
    background: #f0ede4;
    color: var(--ink);
  }
  label {
    display: block;
    margin-bottom: 7px;
    color: var(--muted);
    font: 700 13px var(--hand);
  }
  .minutes-field {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    border: 1.5px solid var(--line);
    border-radius: 9px 12px 8px 11px;
    background: var(--paper);
  }
  .minutes-field:focus-within {
    border-color: var(--ink);
  }
  input {
    width: 100%;
    min-width: 0;
    height: 52px;
    padding: 0 14px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ink);
    font-size: 22px;
    font-weight: 700;
  }
  .minutes-field > span {
    padding: 0 14px;
    color: var(--muted);
    font: 700 13px var(--hand);
  }
  .field-error {
    margin: 7px 2px 0;
    font-size: 11px;
  }
  .field-error {
    color: #b0492f;
  }
  .panel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    margin-top: 24px;
  }
  .panel-actions button {
    min-height: 42px;
    padding: 0 17px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
  }
  .secondary {
    border: 1px solid var(--line);
    background: #fff;
  }
  .secondary:hover {
    border-color: var(--ink);
  }
  .primary {
    border: 1px solid var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .primary:hover {
    filter: brightness(1.1);
  }
</style>
