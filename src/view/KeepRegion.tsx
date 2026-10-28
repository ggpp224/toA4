import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  boxFromCorners,
  clampKeep,
  fractionToKeepPoint,
  keepCssBox,
} from "../domain/layout/sourceKeep";
import type { DisplaySize, PageBox } from "../domain/layout/types";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

interface KeepRegionProps {
  keep: PageBox;
  size: DisplaySize;
  active: boolean;
  onBegin: () => void;
  onLive: (keep: PageBox) => void;
  onEnd: () => void;
}

export function KeepRegion({ keep, size, active, onBegin, onLive, onEnd }: KeepRegionProps) {
  const drag = useRef<{
    handle: Handle;
    start: PageBox;
    origin: { x: number; y: number };
  } | null>(null);
  const css = keepCssBox(keep, size);

  const pointInSheet = (event: ReactPointerEvent<HTMLElement>, sheet: DOMRect) =>
    fractionToKeepPoint(
      (event.clientX - sheet.left) / Math.max(1, sheet.width),
      (event.clientY - sheet.top) / Math.max(1, sheet.height),
      size,
    );

  const applyHandle = (handle: Handle, start: PageBox, point: { x: number; y: number }, origin: { x: number; y: number }) => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    let next = { ...start };
    if (handle === "move") {
      next = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      const left = handle.includes("w");
      const right = handle.includes("e");
      const bottom = handle.includes("s");
      const top = handle.includes("n");
      // n/s in CSS top space map to +y / -y in PDF space because origin is bottom-left.
      if (left) {
        const x = start.x + dx;
        next.width = start.width - dx;
        next.x = x;
      }
      if (right) next.width = start.width + dx;
      if (bottom) {
        const y = start.y + dy;
        next.height = start.height - dy;
        next.y = y;
      }
      if (top) next.height = start.height + dy;
    }
    return clampKeep(next, size);
  };

  return (
    <div
      className={active ? "keep-frame active" : "keep-frame"}
      style={{
        left: `${css.left}%`,
        top: `${css.top}%`,
        width: `${css.width}%`,
        height: `${css.height}%`,
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).dataset.handle) return;
        const sheet = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!sheet) return;
        drag.current = { handle: "move", start: keep, origin: pointInSheet(event, sheet) };
        event.currentTarget.setPointerCapture(event.pointerId);
        onBegin();
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        const sheet = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!state || !sheet) return;
        onLive(applyHandle(state.handle, state.start, pointInSheet(event, sheet), state.origin));
      }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        onEnd();
      }}
    >
      <span className="keep-label">保留区域</span>
      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]).map((handle) => (
        <i
          key={handle}
          data-handle={handle}
          className={`keep-handle ${handle}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            const sheet = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
            if (!sheet) return;
            drag.current = { handle, start: keep, origin: pointInSheet(event, sheet) };
            event.currentTarget.setPointerCapture(event.pointerId);
            onBegin();
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            const sheet = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
            if (!state || !sheet) return;
            onLive(applyHandle(state.handle, state.start, pointInSheet(event, sheet), state.origin));
          }}
          onPointerUp={() => {
            if (!drag.current) return;
            drag.current = null;
            onEnd();
          }}
        />
      ))}
    </div>
  );
}

export function drawKeepFromDrag(
  a: { x: number; y: number },
  b: { x: number; y: number },
  size: DisplaySize,
): PageBox {
  return clampKeep(boxFromCorners(a, b), size);
}
