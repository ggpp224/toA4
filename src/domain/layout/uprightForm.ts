import type { SourcePageMetrics } from "./types";
import { normalizeRotation } from "./units";

export interface FormEmbed {
  boundingBox: { left: number; bottom: number; right: number; top: number };
  /** Maps page user space into reading-direction space, origin at the viewed bottom-left. */
  matrix: [number, number, number, number, number, number];
}

export function uprightForm(page: SourcePageMetrics): FormEmbed {
  const originX = page.originX ?? 0;
  const originY = page.originY ?? 0;
  const urx = originX + page.widthPt;
  const ury = originY + page.heightPt;
  const boundingBox = { left: originX, bottom: originY, right: urx, top: ury };
  const rotation = normalizeRotation(page.rotation);
  if (rotation === 90) {
    return { boundingBox, matrix: [0, -1, 1, 0, -originY, urx] };
  }
  if (rotation === 180) {
    return { boundingBox, matrix: [-1, 0, 0, -1, urx, ury] };
  }
  if (rotation === 270) {
    return { boundingBox, matrix: [0, 1, -1, 0, ury, -originX] };
  }
  return { boundingBox, matrix: [1, 0, 0, 1, -originX, -originY] };
}

export function applyMatrix(
  matrix: readonly number[],
  x: number,
  y: number,
): [number, number] {
  return [
    matrix[0]! * x + matrix[2]! * y + matrix[4]!,
    matrix[1]! * x + matrix[3]! * y + matrix[5]!,
  ];
}
