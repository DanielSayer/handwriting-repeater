<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { getTimerSnapshot } from '../lib/timer';

  export let startedAt: number;
  export let durationMinutes: number;

  const EDGE_GAP = 18;
  const KEYBOARD_STEP = 12;

  let widget: HTMLElement;
  let dragHandle: HTMLButtonElement;
  let now = Date.now();
  let x = EDGE_GAP;
  let y = EDGE_GAP;
  let positioned = false;
  let dragging = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let positionStartX = 0;
  let positionStartY = 0;

  $: snapshot = getTimerSnapshot(startedAt, durationMinutes, now);
  $: remainingAngle = `${snapshot.progress * 360}deg`;
  $: minuteLabel = snapshot.remainingMinutes === 1 ? 'minute' : 'minutes';

  onMount(() => {
    const parent = widget.parentElement;
    const positionAtTopRight = (): void => {
      if (!parent) return;
      if (!positioned) {
        x = Math.max(EDGE_GAP, parent.clientWidth - widget.offsetWidth - EDGE_GAP);
        y = EDGE_GAP;
        positioned = true;
      } else {
        clampPosition();
      }
    };

    const resizeObserver = new ResizeObserver(positionAtTopRight);
    if (parent) resizeObserver.observe(parent);
    positionAtTopRight();

    const clock = window.setInterval(() => (now = Date.now()), 250);
    return () => {
      window.clearInterval(clock);
      resizeObserver.disconnect();
    };
  });

  function clampPosition(): void {
    const parent = widget.parentElement;
    if (!parent) return;
    x = Math.min(
      Math.max(EDGE_GAP, x),
      Math.max(EDGE_GAP, parent.clientWidth - widget.offsetWidth - EDGE_GAP)
    );
    y = Math.min(
      Math.max(EDGE_GAP, y),
      Math.max(EDGE_GAP, parent.clientHeight - widget.offsetHeight - EDGE_GAP)
    );
  }

  function startDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    dragHandle.setPointerCapture(event.pointerId);
    dragging = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    positionStartX = x;
    positionStartY = y;
  }

  function drag(event: PointerEvent): void {
    if (!dragging) return;
    event.stopPropagation();
    x = positionStartX + event.clientX - pointerStartX;
    y = positionStartY + event.clientY - pointerStartY;
    clampPosition();
  }

  function stopDrag(event: PointerEvent): void {
    if (!dragging) return;
    event.stopPropagation();
    dragging = false;
    if (dragHandle.hasPointerCapture(event.pointerId))
      dragHandle.releasePointerCapture(event.pointerId);
  }

  function moveWithKeyboard(event: KeyboardEvent): void {
    const direction = {
      ArrowLeft: [-KEYBOARD_STEP, 0],
      ArrowRight: [KEYBOARD_STEP, 0],
      ArrowUp: [0, -KEYBOARD_STEP],
      ArrowDown: [0, KEYBOARD_STEP]
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    x += direction[0];
    y += direction[1];
    clampPosition();
  }
</script>

<section
  class="timer-widget"
  class:dragging
  bind:this={widget}
  style={`--remaining-angle:${remainingAngle};transform:translate(${x}px, ${y}px)`}
  aria-label="Countdown timer. Drag to move, or use the arrow keys."
>
  <button
    class="drag-label"
    type="button"
    bind:this={dragHandle}
    aria-label="Move timer. Drag, or use the arrow keys."
    on:pointerdown={startDrag}
    on:pointermove={drag}
    on:pointerup={stopDrag}
    on:pointercancel={stopDrag}
    on:keydown={moveWithKeyboard}
  >
    <Icon name="drag" size={13} />
    <span>Drag timer</span>
  </button>
  <div class="timer-face" aria-hidden="true">
    <div class="timer-centre">
      <span>Time remaining</span>
      <strong>{snapshot.remainingMinutes}</strong>
      <small>{minuteLabel}</small>
    </div>
  </div>
  <p class="screen-reader-time" role="timer" aria-live="polite" aria-atomic="true">
    Time remaining: {snapshot.remainingMinutes}
    {minuteLabel}
  </p>
</section>

<style>
  .timer-widget {
    position: absolute;
    z-index: 10;
    top: 0;
    left: 0;
    width: 198px;
    padding: 10px 12px 15px;
    border: 1.5px solid var(--line);
    border-radius: 12px 16px 11px 15px;
    background-color: rgba(255, 254, 250, 0.98);
    background-image: radial-gradient(rgba(37, 48, 68, 0.08) 0.6px, transparent 0.7px);
    background-size: 7px 7px;
    box-shadow: var(--shadow-panel);
    user-select: none;
    will-change: transform;
  }
  .timer-widget.dragging {
    box-shadow:
      5px 7px 0 rgba(37, 48, 68, 0.1),
      0 15px 30px rgba(37, 48, 68, 0.14);
  }
  .drag-label {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    margin-bottom: 8px;
    color: var(--muted);
    border: 0;
    background: transparent;
    font: 700 11px var(--hand);
    letter-spacing: 0.02em;
    cursor: grab;
    touch-action: none;
  }
  .drag-label:focus-visible {
    border-radius: 5px;
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .dragging .drag-label {
    cursor: grabbing;
  }
  .timer-face {
    position: relative;
    width: 158px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    margin: 0 auto;
    border: 5px solid var(--paper);
    border-radius: 49% 51% 48% 52%;
    background: conic-gradient(
      from 0deg,
      var(--accent) 0deg var(--remaining-angle),
      #e3ded2 var(--remaining-angle) 360deg
    );
    box-shadow:
      inset 0 0 0 1.5px rgba(37, 48, 68, 0.45),
      2px 3px 0 #cfc7b7,
      0 0 0 1.5px var(--ink);
    transform: rotate(-0.7deg);
  }
  .timer-face::before {
    position: absolute;
    content: '';
    inset: 4px;
    border-radius: 50%;
    background: repeating-conic-gradient(var(--ink) 0deg 1deg, transparent 1deg 30deg);
    opacity: 0.45;
    mask: radial-gradient(transparent 0 83%, #000 84% 88%, transparent 89%);
    pointer-events: none;
  }
  .timer-centre {
    position: relative;
    z-index: 1;
    width: 102px;
    aspect-ratio: 1;
    display: grid;
    align-content: center;
    justify-items: center;
    border: 1px solid var(--line);
    border-radius: 51% 49% 52% 48%;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 1px 2px 0 rgba(37, 48, 68, 0.12);
    text-align: center;
    transform: rotate(0.7deg);
  }
  .timer-centre span {
    max-width: 74px;
    color: var(--muted);
    font-family: var(--hand);
    font-size: 10px;
    font-weight: 750;
    line-height: 1.15;
    letter-spacing: 0.02em;
  }
  .timer-centre strong {
    margin-top: 3px;
    font: 700 36px/0.95 var(--hand);
  }
  .timer-centre small {
    margin-top: 2px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
  }
  .screen-reader-time {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 620px) {
    .timer-widget {
      width: 166px;
      padding: 8px 9px 11px;
    }
    .timer-face {
      width: 134px;
    }
    .timer-centre {
      width: 88px;
    }
    .timer-centre strong {
      font-size: 29px;
    }
  }
</style>
