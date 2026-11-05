import type { PaperOption, PersistedBoardState } from './types';
import { DEFAULT_GUIDE_FONT } from './guideFonts';

export const STORAGE_KEY = 'repeat-whiteboard-v1';
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 560;
export const BOARD_ASPECT_RATIO = BOARD_WIDTH / BOARD_HEIGHT;

// Dry-erase marker palette.
export const INK_COLOURS = [
  { name: 'Black', value: '#1d2026' },
  { name: 'Blue', value: '#1f5fd1' },
  { name: 'Red', value: '#d8392f' },
  { name: 'Green', value: '#17895a' },
  { name: 'Purple', value: '#7b4fd0' },
  { name: 'Orange', value: '#e8891c' }
] as const;

export const PAPER_OPTIONS: PaperOption[] = [
  { name: 'White', value: '#fcfdfd' },
  { name: 'Cream', value: '#fff4e6' },
  { name: 'Yellow', value: '#fffbd6' },
  { name: 'Blue', value: '#eef6ff' }
];

// Colours saved by the previous design, mapped to their nearest replacement.
const LEGACY_COLOURS: Record<string, string> = {
  '#18243d': '#1d2026',
  '#3569e8': '#1f5fd1',
  '#169c82': '#17895a',
  '#ef6b4a': '#d8392f',
  '#9c5bd6': '#7b4fd0',
  '#efb32d': '#e8891c',
  '#fffdf7': '#fcfdfd',
  '#fff0e4': '#fff4e6',
  '#fff8cf': '#fffbd6',
  '#edf7ff': '#eef6ff'
};

export function migrateColour(colour: string): string {
  return LEGACY_COLOURS[colour.toLowerCase()] ?? colour;
}

export const PEN_SIZES = [
  { name: 'Thin', value: 3 },
  { name: 'Medium', value: 6 },
  { name: 'Thick', value: 10 }
] as const;

// Speed steps map to playback rates of 1/4, 1/2, 1 and 2 (see playbackRateForSpeed).
export const SPEED_OPTIONS = [
  { label: '¼×', value: -1 },
  { label: '½×', value: 1 },
  { label: '1×', value: 3 },
  { label: '2×', value: 5 }
] as const;

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;

export const DEFAULT_BOARD_STATE: PersistedBoardState = {
  strokes: [],
  backgroundImage: null,
  backgroundOpacity: 1,
  penColour: INK_COLOURS[0].value,
  penSize: 6,
  penType: 'marker',
  pageColour: PAPER_OPTIONS[0].value,
  lineStyle: 'ruled',
  zoom: 1,
  speed: 3,
  loopMode: false,
  traceMode: false,
  guideText: '',
  repeatCount: 4,
  guideSize: 42,
  guideLayout: null,
  guideFont: DEFAULT_GUIDE_FONT
};
