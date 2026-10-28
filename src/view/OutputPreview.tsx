import { useEffect, useRef, useState } from "react";
import { displayedSize } from "../domain/layout/displayedSize";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../domain/layout/paper";
import { displayRectToCanvas, overflowCropRects } from "../domain/layout/previewRects";
import type { OutputPageLayout, SourcePageMetrics } from "../domain/layout/types";
import { mmToPt, ptToMm } from "../domain/layout/units";
import { marginBandHasInk, regionHasInk } from "../domain/preview/ink";
import { exportSinglePage } from "../infrastructure/pdf/exportPdf";
import { paintPlacedCrop, renderPdfBytes, renderSourcePage } from "../infrastructure/pdf/renderPage";
import { containSize } from "./fitSheet";
import { FullscreenFrame } from "./FullscreenFrame";
import { ContentZoom, useViewZoom, useWheelZoom, ViewZoom } from "./ViewZoom";

interface OutputPreviewProps {
  fileHash: string;
  bytes: Uint8Array;
  pages: SourcePageMetrics[];
  layout: OutputPageLayout;
  layouts: OutputPageLayout[];
  dragging: boolean;
  safeMarginMm: number;
  contentScale: number;
  title: string;
  onBeginDrag: () => void;
  onLiveOffset: (delta: { xMm: number; yMm: number }) => void;
  onEndDrag: () => void;
  onWarnings: (warnings: { outside: boolean; nearEdge: boolean }) => void;
  onContentScale: (scale: number) => void;
  onSelectPage: (layout: OutputPageLayout) => void;
}

export function OutputPreview(props: OutputPreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <>
      <OutputPane {...props} fullscreen={false} onFullscreen={() => setFullscreen(true)} />
      {fullscreen && (
        <OutputPane {...props} fullscreen onFullscreen={() => setFullscreen(false)} />
      )}
    </>
  );
}

function OutputPane({
  fileHash,
  bytes,
  pages,
  layout,
  layouts,
  dragging,
  safeMarginMm,
  contentScale,
  title,
  onBeginDrag,
  onLiveOffset,
  onEndDrag,
  onWarnings,
  onContentScale,
  onSelectPage,
  fullscreen,
  onFullscreen,
}: OutputPreviewProps & { fullscreen: boolean; onFullscreen: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const sourceCache = useRef(new Map<string, HTMLCanvasElement>());
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const { zoom, setZoom } = useViewZoom();
  const metrics = pages[layout.sourceIndex];
  const fit = containSize(bounds, A4_WIDTH_PT / A4_HEIGHT_PT);
  const sheetWidth = Math.max(0, Math.floor(fit.width * zoom));
  const sheetHeight = Math.floor(fit.height * zoom);
  const pagePos = layouts.findIndex((page) => page.index === layout.index);
  const previous = pagePos > 0 ? layouts[pagePos - 1] : undefined;
  const next = pagePos >= 0 && pagePos < layouts.length - 1 ? layouts[pagePos + 1] : undefined;
  useWheelZoom(stageRef, zoom, setZoom);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setBounds({ width: stage.clientWidth, height: stage.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    update();
    return () => observer.disconnect();
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && previous) {
        event.preventDefault();
        onSelectPage(previous);
      }
      if (event.key === "ArrowRight" && next) {
        event.preventDefault();
        onSelectPage(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, next, onSelectPage, previous]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sheetWidth < 20 || !metrics) return;
    let cancelled = false;
    const paint = async () => {
      const sourceKey = `${fileHash}:${layout.sourceIndex}`;
      const loadSource = async (cssWidth: number) => {
        const cached = sourceCache.current.get(sourceKey);
        if (cached) return cached;
        const source = document.createElement("canvas");
        await renderSourcePage(fileHash, bytes, layout.sourceIndex + 1, source, cssWidth);
        sourceCache.current.set(sourceKey, source);
        return source;
      };
      if (dragging) {
        const source = await loadSource(Math.max(sheetWidth, 640));
        if (cancelled) return;
        paintPlacedCrop(canvas, source, layout, metrics, sheetWidth);
      } else {
        const pageBytes = await exportSinglePage(bytes, pages, layout);
        if (cancelled) return;
        await renderPdfBytes(pageBytes, canvas, sheetWidth);
      }
      if (cancelled) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const nearEdge = marginBandHasInk(
        image.data,
        canvas.width,
        canvas.height,
        (mmToPt(safeMarginMm) / A4_WIDTH_PT) * canvas.width,
        (mmToPt(safeMarginMm) / A4_HEIGHT_PT) * canvas.height,
      );
      let outside = false;
      const overflow = overflowCropRects(layout);
      if (overflow.length > 0) {
        const source = await loadSource(700);
        if (cancelled) return;
        const sourceContext = source.getContext("2d");
        if (sourceContext) {
          const sourceImage = sourceContext.getImageData(0, 0, source.width, source.height);
          const displayed = displayedSize(metrics);
          outside = overflow.some((rect) => regionHasInk(
            sourceImage.data,
            source.width,
            source.height,
            displayRectToCanvas(rect, displayed, { widthPx: source.width, heightPx: source.height }),
          ));
        }
      }
      if (!cancelled) onWarnings({ outside, nearEdge });
    };
    paint().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bytes, dragging, fileHash, layout, metrics, onWarnings, pages, safeMarginMm, sheetWidth]);

  const insetX = (mmToPt(safeMarginMm) / A4_WIDTH_PT) * 100;
  const insetY = (mmToPt(safeMarginMm) / A4_HEIGHT_PT) * 100;
  const scrolled = sheetWidth > bounds.width + 1 || sheetHeight > bounds.height + 1;
  const tools = (
    <div className="tool-groups">
      {fullscreen && (
        <>
          <ViewZoom zoom={zoom} onZoom={setZoom} />
          <span className="tool-sep" aria-hidden="true" />
          <ContentZoom scale={contentScale} onScale={onContentScale} />
          <span className="tool-sep" aria-hidden="true" />
        </>
      )}
      <div className="tool-group">
        <button type="button" disabled={!previous} onClick={() => previous && onSelectPage(previous)}>上一页</button>
        <button type="button" disabled={!next} onClick={() => next && onSelectPage(next)}>下一页</button>
      </div>
      {!fullscreen && (
        <>
          <span className="tool-sep" aria-hidden="true" />
          <button type="button" onClick={onFullscreen}>全屏</button>
        </>
      )}
    </div>
  );

  const body = (
    <div className={fullscreen ? "preview-body fullscreen-pane" : "preview-body"}>
      {!fullscreen && <div className="preview-toolbar">{tools}</div>}
      <div ref={stageRef} className={scrolled ? "stage scrolled" : "stage"}>
        <div
          ref={sheetRef}
          className="sheet output-sheet"
          style={{ width: sheetWidth || undefined, height: sheetHeight || undefined }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={(event) => {
              dragRef.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
              onBeginDrag();
            }}
            onPointerMove={(event) => {
              const start = dragRef.current;
              const canvas = canvasRef.current;
              if (!start || !canvas) return;
              const pxPerPt = canvas.getBoundingClientRect().width / A4_WIDTH_PT;
              if (pxPerPt <= 0) return;
              onLiveOffset({
                xMm: ptToMm((event.clientX - start.x) / pxPerPt),
                yMm: -ptToMm((event.clientY - start.y) / pxPerPt),
              });
            }}
            onPointerUp={() => {
              if (!dragRef.current) return;
              dragRef.current = null;
              onEndDrag();
            }}
          />
          {safeMarginMm > 0 && (
            <div
              className="safe-zone"
              style={{ left: `${insetX}%`, right: `${insetX}%`, top: `${insetY}%`, bottom: `${insetY}%` }}
            >
              <span>安全区 {safeMarginMm.toFixed(1)} 毫米</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <FullscreenFrame open title={title} toolbar={tools} onClose={onFullscreen}>
        {body}
      </FullscreenFrame>
    );
  }
  return body;
}
