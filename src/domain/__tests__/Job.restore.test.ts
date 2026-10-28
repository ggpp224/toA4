import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../layout/initialPlan";
import type { SourcePageMetrics } from "../layout/types";
import {
  applyOffset,
  createJob,
  restoreInitial,
  setSourceSplitRatio,
  updatePlan,
} from "../job/job";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

describe("restore initial plan", () => {
  it("clears cut overrides, half-page rules, and page nudges", () => {
    let job = setSourceSplitRatio(createJob(detectInitialPlan(SPREAD[0]!)), 0, 0.4);
    job = updatePlan(job, { safeMarginMm: 12, scaleMode: "original" });
    job = applyOffset(job, { sourceIndex: 0, side: "left" }, { xMm: -5.6, yMm: 2 }, "all", false);
    job = applyOffset(job, { sourceIndex: 0, side: "right" }, { xMm: 3, yMm: 0 }, "page", false);
    const restored = restoreInitial(SPREAD);
    expect(restored).toEqual(createJob(detectInitialPlan(SPREAD[0]!)));
    expect(restored.plan.safeMarginMm).toBe(5);
    expect(job.pageAdjustments["0:right"]).toEqual({ xMm: 3, yMm: 0 });
  });
});
