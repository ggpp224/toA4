import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "./createStore";

export async function savePdf(bytes: Uint8Array, fileName: string): Promise<boolean> {
  const downloadName = fileName.replace(/\.pdf$/i, "") + "-A4.pdf";
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  if (isTauri()) {
    const path = await save({
      defaultPath: downloadName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!path) return false;
    await writeFile(path, copy);
    return true;
  }
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
