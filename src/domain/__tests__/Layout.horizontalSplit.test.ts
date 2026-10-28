import { describe, expect, it } from "vitest";
import { layoutPages } from "../layout/layoutPages";
import { createJob, updatePlan } from "../job/job";
import { detectInitialPlan } from "../layout/initialPlan";

describe("horizontal split strategy", () => {
  it("emits the top half before the bottom half", () => {
    const page = { widthPt: 500, heightPt: 400, rotation: 0 };
    const job = updatePlan(createJob(detectInitialPlan(page)), {
      split: "horizontal",
      splitRatio: 0.25,
    });
    const [top, bottom] = layoutPages([page], job);
    expect(top?.side).toBe("top");
    expect(bottom?.side).toBe("bottom");
    expect(top?.crop.height).toBeCloseTo(100, 4);
    expect(bottom?.crop.height).toBeCloseTo(300, 4);
    expect(top?.crop.y).toBeCloseTo(300, 4);
    expect(bottom?.index).toBe(2);
  });
});
