import { describe, expect, it } from "vitest";
import { clampContentScale, stepContentScale } from "../layout/units";

describe("content scale", () => {
  it("clamps to the printable range", () => {
    expect(clampContentScale(0.2)).toBe(0.4);
    expect(clampContentScale(2)).toBe(1.5);
    expect(clampContentScale(Number.NaN)).toBe(1);
  });

  it("steps content scale and stops at the ends", () => {
    expect(stepContentScale(1, 1)).toBe(1.05);
    expect(stepContentScale(1, -1)).toBe(0.95);
    expect(stepContentScale(0.4, -1)).toBe(0.4);
    expect(stepContentScale(1.5, 1)).toBe(1.5);
  });
});
