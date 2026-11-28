import { segmentAt, strokeGeometry } from './strokeGeometry';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { guideMetrics, guideBaselines } from './guide';
import { guideFontFamily, guideLetterSpacing, loadGuideFont } from './guideFonts';
import { createReplaySchedule, replayDuration, strokeReplayProgress } from './replay';
import { containRect } from './backgroundImage';
import { BOARD_BOUNDS, PAGE_RECT } from './constants';
import {
  contentRegion,
  exportSize,
  strokeBounds,
  strokesInRect,
  withPenReach
} from './exportRegion';
import type { BoardStroke, ExportBoardOptions, LineStyle, Point, Rect } from './types';

type DrawingCanvas = HTMLCanvasElement | OffscreenCanvas;
type DrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type ResolvedOptions = Omit<ExportBoardOptions, 'region'> & { region: Rect };
type PictureImage = HTMLImageElement | ImageBitmap;
interface Picture {
  image: PictureImage;
  rect: Rect;
}

const TARGET_FRAME_DELAY_MS = 80;
const MAX_GIF_FRAMES = 180;
const FINAL_FRAME_OFFSET_SECONDS = 0.001;

export interface GifFrame {
  elapsedSeconds: number;
  delayMs: number;
}

export async function encodeBoardGif(input: ExportBoardOptions): Promise<Blob> {
  if (input.guideText) await loadGuideFont(input.guideFont);
  const picture = input.backgroundImage ? await loadPicture(input.backgroundImage) : null;
  const region = resolveRegion(input, picture);
  // A view export replays only the strokes in view, so off-screen writing adds no dead time.
  const strokes = input.region === 'content' ? input.strokes : strokesInRect(input.strokes, region);
  const options: ResolvedOptions = { ...input, strokes, region };
  const { width, height } = exportSize(options.region);
  const canvas = createCanvas(width, height);
  const context = getCanvasContext(canvas);
  const baseCanvas = createCanvas(width, height);
  const baseContext = getCanvasContext(baseCanvas);
  const schedule = createReplaySchedule(options.strokes, options.playbackRate);
  const frames = createGifFramePlan(replayDuration(schedule));

  drawBackground(baseContext, width, height, options.pageColour, options.lineStyle, options);
  if (picture) drawPicture(baseContext, width, options, picture);
  drawGuide(baseContext, width, height, options);

  renderFrame(context, baseCanvas, width, height, options, schedule, frames.at(-1)!.elapsedSeconds);
  const palette = includeAnimationColours(
    quantize(context.getImageData(0, 0, width, height).data, 248)
  );
  const gif = GIFEncoder();

  for (const [index, frame] of frames.entries()) {
    renderFrame(context, baseCanvas, width, height, options, schedule, frame.elapsedSeconds);
    const pixels = context.getImageData(0, 0, width, height).data;
    const indexedPixels = applyPalette(pixels, palette);
    gif.writeFrame(indexedPixels, width, height, {
      delay: frame.delayMs,
      palette: index === 0 ? palette : undefined,
      repeat: options.loopMode ? 0 : -1
    });

    await yieldToBrowser();
  }

  gif.finish();
  if (picture && 'close' in picture.image) picture.image.close();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export function createGifFramePlan(durationSeconds: number): GifFrame[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [{ elapsedSeconds: 0, delayMs: 100 }];
  }

  const durationMs = durationSeconds * 1000;
  const frameCount = Math.min(
    MAX_GIF_FRAMES,
    Math.max(2, Math.ceil(durationMs / TARGET_FRAME_DELAY_MS) + 1)
  );
  const delayMs = Math.max(20, Math.round(durationMs / (frameCount - 1)));

  return Array.from({ length: frameCount }, (_, index) => ({
    elapsedSeconds:
      index === frameCount - 1
        ? durationSeconds + FINAL_FRAME_OFFSET_SECONDS
        : (durationSeconds * index) / (frameCount - 1),
    delayMs
  }));
}

export function partialStrokePoints(stroke: BoardStroke, progress: number): Point[] {
  if (stroke.points.length < 2 || progress <= 0) return [];
  if (progress >= 1) return stroke.points;

  const distances = strokeGeometry(stroke.points).distances;

  const totalDistance = distances.at(-1) ?? 0;
  if (totalDistance <= 0) return stroke.points.slice(0, 2);
  const targetDistance = totalDistance * progress;

  const index = segmentAt(distances.length, (index) => distances[index], targetDistance);

  const previous = stroke.points[index - 1];
  const current = stroke.points[index];
  const segmentDistance = distances[index] - distances[index - 1];
  const segmentProgress =
    segmentDistance > 0 ? (targetDistance - distances[index - 1]) / segmentDistance : 1;

  return [
    ...stroke.points.slice(0, index),
    {
      x: previous.x + (current.x - previous.x) * segmentProgress,
      y: previous.y + (current.y - previous.y) * segmentProgress
    }
  ];
}

function renderFrame(
  context: DrawingContext,
  baseCanvas: DrawingCanvas,
  width: number,
  height: number,
  options: ResolvedOptions,
  schedule: ReturnType<typeof createReplaySchedule>,
  elapsedSeconds: number
): void {
  context.clearRect(0, 0, width, height);
  context.drawImage(baseCanvas, 0, 0);

  if (options.traceMode) {
    for (const stroke of options.strokes) {
      drawStroke(context, width, height, options, stroke, stroke.points, '#9ca3af', 0.42);
    }
  }

  for (const [index, stroke] of options.strokes.entries()) {
    const timing = schedule[index];
    if (!timing) continue;
    const progress = strokeReplayProgress(stroke, timing, elapsedSeconds);
    const points = partialStrokePoints(stroke, progress);
    drawStroke(context, width, height, options, stroke, points);
  }

  const activeStrokeIndex = findActiveStroke(schedule, elapsedSeconds);
  if (activeStrokeIndex >= 0) {
    const stroke = options.strokes[activeStrokeIndex];
    const timing = schedule[activeStrokeIndex];
    const progress = strokeReplayProgress(stroke, timing, elapsedSeconds);
    drawAnimatedPen(context, width, height, options, stroke, progress);
  }
}

function includeAnimationColours(palette: number[][]): number[][] {
  const animationColours = [
    [156, 163, 175],
    [17, 24, 32],
    [215, 216, 214],
    [244, 243, 238],
    [23, 33, 56],
    [98, 112, 141],
    [255, 255, 255]
  ];

  return [
    ...palette,
    ...animationColours.filter(
      (colour) =>
        !palette.some((entry) => entry.every((channel, index) => channel === colour[index]))
    )
  ];
}

/** Board pixels to export pixels. */
function exportScale(width: number, options: ResolvedOptions): number {
  return width / options.region.width;
}

function toExport(point: Point, scale: number, region: Rect): Point {
  return { x: (point.x - region.x) * scale, y: (point.y - region.y) * scale };
}

/** First board coordinate at or after `start` on a grid of `step` offset by `phase`. */
function firstGridLine(start: number, phase: number, step: number): number {
  return phase + Math.ceil((start - phase) / step) * step;
}

function createCanvas(width: number, height: number): DrawingCanvas {
  if (typeof document === 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCanvasContext(canvas: DrawingCanvas): DrawingContext {
  const context = canvas.getContext('2d', { willReadFrequently: true }) as DrawingContext | null;
  if (!context) throw new Error('GIF export is not supported by this browser.');
  return context;
}

async function loadPicture(background: NonNullable<ExportBoardOptions['backgroundImage']>) {
  const image = await loadImage(background.src);
  const naturalWidth = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const naturalHeight = 'naturalHeight' in image ? image.naturalHeight : image.height;
  // Older boards have no picture rect: the picture is contained within the page.
  const rect = background.rect ?? containRect(naturalWidth, naturalHeight, PAGE_RECT);
  return { image, rect } satisfies Picture;
}

function resolveRegion(options: ExportBoardOptions, picture: Picture | null): Rect {
  if (options.region !== 'content') return options.region;
  return contentRegion(
    [withPenReach(strokeBounds(options.strokes)), guideRect(options), picture?.rect],
    BOARD_BOUNDS,
    PAGE_RECT
  );
}

/** Box around the guide text, in board pixels. */
function guideRect(options: ExportBoardOptions): Rect | null {
  if (!options.guideText) return null;
  const context = getCanvasContext(createCanvas(1, 1));
  const metrics = guideMetrics(
    context,
    options.guideText,
    options.repeatCount,
    options.guideSize,
    options.guideFont
  );
  const rows = guideBaselines(
    options.guideText,
    options.repeatCount,
    options.guideLayout ?? null,
    metrics
  );
  if (!rows.length) return null;
  const top = Math.min(...rows.map((row) => row.y)) - metrics.ascent;
  const bottom = Math.max(...rows.map((row) => row.y)) + metrics.descent;
  const left = Math.min(...rows.map((row) => row.x));
  return { x: left, y: top, width: metrics.width, height: bottom - top };
}

function drawPicture(
  context: DrawingContext,
  width: number,
  options: ResolvedOptions,
  picture: Picture
): void {
  const scale = exportScale(width, options);
  const origin = toExport(picture.rect, scale, options.region);
  context.save();
  context.globalAlpha = options.backgroundOpacity;
  context.drawImage(
    picture.image,
    origin.x,
    origin.y,
    picture.rect.width * scale,
    picture.rect.height * scale
  );
  context.restore();
}

async function loadImage(src: string): Promise<PictureImage> {
  if (typeof document === 'undefined') {
    const response = await fetch(src);
    return createImageBitmap(await response.blob());
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The background image could not be exported.'));
    image.src = src;
  });
}

function drawBackground(
  context: DrawingContext,
  width: number,
  height: number,
  pageColour: string,
  lineStyle: LineStyle,
  options: ResolvedOptions
): void {
  const scale = exportScale(width, options);
  const { region } = options;
  // Lines are anchored to the board origin so they stay put when the region moves.
  const ruledStart = (firstGridLine(region.y, 74, 92) - region.y) * scale;
  context.fillStyle = pageColour;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#a8c9df';
  context.strokeStyle = '#b8d4e7';
  context.lineWidth = 2 * scale;

  if (lineStyle === 'ruled') {
    for (let y = ruledStart; y < height; y += 92 * scale) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  if (lineStyle === 'dotted') {
    const dotStart = (firstGridLine(region.x, 0, 16) - region.x) * scale;
    for (let y = ruledStart; y < height; y += 92 * scale) {
      for (let x = dotStart; x < width; x += 16 * scale) {
        context.beginPath();
        context.arc(x, y, 1.5 * scale, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  if (lineStyle === 'grid') {
    context.save();
    context.globalAlpha = 0.65;
    context.lineWidth = scale;
    for (let x = (firstGridLine(region.x, 0, 48) - region.x) * scale; x < width; x += 48 * scale) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = (firstGridLine(region.y, 0, 48) - region.y) * scale; y < height; y += 48 * scale) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();
  }
}

function drawGuide(
  context: DrawingContext,
  width: number,
  height: number,
  options: ResolvedOptions
): void {
  if (!options.guideText) return;

  context.save();
  context.fillStyle = options.traceMode ? '#8f9aa6' : '#a7b0b8';
  context.globalAlpha = options.traceMode ? 0.78 : 0.62;
  const metrics = guideMetrics(
    context,
    options.guideText,
    options.repeatCount,
    options.guideSize,
    options.guideFont
  );
  const scale = exportScale(width, options);
  context.scale(scale, scale);
  context.translate(-options.region.x, -options.region.y);
  context.font = `${options.guideSize}px ${guideFontFamily(options.guideFont)}`;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${guideLetterSpacing(options.guideFont, options.guideSize)}px`;
  for (const row of guideBaselines(
    options.guideText,
    options.repeatCount,
    options.guideLayout ?? null,
    metrics
  )) {
    context.fillText(row.text, row.x, row.y);
  }
  context.restore();
}

function drawStroke(
  context: DrawingContext,
  width: number,
  height: number,
  options: ResolvedOptions,
  stroke: BoardStroke,
  points: Point[],
  colour = stroke.colour,
  opacity = stroke.opacity
): void {
  if (points.length < 2) return;

  const scale = exportScale(width, options);
  const scaledPoints = points.map((point) => toExport(point, scale, options.region));
  context.save();
  context.beginPath();
  context.moveTo(scaledPoints[0].x, scaledPoints[0].y);
  for (let index = 1; index < scaledPoints.length - 1; index += 1) {
    const current = scaledPoints[index];
    const next = scaledPoints[index + 1];
    context.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) / 2,
      (current.y + next.y) / 2
    );
  }
  const last = scaledPoints.at(-1)!;
  context.lineTo(last.x, last.y);
  context.strokeStyle = colour;
  context.globalAlpha = opacity;
  context.lineWidth = stroke.width * scale;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
  context.restore();
}

function findActiveStroke(
  schedule: ReturnType<typeof createReplaySchedule>,
  elapsedSeconds: number
): number {
  for (let index = schedule.length - 1; index >= 0; index -= 1) {
    const timing = schedule[index];
    if (
      elapsedSeconds >= timing.delaySeconds &&
      elapsedSeconds < timing.delaySeconds + timing.durationSeconds
    )
      return index;
  }
  return -1;
}

function drawAnimatedPen(
  context: DrawingContext,
  width: number,
  height: number,
  options: ResolvedOptions,
  stroke: BoardStroke,
  progress: number
): void {
  const position = pointAtProgress(stroke, progress);
  if (!position) return;

  const tangentAngle = Math.atan2(position.tangentY, position.tangentX) * (180 / Math.PI);
  const rotation = -55 + Math.max(-45, Math.min(45, tangentAngle)) * 0.18;
  const scale = exportScale(width, options);
  const origin = toExport(position, scale, options.region);

  context.save();
  context.translate(origin.x, origin.y);
  context.rotate(rotation * (Math.PI / 180));
  context.scale(scale, scale);
  context.lineJoin = 'round';
  context.shadowColor = 'rgba(24, 36, 61, 0.2)';
  context.shadowBlur = 2;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 3;

  drawPolygon(
    context,
    [
      [0, 0],
      [10, -6],
      [13, 4],
      [5, 9]
    ],
    stroke.colour,
    '#111820',
    2
  );
  drawPolygon(
    context,
    [
      [10, -6],
      [17, -8],
      [20, 4],
      [13, 6]
    ],
    '#d7d8d6',
    '#111820',
    2
  );

  context.beginPath();
  context.moveTo(17, -8);
  context.lineTo(62, -8);
  context.quadraticCurveTo(67, -8, 67, -3);
  context.lineTo(67, 3);
  context.quadraticCurveTo(67, 8, 62, 8);
  context.lineTo(17, 6);
  context.closePath();
  context.fillStyle = '#f4f3ee';
  context.strokeStyle = '#111820';
  context.lineWidth = 2.5;
  context.fill();
  context.stroke();

  context.shadowColor = 'transparent';
  context.beginPath();
  context.moveTo(23, -3);
  context.lineTo(57, -3);
  context.strokeStyle = '#ffffff';
  context.globalAlpha = 0.85;
  context.lineWidth = 2.5;
  context.lineCap = 'round';
  context.stroke();
  context.globalAlpha = 1;

  drawRoundedCap(context, stroke.colour);
  context.beginPath();
  context.moveTo(67, -8);
  context.lineTo(67, 8);
  context.strokeStyle = '#ffffff';
  context.globalAlpha = 0.45;
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

function pointAtProgress(
  stroke: BoardStroke,
  progress: number
): { x: number; y: number; tangentX: number; tangentY: number } | null {
  const points = stroke.points;
  if (points.length < 2) return null;

  const partialPoints = partialStrokePoints(stroke, progress);
  if (partialPoints.length < 2) {
    const first = points[0];
    const next = points[1];
    return { x: first.x, y: first.y, tangentX: next.x - first.x, tangentY: next.y - first.y };
  }

  const point = partialPoints.at(-1)!;
  const previous = partialPoints.at(-2)!;
  return {
    x: point.x,
    y: point.y,
    tangentX: point.x - previous.x,
    tangentY: point.y - previous.y
  };
}

function drawPolygon(
  context: DrawingContext,
  points: [number, number][],
  fill: string,
  stroke: string,
  lineWidth: number
): void {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) context.lineTo(x, y);
  context.closePath();
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.fill();
  context.stroke();
}

function drawRoundedCap(context: DrawingContext, colour: string): void {
  context.beginPath();
  context.moveTo(61, -10);
  context.lineTo(76, -10);
  context.quadraticCurveTo(80, -10, 80, -6);
  context.lineTo(80, 6);
  context.quadraticCurveTo(80, 10, 76, 10);
  context.lineTo(61, 10);
  context.closePath();
  context.fillStyle = colour;
  context.strokeStyle = '#111820';
  context.lineWidth = 2.5;
  context.fill();
  context.stroke();
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}
