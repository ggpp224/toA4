export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Media box size before rotation is applied. */
export interface SourcePageMetrics {
  widthPt: number;
  heightPt: number;
  /** Clockwise degrees: 0, 90, 180, or 270. */
  rotation: number;
  /** Media box lower-left. Defaults to the origin. */
  originX?: number;
  originY?: number;
}

export interface DisplaySize {
  widthPt: number;
  heightPt: number;
}

export type SplitDirection = "none" | "vertical" | "horizontal";
export type ScaleMode = "cover" | "fit" | "fitSafe" | "original";
export type HalfSide = "left" | "right" | "top" | "bottom" | "whole";

export interface OffsetMm {
  xMm: number;
  yMm: number;
}

export interface DefaultPlan {
  split: SplitDirection;
  /** Cut position as a fraction of the page, from the left or from the top. */
  splitRatio: number;
  scaleMode: ScaleMode;
  safeMarginMm: number;
  /**
   * Extra print-content scale on top of scaleMode. 1 = 100%.
   * Does not change A4 or the safety-zone overlay size.
   */
  contentScale: number;
}

export interface WorkbookJob {
  plan: DefaultPlan;
  halfRules: {
    left: OffsetMm;
    right: OffsetMm;
  };
  /** Source index -> cut direction. Absent means follow the plan. */
  sourceSplits: Record<number, SplitDirection>;
  /** Source index -> cut ratio. Absent means follow the plan. */
  sourceSplitRatios: Record<number, number>;
  /**
   * Source index -> keep box in reading-direction space.
   * Absent means the whole page is kept. Split happens inside this box.
   */
  sourceKeeps: Record<number, PageBox>;
  /** `${sourceIndex}:${side}` replaces the half-page rule for that output page. */
  pageAdjustments: Record<string, OffsetMm>;
  /**
   * `${sourceIndex}:${side}` print-content scale for that output page.
   * Absent means follow plan.contentScale.
   */
  pageContentScales: Record<string, number>;
}

export interface OutputPageLayout {
  /** 1-based print order. */
  index: number;
  sourceIndex: number;
  side: HalfSide;
  /** Crop in reading-direction space. Origin is the bottom-left of the viewed page. */
  crop: PageBox;
  scale: number;
  /** Where the viewed page's bottom-left sits on the A4 page. Positive y is up. */
  originXPt: number;
  originYPt: number;
  offsetMm: OffsetMm;
  followsHalfRule: boolean;
  /** Crop rectangle on the A4 page before clipping. */
  placed: PageBox;
}

export interface SplitPiece {
  side: HalfSide;
  crop: PageBox;
}
