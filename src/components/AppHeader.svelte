<script lang="ts">
</script>

<header class="topbar">
  <div class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <path d="M11 32c4-12 14-22 25-22-1 11-10 23-23 25" />
      <path d="M13 35c9-2 16-4 24-8" />
    </svg>
  </div>
  <div class="brand-copy">
    <h1>Repeat</h1>
    <p>handwriting whiteboard</p>
  </div>
</header>

<style>
  .topbar {
    height: 78px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 22px;
    background: rgba(250, 248, 242, 0.94);
    border-bottom: 1px solid #d8d3c8;
    box-shadow: 0 4px 18px rgba(36, 43, 50, 0.06);
    z-index: 10;
  }
  .brand-mark {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px 12px 16px 11px;
    background: var(--ink);
    transform: rotate(-2deg);
  }
  .brand-mark svg {
    width: 36px;
    fill: none;
    stroke: #fffaf0;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .brand-copy h1 { margin: 0; font-size: 23px; letter-spacing: -0.5px; line-height: 1; }
  .brand-copy p { margin: 5px 0 0; color: var(--muted); font-size: 12px; letter-spacing: 0.04em; }
  @media (max-width: 620px) {
    .topbar { height: 68px; padding: 10px 13px; }
    .brand-mark { width: 42px; height: 42px; }
    .brand-copy h1 { font-size: 20px; }
    .brand-copy p { display: none; }
  }
</style>
