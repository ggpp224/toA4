import {
  clip,
  endPath,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  type PDFEmbeddedPage,
  type PDFPage,
} from "pdf-lib";
import { placementToDraw } from "../../domain/layout/layoutPages";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../../domain/layout/paper";
import { visibleOutputClip } from "../../domain/layout/previewRects";
import type { OutputPageLayout, SourcePageMetrics } from "../../domain/layout/types";
import { uprightForm } from "../../domain/layout/uprightForm";

export async function exportPdf(
  source: Uint8Array,
  pages: SourcePageMetrics[],
  layouts: OutputPageLayout[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  await drawLayouts(out, source, pages, layouts);
  return out.save();
}

export async function exportSinglePage(
  source: Uint8Array,
  pages: SourcePageMetrics[],
  layout: OutputPageLayout,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  await drawLayouts(out, source, pages, [layout]);
  return out.save();
}

async function drawLayouts(
  out: PDFDocument,
  source: Uint8Array,
  pages: SourcePageMetrics[],
  layouts: OutputPageLayout[],
): Promise<void> {
  const src = await PDFDocument.load(source.slice());
  const embedded = new Map<number, PDFEmbeddedPage>();
  for (const layout of layouts) {
    const metrics = pages[layout.sourceIndex];
    const srcPage = src.getPages()[layout.sourceIndex];
    if (!metrics || !srcPage) continue;
    const form = await embedSource(out, srcPage, metrics, embedded, layout.sourceIndex);
    drawLayout(out, form, layout);
  }
}

async function embedSource(
  out: PDFDocument,
  srcPage: PDFPage,
  metrics: SourcePageMetrics,
  cache: Map<number, PDFEmbeddedPage>,
  sourceIndex: number,
): Promise<PDFEmbeddedPage> {
  const cached = cache.get(sourceIndex);
  if (cached) return cached;
  const upright = uprightForm(metrics);
  const embedded = await out.embedPage(srcPage, upright.boundingBox, upright.matrix);
  cache.set(sourceIndex, embedded);
  return embedded;
}

function drawLayout(out: PDFDocument, embedded: PDFEmbeddedPage, layout: OutputPageLayout): void {
  const page = out.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  const clipBox = visibleOutputClip(layout);
  if (!clipBox) return;
  const draw = placementToDraw(layout);
  page.pushOperators(
    pushGraphicsState(),
    rectangle(clipBox.x, clipBox.y, clipBox.width, clipBox.height),
    clip(),
    endPath(),
  );
  page.drawPage(embedded, {
    x: draw.x,
    y: draw.y,
    xScale: draw.xScale,
    yScale: draw.yScale,
  });
  page.pushOperators(popGraphicsState());
}
