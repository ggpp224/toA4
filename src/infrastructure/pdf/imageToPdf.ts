import { PDFDocument } from "pdf-lib";
import type { SourceKind } from "./sourceKind";

/** Wrap one raster image as a single-page PDF. 1 image pixel → 1 PDF point. */
export async function imageToPdf(bytes: Uint8Array, kind: Extract<SourceKind, "jpeg" | "png">): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image = kind === "png"
    ? await doc.embedPng(bytes.slice())
    : await doc.embedJpg(bytes.slice());
  const page = doc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });
  return doc.save();
}
