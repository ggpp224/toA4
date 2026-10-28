import { describe, expect, it } from "vitest";
import { applyOffset, createJobForPages, setSourceKeep, setSourceSplit, updatePlan } from "../job/job";
import { layoutPages } from "../layout/layoutPages";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../layout/paper";
import { visibleOutputClip } from "../layout/previewRects";
import type { SourcePageMetrics } from "../layout/types";

const SPREAD: SourcePageMetrics = { widthPt: 841.89, heightPt: 595.28, rotation: 0 };

describe("finished page clip", () => {
  it("ties the finished crop to the keep box, not the whole source page", () => {
    let job = createJobForPages([SPREAD]);
    job = setSourceSplit(updatePlan(job, { scaleMode: "original" }), 0, "none");
    job = setSourceKeep(job, 0, { x: 100, y: 50, width: 220, height: 180 }, SPREAD);
    const [page] = layoutPages([SPREAD], job);
    const clip = visibleOutputClip(page!);
    expect(page!.crop).toEqual({ x: 100, y: 50, width: 220, height: 180 });
    expect(clip).toEqual({
      x: page!.placed.x,
      y: page!.placed.y,
      width: 220,
      height: 180,
    });
    expect(clip!.width).toBeLessThan(A4_WIDTH_PT);
    expect(clip!.height).toBeLessThan(A4_HEIGHT_PT);
  });

  it("does not enlarge the source crop when the finished page is nudged", () => {
    let job = createJobForPages([SPREAD]);
    job = setSourceSplit(updatePlan(job, { scaleMode: "original" }), 0, "none");
    job = setSourceKeep(job, 0, { x: 200, y: 100, width: 240, height: 200 }, SPREAD);
    job = applyOffset(job, { sourceIndex: 0, side: "whole" }, { xMm: 40, yMm: -30 }, "page", false);
    const [page] = layoutPages([SPREAD], job);
    const clip = visibleOutputClip(page!);
    expect(page!.crop).toEqual({ x: 200, y: 100, width: 240, height: 200 });
    expect(clip).not.toBeNull();
    expect(clip!.x).toBeGreaterThanOrEqual(0);
    expect(clip!.y).toBeGreaterThanOrEqual(0);
    expect(clip!.x + clip!.width).toBeLessThanOrEqual(A4_WIDTH_PT + 0.01);
    expect(clip!.y + clip!.height).toBeLessThanOrEqual(A4_HEIGHT_PT + 0.01);
  });
});
