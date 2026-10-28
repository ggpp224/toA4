import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const documents = new Map<string, Promise<pdfjs.PDFDocumentProxy>>();

export function loadPdfDocument(hash: string, bytes: Uint8Array): Promise<pdfjs.PDFDocumentProxy> {
  const cached = documents.get(hash);
  if (cached) return cached;
  const loading = pdfjs.getDocument({ data: bytes.slice() }).promise;
  loading.catch(() => {
    if (documents.get(hash) === loading) documents.delete(hash);
  });
  documents.set(hash, loading);
  return loading;
}

export async function openPdfDocument(bytes: Uint8Array): Promise<pdfjs.PDFDocumentProxy> {
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

export async function releasePdfDocument(hash: string): Promise<void> {
  const pending = documents.get(hash);
  documents.delete(hash);
  if (!pending) return;
  const doc = await pending.catch(() => null);
  await doc?.destroy();
}
