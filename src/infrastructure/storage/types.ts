import type { WorkbookJob } from "../../domain/layout/types";
import type { Preset } from "../../domain/preset/preset";

export interface WorkbookStore {
  loadJob(fileHash: string): Promise<WorkbookJob | null>;
  saveJob(fileHash: string, job: WorkbookJob): Promise<void>;
  listPresets(): Promise<Preset[]>;
  savePreset(preset: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;
}
