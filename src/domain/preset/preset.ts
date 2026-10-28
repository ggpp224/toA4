import { cloneJob, sanitizePlan } from "../job/job";
import type { WorkbookJob } from "../layout/types";
import { roundOffset } from "../layout/units";

export interface Preset {
  id: string;
  name: string;
  split: WorkbookJob["plan"]["split"];
  splitRatio: number;
  scaleMode: WorkbookJob["plan"]["scaleMode"];
  safeMarginMm: number;
  contentScale: number;
  leftOffset: { xMm: number; yMm: number };
  rightOffset: { xMm: number; yMm: number };
}

export function presetFromJob(job: WorkbookJob, name: string, id: string): Preset {
  return {
    id,
    name,
    split: job.plan.split,
    splitRatio: job.plan.splitRatio,
    scaleMode: job.plan.scaleMode,
    safeMarginMm: job.plan.safeMarginMm,
    contentScale: job.plan.contentScale,
    leftOffset: { ...job.halfRules.left },
    rightOffset: { ...job.halfRules.right },
  };
}

/** Presets replace the shared plan and half-page rules. Per-page cut choices are cleared so the preset applies to every page. Nudges stay. */
export function applyPreset(job: WorkbookJob, preset: Preset): WorkbookJob {
  const next = cloneJob(job);
  next.plan = sanitizePlan({
    split: preset.split,
    splitRatio: preset.splitRatio,
    scaleMode: preset.scaleMode,
    safeMarginMm: preset.safeMarginMm,
    contentScale: preset.contentScale ?? 1,
  });
  next.halfRules = {
    left: roundOffset(preset.leftOffset),
    right: roundOffset(preset.rightOffset),
  };
  next.sourceSplits = {};
  next.sourceSplitRatios = {};
  return next;
}
