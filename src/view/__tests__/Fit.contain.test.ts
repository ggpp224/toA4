import { describe, expect, it } from "vitest";
import { containSize, stepViewZoom } from "../fitSheet";

describe("preview viewing size", () => {
  it("fits a landscape page inside a short pane without cropping", () => {
    const size = containSize({ width: 800, height: 220 }, 841.89 / 595.28);
    expect(size.height).toBeCloseTo(220, 4);
    expect(size.width).toBeCloseTo(220 * (841.89 / 595.28), 4);
    expect(size.width).toBeLessThan(800);
  });

  it("fits a portrait page inside a narrow pane", () => {
    const size = containSize({ width: 200, height: 500 }, 210 / 297);
    expect(size.width).toBeCloseTo(200, 4);
    expect(size.height).toBeCloseTo(200 / (210 / 297), 4);
  });

  it("steps the viewing zoom and stops at the ends", () => {
    expect(stepViewZoom(1, 1)).toBe(1.25);
    expect(stepViewZoom(1, -1)).toBe(0.75);
    expect(stepViewZoom(0.5, -1)).toBe(0.5);
    expect(stepViewZoom(4, 1)).toBe(4);
  });
});
