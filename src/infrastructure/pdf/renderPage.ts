import { displayedSize } from "../../domain/layout/displayedSize";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../../domain/layout/paper";
import { cropDrawRects } from "../../domain/layout/previewRects";
import type { OutputPageLayout, SourcePageMetrics } from "../../domain/layout/types";
import type { PDFPageProxy } from "pdfjs-dist";
import { loadPdfDocument, openPdfDocument } from "./pdfjs";

export async function renderPdfBytes(
  bytes: Uint8Array,
  canvas: HTMLCanvasElement,
  cssWidth: number,
): Promise<void> {
  const doc = await openPdfDocument(bytes);
  try {
    const page = await doc.getPage(1);
    await paintViewport(page, canvas, cssWidth);
  } finally {
    await doc.destroy();
  }
}

async function paintViewport(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  cssWidth: number,
): Promise<void> {
  const base = page.getViewport({ scale: 1 });
  const pixelWidth = Math.max(1, Math.round(cssWidth * devicePixelRatio));
  const scale = pixelWidth / base.width;
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
}

export async function renderSourcePage(
  hash: string,
  bytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
): Promise<void> {
  const doc = await loadPdfDocument(hash, bytes);
  const page = await doc.getPage(pageNumber);
  await paintViewport(page, canvas, cssWidth);
}

export function paintPlacedCrop(
  dest: HTMLCanvasElement,
  source: HTMLCanvasElement,
  layout: OutputPageLayout,
  metrics: SourcePageMetrics,
  cssWidth: number,
): void {
  const displayed = displayedSize(metrics);
  const pixelWidth = Math.max(1, Math.round(cssWidth * devicePixelRatio));
  const pixelHeight = Math.max(1, Math.round(pixelWidth * (A4_HEIGHT_PT / A4_WIDTH_PT)));
  dest.width = pixelWidth;
  dest.height = pixelHeight;
  const context = dest.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, dest.width, dest.height);
  const rects = cropDrawRects(
    layout,
    displayed,
    { widthPx: source.width, heightPx: source.height },
    { widthPx: dest.width, heightPx: dest.height },
  );
  context.drawImage(
    source,
    rects.source.x,
    rects.source.y,
    rects.source.width,
    rects.source.height,
    rects.dest.x,
    rects.dest.y,
    rects.dest.width,
    rects.dest.height,
  );
}
