export type SourceKind = "pdf" | "jpeg" | "png";

/** Sniff PDF / JPEG / PNG from magic bytes, then MIME / extension. */
export function detectSourceKind(
  bytes: Uint8Array,
  file?: { name?: string; type?: string },
): SourceKind | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "png";
  }

  const type = (file?.type ?? "").toLowerCase();
  if (type === "application/pdf") return "pdf";
  if (type === "image/jpeg" || type === "image/jpg") return "jpeg";
  if (type === "image/png") return "png";

  const name = (file?.name ?? "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
  if (name.endsWith(".png")) return "png";
  return null;
}
