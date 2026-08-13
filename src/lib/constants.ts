import type { PaperOption, PersistedBoardState } from './types';

export const STORAGE_KEY = 'repeat-whiteboard-v1';
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 560;
export const BOARD_ASPECT_RATIO = BOARD_WIDTH / BOARD_HEIGHT;

export const INK_COLOURS = [
  '#18243d',
  '#3569e8',
  '#169c82',
  '#ef6b4a',
  '#9c5bd6',
  '#efb32d'
] as const;

export const PAPER_OPTIONS: PaperOption[] = [
  { name: 'Warm white', value: '#fffdf7' },
  { name: 'Soft peach', value: '#fff0e4' },
  { name: 'Pale yellow', value: '#fff8cf' },
  { name: 'Cool blue', value: '#edf7ff' }
];

export const DEFAULT_BOARD_STATE: PersistedBoardState = {
  strokes: [],
  backgroundImage: null,
  backgroundOpacity: 1,
  penColour: INK_COLOURS[0],
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
  guideSize: 42
};
