import { useEffect, useRef, useState } from "react";
import { displayedSize } from "../domain/layout/displayedSize";
import { cutStrip, regionHasInk } from "../domain/preview/ink";
import { keepCssBox } from "../domain/layout/sourceKeep";
import type { OutputPageLayout, PageBox, SourcePageMetrics, SplitDirection } from "../domain/layout/types";
import { renderSourcePage } from "../infrastructure/pdf/renderPage";
import { containSize } from "./fitSheet";
import { FullscreenFrame } from "./FullscreenFrame";
import { KeepRegion } from "./KeepRegion";
import { useViewZoom, useWheelZoom, ViewZoom } from "./ViewZoom";

interface SourcePreviewProps {
  fileHash: string;
  bytes: Uint8Array;
  metrics: SourcePageMetrics;
  sourceIndex: number;
  sourceCount: number;
  split: SplitDirection;
  ratio: number;
  keep: PageBox;
  hasOwnKeep: boolean;
  pieces: OutputPageLayout[];
  onSelectSource: (index: number) => void;
  onBeginDrag: () => void;
  onLiveRatio: (ratio: number) => void;
  onLiveKeep: (keep: PageBox) => void;
  onCommitKeep: (keep: PageBox | null) => void;
  onEndDrag: () => void;
  onCutInk: (hit: boolean) => void;
}

export function SourcePreview(props: SourcePreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <>
      <section className="pane">
        <SourcePane {...props} fullscreen={false} onFullscreen={() => setFullscreen(true)} />
      </section>
      {fullscreen && (
        <SourcePane {...props} fullscreen onFullscreen={() => setFullscreen(false)} />
      )}
    </>
  );
}

function SourcePane({
  fileHash,
  bytes,
  metrics,
  sourceIndex,
  sourceCount,
  split,
  ratio,
  keep,
  hasOwnKeep,
  pieces,
  onSelectSource,
  onBeginDrag,
  onLiveRatio,
  onLiveKeep,
  onCommitKeep,
  onEndDrag,
  onCutInk,
  fullscreen,
  onFullscreen,
}: SourcePreviewProps & { fullscreen: boolean; onFullscreen: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef(false);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [painted, setPainted] = useState(0);
  const { zoom, setZoom } = useViewZoom();
  const displayed = displayedSize(metrics);
  const fit = containSize(bounds, displayed.widthPt / displayed.heightPt);
  const sheetWidth = Math.max(0, Math.floor(fit.width * zoom));
  const sheetHeight = Math.floor(fit.height * zoom);
  useWheelZoom(stageRef, zoom, setZoom);
  const keepCss = keepCssBox(keep, displayed);
  const cutLeft = ((keep.x + keep.width * ratio) / Math.max(1, displayed.widthPt)) * 100;
  const cutTop = ((displayed.heightPt - keep.y - keep.height * ratio) / Math.max(1, displayed.heightPt)) * 100;

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
    const canvas = canvasRef.current;
    if (!canvas || sheetWidth < 20) return;
    let cancelled = false;
    renderSourcePage(fileHash, bytes, sourceIndex + 1, canvas, sheetWidth)
      .then(() => {
        if (!cancelled) setPainted((count) => count + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bytes, fileHash, sheetWidth, sourceIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || split === "none" || canvas.width === 0) {
      onCutInk(false);
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const keepLeft = (keep.x / displayed.widthPt) * canvas.width;
    const keepTop = ((displayed.heightPt - keep.y - keep.height) / displayed.heightPt) * canvas.height;
    const keepW = (keep.width / displayed.widthPt) * canvas.width;
    const keepH = (keep.height / displayed.heightPt) * canvas.height;
    const strip = cutStrip(Math.max(1, Math.round(keepW)), Math.max(1, Math.round(keepH)), ratio, split === "vertical");
    const shifted = {
      x: Math.round(keepLeft + strip.x),
      y: Math.round(keepTop + strip.y),
      width: strip.width,
      height: strip.height,
    };
    onCutInk(regionHasInk(image.data, canvas.width, canvas.height, shifted));
  }, [displayed.heightPt, displayed.widthPt, keep.height, keep.width, keep.x, keep.y, onCutInk, painted, ratio, split]);

  const moveCut = (clientX: number, clientY: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const bounds = sheet.getBoundingClientRect();
    if (split === "horizontal") {
      const y = (clientY - bounds.top) / bounds.height;
      const top = (displayed.heightPt - keep.y - keep.height) / displayed.heightPt;
      const next = (y - top) / Math.max(0.001, keep.height / displayed.heightPt);
      onLiveRatio(Math.min(0.95, Math.max(0.05, next)));
      return;
    }
    const x = (clientX - bounds.left) / bounds.width;
    const left = keep.x / displayed.widthPt;
    const next = (x - left) / Math.max(0.001, keep.width / displayed.widthPt);
    onLiveRatio(Math.min(0.95, Math.max(0.05, next)));
  };

  const tools = (
    <div className="tool-groups">
      <ViewZoom zoom={zoom} onZoom={setZoom} />
      <span className="tool-sep" aria-hidden="true" />
      {hasOwnKeep
        ? <button type="button" onClick={() => onCommitKeep(null)}>整页保留</button>
        : <button type="button" className="quiet" disabled>可拖动蓝框裁边</button>}
      <span className="tool-sep" aria-hidden="true" />
      <div className="tool-group">
        <button type="button" disabled={sourceIndex === 0} onClick={() => onSelectSource(sourceIndex - 1)}>上一张</button>
        <button type="button" disabled={sourceIndex >= sourceCount - 1} onClick={() => onSelectSource(sourceIndex + 1)}>下一张</button>
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
      {!fullscreen && (
        <header className="pane-head">
          <h2>源页 {sourceIndex + 1} / {sourceCount}</h2>
          {tools}
        </header>
      )}
      <div
        ref={stageRef}
        className={sheetWidth > bounds.width + 1 || sheetHeight > bounds.height + 1 ? "stage scrolled" : "stage"}
      >
        <div
          ref={sheetRef}
          className="sheet source-sheet"
          style={{ width: sheetWidth || undefined, height: sheetHeight || undefined }}
        >
          <canvas ref={canvasRef} />
          <KeepRegion
            keep={keep}
            size={displayed}
            active={hasOwnKeep}
            onBegin={onBeginDrag}
            onLive={onLiveKeep}
            onEnd={onEndDrag}
          />
          {split !== "none" && (
            <div
              className={split === "horizontal" ? "cut-line horizontal" : "cut-line"}
              style={split === "horizontal"
                ? { top: `${cutTop}%`, left: `${keepCss.left}%`, width: `${keepCss.width}%` }
                : { left: `${cutLeft}%`, top: `${keepCss.top}%`, height: `${keepCss.height}%`, bottom: "auto" }}
              onPointerDown={(event) => {
                dragRef.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                onBeginDrag();
              }}
              onPointerMove={(event) => {
                if (!dragRef.current) return;
                moveCut(event.clientX, event.clientY);
              }}
              onPointerUp={() => {
                if (!dragRef.current) return;
                dragRef.current = false;
                onEndDrag();
              }}
            >
              <span>{Math.round(ratio * 1000) / 10}%</span>
            </div>
          )}
          {split === "none" && pieces[0] && (
            <div className="half-labels" style={{ left: `${keepCss.left}%`, width: `${keepCss.width}%`, top: `${keepCss.top + 1}%` }}>
              <span>成品 {pieces[0].index}</span>
            </div>
          )}
          {split !== "none" && pieces.length === 2 && (
            <div
              className={split === "horizontal" ? "half-labels horizontal" : "half-labels"}
              style={{ left: `${keepCss.left}%`, width: `${keepCss.width}%`, top: `${keepCss.top + 1}%`, height: split === "horizontal" ? `${keepCss.height}%` : undefined }}
            >
              <span>成品 {pieces[0]?.index}</span>
              <span>成品 {pieces[1]?.index}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <FullscreenFrame
        open
        title={`源页 ${sourceIndex + 1} / ${sourceCount}`}
        toolbar={tools}
        onClose={onFullscreen}
      >
        {body}
      </FullscreenFrame>
    );
  }
  return body;
}
