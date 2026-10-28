import { useEffect, useRef, useState } from "react";
import type { OutputPageLayout, SourcePageMetrics } from "../domain/layout/types";
import { paintPlacedCrop, renderSourcePage } from "../infrastructure/pdf/renderPage";
import { sideName } from "../viewmodel/useWorkbookSession";

interface OutputStripProps {
  fileHash: string;
  bytes: Uint8Array;
  pages: SourcePageMetrics[];
  layouts: OutputPageLayout[];
  selectedIndex: number;
  adjusted: number[];
  onSelect: (layout: OutputPageLayout) => void;
}

export function OutputStrip({
  fileHash,
  bytes,
  pages,
  layouts,
  selectedIndex,
  adjusted,
  onSelect,
}: OutputStripProps) {
  return (
    <div className="strip" role="list">
      {layouts.map((layout) => (
        <Thumbnail
          key={`${layout.sourceIndex}:${layout.side}`}
          fileHash={fileHash}
          bytes={bytes}
          metrics={pages[layout.sourceIndex]}
          layout={layout}
          selected={layout.index === selectedIndex}
          marked={adjusted.includes(layout.index)}
          onSelect={() => onSelect(layout)}
        />
      ))}
    </div>
  );
}

function Thumbnail({
  fileHash,
  bytes,
  metrics,
  layout,
  selected,
  marked,
  onSelect,
}: {
  fileHash: string;
  bytes: Uint8Array;
  metrics: SourcePageMetrics | undefined;
  layout: OutputPageLayout;
  selected: boolean;
  marked: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceReady, setSourceReady] = useState(0);

  useEffect(() => {
    const source = document.createElement("canvas");
    let cancelled = false;
    renderSourcePage(fileHash, bytes, layout.sourceIndex + 1, source, 180)
      .then(() => {
        if (cancelled) return;
        sourceRef.current = source;
        setSourceReady((count) => count + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bytes, fileHash, layout.sourceIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source || !metrics) return;
    paintPlacedCrop(canvas, source, layout, metrics, 72);
  }, [layout, metrics, sourceReady]);

  return (
    <button type="button" className={selected ? "thumb selected" : "thumb"} onClick={onSelect} role="listitem">
      <canvas ref={canvasRef} />
      <span>成品 {layout.index}</span>
      <small>{sideName(layout.side)}{marked ? " · 已单独调整" : ""}</small>
    </button>
  );
}
