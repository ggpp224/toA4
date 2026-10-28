import { displayedSize } from "./displayedSize";
import { ZERO_OFFSET } from "./paper";
import { placeOnPaper } from "./scale/placeOnPaper";
import { effectiveKeep } from "./sourceKeep";
import { effectiveRatio, effectiveSplit } from "./sourceCut";
import { splitPage } from "./split/splitPage";
import type {
  HalfSide,
  OffsetMm,
  OutputPageLayout,
  SourcePageMetrics,
  WorkbookJob,
} from "./types";
import { clampContentScale } from "./units";

export function outputKey(sourceIndex: number, side: HalfSide): string {
  return `${sourceIndex}:${side}`;
}

/** Page override if present, otherwise the document default. */
export function effectiveContentScale(
  job: WorkbookJob,
  sourceIndex: number,
  side: HalfSide,
): number {
  const own = job.pageContentScales[outputKey(sourceIndex, side)];
  return own === undefined ? job.plan.contentScale : clampContentScale(own);
}

export function layoutPages(
  pages: SourcePageMetrics[],
  job: WorkbookJob,
): OutputPageLayout[] {
  const layouts: OutputPageLayout[] = [];
  pages.forEach((page, sourceIndex) => {
    const size = displayedSize(page);
    const keep = effectiveKeep(job, sourceIndex, size);
    const ratio = effectiveRatio(job, sourceIndex);
    const pieces = splitPage(
      effectiveSplit(job, sourceIndex),
      { widthPt: keep.width, heightPt: keep.height },
      ratio,
    );
    for (const piece of pieces) {
      const crop = {
        x: keep.x + piece.crop.x,
        y: keep.y + piece.crop.y,
        width: piece.crop.width,
        height: piece.crop.height,
      };
      const key = outputKey(sourceIndex, piece.side);
      const adjustment = job.pageAdjustments[key];
      const rule = halfRuleFor(piece.side, job);
      const followsHalfRule = adjustment === undefined && rule !== null;
      const offset = adjustment ?? rule ?? ZERO_OFFSET;
      const placed = placeOnPaper(crop, job.plan.scaleMode, offset, {
        safeMarginMm: job.plan.safeMarginMm,
        contentScale: effectiveContentScale(job, sourceIndex, piece.side),
      });
      layouts.push({
        index: layouts.length + 1,
        sourceIndex,
        side: piece.side,
        crop,
        scale: placed.scale,
        originXPt: placed.originXPt,
        originYPt: placed.originYPt,
        offsetMm: offset,
        followsHalfRule,
        placed: placed.placed,
      });
    }
  });
  return layouts;
}

function halfRuleFor(side: HalfSide, job: WorkbookJob): OffsetMm | null {
  if (side === "left") return job.halfRules.left;
  if (side === "right") return job.halfRules.right;
  return null;
}

export function placementToDraw(layout: OutputPageLayout): {
  x: number;
  y: number;
  xScale: number;
  yScale: number;
} {
  return {
    x: layout.originXPt,
    y: layout.originYPt,
    xScale: layout.scale,
    yScale: layout.scale,
  };
}
