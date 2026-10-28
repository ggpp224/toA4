import { describe, expect, it } from "vitest";
import { createJob, setPageContentScale, updatePlan } from "../job/job";
import { detectInitialPlan } from "../layout/initialPlan";
import { effectiveContentScale, layoutPages } from "../layout/layoutPages";
import type { SourcePageMetrics } from "../layout/types";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

describe("per-page content scale", () => {
  it("keeps each output page's content scale without changing other pages", () => {
    let job = createJob(detectInitialPlan(SPREAD[0]!));
    job = setPageContentScale(job, { sourceIndex: 0, side: "left" }, 0.85);

    expect(effectiveContentScale(job, 0, "left")).toBe(0.85);
    expect(effectiveContentScale(job, 0, "right")).toBe(1);
    expect(effectiveContentScale(job, 1, "left")).toBe(1);

    const layouts = layoutPages(SPREAD, job);
    const left = layouts.find((page) => page.sourceIndex === 0 && page.side === "left")!;
    const right = layouts.find((page) => page.sourceIndex === 0 && page.side === "right")!;
    expect(left.scale).toBeCloseTo(right.scale * 0.85, 6);
  });

  it("falls back to the document default until a page sets its own ratio", () => {
    let job = updatePlan(createJob(detectInitialPlan(SPREAD[0]!)), { contentScale: 0.9 });
    expect(effectiveContentScale(job, 0, "left")).toBe(0.9);

    job = setPageContentScale(job, { sourceIndex: 0, side: "left" }, 1.1);
    expect(effectiveContentScale(job, 0, "left")).toBe(1.1);
    expect(effectiveContentScale(job, 0, "right")).toBe(0.9);
  });
});
