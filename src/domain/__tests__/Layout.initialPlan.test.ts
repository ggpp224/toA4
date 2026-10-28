import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../layout/initialPlan";
import { layoutPages } from "../layout/layoutPages";
import { createJob, setSourceSplitRatio, updatePlan } from "../job/job";

describe("initial plan", () => {
  it("does not guess a non-A4 page and clamps an extreme cut", () => {
    const page = { widthPt: 500, heightPt: 500, rotation: 0 };
    const plan = detectInitialPlan(page);
    expect(plan).toMatchObject({ split: "none", scaleMode: "fit", splitRatio: 0.5 });
    const job = updatePlan(setSourceSplitRatio(createJob(plan), 0, 0.01), {
      split: "vertical",
      splitRatio: 0.99,
    });
    const [left] = layoutPages([page], job);
    expect(left?.crop.width).toBeCloseTo(500 * 0.05, 4);
    const shared = layoutPages([page], updatePlan(createJob(plan), { split: "vertical", splitRatio: 0.99 }));
    expect(shared[0]?.crop.width).toBeCloseTo(500 * 0.95, 4);
  });

  it("gives each source page its own size when the file is mixed", () => {
    const pages = [
      { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
      { widthPt: 400, heightPt: 600, rotation: 0 },
    ];
    const job = updatePlan(createJob(detectInitialPlan(pages[0]!)), {});
    const layouts = layoutPages(pages, job);
    expect(layouts[0]?.crop.height).toBeCloseTo(595.28, 2);
    expect(layouts[2]?.crop.height).toBeCloseTo(600, 2);
    expect(layouts[2]?.crop.width).toBeCloseTo(200, 2);
  });
});
