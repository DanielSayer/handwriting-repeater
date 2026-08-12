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
    height: 60px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 20px;
    background: var(--panel);
    border-bottom: 1.5px solid var(--line);
    box-shadow: 0 3px 0 rgba(37, 48, 68, 0.035);
    z-index: 10;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 48% 43% 46% 40%;
    background: var(--ink);
    box-shadow: 2px 3px 0 var(--accent);
    transform: rotate(-2deg);
  }
  .brand-mark svg {
    width: 28px;
    fill: none;
    stroke: #fffaf0;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .brand-copy h1 {
    position: relative;
    margin: 0;
    font-family: var(--hand);
    font-size: 23px;
    font-weight: 700;
    line-height: 1;
  }
  .brand-copy h1::after {
    content: '';
    position: absolute;
    left: 1px;
    bottom: -3px;
    width: 54px;
    height: 2px;
    border-radius: 50%;
    background: var(--accent);
    transform: rotate(-2deg);
  }
  .brand-copy p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  @media (max-width: 620px) {
    .topbar {
      height: 54px;
      padding: 8px 14px;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
    }
    .brand-copy h1 {
      font-size: 18px;
    }
    .brand-copy p {
      display: none;
    }
  }
</style>
