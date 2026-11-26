import {
  BOARD_BOUNDS,
  PAGE_RECT,
  DEFAULT_BOARD_STATE,
  STORAGE_KEY,
  ZOOM_MAX,
  ZOOM_MIN,
  migrateColour
} from './constants';
import { isGuideFont } from './guideFonts';
import type { BoardStroke, PersistedBoardState, Point, Rect } from './types';

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

// Version 1 stored points as fractions of the page.
const LEGACY_POINT_SPACE: Rect = { x: 0, y: 0, width: 1, height: 1 };

function pointIn(bounds: Rect) {
  return (value: unknown): value is Point =>
    record(value) &&
    numberInRange(value.x, bounds.x, bounds.x + bounds.width) &&
    numberInRange(value.y, bounds.y, bounds.y + bounds.height) &&
    (value.elapsedMs === undefined || numberInRange(value.elapsedMs, 0, Number.MAX_SAFE_INTEGER));
}

function strokeIn(bounds: Rect) {
  const point = pointIn(bounds);
  return (value: unknown): value is BoardStroke =>
    record(value) &&
    typeof value.id === 'string' &&
    colour(value.colour) &&
    numberInRange(value.width, 1, 100) &&
    numberInRange(value.opacity, 0, 1) &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.every(point);
}

function legacyStrokeToBoard(stroke: BoardStroke): BoardStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({
      ...point,
      x: PAGE_RECT.x + point.x * PAGE_RECT.width,
      y: PAGE_RECT.y + point.y * PAGE_RECT.height
    }))
  };
}

/** Treat local storage as untrusted input. Recover valid fields independently. */
export function parseBoardState(value: unknown): PersistedBoardState {
  const state = { ...DEFAULT_BOARD_STATE, strokes: [] as BoardStroke[] };
  if (!record(value)) return state;
  if (Array.isArray(value.strokes)) {
    const legacy = value.version === undefined;
    const valid = value.strokes.filter(strokeIn(legacy ? LEGACY_POINT_SPACE : BOARD_BOUNDS));
    const ids = new Set<string>();
    state.strokes = (legacy ? valid.map(legacyStrokeToBoard) : valid).map((item) => {
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
  if (colour(value.penColour)) state.penColour = migrateColour(value.penColour);
  if (colour(value.pageColour)) state.pageColour = migrateColour(value.pageColour);
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
  if (numberInRange(value.zoom, ZOOM_MIN, ZOOM_MAX)) state.zoom = value.zoom;
  if (numberInRange(value.speed, -1, 5)) state.speed = value.speed;
  if (numberInRange(value.repeatCount, 1, 8)) state.repeatCount = Math.round(value.repeatCount);
  if (numberInRange(value.guideSize, 12, 160)) state.guideSize = value.guideSize;
  if (
    record(value.guideLayout) &&
    numberInRange(value.guideLayout.x, BOARD_BOUNDS.x, BOARD_BOUNDS.x + BOARD_BOUNDS.width) &&
    numberInRange(value.guideLayout.y, BOARD_BOUNDS.y, BOARD_BOUNDS.y + BOARD_BOUNDS.height) &&
    numberInRange(value.guideLayout.rowSpacing, 16, 160)
  ) {
    state.guideLayout = {
      x: value.guideLayout.x,
      y: value.guideLayout.y,
      rowSpacing: value.guideLayout.rowSpacing
    };
  }
  if (typeof value.guideText === 'string') state.guideText = value.guideText;
  if (isGuideFont(value.guideFont)) state.guideFont = value.guideFont;
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
