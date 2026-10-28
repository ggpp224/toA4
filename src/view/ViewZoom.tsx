import { useEffect, useState } from "react";
import { MAX_CONTENT_SCALE, MIN_CONTENT_SCALE, stepContentScale } from "../domain/layout/units";
import { stepViewZoom } from "./fitSheet";

export function useViewZoom() {
  const [zoom, setZoom] = useState(1);
  return { zoom, setZoom };
}

export function ViewZoom({ zoom, onZoom }: { zoom: number; onZoom: (zoom: number) => void }) {
  return (
    <div className="view-zoom" title="只放大查看，不改变打印大小">
      <span>查看</span>
      <button type="button" onClick={() => onZoom(stepViewZoom(zoom, -1))} disabled={zoom <= 0.5}>缩小</button>
      <button type="button" className="quiet" onClick={() => onZoom(1)}>{Math.round(zoom * 100)}%</button>
      <button type="button" onClick={() => onZoom(stepViewZoom(zoom, 1))} disabled={zoom >= 4}>放大</button>
    </div>
  );
}

/** Scales placed content on the A4 sheet; paper edges and the safety dashed line stay put. */
export function ContentZoom({
  scale,
  onScale,
}: {
  scale: number;
  onScale: (scale: number) => void;
}) {
  return (
    <div className="view-zoom" title="只缩放纸上的内容，A4 纸边和虚线不变，会影响导出">
      <span>内容</span>
      <button type="button" onClick={() => onScale(stepContentScale(scale, -1))} disabled={scale <= MIN_CONTENT_SCALE}>缩小</button>
      <button type="button" className="quiet" onClick={() => onScale(1)}>{Math.round(scale * 100)}%</button>
      <button type="button" onClick={() => onScale(stepContentScale(scale, 1))} disabled={scale >= MAX_CONTENT_SCALE}>放大</button>
    </div>
  );
}

export function useWheelZoom(
  ref: { current: HTMLElement | null },
  zoom: number,
  onZoom: (zoom: number) => void,
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoom(stepViewZoom(zoom, event.deltaY < 0 ? 1 : -1));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoom, ref, zoom]);
}
