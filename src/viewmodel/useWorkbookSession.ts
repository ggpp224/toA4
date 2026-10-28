import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effectiveContentScale, layoutPages } from "../domain/layout/layoutPages";
import { effectiveKeep } from "../domain/layout/sourceKeep";
import { effectiveRatio, effectiveSplit } from "../domain/layout/sourceCut";
import type { HalfSide, OffsetMm, OutputPageLayout, PageBox, ScaleMode, SourcePageMetrics, SplitDirection, WorkbookJob } from "../domain/layout/types";
import {
  applyCutToDocument,
  applyOffset,
  createJobForPages,
  hasPageAdjustment,
  restoreFollow,
  restoreInitial,
  roundJob,
  setPageContentScale,
  setSourceKeep,
  setSourceSplit,
  setSourceSplitRatio,
  updatePlan,
  type CutScope,
  type OffsetScope,
} from "../domain/job/job";
import { displayedSize } from "../domain/layout/displayedSize";
import { commitHistory, createHistory, redoHistory, undoHistory, type HistoryState } from "../domain/job/history";
import { applyPreset, presetFromJob, type Preset } from "../domain/preset/preset";
import { exportPdf } from "../infrastructure/pdf/exportPdf";
import { normalizeSource } from "../infrastructure/pdf/normalizeSource";
import { readPdfMetrics } from "../infrastructure/pdf/readPdf";
import { releasePdfDocument } from "../infrastructure/pdf/pdfjs";
import { createStore } from "../infrastructure/storage/createStore";
import type { WorkbookStore } from "../infrastructure/storage/types";
import { sha256 } from "../infrastructure/storage/hash";
import { savePdf } from "../infrastructure/storage/savePdf";

export interface OpenFile {
  name: string;
  hash: string;
  bytes: Uint8Array;
}

export interface PendingOpen extends OpenFile {
  metrics: SourcePageMetrics[];
}

const PRINT_NOTE = "打印时选择纸张 A4，方向纵向，缩放选择实际大小。";

export function useWorkbookSession() {
  const store = useMemo<WorkbookStore>(() => createStore(), []);
  const [file, setFile] = useState<OpenFile | null>(null);
  const [metrics, setMetrics] = useState<SourcePageMetrics[]>([]);
  const [history, setHistory] = useState<HistoryState<WorkbookJob> | null>(null);
  const [draft, setDraft] = useState<WorkbookJob | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [outputIndex, setOutputIndex] = useState(1);
  const [scope, setScope] = useState<OffsetScope>("page");
  const [includeAdjusted, setIncludeAdjusted] = useState(false);
  const [cutScope, setCutScope] = useState<CutScope>("source");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [pending, setPending] = useState<PendingOpen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<WorkbookJob | null>(null);
  const dragBase = useRef<WorkbookJob | null>(null);
  draftRef.current = draft;

  const job = draft ?? history?.present ?? null;

  const layouts = useMemo(
    () => (job && metrics.length > 0 ? layoutPages(metrics, job) : []),
    [job, metrics],
  );

  const selected = layouts.find((page) => page.index === outputIndex) ?? layouts[0] ?? null;

  useEffect(() => {
    store.listPresets().then(setPresets).catch(() => setPresets([]));
  }, [store]);

  useEffect(() => {
    if (!file || !history || dragging) return;
    const timer = window.setTimeout(() => {
      store.saveJob(file.hash, history.present).catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [file, history, dragging, store]);

  useEffect(() => {
    if (layouts.length === 0) return;
    if (!layouts.some((page) => page.index === outputIndex)) {
      setOutputIndex(layouts[0]!.index);
    }
  }, [layouts, outputIndex]);

  const openLoaded = useCallback((nextFile: OpenFile, nextMetrics: SourcePageMetrics[], nextJob: WorkbookJob) => {
    setFile((current) => {
      if (current) void releasePdfDocument(current.hash);
      return nextFile;
    });
    setMetrics(nextMetrics);
    setHistory(createHistory(nextJob));
    setDraft(null);
    setDragging(false);
    setSourceIndex(0);
    setOutputIndex(1);
    setScope("page");
    setCutScope("source");
    setError(null);
    setExportNote(null);
    setPending(null);
  }, []);

  const ingestFile = useCallback(async (blob: File) => {
    setError(null);
    let bytes: Uint8Array;
    let name: string;
    try {
      const normalized = await normalizeSource(blob);
      bytes = normalized.bytes;
      name = normalized.name;
    } catch {
      setError("无法打开这份文件，请使用 PDF、JPG 或 PNG");
      return;
    }
    const hash = await sha256(bytes);
    let nextMetrics: SourcePageMetrics[];
    try {
      nextMetrics = await readPdfMetrics(hash, bytes);
    } catch {
      setError("无法打开这份文件，请使用 PDF、JPG 或 PNG");
      return;
    }
    const saved = await store.loadJob(hash).catch(() => null);
    const nextFile = { name, hash, bytes };
    if (saved) {
      openLoaded(nextFile, nextMetrics, saved);
      return;
    }
    const available = await store.listPresets().catch(() => []);
    setPresets(available);
    if (available.length === 0) {
      openLoaded(nextFile, nextMetrics, createJobForPages(nextMetrics));
      return;
    }
    setPending({ ...nextFile, metrics: nextMetrics });
  }, [openLoaded, store]);

  const confirmPending = useCallback((preset: Preset | null) => {
    if (!pending) return;
    let next = createJobForPages(pending.metrics);
    if (preset) next = applyPreset(next, preset);
    openLoaded(pending, pending.metrics, next);
  }, [openLoaded, pending]);

  const commit = useCallback((next: WorkbookJob) => {
    setDragging(false);
    dragBase.current = null;
    setDraft(null);
    setHistory((current) => (current ? commitHistory(current, next) : createHistory(next)));
  }, []);

  const beginDrag = useCallback(() => {
    if (!history) return;
    dragBase.current = history.present;
    setDraft(history.present);
    setDragging(true);
  }, [history]);

  const endDrag = useCallback(() => {
    const next = draftRef.current;
    setDragging(false);
    dragBase.current = null;
    setDraft(null);
    if (!next) return;
    setHistory((current) => (current ? commitHistory(current, roundJob(next)) : current));
  }, []);

  const liveJob = useCallback((update: (base: WorkbookJob) => WorkbookJob) => {
    const base = dragBase.current;
    if (!base) return;
    setDraft(update(base));
  }, []);

  const liveRatio = useCallback((ratio: number) => {
    liveJob((base) => {
      if (cutScope === "source") return setSourceSplitRatio(base, sourceIndex, ratio);
      return setSourceSplitRatio(updatePlan(base, { splitRatio: ratio }), sourceIndex, null);
    });
  }, [cutScope, liveJob, sourceIndex]);

  const liveKeep = useCallback((keep: PageBox) => {
    const page = metrics[sourceIndex];
    if (!page) return;
    liveJob((base) => setSourceKeep(base, sourceIndex, keep, page));
  }, [liveJob, metrics, sourceIndex]);

  const commitKeep = useCallback((keep: PageBox | null) => {
    if (!job) return;
    const page = metrics[sourceIndex];
    if (!page) return;
    commit(setSourceKeep(job, sourceIndex, keep, page));
  }, [commit, job, metrics, sourceIndex]);

  const liveOffset = useCallback((delta: OffsetMm) => {
    if (!selected) return;
    liveJob((base) => {
      const origin = layoutPages(metrics, base).find(
        (page) => page.sourceIndex === selected.sourceIndex && page.side === selected.side,
      );
      if (!origin) return base;
      const dragScope: OffsetScope = effectiveSplit(base, selected.sourceIndex) === "none" ? "page" : scope;
      return applyOffset(
        base,
        { sourceIndex: selected.sourceIndex, side: selected.side },
        { xMm: origin.offsetMm.xMm + delta.xMm, yMm: origin.offsetMm.yMm + delta.yMm },
        dragScope,
        includeAdjusted,
        false,
      );
    });
  }, [includeAdjusted, liveJob, metrics, scope, selected]);

  const nudge = useCallback((deltaX: number, deltaY: number) => {
    if (!job || !selected) return;
    commit(applyOffset(
      job,
      { sourceIndex: selected.sourceIndex, side: selected.side },
      { xMm: selected.offsetMm.xMm + deltaX, yMm: selected.offsetMm.yMm + deltaY },
      effectiveSplit(job, selected.sourceIndex) === "none" ? "page" : scope,
      includeAdjusted,
    ));
  }, [commit, includeAdjusted, job, scope, selected]);

  const setOffset = useCallback((offset: OffsetMm) => {
    if (!job || !selected) return;
    commit(applyOffset(
      job,
      { sourceIndex: selected.sourceIndex, side: selected.side },
      offset,
      effectiveSplit(job, selected.sourceIndex) === "none" ? "page" : scope,
      includeAdjusted,
    ));
  }, [commit, includeAdjusted, job, scope, selected]);

  const selectOutput = useCallback((page: OutputPageLayout) => {
    setOutputIndex(page.index);
    setSourceIndex(page.sourceIndex);
  }, []);

  const selectSource = useCallback((index: number) => {
    setSourceIndex(index);
    const first = layouts.find((page) => page.sourceIndex === index);
    if (first) setOutputIndex(first.index);
  }, [layouts]);

  const undo = useCallback(() => {
    setDraft(null);
    setDragging(false);
    setHistory((current) => (current ? undoHistory(current) : current));
  }, []);

  const redo = useCallback(() => {
    setDraft(null);
    setDragging(false);
    setHistory((current) => (current ? redoHistory(current) : current));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (!selected) return;
      const step = event.shiftKey ? 5 : 1;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      nudge(delta[0], delta[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge, redo, selected, undo]);

  const savePreset = useCallback(async (name: string) => {
    if (!job) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = presets.find((preset) => preset.name === trimmed);
    const preset = presetFromJob(job, trimmed, existing?.id ?? crypto.randomUUID());
    await store.savePreset(preset);
    setPresets(await store.listPresets());
  }, [job, presets, store]);

  const deletePreset = useCallback(async (id: string) => {
    await store.deletePreset(id);
    setPresets(await store.listPresets());
  }, [store]);

  const usePreset = useCallback((preset: Preset) => {
    if (!job) return;
    commit(applyPreset(job, preset));
  }, [commit, job]);

  const exportCurrent = useCallback(async () => {
    if (!file || !job || metrics.length === 0) return;
    setBusy(true);
    try {
      const current = roundJob(draftRef.current ?? job);
      if (draftRef.current) {
        setHistory((historyState) => (historyState ? commitHistory(historyState, current) : historyState));
        setDraft(null);
        setDragging(false);
      }
      const bytes = await exportPdf(file.bytes, metrics, layoutPages(metrics, current));
      const saved = await savePdf(bytes, file.name);
      if (saved) setExportNote(PRINT_NOTE);
    } catch {
      setError("导出失败");
    } finally {
      setBusy(false);
    }
  }, [file, job, metrics]);

  const pageSplit = job && selected ? effectiveSplit(job, selected.sourceIndex) : job?.plan.split;
  const effectiveScope: OffsetScope = pageSplit === "none" ? "page" : scope;

  return {
    file,
    metrics,
    job,
    layouts,
    selected,
    sourceIndex,
    outputIndex,
    scope: effectiveScope,
    includeAdjusted,
    cutScope,
    presets,
    pending,
    error,
    exportNote,
    busy,
    dragging,
    canUndo: (history?.past.length ?? 0) > 0,
    canRedo: (history?.future.length ?? 0) > 0,
    adjusted: selected ? hasPageAdjustment(job!, selected.sourceIndex, selected.side) : false,
    ingestFile,
    confirmPending,
    cancelPending: () => setPending(null),
    dismissError: () => setError(null),
    dismissNote: () => setExportNote(null),
    setScope,
    setIncludeAdjusted,
    setCutScope,
    setSplit: (split: SplitDirection) => job && commit(setSourceSplit(job, sourceIndex, split)),
    setScale: (scaleMode: ScaleMode) => job && commit(updatePlan(job, { scaleMode })),
    setContentScale: (contentScale: number) => {
      if (!job || !selected) return;
      commit(setPageContentScale(
        job,
        { sourceIndex: selected.sourceIndex, side: selected.side },
        contentScale,
      ));
    },
    contentScale: selected
      ? effectiveContentScale(job!, selected.sourceIndex, selected.side)
      : 1,
    setSafeMargin: (safeMarginMm: number) => job && commit(updatePlan(job, { safeMarginMm })),
    commitRatio: (ratio: number) => {
      if (!job) return;
      const next = cutScope === "source"
        ? setSourceSplitRatio(job, sourceIndex, ratio)
        : setSourceSplitRatio(updatePlan(job, { splitRatio: ratio }), sourceIndex, null);
      commit(next);
    },
    followDocumentCut: () => {
      if (!job) return;
      commit(setSourceSplit(setSourceSplitRatio(job, sourceIndex, null), sourceIndex, null));
    },
    applyCutToAll: () => {
      if (!job) return;
      commit(applyCutToDocument(job, effectiveSplit(job, sourceIndex), effectiveRatio(job, sourceIndex)));
    },
    beginDrag,
    endDrag,
    liveRatio,
    liveKeep,
    commitKeep,
    currentKeep: job && metrics[sourceIndex]
      ? effectiveKeep(job, sourceIndex, displayedSize(metrics[sourceIndex]!))
      : null,
    hasOwnKeep: job ? job.sourceKeeps[sourceIndex] !== undefined : false,
    liveOffset,
    nudge,
    setOffset,
    selectOutput,
    selectSource,
    undo,
    redo,
    restorePage: () => {
      if (!job || !selected) return;
      commit(restoreFollow(job, selected.sourceIndex, selected.side));
    },
    restoreAll: () => commit(restoreInitial(metrics)),
    savePreset,
    deletePreset,
    usePreset,
    exportCurrent,
  };
}

export function sideName(side: HalfSide): string {
  if (side === "left") return "左半页";
  if (side === "right") return "右半页";
  if (side === "top") return "上半页";
  if (side === "bottom") return "下半页";
  return "整页";
}
