import type { DisplaySize, SourcePageMetrics } from "./types";
import { normalizeRotation } from "./units";

/** Size of the page in reading direction, not the unrotated media box. */
export function displayedSize(page: SourcePageMetrics): DisplaySize {
  const rotation = normalizeRotation(page.rotation);
  if (rotation === 90 || rotation === 270) {
    return { widthPt: page.heightPt, heightPt: page.widthPt };
  }
  return { widthPt: page.widthPt, heightPt: page.heightPt };
}
