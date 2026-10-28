import type { SourcePageMetrics } from "../../domain/layout/types";
import { loadPdfDocument } from "./pdfjs";

export async function readPdfMetrics(hash: string, bytes: Uint8Array): Promise<SourcePageMetrics[]> {
  const doc = await loadPdfDocument(hash, bytes);
  const pages: SourcePageMetrics[] = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    const [originX, originY, right, top] = page.view;
    pages.push({
      originX,
      originY,
      widthPt: right - originX,
      heightPt: top - originY,
      rotation: page.rotate,
    });
  }
  if (pages.length === 0) throw new Error("empty pdf");
  return pages;
}
