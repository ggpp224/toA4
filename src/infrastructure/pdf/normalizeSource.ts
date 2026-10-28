import { imageToPdf } from "./imageToPdf";
import { detectSourceKind } from "./sourceKind";

export interface NormalizedSource {
  /** PDF bytes used by the rest of the pipeline. */
  bytes: Uint8Array;
  /** Original file name for display. */
  name: string;
}

/**
 * Accept PDF / JPEG / PNG. Images become a one-page PDF so layout and export stay unchanged.
 */
export async function normalizeSource(file: File): Promise<NormalizedSource> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const kind = detectSourceKind(raw, file);
  if (kind === null) {
    throw new Error("unsupported source");
  }
  if (kind === "pdf") {
    return { bytes: raw, name: file.name };
  }
  return {
    bytes: await imageToPdf(raw, kind),
    name: file.name,
  };
}
