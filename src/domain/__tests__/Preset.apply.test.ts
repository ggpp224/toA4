import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../layout/initialPlan";
import { layoutPages } from "../layout/layoutPages";
import type { SourcePageMetrics } from "../layout/types";
import { applyOffset, createJob } from "../job/job";
import { applyPreset, presetFromJob } from "../preset/preset";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

describe("presets", () => {
  it("stores the shared plan and half-page rules, not a one-page nudge", () => {
    let job = applyOffset(
      createJob(detectInitialPlan(SPREAD[0]!)),
      { sourceIndex: 0, side: "left" },
      { xMm: -5.6, yMm: 0.4 },
      "left",
      false,
    );
    job = applyOffset(job, { sourceIndex: 1, side: "left" }, { xMm: -1.2, yMm: 0 }, "page", false);
    const preset = presetFromJob(job, "单元一", "preset-1");
    expect(preset).toMatchObject({
      split: "vertical",
      scaleMode: "cover",
      splitRatio: 0.5,
      safeMarginMm: 5,
      leftOffset: { xMm: -5.6, yMm: 0.4 },
      rightOffset: { xMm: 0, yMm: 0 },
    });
    expect(preset).not.toHaveProperty("pageAdjustments");

    const fresh = applyPreset(createJob(detectInitialPlan(SPREAD[0]!)), preset);
    expect(fresh.pageAdjustments).toEqual({});
    const layouts = layoutPages(SPREAD, fresh);
    expect(layouts[0]!.offsetMm).toEqual({ xMm: -5.6, yMm: 0.4 });
    expect(layouts[2]!.offsetMm).toEqual({ xMm: -5.6, yMm: 0.4 });

    const kept = applyPreset(job, {
      ...preset,
      leftOffset: { xMm: -3, yMm: 0 },
    });
    expect(kept.pageAdjustments["1:left"]).toEqual({ xMm: -1.2, yMm: 0 });
    expect(layoutPages(SPREAD, kept)[2]!.offsetMm.xMm).toBe(-1.2);
    expect(layoutPages(SPREAD, kept)[0]!.offsetMm.xMm).toBe(-3);
  });
});
