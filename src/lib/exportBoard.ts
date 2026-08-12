import { createGuideRows } from './drawing';
import type { ExportBoardOptions, LineStyle } from './types';

export async function downloadBoardPng(options: ExportBoardOptions): Promise<void> {
  const width = 1600;
  const height = Math.round(width * (options.boardHeight / options.boardWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');

  drawBackground(context, width, height, options.pageColour, options.lineStyle);
  await drawBackgroundImage(context, width, height, options);
  drawGuide(context, width, height, options);
  drawStrokes(context, width, height, options);

  const link = document.createElement('a');
  link.download = 'my-handwriting.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function drawBackgroundImage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ExportBoardOptions
): Promise<void> {
  if (!options.backgroundImage) return;

  const image = await loadImage(options.backgroundImage.src);
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;

  context.save();
  context.globalAlpha = options.backgroundOpacity;
  context.drawImage(
    image,
    (width - imageWidth) / 2,
    (height - imageHeight) / 2,
    imageWidth,
    imageHeight
  );
  context.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The background image could not be exported.'));
    image.src = src;
  });
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageColour: string,
  lineStyle: LineStyle
): void {
  context.fillStyle = pageColour;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#b8d4e7';
  context.lineWidth = 2;

  if (lineStyle === 'ruled' || lineStyle === 'dotted') {
    for (let y = 90; y < height; y += 92) {
      context.setLineDash(lineStyle === 'dotted' ? [8, 12] : []);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  if (lineStyle === 'grid') {
    context.globalAlpha = 0.65;
    for (let x = 0; x < width; x += 64) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 64) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawGuide(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ExportBoardOptions
): void {
  if (!options.guideText) return;

  context.fillStyle = '#a7b0b8';
  context.font = `${Math.round(options.guideSize * (width / options.boardWidth))}px "Comic Sans MS", cursive`;
  for (const row of createGuideRows(options.guideText, options.repeatCount)) {
    context.fillText(row.text, width * 0.08, (row.topPercent / 100) * height);
  }
}

function drawStrokes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ExportBoardOptions
): void {
  for (const stroke of options.strokes) {
    if (stroke.points.length < 2) continue;

    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (const point of stroke.points.slice(1)) {
      context.lineTo(point.x * width, point.y * height);
    }
    context.strokeStyle = stroke.colour;
    context.globalAlpha = stroke.opacity;
    context.lineWidth = stroke.width * (width / options.boardWidth);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  }
  context.globalAlpha = 1;
}
