import { describe, expect, it } from "vitest";
import { layoutPages } from "../layout/layoutPages";
import type { SourcePageMetrics } from "../layout/types";
import {
  applyCutToDocument,
  createJobForPages,
  setSourceSplit,
  setSourceSplitRatio,
} from "../job/job";
import { applyPreset, presetFromJob } from "../preset/preset";

const SPREAD: SourcePageMetrics = { widthPt: 841.89, heightPt: 595.28, rotation: 0 };
const PORTRAIT: SourcePageMetrics = { widthPt: 595.28, heightPt: 841.89, rotation: 0 };

describe("per-page cut range", () => {
  it("turns one landscape page into two finished pages and two portrait pages into two", () => {
    const oneSpread = layoutPages([SPREAD], createJobForPages([SPREAD]));
    expect(oneSpread.map((page) => page.side)).toEqual(["left", "right"]);

    const twoSingles = layoutPages([PORTRAIT, PORTRAIT], createJobForPages([PORTRAIT, PORTRAIT]));
    expect(twoSingles.map((page) => page.side)).toEqual(["whole", "whole"]);
    expect(twoSingles).toHaveLength(2);
  });

  it("lets one source page stay whole while the other is cut", () => {
    const pages = [SPREAD, SPREAD];
    let job = createJobForPages(pages);
    expect(layoutPages(pages, job)).toHaveLength(4);

    job = setSourceSplit(job, 1, "none");
    const layouts = layoutPages(pages, job);
    expect(layouts.map((page) => [page.sourceIndex, page.side])).toEqual([
      [0, "left"],
      [0, "right"],
      [1, "whole"],
    ]);
    expect(layouts[2]?.crop.width).toBeCloseTo(841.89, 2);
  });

  it("keeps another page's cut when this page's range changes", () => {
    const pages = [SPREAD, SPREAD];
    const job = setSourceSplitRatio(createJobForPages(pages), 0, 0.4);
    const layouts = layoutPages(pages, job);
    expect(layouts[0]?.crop.width).toBeCloseTo(841.89 * 0.4, 2);
    expect(layouts[2]?.crop.width).toBeCloseTo(841.89 * 0.5, 2);
  });

  it("can make every page follow the current page, including no cut", () => {
    const pages = [SPREAD, PORTRAIT];
    const mixed = createJobForPages(pages);
    expect(layoutPages(pages, mixed)).toHaveLength(3);

    const allWhole = applyCutToDocument(mixed, "none", 0.5);
    expect(layoutPages(pages, allWhole).map((page) => page.side)).toEqual(["whole", "whole"]);
    expect(allWhole.sourceSplits).toEqual({});

    const preset = presetFromJob(allWhole, "单页", "preset-single");
    const reapplied = applyPreset(setSourceSplit(allWhole, 0, "vertical"), preset);
    expect(reapplied.sourceSplits).toEqual({});
    expect(layoutPages(pages, reapplied)).toHaveLength(2);
  });
});
