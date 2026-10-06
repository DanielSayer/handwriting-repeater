import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import { createGuideRows } from './drawing';
import type { GuideLayout } from './types';
import { DEFAULT_GUIDE_FONT, guideFontFamily, type GuideFontId } from './guideFonts';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function guideLines(text: string, repeats: number): string[] {
  const lines = text.split(/\r?\n/);
  return Array.from({ length: clamp(Math.round(repeats), 1, 8) }, () => lines).flat();
}

export function guideMetrics(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  repeats: number,
  size: number,
  font: GuideFontId = DEFAULT_GUIDE_FONT
) {
  context.font = `${size}px ${guideFontFamily(font)}`;
  context.letterSpacing = `${size * 0.05}px`;
  const lines = guideLines(text, repeats);
  const metrics = lines.map((line) => context.measureText(line || ' '));
  return {
    lines,
    width: Math.max(24, ...metrics.map((metric) => metric.width)),
    ascent: Math.max(size * 0.65, ...metrics.map((metric) => metric.actualBoundingBoxAscent || 0)),
    descent: Math.max(size * 0.15, ...metrics.map((metric) => metric.actualBoundingBoxDescent || 0))
  };
}

export function guideBounds(metrics: ReturnType<typeof guideMetrics>, layout: GuideLayout) {
  return {
    x: layout.x,
    y: layout.y - metrics.ascent,
    width: metrics.width,
    height: metrics.ascent + metrics.descent + (metrics.lines.length - 1) * layout.rowSpacing
  };
}

export function constrainGuide(
  layout: GuideLayout,
  metrics: ReturnType<typeof guideMetrics>
): GuideLayout {
  const height = metrics.ascent + metrics.descent + (metrics.lines.length - 1) * layout.rowSpacing;
  return {
    ...layout,
    x: clamp(layout.x, 0, Math.max(0, BOARD_WIDTH - metrics.width)),
    y: clamp(
      layout.y,
      metrics.ascent,
      Math.max(metrics.ascent, BOARD_HEIGHT - height + metrics.ascent)
    )
  };
}

// Old boards retain their original layout until the user explicitly edits the guide.
export function guideBaselines(
  text: string,
  repeats: number,
  layout: GuideLayout | null,
  metrics: ReturnType<typeof guideMetrics>
) {
  if (layout)
    return metrics.lines.map((text, index) => ({
      text,
      x: layout.x,
      y: layout.y + index * layout.rowSpacing
    }));
  return createGuideRows(text, repeats).map((row) => ({
    text: row.text,
    x: BOARD_WIDTH * 0.07,
    y: (row.topPercent / 100) * BOARD_HEIGHT + (metrics.ascent - metrics.descent) / 2
  }));
}
