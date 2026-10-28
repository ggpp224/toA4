import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../layout/initialPlan";
import { layoutPages } from "../layout/layoutPages";
import type { SourcePageMetrics } from "../layout/types";
import { mmToPt } from "../layout/units";
import { applyOffset, createJob, hasPageAdjustment, restoreFollow } from "../job/job";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

describe("half-page rules", () => {
  it("shifts every left page and leaves right pages in place", () => {
    const base = layoutPages(SPREAD, createJob(detectInitialPlan(SPREAD[0]!)));
    const job = applyOffset(
      createJob(detectInitialPlan(SPREAD[0]!)),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "left",
      false,
    );
    const moved = layoutPages(SPREAD, job);
    expect(moved[0]!.originXPt).toBeCloseTo(base[0]!.originXPt + mmToPt(-5.6), 4);
    expect(moved[2]!.originXPt).toBeCloseTo(base[2]!.originXPt + mmToPt(-5.6), 4);
    expect(moved[1]!.originXPt).toBeCloseTo(base[1]!.originXPt, 4);
    expect(moved[3]!.originXPt).toBeCloseTo(base[3]!.originXPt, 4);
    expect(moved[0]!.followsHalfRule).toBe(true);
    expect(moved[2]!.followsHalfRule).toBe(true);
  });

  it("lets a zero page adjustment stop following without moving the other left page", () => {
    let job = applyOffset(
      createJob(detectInitialPlan(SPREAD[0]!)),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "left",
      false,
    );
    const following = layoutPages(SPREAD, job);
    job = applyOffset(job, { sourceIndex: 1, side: "left" }, { xMm: 0, yMm: 0 }, "page", false);
    const layouts = layoutPages(SPREAD, job);
    const base = layoutPages(SPREAD, createJob(detectInitialPlan(SPREAD[0]!)));

    expect(layouts[2]!.originXPt).toBeCloseTo(base[2]!.originXPt, 4);
    expect(layouts[2]!.followsHalfRule).toBe(false);
    expect(hasPageAdjustment(job, 1, "left")).toBe(true);
    expect(layouts[0]!.originXPt).toBeCloseTo(following[0]!.originXPt, 4);

    const restored = layoutPages(SPREAD, restoreFollow(job, 1, "left"));
    expect(restored[2]!.originXPt).toBeCloseTo(following[2]!.originXPt, 4);
    expect(restored[2]!.followsHalfRule).toBe(true);
  });

  it("keeps an existing page adjustment unless the user includes it", () => {
    let job = applyOffset(
      createJob(detectInitialPlan(SPREAD[0]!)),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "page",
      false,
    );
    job = applyOffset(job, { sourceIndex: 0, side: "left" }, { xMm: -1, yMm: 0 }, "left", false);
    let layouts = layoutPages(SPREAD, job);
    expect(layouts[0]!.offsetMm.xMm).toBe(-1);
    expect(layouts[2]!.offsetMm.xMm).toBe(-5.6);

    job = applyOffset(job, { sourceIndex: 0, side: "left" }, { xMm: -1, yMm: 0 }, "left", true);
    layouts = layoutPages(SPREAD, job);
    expect(layouts[2]!.offsetMm.xMm).toBe(-1);
    expect(layouts[2]!.followsHalfRule).toBe(true);
  });
});
