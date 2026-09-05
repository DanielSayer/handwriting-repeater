<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import AnimatedPen from './AnimatedPen.svelte';
  import { BOARD_WIDTH, BOARD_HEIGHT } from '../lib/constants';
  import { smoothPath } from '../lib/drawing';
  import { createReplaySchedule, strokeReplayProgress } from '../lib/replay';
  import type { StrokeReplayTiming } from '../lib/replay';
  import type { BoardStroke } from '../lib/types';
  export let strokes: BoardStroke[];
  export let traceMode: boolean;
  export let replaying: boolean;
  export let replayNonce: number;
  export let playbackRate: number;
  let replayPaths: SVGPathElement[] = [];
  let pathLengths: number[] = [];
  let nextStroke = 0;
  let disposed = false;
  let penAnimationFrame: number | undefined;
  let penVisible = false;
  let penX = 0;
  let penY = 0;
  let penRotation = -55;
  let animatedPenColour = '#18243d';
  const paths = new WeakMap<BoardStroke, string>();
  function pathFor(stroke: BoardStroke): string {
    let path = paths.get(stroke);
    if (path === undefined) {
      path = smoothPath(stroke.points, BOARD_WIDTH, BOARD_HEIGHT);
      paths.set(stroke, path);
    }
    return path;
  }
  $: renderedStrokes = strokes.map((stroke) => ({ stroke, path: pathFor(stroke) }));
  $: replaySchedule = createReplaySchedule(strokes, playbackRate);
  $: if (replaying) void startPenAnimation(replayNonce);
  $: if (!replaying) stopPenAnimation();
  onDestroy(() => {
    disposed = true;
    stopPenAnimation();
  });
  async function startPenAnimation(nonce: number): Promise<void> {
    stopPenAnimation();
    await tick();
    if (disposed || !replaying || nonce !== replayNonce) return;

    nextStroke = 0;
    pathLengths = replayPaths.map((path) => path?.getTotalLength() ?? 0);
    const startedAt = performance.now();
    const frame = (timestamp: number): void => {
      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const activeIndex = updateReplayPaths(elapsedSeconds);
      if (activeIndex >= 0) updatePenPosition(activeIndex, elapsedSeconds);
      else penVisible = false;

      penAnimationFrame = requestAnimationFrame(frame);
    };
    penAnimationFrame = requestAnimationFrame(frame);
  }

  function stopPenAnimation(): void {
    if (penAnimationFrame !== undefined) cancelAnimationFrame(penAnimationFrame);
    penAnimationFrame = undefined;
    penVisible = false;
  }

  function updatePenPosition(index: number, elapsedSeconds: number): void {
    const path = replayPaths[index];
    const stroke = strokes[index];
    if (!path || !stroke) return;

    const timing = timingFor(index);
    const progress = strokeReplayProgress(stroke, timing, elapsedSeconds);
    const length = pathLengths[index];
    const distance = length * progress;
    const point = path.getPointAtLength(distance);
    const nearbyPoint = path.getPointAtLength(
      Math.min(length, distance + Math.max(1, length * 0.01))
    );
    const tangentAngle =
      Math.atan2(nearbyPoint.y - point.y, nearbyPoint.x - point.x) * (180 / Math.PI);

    penX = point.x;
    penY = point.y;
    penRotation = -55 + Math.max(-45, Math.min(45, tangentAngle)) * 0.18;
    animatedPenColour = stroke.colour;
    penVisible = true;
  }

  function updateReplayPaths(elapsedSeconds: number): number {
    while (nextStroke < strokes.length) {
      const timing = timingFor(nextStroke);
      const path = replayPaths[nextStroke];
      if (elapsedSeconds >= timing.delaySeconds + timing.durationSeconds) {
        if (path) path.style.strokeDashoffset = '0';
        nextStroke += 1;
        continue;
      }
      if (elapsedSeconds < timing.delaySeconds) return -1;
      if (path)
        path.style.strokeDashoffset = String(
          1 - strokeReplayProgress(strokes[nextStroke], timing, elapsedSeconds)
        );
      return nextStroke;
    }
    return -1;
  }

  function timingFor(index: number): StrokeReplayTiming {
    return replaySchedule[index] ?? { delaySeconds: 0, durationSeconds: 0.04 };
  }
</script>

{#key replayNonce}
  <g class:replaying>
    {#if traceMode && replaying}
      <g class="trace-stroke-layer" aria-hidden="true">
        {#each renderedStrokes as { stroke, path } (stroke.id)}
          <path
            d={path}
            fill="none"
            stroke="#9ca3af"
            stroke-width={stroke.width}
            stroke-opacity={0.42}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/each}
      </g>
    {/if}
    {#each renderedStrokes as { stroke, path }, index (stroke.id)}
      <path
        bind:this={replayPaths[index]}
        class="replay-path"
        d={path}
        fill="none"
        stroke={stroke.colour}
        stroke-width={stroke.width}
        stroke-opacity={stroke.opacity}
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="1"
        style={`--delay:${timingFor(index).delaySeconds}s;--duration:${timingFor(index).durationSeconds}s`}
      />
    {/each}
  </g>
{/key}
{#if penVisible}
  <AnimatedPen x={penX} y={penY} rotation={penRotation} colour={animatedPenColour} scale={1} />
{/if}

<style>
  .replaying .replay-path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  .trace-stroke-layer {
    pointer-events: none;
  }
</style>
