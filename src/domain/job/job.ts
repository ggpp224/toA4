import { detectInitialPlan } from "../layout/initialPlan";
import { displayedSize } from "../layout/displayedSize";
import { outputKey } from "../layout/layoutPages";
import { ZERO_OFFSET } from "../layout/paper";
import { clampKeep, isFullKeep } from "../layout/sourceKeep";
import { effectiveSplit } from "../layout/sourceCut";
import type {
  DefaultPlan,
  HalfSide,
  OffsetMm,
  PageBox,
  ScaleMode,
  SourcePageMetrics,
  SplitDirection,
  WorkbookJob,
} from "../layout/types";
import { clampContentScale, clampSafeMargin, clampSplitRatio, roundOffset } from "../layout/units";

export type OffsetScope = "page" | "left" | "right" | "all";
export type CutScope = "document" | "source";

const SPLITS: SplitDirection[] = ["none", "vertical", "horizontal"];
const SCALES: ScaleMode[] = ["cover", "fit", "fitSafe", "original"];

export function sanitizePlan(plan: DefaultPlan): DefaultPlan {
  return {
    split: SPLITS.includes(plan.split) ? plan.split : "none",
    splitRatio: clampSplitRatio(plan.splitRatio),
    scaleMode: SCALES.includes(plan.scaleMode) ? plan.scaleMode : "fit",
    safeMarginMm: clampSafeMargin(plan.safeMarginMm),
    contentScale: clampContentScale(plan.contentScale ?? 1),
  };
}

export function createJob(plan: DefaultPlan): WorkbookJob {
  return {
    plan: sanitizePlan(plan),
    halfRules: {
      left: { ...ZERO_OFFSET },
      right: { ...ZERO_OFFSET },
    },
    sourceSplits: {},
    sourceSplitRatios: {},
    sourceKeeps: {},
    pageAdjustments: {},
    pageContentScales: {},
  };
}

export function setPageContentScale(
  job: WorkbookJob,
  target: { sourceIndex: number; side: HalfSide },
  scale: number,
): WorkbookJob {
  const next = cloneJob(job);
  next.pageContentScales[outputKey(target.sourceIndex, target.side)] = clampContentScale(scale);
  return next;
}

/** Each source page keeps the cut that matches its own shape. A spread and a single page in one file do not share a knife. */
export function createJobForPages(pages: SourcePageMetrics[]): WorkbookJob {
  const first = pages[0] ?? { widthPt: 595.28, heightPt: 841.89, rotation: 0 };
  const job = createJob(detectInitialPlan(first));
  pages.forEach((page, index) => {
    const split = detectInitialPlan(page).split;
    if (split !== job.plan.split) job.sourceSplits[index] = split;
  });
  return job;
}

export function restoreInitial(pages: SourcePageMetrics[]): WorkbookJob {
  return createJobForPages(pages);
}

export function updatePlan(job: WorkbookJob, patch: Partial<DefaultPlan>): WorkbookJob {
  return {
    ...cloneJob(job),
    plan: sanitizePlan({ ...job.plan, ...patch }),
  };
}

export function setSourceSplitRatio(
  job: WorkbookJob,
  sourceIndex: number,
  ratio: number | null,
): WorkbookJob {
  const next = cloneJob(job);
  if (ratio === null) delete next.sourceSplitRatios[sourceIndex];
  else next.sourceSplitRatios[sourceIndex] = clampSplitRatio(ratio);
  return next;
}

/** null means this page follows the document cut again. */
export function setSourceSplit(
  job: WorkbookJob,
  sourceIndex: number,
  split: SplitDirection | null,
): WorkbookJob {
  const next = cloneJob(job);
  if (split === null || split === next.plan.split) delete next.sourceSplits[sourceIndex];
  else next.sourceSplits[sourceIndex] = split;
  const keptSplit = effectiveSplit(next, sourceIndex);
  next.pageAdjustments = keepSides(next.pageAdjustments, sourceIndex, keptSplit);
  next.pageContentScales = keepSides(next.pageContentScales, sourceIndex, keptSplit);
  return next;
}

/** Copy this page's cut onto the document and clear every per-page cut. */
export function applyCutToDocument(
  job: WorkbookJob,
  split: SplitDirection,
  ratio: number,
): WorkbookJob {
  const next = updatePlan(job, { split, splitRatio: ratio });
  next.sourceSplits = {};
  next.sourceSplitRatios = {};
  next.pageAdjustments = keepSides(next.pageAdjustments, null, split);
  next.pageContentScales = keepSides(next.pageContentScales, null, split);
  return next;
}

/** null clears the keep and uses the whole page again. */
export function setSourceKeep(
  job: WorkbookJob,
  sourceIndex: number,
  keep: PageBox | null,
  page: SourcePageMetrics,
): WorkbookJob {
  const next = cloneJob(job);
  const size = displayedSize(page);
  if (keep === null || isFullKeep(clampKeep(keep, size), size)) {
    delete next.sourceKeeps[sourceIndex];
    return next;
  }
  next.sourceKeeps[sourceIndex] = clampKeep(keep, size);
  return next;
}

export function applyOffset(
  job: WorkbookJob,
  target: { sourceIndex: number; side: HalfSide },
  offset: OffsetMm,
  scope: OffsetScope,
  includeAdjusted: boolean,
  round = true,
): WorkbookJob {
  const next = cloneJob(job);
  const rounded = round ? roundOffset(offset) : { xMm: offset.xMm, yMm: offset.yMm };
  if (scope === "page") {
    next.pageAdjustments[outputKey(target.sourceIndex, target.side)] = rounded;
    return next;
  }
  if (scope === "left" || scope === "all") {
    next.halfRules.left = rounded;
    if (includeAdjusted) next.pageAdjustments = removeSides(next.pageAdjustments, ["left"]);
  }
  if (scope === "right" || scope === "all") {
    next.halfRules.right = rounded;
    if (includeAdjusted) next.pageAdjustments = removeSides(next.pageAdjustments, ["right"]);
  }
  return next;
}

export function restoreFollow(
  job: WorkbookJob,
  sourceIndex: number,
  side: HalfSide,
): WorkbookJob {
  const next = cloneJob(job);
  delete next.pageAdjustments[outputKey(sourceIndex, side)];
  return next;
}

export function parseJob(value: unknown): WorkbookJob | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WorkbookJob>;
  if (!raw.plan || !raw.halfRules?.left || !raw.halfRules?.right) return null;
  return {
    plan: sanitizePlan(raw.plan),
    halfRules: {
      left: roundOffset(raw.halfRules.left),
      right: roundOffset(raw.halfRules.right),
    },
    sourceSplits: sanitizeSplits(raw.sourceSplits),
    sourceSplitRatios: { ...(raw.sourceSplitRatios ?? {}) },
    sourceKeeps: sanitizeKeeps(raw.sourceKeeps),
    pageAdjustments: Object.fromEntries(
      Object.entries(raw.pageAdjustments ?? {}).map(([key, offset]) => [
        key,
        roundOffset(offset),
      ]),
    ),
    pageContentScales: sanitizeContentScales(raw.pageContentScales),
  };
}

export function hasPageAdjustment(
  job: WorkbookJob,
  sourceIndex: number,
  side: HalfSide,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    job.pageAdjustments,
    outputKey(sourceIndex, side),
  );
}

function sanitizeSplits(value: unknown): Record<number, SplitDirection> {
  if (!value || typeof value !== "object") return {};
  const next: Record<number, SplitDirection> = {};
  for (const [key, split] of Object.entries(value as Record<string, unknown>)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) continue;
    if (split === "none" || split === "vertical" || split === "horizontal") next[index] = split;
  }
  return next;
}

function sanitizeKeeps(value: unknown): Record<number, PageBox> {
  if (!value || typeof value !== "object") return {};
  const next: Record<number, PageBox> = {};
  for (const [key, box] of Object.entries(value as Record<string, unknown>)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || !box || typeof box !== "object") continue;
    const raw = box as Partial<PageBox>;
    if (![raw.x, raw.y, raw.width, raw.height].every((n) => typeof n === "number" && Number.isFinite(n))) {
      continue;
    }
    next[index] = clampKeep(
      { x: raw.x!, y: raw.y!, width: raw.width!, height: raw.height! },
      { widthPt: Math.max(raw.x! + raw.width!, 1), heightPt: Math.max(raw.y! + raw.height!, 1) },
    );
  }
  return next;
}

function sideOf(key: string): string {
  return key.slice(key.lastIndexOf(":") + 1);
}

function sourceOf(key: string): number {
  return Number(key.slice(0, key.indexOf(":")));
}

function sideFits(side: string, split: SplitDirection): boolean {
  if (split === "vertical") return side === "left" || side === "right";
  if (split === "horizontal") return side === "top" || side === "bottom";
  return side === "whole";
}

function sanitizeContentScales(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, number> = {};
  for (const [key, scale] of Object.entries(value as Record<string, unknown>)) {
    if (typeof scale !== "number" || !Number.isFinite(scale)) continue;
    if (!key.includes(":")) continue;
    next[key] = clampContentScale(scale);
  }
  return next;
}

/** sourceIndex null keeps every page that matches split. */
function keepSides<T>(
  records: Record<string, T>,
  sourceIndex: number | null,
  split: SplitDirection,
): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(records)) {
    if (sourceIndex !== null && sourceOf(key) !== sourceIndex) {
      next[key] = value;
      continue;
    }
    if (sideFits(sideOf(key), split)) next[key] = value;
  }
  return next;
}

function removeSides(
  adjustments: Record<string, OffsetMm>,
  sides: HalfSide[],
): Record<string, OffsetMm> {
  const next: Record<string, OffsetMm> = {};
  for (const [key, value] of Object.entries(adjustments)) {
    const side = key.slice(key.lastIndexOf(":") + 1);
    if (!sides.includes(side as HalfSide)) next[key] = value;
  }
  return next;
}

export function roundJob(job: WorkbookJob): WorkbookJob {
  const next = cloneJob(job);
  next.halfRules.left = roundOffset(next.halfRules.left);
  next.halfRules.right = roundOffset(next.halfRules.right);
  for (const [key, offset] of Object.entries(next.pageAdjustments)) {
    next.pageAdjustments[key] = roundOffset(offset);
  }
  return next;
}

export function cloneJob(job: WorkbookJob): WorkbookJob {
  return {
    plan: { ...job.plan },
    halfRules: {
      left: { ...job.halfRules.left },
      right: { ...job.halfRules.right },
    },
    sourceSplits: { ...job.sourceSplits },
    sourceSplitRatios: { ...job.sourceSplitRatios },
    sourceKeeps: Object.fromEntries(
      Object.entries(job.sourceKeeps).map(([key, box]) => [key, { ...box }]),
    ),
    pageAdjustments: Object.fromEntries(
      Object.entries(job.pageAdjustments).map(([key, offset]) => [key, { ...offset }]),
    ),
    pageContentScales: { ...job.pageContentScales },
  };
}
