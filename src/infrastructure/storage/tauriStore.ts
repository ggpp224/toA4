import { BaseDirectory } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { parseJob } from "../../domain/job/job";
import type { Preset } from "../../domain/preset/preset";
import type { WorkbookStore } from "./types";

const baseDir = BaseDirectory.AppData;

export function tauriStore(): WorkbookStore {
  return {
    async loadJob(fileHash) {
      const path = jobPath(fileHash);
      if (!(await exists(path, { baseDir }))) return null;
      return parseJob(JSON.parse(await readTextFile(path, { baseDir })));
    },
    async saveJob(fileHash, job) {
      await ensureDir("jobs");
      await writeTextFile(jobPath(fileHash), JSON.stringify(job), { baseDir });
    },
    async listPresets() {
      if (!(await exists("presets.json", { baseDir }))) return [];
      const parsed = JSON.parse(await readTextFile("presets.json", { baseDir })) as Preset[];
      return Array.isArray(parsed) ? parsed : [];
    },
    async savePreset(preset) {
      const presets = (await this.listPresets()).filter((item) => item.id !== preset.id);
      presets.push(preset);
      await writeTextFile("presets.json", JSON.stringify(presets), { baseDir });
    },
    async deletePreset(id) {
      const presets = (await this.listPresets()).filter((item) => item.id !== id);
      await writeTextFile("presets.json", JSON.stringify(presets), { baseDir });
    },
  };
}

async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path, { baseDir }))) {
    await mkdir(path, { baseDir, recursive: true });
  }
}

function jobPath(fileHash: string): string {
  return `jobs/${fileHash}.json`;
}
