<script lang="ts">
  import { onMount } from 'svelte';
  import { createBoardSaver, loadBoard } from '../lib/storage';
  import type { PersistedBoardState } from '../lib/types';

  export let state: PersistedBoardState;
  export let onRestore: (state: PersistedBoardState) => void;
  let ready = false;
  let failed = false;
  const saver = createBoardSaver(undefined, (value) => (failed = value));

  $: if (ready) saver.schedule(state);

  onMount(() => {
    try {
      const saved = loadBoard();
      if (saved) onRestore(saved);
    } catch {
      failed = true;
    }
    ready = true;
    return saver.flush;
  });
</script>

<svelte:window on:pagehide={() => saver.flush()} />
<svelte:document
  on:visibilitychange={() => {
    if (document.hidden) saver.flush();
  }}
/>

{#if failed}
  <p class="storage-warning" role="status">
    Your board could not be saved in this browser. Export it before closing this page.
  </p>
{/if}

<style>
  .storage-warning {
    margin: 0;
    padding: 8px 16px;
    background: #fff0e4;
    color: #843b27;
    font-size: 13px;
  }
</style>
