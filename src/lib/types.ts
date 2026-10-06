import type { GuideFontId } from './guideFonts';

export type PenType = 'marker' | 'pencil';
export type LineStyle = 'ruled' | 'dotted' | 'grid' | 'blank';

export interface Point {
  x: number;
  y: number;
  elapsedMs?: number;
}

export interface BoardStroke {
  id: string;
  colour: string;
  width: number;
  opacity: number;
  points: Point[];
}

export interface BoardBackground {
  src: string;
  name: string;
}

export interface PaperOption {
  name: string;
  value: string;
}

export interface GuideRow {
  id: number;
  text: string;
  topPercent: number;
}

export interface GuideLayout {
  x: number;
  y: number;
  rowSpacing: number;
}

export interface PersistedBoardState {
  strokes: BoardStroke[];
  backgroundImage: BoardBackground | null;
  backgroundOpacity: number;
  penColour: string;
  penSize: number;
  penType: PenType;
  pageColour: string;
  lineStyle: LineStyle;
  zoom: number;
  speed: number;
  loopMode: boolean;
  traceMode: boolean;
  guideText: string;
  repeatCount: number;
  guideSize: number;
  guideLayout: GuideLayout | null;
  guideFont: GuideFontId;
}

export interface ExportBoardOptions {
  strokes: BoardStroke[];
  backgroundImage: BoardBackground | null;
  backgroundOpacity: number;
  boardWidth: number;
  boardHeight: number;
  pageColour: string;
  lineStyle: LineStyle;
  guideText: string;
  repeatCount: number;
  guideSize: number;
  guideLayout?: GuideLayout | null;
  guideFont?: GuideFontId;
  playbackRate: number;
  traceMode: boolean;
  loopMode: boolean;
}
