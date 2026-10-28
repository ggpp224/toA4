import type { DisplaySize, SplitDirection, SplitPiece } from "../types";

export function splitPage(
  direction: SplitDirection,
  size: DisplaySize,
  ratio: number,
): SplitPiece[] {
  if (direction === "vertical") return splitVertical(size, ratio);
  if (direction === "horizontal") return splitHorizontal(size, ratio);
  return splitNone(size);
}

function splitNone(size: DisplaySize): SplitPiece[] {
  return [
    {
      side: "whole",
      crop: { x: 0, y: 0, width: size.widthPt, height: size.heightPt },
    },
  ];
}

function splitVertical(size: DisplaySize, ratio: number): SplitPiece[] {
  const cut = size.widthPt * ratio;
  return [
    {
      side: "left",
      crop: { x: 0, y: 0, width: cut, height: size.heightPt },
    },
    {
      side: "right",
      crop: { x: cut, y: 0, width: size.widthPt - cut, height: size.heightPt },
    },
  ];
}

/** Ratio is measured from the top of the viewed page. Top half is emitted first. */
function splitHorizontal(size: DisplaySize, ratio: number): SplitPiece[] {
  const topHeight = size.heightPt * ratio;
  const cutFromBottom = size.heightPt - topHeight;
  return [
    {
      side: "top",
      crop: { x: 0, y: cutFromBottom, width: size.widthPt, height: topHeight },
    },
    {
      side: "bottom",
      crop: { x: 0, y: 0, width: size.widthPt, height: cutFromBottom },
    },
  ];
}
