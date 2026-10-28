export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const HISTORY_LIMIT = 50;

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

export function commitHistory<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const [next, ...future] = history.future;
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future,
  };
}
