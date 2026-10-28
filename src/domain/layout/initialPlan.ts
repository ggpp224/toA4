import { displayedSize } from "./displayedSize";
import type { DefaultPlan, SourcePageMetrics } from "./types";
import { ASPECT_TOLERANCE } from "./units";

function nearSqrt2(longSide: number, shortSide: number): boolean {
  if (shortSide <= 0) return false;
  return Math.abs(longSide / shortSide - Math.SQRT2) / Math.SQRT2 <= ASPECT_TOLERANCE;
}

export function isNearLandscapeA4(widthPt: number, heightPt: number): boolean {
  return widthPt > heightPt && nearSqrt2(widthPt, heightPt);
}

export function isNearPortraitA4(widthPt: number, heightPt: number): boolean {
  return heightPt > widthPt && nearSqrt2(heightPt, widthPt);
}

export function detectInitialPlan(page: SourcePageMetrics): DefaultPlan {
  const size = displayedSize(page);
  if (isNearLandscapeA4(size.widthPt, size.heightPt)) {
    return {
      split: "vertical",
      splitRatio: 0.5,
      scaleMode: "cover",
      safeMarginMm: 5,
      contentScale: 1,
    };
  }
  return {
    split: "none",
    splitRatio: 0.5,
    scaleMode: "fit",
    safeMarginMm: 5,
    contentScale: 1,
  };
}
