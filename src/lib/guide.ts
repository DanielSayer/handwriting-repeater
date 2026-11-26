import { BOARD_BOUNDS } from './constants';
import { createGuideRows } from './drawing';
import type { GuideLayout, Rect } from './types';
import {
  DEFAULT_GUIDE_FONT,
  guideFontFamily,
  guideLetterSpacing,
  type GuideFontId
} from './guideFonts';

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
  context.letterSpacing = `${guideLetterSpacing(font, size)}px`;
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

/** Keep the whole guide block inside `bounds`. */
export function constrainGuide(
  layout: GuideLayout,
  metrics: ReturnType<typeof guideMetrics>,
  bounds: Rect = BOARD_BOUNDS
): GuideLayout {
  const height = metrics.ascent + metrics.descent + (metrics.lines.length - 1) * layout.rowSpacing;
  const top = bounds.y + metrics.ascent;
  return {
    ...layout,
    x: clamp(layout.x, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - metrics.width)),
    y: clamp(layout.y, top, Math.max(top, bounds.y + bounds.height - height + metrics.ascent))
  };
}

// Old boards retain their original layout (relative to the original page) until the user
// explicitly edits the guide.
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
    x: BOARD_BOUNDS.x + BOARD_BOUNDS.width * 0.07,
    y:
      BOARD_BOUNDS.y +
      (row.topPercent / 100) * BOARD_BOUNDS.height +
      (metrics.ascent - metrics.descent) / 2
  }));
}
