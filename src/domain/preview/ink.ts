import type { PageBox } from "../layout/types";

const WHITE = 245;

export function inkRatio(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: PageBox,
): number {
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(width, Math.ceil(region.x + region.width));
  const y1 = Math.min(height, Math.ceil(region.y + region.height));
  let ink = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] ?? 0;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      total += 1;
      if (alpha > 16 && (r < WHITE || g < WHITE || b < WHITE)) ink += 1;
    }
  }
  if (total === 0) return 0;
  return ink / total;
}

export function regionHasInk(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: PageBox,
): boolean {
  return inkRatio(data, width, height, region) >= 0.004;
}

export function cutStrip(width: number, height: number, ratio: number, vertical: boolean): PageBox {
  if (vertical) {
    const x = Math.min(width - 1, Math.max(0, ratio * width));
    return { x: Math.max(0, x - 1), y: 0, width: 2, height };
  }
  const y = Math.min(height - 1, Math.max(0, ratio * height));
  return { x: 0, y: Math.max(0, y - 1), width, height: 2 };
}

export function marginBandHasInk(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  marginX: number,
  marginY = marginX,
): boolean {
  if (marginX <= 0 && marginY <= 0) return false;
  const bandX = marginX <= 0 ? 0 : Math.max(1, Math.round(marginX));
  const bandY = marginY <= 0 ? 0 : Math.max(1, Math.round(marginY));
  const strips: PageBox[] = [];
  if (bandY > 0) {
    strips.push(
      { x: 0, y: 0, width, height: bandY },
      { x: 0, y: Math.max(0, height - bandY), width, height: bandY },
    );
  }
  if (bandX > 0) {
    strips.push(
      { x: 0, y: 0, width: bandX, height },
      { x: Math.max(0, width - bandX), y: 0, width: bandX, height },
    );
  }
  return strips.some((strip) => regionHasInk(data, width, height, strip));
}
