import { describe, expect, it } from "vitest";
import { commitHistory, createHistory, redoHistory, undoHistory } from "../job/history";
import { createJob, updatePlan } from "../job/job";
import { detectInitialPlan } from "../layout/initialPlan";

describe("undo history", () => {
  it("treats one committed change as a single step", () => {
    const initial = createJob(detectInitialPlan({ widthPt: 841.89, heightPt: 595.28, rotation: 0 }));
    let history = createHistory(initial);
    const dragged = updatePlan(initial, { splitRatio: 0.42 });
    history = commitHistory(history, dragged);
    history = commitHistory(history, dragged);
    expect(history.past).toHaveLength(1);
    history = undoHistory(history);
    expect(history.present.plan.splitRatio).toBe(0.5);
    history = redoHistory(history);
    expect(history.present.plan.splitRatio).toBe(0.42);
  });

  it("does nothing when there is no past entry", () => {
    const history = createHistory({ n: 1 });
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
  });
});
