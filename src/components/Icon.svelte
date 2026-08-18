<script lang="ts">
  export let name:
    | 'marker'
    | 'pencil'
    | 'trace'
    | 'loop'
    | 'undo'
    | 'redo'
    | 'clear'
    | 'image'
    | 'download'
    | 'type'
    | 'play'
    | 'stop'
    | 'fullscreen'
    | 'exit-fullscreen'
    | 'clock'
    | 'drag'
    | 'close';
  export let size = 18;
</script>

<!-- Original loose-line icons drawn for Repeat, inspired by Streamline's Freehand set. -->
<svg
  class="scribble-icon"
  viewBox="0 0 48 48"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="3.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'marker'}
    <path d="M9 39c2-5 3-9 6-12L31 9c2-2 5-1 7 1 2 3 2 5 0 7L21 35c-3 2-7 3-12 4Z" />
    <path d="m28 13 7 7M14 29c3 0 5 2 7 5M10 39l7-3" />
  {:else if name === 'pencil'}
    <path d="m8 39 3-11L30 8c2-2 5-1 8 2 2 2 2 5 0 7L18 37 8 39Z" />
    <path d="m27 12 8 8M11 29c3 1 5 3 7 7M8 39l7-3" />
  {:else if name === 'trace'}
    <path d="M5 16c4-7 8-7 12 0s8 7 12 0 8-7 14-1" />
    <path d="M5 33c4-7 8-7 12 0s8 7 12 0 8-7 14-1" />
    <path d="M7 20c8 2 23 1 34-2" opacity=".42" />
  {:else if name === 'loop'}
    <path d="M38 18c-3-7-11-11-19-8C9 13 6 24 11 33c5 8 17 9 24 3 3-3 4-6 4-10" />
    <path d="m32 12 7 6 1-10" />
  {:else if name === 'undo'}
    <path d="M18 15 8 23l10 7" />
    <path d="M9 23c10-3 24-4 29 5 3 6-1 11-6 13" />
  {:else if name === 'redo'}
    <path d="m30 15 10 8-10 7" />
    <path d="M39 23c-10-3-24-4-29 5-3 6 1 11 6 13" />
  {:else if name === 'clear'}
    <path d="M8 14c8 1 22-1 32 0M17 13l1-5c5-1 9-1 13 0l1 5" />
    <path d="M12 16c1 8 1 16 3 24 6 1 13 0 19-1 2-8 2-15 2-23" />
    <path d="m21 21 1 12m7-12-1 12" />
  {:else if name === 'image'}
    <path d="M8 9c9-1 21 0 31 1 1 9 1 20 0 29-10 1-21 1-31-1-1-9-1-19 0-29Z" />
    <path d="M10 34 19 24l8 8 5-6 7 8" />
    <path d="M30 17c0 3-4 5-6 3-3-2-1-6 2-7 2 0 4 1 4 4Z" />
  {:else if name === 'download'}
    <path d="M24 7c0 10-1 19 0 27" />
    <path d="m15 27 9 8 10-9" />
    <path d="M8 41c10-1 22 1 32-1" />
  {:else if name === 'type'}
    <path d="M8 13c9-2 22-2 32 0M24 13c-1 10 0 18-1 27M16 40c6-1 11 1 17-1" />
    <path d="m9 13-1 5m31-5 1 5" />
  {:else if name === 'play'}
    <path d="M15 8c8 5 16 10 24 17-8 6-16 11-24 15 1-11 0-21 0-32Z" />
  {:else if name === 'stop'}
    <path d="M12 12c8-1 16 0 24 1 1 7 0 15 0 23-8 1-16 1-24-1-1-7 0-15 0-23Z" />
  {:else if name === 'fullscreen'}
    <path d="M8 19c0-4 0-7 1-11 4 0 7 0 11 1M28 9c4-1 7-1 11 0 0 4 1 7 0 11" />
    <path d="M9 28c-1 4-1 7 0 11 4 0 7 1 11 0M39 28c1 4 1 7 0 11-4 0-7 0-11 1" />
  {:else if name === 'exit-fullscreen'}
    <path d="M8 19c4 0 7 0 11-1 0-4 0-7 1-11M28 8c1 4 1 7 1 11 4 0 7 0 11 1" />
    <path d="M8 29c4 0 7 0 11 1 0 4 0 7 1 11M28 40c1-4 1-7 1-11 4 0 7 0 11-1" />
  {:else if name === 'clock'}
    <path d="M24 7c10 0 17 7 17 17 0 11-7 17-17 17S7 34 7 24 14 7 24 7Z" />
    <path d="M24 13c-1 5 0 9 0 12l8 5M12 24h2m20 0h2M24 35v2" />
  {:else if name === 'drag'}
    <path d="M17 13h.1M31 13h.1M17 24h.1M31 24h.1M17 35h.1M31 35h.1" stroke-width="5" />
  {:else if name === 'close'}
    <path d="M10 9c9 10 18 20 29 30M39 9C29 18 20 29 9 39" />
  {/if}
</svg>

<style>
  .scribble-icon {
    display: block;
    overflow: visible;
    transform: rotate(-1deg);
  }
</style>
