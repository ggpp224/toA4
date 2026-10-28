import { describe, expect, it } from "vitest";
import { layoutPages } from "../layout/layoutPages";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../layout/paper";
import type { SourcePageMetrics } from "../layout/types";
import { createJob } from "../job/job";
import { detectInitialPlan } from "../layout/initialPlan";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

describe("vertical cover of a landscape A4 spread", () => {
  const job = createJob(detectInitialPlan(SPREAD[0]!));
  const layouts = layoutPages(SPREAD, job);

  it("emits four portrait pages in left-then-right order", () => {
    expect(layouts.map((page) => page.side)).toEqual(["left", "right", "left", "right"]);
    expect(layouts.map((page) => page.sourceIndex)).toEqual([0, 0, 1, 1]);
    expect(layouts.map((page) => page.index)).toEqual([1, 2, 3, 4]);
    expect(job.plan).toMatchObject({ split: "vertical", scaleMode: "cover", splitRatio: 0.5 });
  });

  it("scales each half uniformly so it covers A4", () => {
    for (const page of layouts) {
      expect(page.scale).toBeGreaterThan(1);
      expect(page.placed.width).toBeGreaterThanOrEqual(A4_WIDTH_PT - 0.2);
      expect(page.placed.height).toBeGreaterThanOrEqual(A4_HEIGHT_PT - 0.2);
      expect(page.crop.width).toBeCloseTo(841.89 / 2, 2);
      expect(page.crop.height).toBeCloseTo(595.28, 2);
    }
    expect(layouts[0]!.scale).toBeCloseTo(layouts[0]!.placed.width / layouts[0]!.crop.width, 6);
    expect(layouts[0]!.scale).toBeCloseTo(layouts[0]!.placed.height / layouts[0]!.crop.height, 5);
  });

  it("keeps the right half shifted by exactly one half-page", () => {
    const left = layouts[0]!;
    const right = layouts[1]!;
    expect(right.originXPt).toBeCloseTo(left.originXPt - right.crop.x * right.scale, 4);
    expect(right.crop.x).toBeCloseTo(left.crop.width, 4);
  });
});
