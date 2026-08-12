<script lang="ts">
  export let x: number;
  export let y: number;
  export let rotation: number;
  export let colour: string;
  export let scale: number;
</script>

<g
  class="animated-pen"
  transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
  aria-hidden="true"
>
  <path class="nib" d="M0 0 10-6 13 4 5 9Z" fill={colour} />
  <path class="collar" d="M10-6 17-8 20 4 13 6Z" fill="#d7d8d6" />
  <path class="barrel" d="M17-8 62-8Q67-8 67-3V3Q67 8 62 8L17 6Z" />
  <path class="barrel-shine" d="M23-3H57" />
  <path class="cap" d="M61-10H76Q80-10 80-6V6Q80 10 76 10H61Z" />
  <path class="cap-line" d="M67-8V8" />
</g>

<style>
  .animated-pen {
    pointer-events: none;
    filter: drop-shadow(2px 3px 2px rgba(24, 36, 61, 0.2));
  }
  .nib {
    stroke: #111820;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .collar {
    stroke: #111820;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .barrel {
    fill: #f4f3ee;
    stroke: #111820;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .barrel-shine {
    fill: none;
    stroke: #fff;
    stroke-width: 2.5;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .cap {
    fill: #172138;
    stroke: #111820;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .cap-line {
    stroke: #62708d;
    stroke-width: 2;
    opacity: 0.65;
  }
</style>
