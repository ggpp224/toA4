import { useEffect, type ReactNode } from "react";

interface FullscreenFrameProps {
  open: boolean;
  title: string;
  onClose: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function FullscreenFrame({ open, title, onClose, toolbar, children }: FullscreenFrameProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fullscreen-back" role="dialog" aria-modal="true" aria-label={title}>
      <header className="fullscreen-head">
        <h2>{title}</h2>
        <div className="fullscreen-tools">
          {toolbar}
          {toolbar ? <span className="tool-sep" aria-hidden="true" /> : null}
          <button type="button" onClick={onClose}>退出全屏</button>
        </div>
      </header>
      <div className="fullscreen-body">{children}</div>
    </div>
  );
}
