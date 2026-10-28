export const PT_PER_MM = 72 / 25.4;
export const MIN_SPLIT_RATIO = 0.05;
export const MAX_SPLIT_RATIO = 0.95;
export const MIN_SAFE_MARGIN_MM = 0;
export const MAX_SAFE_MARGIN_MM = 15;
export const ASPECT_TOLERANCE = 0.04;

export function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

export function ptToMm(pt: number): number {
  return pt / PT_PER_MM;
}

export function roundMm(mm: number): number {
  return Math.round(mm * 10) / 10;
}

export function roundOffset(offset: { xMm: number; yMm: number }): {
  xMm: number;
  yMm: number;
} {
  return { xMm: roundMm(offset.xMm), yMm: roundMm(offset.yMm) };
}

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0.5;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));
}

export function clampSafeMargin(mm: number): number {
  if (!Number.isFinite(mm)) return 5;
  return Math.min(MAX_SAFE_MARGIN_MM, Math.max(MIN_SAFE_MARGIN_MM, roundMm(mm)));
}

export const MIN_CONTENT_SCALE = 0.4;
export const MAX_CONTENT_SCALE = 1.5;
export const CONTENT_SCALE_STEP = 0.05;

export function clampContentScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_CONTENT_SCALE, Math.max(MIN_CONTENT_SCALE, Math.round(scale * 100) / 100));
}

/** Step print content scale without changing paper edges or the safety dashed line. */
export function stepContentScale(scale: number, direction: -1 | 1): number {
  return clampContentScale(clampContentScale(scale) + direction * CONTENT_SCALE_STEP);
}

export function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const turns = ((Math.round(rotation) % 360) + 360) % 360;
  if (turns === 90 || turns === 180 || turns === 270) return turns;
  return 0;
}
