import type { SplitDirection, WorkbookJob } from "./types";
import { clampSplitRatio } from "./units";

const SPLITS: SplitDirection[] = ["none", "vertical", "horizontal"];

export function effectiveSplit(job: WorkbookJob, sourceIndex: number): SplitDirection {
  const override = job.sourceSplits[sourceIndex];
  return override && SPLITS.includes(override) ? override : job.plan.split;
}

export function effectiveRatio(job: WorkbookJob, sourceIndex: number): number {
  return clampSplitRatio(job.sourceSplitRatios[sourceIndex] ?? job.plan.splitRatio);
}

/** What fraction of this source page each finished page keeps. */
export function cutRangeLabel(split: SplitDirection, ratio: number): string {
  if (split === "none") return "整页保留";
  const cut = Math.round(clampSplitRatio(ratio) * 1000) / 10;
  if (split === "horizontal") return `上页 0%–${cut}%，下页 ${cut}%–100%`;
  return `左页 0%–${cut}%，右页 ${cut}%–100%`;
}
