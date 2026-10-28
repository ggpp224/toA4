import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../paper";
import type { OffsetMm, PageBox, ScaleMode } from "../types";
import { clampContentScale, mmToPt } from "../units";

export function scaleFor(
  mode: ScaleMode,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): number {
  if (srcW <= 0 || srcH <= 0) return 1;
  if (mode === "original") return 1;
  const sx = dstW / srcW;
  const sy = dstH / srcH;
  return mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
}

export interface PlaceOptions {
  safeMarginMm?: number;
  contentScale?: number;
}

export function placeOnPaper(
  crop: PageBox,
  mode: ScaleMode,
  offset: OffsetMm,
  options: PlaceOptions = {},
): { scale: number; originXPt: number; originYPt: number; placed: PageBox } {
  const margin = mmToPt(options.safeMarginMm ?? 0);
  const fitSafe = mode === "fitSafe";
  const dstW = fitSafe ? Math.max(1, A4_WIDTH_PT - margin * 2) : A4_WIDTH_PT;
  const dstH = fitSafe ? Math.max(1, A4_HEIGHT_PT - margin * 2) : A4_HEIGHT_PT;
  const baseMode: ScaleMode = fitSafe ? "fit" : mode;
  const scale = scaleFor(baseMode, crop.width, crop.height, dstW, dstH)
    * clampContentScale(options.contentScale ?? 1);
  const scaledW = crop.width * scale;
  const scaledH = crop.height * scale;
  const centerDx = (A4_WIDTH_PT - scaledW) / 2;
  const centerDy = (A4_HEIGHT_PT - scaledH) / 2;
  const originXPt = -crop.x * scale + centerDx + mmToPt(offset.xMm);
  const originYPt = -crop.y * scale + centerDy + mmToPt(offset.yMm);
  return {
    scale,
    originXPt,
    originYPt,
    placed: {
      x: centerDx + mmToPt(offset.xMm),
      y: centerDy + mmToPt(offset.yMm),
      width: scaledW,
      height: scaledH,
    },
  };
}
