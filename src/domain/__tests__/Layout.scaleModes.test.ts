import { describe, expect, it } from "vitest";
import { layoutPages } from "../layout/layoutPages";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../layout/paper";
import type { SourcePageMetrics } from "../layout/types";
import { createJob } from "../job/job";
import { detectInitialPlan } from "../layout/initialPlan";
import { updatePlan } from "../job/job";

const SQUARE: SourcePageMetrics[] = [{ widthPt: 400, heightPt: 400, rotation: 0 }];

describe("scale modes", () => {
  it("fits an unknown page inside A4 and covers it without distortion", () => {
    const fitted = layoutPages(SQUARE, createJob(detectInitialPlan(SQUARE[0]!)));
    expect(fitted[0]!.placed.width).toBeLessThanOrEqual(A4_WIDTH_PT + 0.01);
    expect(fitted[0]!.placed.height).toBeLessThanOrEqual(A4_HEIGHT_PT + 0.01);
    expect(fitted[0]!.placed.width).toBeCloseTo(A4_WIDTH_PT, 1);
    expect(fitted[0]!.placed.height).toBeCloseTo(A4_WIDTH_PT, 1);

    const covered = layoutPages(SQUARE, updatePlan(createJob(detectInitialPlan(SQUARE[0]!)), {
      scaleMode: "cover",
    }));
    expect(covered[0]!.scale).toBeGreaterThan(fitted[0]!.scale);
    expect(covered[0]!.placed.width).toBeGreaterThanOrEqual(A4_WIDTH_PT - 0.01);
    expect(covered[0]!.placed.height).toBeGreaterThanOrEqual(A4_HEIGHT_PT - 0.01);
    expect(covered[0]!.scale).toBeCloseTo(covered[0]!.placed.width / covered[0]!.crop.width, 6);

    const original = layoutPages(SQUARE, updatePlan(createJob(detectInitialPlan(SQUARE[0]!)), {
      scaleMode: "original",
    }));
    expect(original[0]!.scale).toBe(1);
    expect(original[0]!.placed.width).toBeCloseTo(400, 4);
    expect(original[0]!.placed.x).toBeCloseTo((A4_WIDTH_PT - 400) / 2, 4);
  });

  it("fits inside the safety zone and can shrink further with content scale", () => {
    const safe = layoutPages(SQUARE, updatePlan(createJob(detectInitialPlan(SQUARE[0]!)), {
      scaleMode: "fitSafe",
      safeMarginMm: 10,
    }));
    const inset = 10 * (72 / 25.4);
    expect(safe[0]!.placed.width).toBeLessThanOrEqual(A4_WIDTH_PT - inset * 2 + 0.01);
    expect(safe[0]!.placed.height).toBeLessThanOrEqual(A4_HEIGHT_PT - inset * 2 + 0.01);

    const shrunk = layoutPages(SQUARE, updatePlan(createJob(detectInitialPlan(SQUARE[0]!)), {
      scaleMode: "fitSafe",
      safeMarginMm: 10,
      contentScale: 0.8,
    }));
    expect(shrunk[0]!.scale).toBeCloseTo(safe[0]!.scale * 0.8, 6);
    expect(shrunk[0]!.placed.width).toBeCloseTo(safe[0]!.placed.width * 0.8, 4);
  });
});
