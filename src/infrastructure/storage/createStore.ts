import { browserStore } from "./browserStore";
import { tauriStore } from "./tauriStore";
import type { WorkbookStore } from "./types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function createStore(): WorkbookStore {
  return isTauri() ? tauriStore() : browserStore();
}
