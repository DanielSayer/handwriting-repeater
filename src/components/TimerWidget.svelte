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
    <Icon name="move" size={16} />
    <span>Move</span>
  </button>
  <div class="timer-face" aria-hidden="true">
    <div class="timer-centre">
      <span>Time left</span>
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
    width: 168px;
    padding: 6px 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow:
      0 4px 14px rgba(29, 36, 51, 0.14),
      0 0 0 1px rgba(29, 36, 51, 0.06);
    user-select: none;
    will-change: transform;
  }
  .timer-widget.dragging {
    box-shadow:
      0 14px 30px rgba(29, 36, 51, 0.2),
      0 0 0 1px rgba(29, 36, 51, 0.06);
  }
  .drag-label {
    width: 100%;
    min-height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: grab;
    touch-action: none;
  }
  .drag-label:hover {
    background: var(--hover);
  }
  .dragging .drag-label {
    cursor: grabbing;
  }
  .timer-face {
    position: relative;
    width: 132px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    margin: 0 auto;
    border-radius: 50%;
    background: conic-gradient(
      var(--blue) 0deg var(--remaining-angle),
      #e3e7eb var(--remaining-angle) 360deg
    );
  }
  .timer-centre {
    width: 108px;
    aspect-ratio: 1;
    display: grid;
    align-content: center;
    justify-items: center;
    border-radius: 50%;
    background: #fff;
    color: var(--ink);
    text-align: center;
  }
  .timer-centre span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .timer-centre strong {
    font-size: 38px;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .timer-centre small {
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
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
      width: 140px;
    }
    .timer-face {
      width: 108px;
    }
    .timer-centre {
      width: 88px;
    }
    .timer-centre strong {
      font-size: 30px;
    }
  }
</style>
