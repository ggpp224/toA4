import { describe, expect, it } from "vitest";
import { createJobForPages, setSourceKeep } from "../job/job";
import { layoutPages } from "../layout/layoutPages";
import type { SourcePageMetrics } from "../layout/types";

const SPREAD: SourcePageMetrics = { widthPt: 841.89, heightPt: 595.28, rotation: 0 };

describe("source keep region", () => {
  it("crops away the margins before the vertical cut", () => {
    let job = createJobForPages([SPREAD]);
    job = setSourceKeep(job, 0, { x: 40, y: 30, width: 760, height: 520 }, SPREAD);
    const layouts = layoutPages([SPREAD], job);
    expect(layouts).toHaveLength(2);
    expect(layouts[0]?.crop).toEqual({ x: 40, y: 30, width: 380, height: 520 });
    expect(layouts[1]?.crop).toEqual({ x: 420, y: 30, width: 380, height: 520 });
  });

  it("clears a keep that covers the whole page", () => {
    let job = setSourceKeep(
      createJobForPages([SPREAD]),
      0,
      { x: 10, y: 10, width: 100, height: 100 },
      SPREAD,
    );
    expect(job.sourceKeeps[0]).toBeDefined();
    job = setSourceKeep(job, 0, { x: 0, y: 0, width: 841.89, height: 595.28 }, SPREAD);
    expect(job.sourceKeeps[0]).toBeUndefined();
  });

  it("keeps each source page's own region", () => {
    const pages = [SPREAD, SPREAD];
    let job = createJobForPages(pages);
    job = setSourceKeep(job, 1, { x: 100, y: 0, width: 600, height: 595.28 }, SPREAD);
    const layouts = layoutPages(pages, job);
    expect(layouts[0]?.crop.x).toBeCloseTo(0, 4);
    expect(layouts[2]?.crop.x).toBeCloseTo(100, 4);
    expect(layouts[2]?.crop.width).toBeCloseTo(300, 4);
  });
});
