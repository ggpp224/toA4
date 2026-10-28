import { PDFDocument, PDFRawStream, rgb, degrees } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { detectInitialPlan } from "../../../domain/layout/initialPlan";
import { layoutPages, placementToDraw } from "../../../domain/layout/layoutPages";
import { A4_HEIGHT_PT, A4_WIDTH_PT } from "../../../domain/layout/paper";
import type { PDFPage } from "pdf-lib";
import type { SourcePageMetrics } from "../../../domain/layout/types";
import { mmToPt } from "../../../domain/layout/units";
import { applyOffset, createJob, setSourceKeep, setSourceSplit, updatePlan } from "../../../domain/job/job";
import { exportPdf, exportSinglePage } from "../exportPdf";

const SPREAD: SourcePageMetrics[] = [
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
  { widthPt: 841.89, heightPt: 595.28, rotation: 0 },
];

async function spreadPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < 2; index += 1) {
    const page = doc.addPage([841.89, 595.28]);
    page.drawRectangle({ x: 36, y: 36, width: 120, height: 80, color: rgb(0.1, 0.1, 0.1) });
    page.drawRectangle({ x: 520, y: 36, width: 120, height: 80, color: rgb(0.4, 0.1, 0.1) });
  }
  return doc.save();
}

async function contentText(page: PDFPage): Promise<string> {
  const { Contents } = page.node.normalizedEntries();
  if (!Contents) return "";
  const parts: string[] = [];
  for (let index = 0; index < Contents.size(); index += 1) {
    const stream = page.node.context.lookup(Contents.get(index));
    if (!(stream instanceof PDFRawStream)) continue;
    const raw = stream.getContents();
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    const decoded = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate"));
    parts.push(await new Response(decoded).text());
  }
  return parts.join("\n").replace(/\/\S+ Do/g, "/Form Do");
}

describe("export placement", () => {
  it("writes four portrait A4 pages and keeps the preview page identical", async () => {
    const source = await spreadPdf();
    const job = applyOffset(
      createJob(detectInitialPlan(SPREAD[0]!)),
      { sourceIndex: 1, side: "left" },
      { xMm: -5.6, yMm: 0 },
      "page",
      false,
    );
    const layouts = layoutPages(SPREAD, job);
    const full = await PDFDocument.load(await exportPdf(source, SPREAD, layouts));
    const single = await PDFDocument.load(await exportSinglePage(source, SPREAD, layouts[2]!));

    expect(full.getPageCount()).toBe(4);
    for (const page of full.getPages()) {
      expect(page.getSize().width).toBeCloseTo(A4_WIDTH_PT, 2);
      expect(page.getSize().height).toBeCloseTo(A4_HEIGHT_PT, 2);
    }
    expect(single.getPageCount()).toBe(1);
    expect(await contentText(single.getPage(0))).toBe(await contentText(full.getPage(2)));

    const base = layoutPages(SPREAD, createJob(detectInitialPlan(SPREAD[0]!)));
    const shifted = placementToDraw(layouts[2]!).x - placementToDraw(base[2]!).x;
    expect(shifted).toBeCloseTo(mmToPt(-5.6), 4);
  });

  it("clips the finished page to the keep region so a nudge cannot reveal outside content", async () => {
    const source = await spreadPdf();
    let job = createJob(detectInitialPlan(SPREAD[0]!));
    job = setSourceSplit(updatePlan(job, { scaleMode: "fit" }), 0, "none");
    job = setSourceKeep(job, 0, { x: 200, y: 100, width: 300, height: 300 }, SPREAD[0]!);
    job = applyOffset(job, { sourceIndex: 0, side: "whole" }, { xMm: 25, yMm: 0 }, "page", false);
    const [layout] = layoutPages([SPREAD[0]!], job);
    const out = await PDFDocument.load(await exportSinglePage(source, [SPREAD[0]!], layout!));
    const text = await contentText(out.getPage(0));
    expect(text).toContain(`${layout!.placed.width}`);
    expect(text).toContain(`${layout!.placed.height}`);
    expect(text).not.toContain(`0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}`);
  });

  it("exports a rotated source page onto portrait A4", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    page.setRotation(degrees(90));
    page.drawRectangle({ x: 40, y: 40, width: 80, height: 80, color: rgb(0, 0, 0) });
    const source = await doc.save();
    const metrics: SourcePageMetrics[] = [
      { widthPt: 595.28, heightPt: 841.89, rotation: 90 },
    ];
    const layouts = layoutPages(metrics, createJob(detectInitialPlan(metrics[0]!)));
    const out = await PDFDocument.load(await exportPdf(source, metrics, layouts));
    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(0).getSize().width).toBeCloseTo(A4_WIDTH_PT, 2);
    expect((await contentText(out.getPage(0))).length).toBeGreaterThan(0);
  });
});
