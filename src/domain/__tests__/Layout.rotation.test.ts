import { describe, expect, it } from "vitest";
import { displayedSize } from "../layout/displayedSize";
import { detectInitialPlan } from "../layout/initialPlan";
import { layoutPages } from "../layout/layoutPages";
import { applyMatrix, uprightForm } from "../layout/uprightForm";
import type { SourcePageMetrics } from "../layout/types";
import { createJob } from "../job/job";

describe("page rotation", () => {
  it("cuts a portrait media box rotated 90 degrees as a landscape spread", () => {
    const page: SourcePageMetrics = { widthPt: 595.28, heightPt: 841.89, rotation: 90 };
    expect(displayedSize(page)).toEqual({ widthPt: 841.89, heightPt: 595.28 });
    const job = createJob(detectInitialPlan(page));
    expect(job.plan.split).toBe("vertical");
    expect(job.plan.scaleMode).toBe("cover");
    const [left, right] = layoutPages([page], job);
    expect(left?.side).toBe("left");
    expect(right?.side).toBe("right");
    expect(left?.crop.width).toBeCloseTo(841.89 / 2, 2);
  });

  it("leaves an upright portrait page uncut", () => {
    const page: SourcePageMetrics = { widthPt: 595.28, heightPt: 841.89, rotation: 0 };
    const job = createJob(detectInitialPlan(page));
    const layouts = layoutPages([page], job);
    expect(job.plan).toMatchObject({ split: "none", scaleMode: "fit" });
    expect(layouts).toHaveLength(1);
    expect(layouts[0]?.side).toBe("whole");
  });

  it("maps media-box corners into reading direction before export", () => {
    const page: SourcePageMetrics = {
      widthPt: 200,
      heightPt: 400,
      rotation: 90,
      originX: 10,
      originY: 20,
    };
    const { matrix } = uprightForm(page);
    const displayed = displayedSize(page);
    const corners = [
      [10, 20],
      [210, 20],
      [10, 420],
      [210, 420],
    ].map(([x, y]) => applyMatrix(matrix, x!, y!));
    for (const [x, y] of corners) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(displayed.widthPt + 0.01);
      expect(y).toBeLessThanOrEqual(displayed.heightPt + 0.01);
    }
    expect(applyMatrix(matrix, 10, 20)).toEqual([0, 200]);
    expect(applyMatrix(matrix, 210, 420)).toEqual([400, 0]);
  });
});
