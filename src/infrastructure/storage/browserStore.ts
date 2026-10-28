import { parseJob } from "../../domain/job/job";
import type { Preset } from "../../domain/preset/preset";
import type { WorkbookStore } from "./types";

const JOB_PREFIX = "toA4:job:";
const PRESET_KEY = "toA4:presets";

export function browserStore(): WorkbookStore {
  return {
    async loadJob(fileHash) {
      const raw = localStorage.getItem(JOB_PREFIX + fileHash);
      if (!raw) return null;
      try {
        return parseJob(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async saveJob(fileHash, job) {
      localStorage.setItem(JOB_PREFIX + fileHash, JSON.stringify(job));
    },
    async listPresets() {
      return readPresets();
    },
    async savePreset(preset) {
      const presets = readPresets().filter((item) => item.id !== preset.id);
      presets.push(preset);
      localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    },
    async deletePreset(id) {
      const presets = readPresets().filter((item) => item.id !== id);
      localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    },
  };
}

function readPresets(): Preset[] {
  const raw = localStorage.getItem(PRESET_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Preset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
