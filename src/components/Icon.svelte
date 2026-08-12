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
    | 'close';
  export let size = 18;
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.9"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'marker'}
    <path d="M4 20l1.4-4.3L15.9 5.2a2.1 2.1 0 0 1 3 3L8.4 18.7 4 20z" />
    <path d="M13.5 7.5l3 3" />
  {:else if name === 'pencil'}
    <path d="M4 20l.9-3.7L15.4 5.8a2 2 0 0 1 2.8 2.8L7.7 19.1 4 20z" />
    <path d="M13.8 7.4l2.8 2.8" />
    <path d="M4 20l2.6-.9" />
  {:else if name === 'trace'}
    <path d="M3 9c2.2-3.4 4.4-3.4 6.6 0s4.4 3.4 6.6 0c1.1-1.7 2.2-2.5 3.3-2.4" />
    <path d="M3 16c2.2-3.4 4.4-3.4 6.6 0s4.4 3.4 6.6 0c1.1-1.7 2.2-2.5 3.3-2.4" />
  {:else if name === 'loop'}
    <path d="M20 12a8 8 0 1 1-2.5-5.8" />
    <path d="M20 3v4.2h-4.2" />
  {:else if name === 'undo'}
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  {:else if name === 'redo'}
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  {:else if name === 'clear'}
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6.5 7l.9 13h9.2l.9-13" />
    <path d="M10 11v5M14 11v5" />
  {:else if name === 'image'}
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 17l4.5-4.5 4 4 3-3 4 4" />
  {:else if name === 'download'}
    <path d="M12 4v10" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M5 19.5h14" />
  {:else if name === 'type'}
    <path d="M5 6.5h14" />
    <path d="M12 6.5V19" />
    <path d="M9 19h6" />
  {:else if name === 'play'}
    <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" stroke="none" />
  {:else if name === 'stop'}
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  {:else if name === 'close'}
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  {/if}
</svg>
