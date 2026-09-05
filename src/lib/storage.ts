import { DEFAULT_BOARD_STATE, STORAGE_KEY } from './constants';
import type { BoardStroke, PersistedBoardState, Point } from './types';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberInRange(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

function colour(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

function point(value: unknown): value is Point {
  return (
    record(value) &&
    numberInRange(value.x, 0, 1) &&
    numberInRange(value.y, 0, 1) &&
    (value.elapsedMs === undefined || numberInRange(value.elapsedMs, 0, Number.MAX_SAFE_INTEGER))
  );
}

function stroke(value: unknown): value is BoardStroke {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    colour(value.colour) &&
    numberInRange(value.width, 1, 100) &&
    numberInRange(value.opacity, 0, 1) &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.every(point)
  );
}

/** Treat local storage as untrusted input. Recover valid fields independently. */
export function parseBoardState(value: unknown): PersistedBoardState {
  const state = { ...DEFAULT_BOARD_STATE, strokes: [] as BoardStroke[] };
  if (!record(value)) return state;
  if (Array.isArray(value.strokes)) {
    const ids = new Set<string>();
    state.strokes = value.strokes.filter(stroke).map((item) => {
      let id = item.id;
      while (ids.has(id)) id += '-duplicate';
      ids.add(id);
      return id === item.id ? item : { ...item, id };
    });
  }
  if (
    record(value.backgroundImage) &&
    typeof value.backgroundImage.src === 'string' &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value.backgroundImage.src) &&
    typeof value.backgroundImage.name === 'string'
  ) {
    state.backgroundImage = { src: value.backgroundImage.src, name: value.backgroundImage.name };
  }
  if (colour(value.penColour)) state.penColour = value.penColour;
  if (colour(value.pageColour)) state.pageColour = value.pageColour;
  if (value.penType === 'marker' || value.penType === 'pencil') state.penType = value.penType;
  if (
    value.lineStyle === 'ruled' ||
    value.lineStyle === 'dotted' ||
    value.lineStyle === 'grid' ||
    value.lineStyle === 'blank'
  )
    state.lineStyle = value.lineStyle;
  if (numberInRange(value.penSize, 1, 100)) state.penSize = value.penSize;
  if (numberInRange(value.backgroundOpacity, 0, 1))
    state.backgroundOpacity = value.backgroundOpacity;
  if (numberInRange(value.zoom, 0.8, 1.25)) state.zoom = value.zoom;
  if (numberInRange(value.speed, -1, 5)) state.speed = value.speed;
  if (numberInRange(value.repeatCount, 1, 8)) state.repeatCount = Math.round(value.repeatCount);
  if (numberInRange(value.guideSize, 16, 100)) state.guideSize = value.guideSize;
  if (typeof value.guideText === 'string') state.guideText = value.guideText;
  if (typeof value.loopMode === 'boolean') state.loopMode = value.loopMode;
  if (typeof value.traceMode === 'boolean') state.traceMode = value.traceMode;
  return state;
}

export function loadBoard(): PersistedBoardState | null {
  const rawState = localStorage.getItem(STORAGE_KEY);
  if (!rawState) return null;
  return parseBoardState(JSON.parse(rawState));
}

export function saveBoard(state: PersistedBoardState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Collapse input bursts, with a maximum wait and an explicit lifecycle flush. */
export function createBoardSaver(write = saveBoard, onError: (failed: boolean) => void = () => {}) {
  let pending: PersistedBoardState | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;

  function flush(): void {
    clearTimeout(debounce);
    clearTimeout(deadline);
    deadline = undefined;
    if (!pending) return;
    try {
      write(pending);
      pending = undefined;
      onError(false);
    } catch {
      onError(true);
    }
  }

  return {
    schedule(state: PersistedBoardState): void {
      pending = state;
      clearTimeout(debounce);
      debounce = setTimeout(flush, 300);
      deadline ??= setTimeout(flush, 2000);
    },
    flush
  };
}
