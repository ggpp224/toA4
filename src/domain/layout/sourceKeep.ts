import type { DisplaySize, PageBox, WorkbookJob } from "./types";

const MIN_KEEP_PT = 36;

export function fullKeep(size: DisplaySize): PageBox {
  return { x: 0, y: 0, width: size.widthPt, height: size.heightPt };
}

export function clampKeep(keep: PageBox, size: DisplaySize): PageBox {
  const maxW = Math.max(MIN_KEEP_PT, size.widthPt);
  const maxH = Math.max(MIN_KEEP_PT, size.heightPt);
  const width = Math.min(maxW, Math.max(MIN_KEEP_PT, keep.width));
  const height = Math.min(maxH, Math.max(MIN_KEEP_PT, keep.height));
  const x = Math.min(Math.max(0, keep.x), Math.max(0, size.widthPt - width));
  const y = Math.min(Math.max(0, keep.y), Math.max(0, size.heightPt - height));
  return {
    x,
    y,
    width: Math.min(width, size.widthPt - x),
    height: Math.min(height, size.heightPt - y),
  };
}

export function effectiveKeep(job: WorkbookJob, sourceIndex: number, size: DisplaySize): PageBox {
  const override = job.sourceKeeps[sourceIndex];
  if (!override) return fullKeep(size);
  return clampKeep(override, size);
}

export function isFullKeep(keep: PageBox, size: DisplaySize, epsilon = 0.5): boolean {
  return (
    Math.abs(keep.x) < epsilon
    && Math.abs(keep.y) < epsilon
    && Math.abs(keep.width - size.widthPt) < epsilon
    && Math.abs(keep.height - size.heightPt) < epsilon
  );
}

/** Map a keep box from bottom-left PDF space into CSS percentages (top-left origin). */
export function keepCssBox(keep: PageBox, size: DisplaySize): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const safeW = size.widthPt || 1;
  const safeH = size.heightPt || 1;
  return {
    left: (keep.x / safeW) * 100,
    top: ((size.heightPt - keep.y - keep.height) / safeH) * 100,
    width: (keep.width / safeW) * 100,
    height: (keep.height / safeH) * 100,
  };
}

export function boxFromCorners(a: { x: number; y: number }, b: { x: number; y: number }): PageBox {
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const bottom = Math.min(a.y, b.y);
  const top = Math.max(a.y, b.y);
  return { x: left, y: bottom, width: right - left, height: top - bottom };
}

/** Convert a CSS fraction of the sheet (origin top-left) into reading-direction points. */
export function fractionToKeepPoint(
  leftFraction: number,
  topFraction: number,
  size: DisplaySize,
): { x: number; y: number } {
  return {
    x: Math.min(1, Math.max(0, leftFraction)) * size.widthPt,
    y: (1 - Math.min(1, Math.max(0, topFraction))) * size.heightPt,
  };
}
