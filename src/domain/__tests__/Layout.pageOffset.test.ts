import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../layout/initialPlan";
import { layoutPages } from "../layout/layoutPages";
import { cropDrawRects } from "../layout/previewRects";
import { displayedSize } from "../layout/displayedSize";
import type { SourcePageMetrics } from "../layout/types";
import { mmToPt } from "../layout/units";
import { applyOffset, createJob, updatePlan } from "../job/job";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

function baseJob() {
  return createJob(detectInitialPlan(SPREAD[0]!));
}

describe("single page offset", () => {
  it("moves only output page 3 left by 5.6 mm and replaces any half-page rule", () => {
    const base = layoutPages(SPREAD, baseJob());
    let job = applyOffset(
      baseJob(),
      { sourceIndex: 0, side: "left" },
      { xMm: -2, yMm: 1 },
      "left",
      false,
    );
    job = applyOffset(job, { sourceIndex: 1, side: "left" }, { xMm: -5.6, yMm: 0 }, "page", false);
    const moved = layoutPages(SPREAD, job);

    expect(moved[0]!.originXPt).toBeCloseTo(base[0]!.originXPt + mmToPt(-2), 4);
    expect(moved[1]!.originXPt).toBeCloseTo(base[1]!.originXPt, 4);
    expect(moved[2]!.originXPt).toBeCloseTo(base[2]!.originXPt + mmToPt(-5.6), 4);
    expect(moved[2]!.originYPt).toBeCloseTo(base[2]!.originYPt, 4);
    expect(moved[3]).toMatchObject({
      originXPt: base[3]!.originXPt,
      originYPt: base[3]!.originYPt,
    });
    expect(moved[2]!.followsHalfRule).toBe(false);
    expect(moved[2]!.offsetMm).toEqual({ xMm: -5.6, yMm: 0 });
    expect(moved[2]!.originXPt).not.toBeCloseTo(base[2]!.originXPt + mmToPt(-7.6), 1);
  });

  it("keeps the page nudge when the shared cut changes", () => {
    let job = applyOffset(
      baseJob(),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "page",
      false,
    );
    job = updatePlan(job, { splitRatio: 0.42 });
    const layouts = layoutPages(SPREAD, job);
    expect(layouts[2]!.offsetMm.xMm).toBe(-5.6);
    expect(layouts[2]!.crop.width).toBeCloseTo(841.89 * 0.42, 2);
    expect(layouts[0]!.crop.width).toBeCloseTo(841.89 * 0.42, 2);
  });

  it("uses the same placed rectangle for the preview bitmap", () => {
    const job = applyOffset(
      baseJob(),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "page",
      false,
    );
    const page = layoutPages(SPREAD, job)[2]!;
    const rects = cropDrawRects(
      page,
      displayedSize(SPREAD[1]!),
      { widthPx: 842, heightPx: 595 },
      { widthPx: 595, heightPx: 842 },
    );
    const expectedShiftPx = (mmToPt(-5.6) / 595.28) * 595;
    expect(rects.dest.x).toBeCloseTo(expectedShiftPx, 0);
    expect(rects.source.width).toBeCloseTo(421, 0);
  });
});
