import { A4_HEIGHT_PT, A4_WIDTH_PT } from "./paper";
import type { DisplaySize, OutputPageLayout, PageBox } from "./types";

export interface PixelSize {
  widthPx: number;
  heightPx: number;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Map a layout crop onto a source bitmap and an A4 preview canvas. */
export function cropDrawRects(
  layout: OutputPageLayout,
  displayed: DisplaySize,
  source: PixelSize,
  dest: PixelSize,
): { source: DrawRect; dest: DrawRect } {
  return {
    source: displayRectToCanvas(layout.crop, displayed, source),
    dest: {
      x: (layout.placed.x / A4_WIDTH_PT) * dest.widthPx,
      y:
        ((A4_HEIGHT_PT - layout.placed.y - layout.placed.height) / A4_HEIGHT_PT) *
        dest.heightPx,
      width: (layout.placed.width / A4_WIDTH_PT) * dest.widthPx,
      height: (layout.placed.height / A4_HEIGHT_PT) * dest.heightPx,
    },
  };
}

export function displayRectToCanvas(
  rect: PageBox,
  displayed: DisplaySize,
  canvas: PixelSize,
): DrawRect {
  const safeW = displayed.widthPt || 1;
  const safeH = displayed.heightPt || 1;
  return {
    x: (rect.x / safeW) * canvas.widthPx,
    y: ((displayed.heightPt - rect.y - rect.height) / safeH) * canvas.heightPx,
    width: (rect.width / safeW) * canvas.widthPx,
    height: (rect.height / safeH) * canvas.heightPx,
  };
}

/**
 * Where the selected source crop may paint on A4.
 * Finished pages must clip to this so nudging cannot reveal content outside the keep/split box.
 */
export function visibleOutputClip(layout: OutputPageLayout): PageBox | null {
  return intersectBox(layout.placed, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  });
}

/** Parts of the crop that land outside the A4 page, in reading-direction space. */
export function overflowCropRects(layout: OutputPageLayout): PageBox[] {
  const paper = { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT };
  const visible = intersectBox(layout.placed, paper);
  if (!visible || visible.width < 0.8 || visible.height < 0.8) return [layout.crop];
  const vis = {
    x: layout.crop.x + (visible.x - layout.placed.x) / layout.scale,
    y: layout.crop.y + (visible.y - layout.placed.y) / layout.scale,
    width: visible.width / layout.scale,
    height: visible.height / layout.scale,
  };
  const crop = layout.crop;
  const rects: PageBox[] = [];
  const leftGap = vis.x - crop.x;
  if (leftGap > 0.8) {
    rects.push({ x: crop.x, y: crop.y, width: leftGap, height: crop.height });
  }
  const rightGap = crop.x + crop.width - (vis.x + vis.width);
  if (rightGap > 0.8) {
    rects.push({ x: vis.x + vis.width, y: crop.y, width: rightGap, height: crop.height });
  }
  const bottomGap = vis.y - crop.y;
  if (bottomGap > 0.8) {
    rects.push({ x: vis.x, y: crop.y, width: vis.width, height: bottomGap });
  }
  const topGap = crop.y + crop.height - (vis.y + vis.height);
  if (topGap > 0.8) {
    rects.push({ x: vis.x, y: vis.y + vis.height, width: vis.width, height: topGap });
  }
  return rects;
}

function intersectBox(a: PageBox, b: PageBox): PageBox | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.min(a.y + a.height, b.y + b.height);
  if (right <= x || top <= y) return null;
  return { x, y, width: right - x, height: top - y };
}
