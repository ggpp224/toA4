import { describe, expect, it } from "vitest";
import { cutStrip, marginBandHasInk, regionHasInk } from "../preview/ink";
import { overflowCropRects } from "../layout/previewRects";
import { layoutPages } from "../layout/layoutPages";
import { detectInitialPlan } from "../layout/initialPlan";
import { applyOffset, createJob } from "../job/job";
import type { SourcePageMetrics } from "../layout/types";

const SPREAD: SourcePageMetrics = { widthPt: 841.89, heightPt: 595.28, rotation: 0 };

function image(width: number, height: number, paint: (data: Uint8ClampedArray) => void) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  paint(data);
  return data;
}

describe("ink warnings", () => {
  it("flags a dark pixel on the cut and ignores blank paper", () => {
    const blank = image(20, 10, () => undefined);
    const strip = cutStrip(20, 10, 0.5, true);
    expect(regionHasInk(blank, 20, 10, strip)).toBe(false);
    const marked = image(20, 10, (data) => {
      const x = 10;
      const i = x * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    });
    expect(regionHasInk(marked, 20, 10, strip)).toBe(true);
  });

  it("flags ink inside the margin band only", () => {
    const blank = image(30, 40, () => undefined);
    expect(marginBandHasInk(blank, 30, 40, 4)).toBe(false);
    const edge = image(30, 40, (data) => {
      data[0] = 0;
      data[1] = 0;
      data[2] = 0;
      data[3] = 255;
    });
    expect(marginBandHasInk(edge, 30, 40, 4)).toBe(true);
    expect(marginBandHasInk(edge, 30, 40, 0)).toBe(false);
  });

  it("reports crop area pushed fully off the page", () => {
    const job = applyOffset(
      createJob(detectInitialPlan(SPREAD)),
      { sourceIndex: 0, side: "left" },
      { xMm: -400, yMm: 0 },
      "page",
      false,
    );
    const page = layoutPages([SPREAD], job)[0]!;
    expect(overflowCropRects(page).length).toBeGreaterThan(0);
  });
});
