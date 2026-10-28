import { useEffect, useState } from "react";
import { cutRangeLabel } from "../domain/layout/sourceCut";
import type { HalfSide, OffsetMm, ScaleMode, SplitDirection } from "../domain/layout/types";
import type { CutScope, OffsetScope } from "../domain/job/job";
import { sideName } from "../viewmodel/useWorkbookSession";

interface AdjustmentBarProps {
  split: SplitDirection;
  scaleMode: ScaleMode;
  contentScale: number;
  ratio: number;
  sourceHasOwnCut: boolean;
  outputCount: number;
  cutScope: CutScope;
  safeMarginMm: number;
  offset: OffsetMm;
  side: HalfSide;
  adjusted: boolean;
  scope: OffsetScope;
  includeAdjusted: boolean;
  onSplit: (split: SplitDirection) => void;
  onScale: (scale: ScaleMode) => void;
  onContentScale: (scale: number) => void;
  onRatio: (ratio: number) => void;
  onCutScope: (scope: CutScope) => void;
  onFollowCut: () => void;
  onApplyAll: () => void;
  onSafeMargin: (mm: number) => void;
  onOffset: (offset: OffsetMm) => void;
  onScope: (scope: OffsetScope) => void;
  onIncludeAdjusted: (value: boolean) => void;
  onRestorePage: () => void;
  onRestoreAll: () => void;
}

export function AdjustmentBar(props: AdjustmentBarProps) {
  const [open, setOpen] = useState(false);
  const splitOpen = props.split !== "none";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={open ? "adjust-shell open" : "adjust-shell"}>
      {!open && (
        <button
          type="button"
          className="adjust-drawer-tab"
          aria-expanded={false}
          aria-controls="adjust-drawer"
          onClick={() => setOpen(true)}
        >
          页面调整
        </button>
      )}
      {open && (
        <button
          type="button"
          className="adjust-drawer-back"
          aria-label="收起调整面板"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="adjust-drawer"
        className={open ? "adjust-drawer open" : "adjust-drawer"}
        aria-hidden={!open}
        aria-label="页面调整"
      >
        <header className="adjust-drawer-head">
          <h2>页面调整</h2>
          <button type="button" onClick={() => setOpen(false)}>收起</button>
        </header>
        <div className="controls">
          <section className="control-group">
            <h3>怎么切这一页</h3>
            <p>先在源页上拖蓝色框裁掉不要的边，再决定这一页印成 1 张还是 2 张，以及刀切在哪里。可点「全屏」看大图。</p>
            <label>
              这一页
              <select value={props.split} onChange={(event) => props.onSplit(event.target.value as SplitDirection)}>
                <option value="none">不切割，印成 1 张</option>
                <option value="vertical">左右切开，印成 2 张</option>
                {props.split === "horizontal" && <option value="horizontal">上下切开，印成 2 张</option>}
              </select>
            </label>
            {splitOpen && <RatioField ratio={props.ratio} onCommit={props.onRatio} />}
            <p className="hint">这份共 {props.outputCount} 张成品。{cutRangeLabel(props.split, props.ratio)}</p>
            {splitOpen && (
              <fieldset className="scopes">
                <legend>这一刀改哪些页</legend>
                <label><input type="radio" name="cut-scope" checked={props.cutScope === "source"} onChange={() => props.onCutScope("source")} />只改这一页</label>
                <label><input type="radio" name="cut-scope" checked={props.cutScope === "document"} onChange={() => props.onCutScope("document")} />整份一起改</label>
              </fieldset>
            )}
            <div className="group-actions">
              <button type="button" onClick={props.onApplyAll}>全部源页都按这一页切</button>
              {props.sourceHasOwnCut && (
                <button type="button" onClick={props.onFollowCut}>这一页改回跟随整份</button>
              )}
            </div>
          </section>

          <section className="control-group">
            <h3>印到纸上的大小</h3>
            <p>只缩放当前这张成品纸上的内容，A4 纸边和虚线不变；每张成品各自记住比例。查看放大只影响预览，不改导出。</p>
            <label>
              打印缩放
              <select value={props.scaleMode} onChange={(event) => props.onScale(event.target.value as ScaleMode)}>
                <option value="cover">铺满，超出的边裁掉</option>
                <option value="fit">适应纸张，整页落在纸内</option>
                <option value="fitSafe">适应安全区，落在虚线内</option>
                <option value="original">原大居中，不放大</option>
              </select>
            </label>
            <ContentScaleField scale={props.contentScale} onCommit={props.onContentScale} />
            <label>
              安全区
              <input
                type="number"
                min={0}
                max={15}
                step={0.5}
                value={props.safeMarginMm}
                onChange={(event) => props.onSafeMargin(Number(event.target.value))}
              />
              毫米
            </label>
            <p className="hint">内容仍超出虚线时：选「适应安全区」，或把内容缩放调小。</p>
          </section>

          <section className="control-group">
            <h3>挪动这一张 · {sideName(props.side)}</h3>
            <p>只平移当前成品在纸上的位置。向右、向上为正。方向键 1 毫米，按住 Shift 为 5 毫米。</p>
            <div className="offset-fields">
              <MmField
                label="水平"
                value={props.offset.xMm}
                onCommit={(xMm) => props.onOffset({ xMm, yMm: props.offset.yMm })}
              />
              <MmField
                label="垂直"
                value={props.offset.yMm}
                onCommit={(yMm) => props.onOffset({ xMm: props.offset.xMm, yMm })}
              />
            </div>
            {splitOpen && (
              <fieldset className="scopes">
                <legend>这次平移改哪些成品</legend>
                <label><input type="radio" name="offset-scope" checked={props.scope === "page"} onChange={() => props.onScope("page")} />仅此页</label>
                <label><input type="radio" name="offset-scope" checked={props.scope === "left"} onChange={() => props.onScope("left")} />所有左半页</label>
                <label><input type="radio" name="offset-scope" checked={props.scope === "right"} onChange={() => props.onScope("right")} />所有右半页</label>
                <label><input type="radio" name="offset-scope" checked={props.scope === "all"} onChange={() => props.onScope("all")} />全部成品页</label>
              </fieldset>
            )}
            {props.scope !== "page" && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={props.includeAdjusted}
                  onChange={(event) => props.onIncludeAdjusted(event.target.checked)}
                />
                连同已单独调整的页
              </label>
            )}
            <div className="group-actions">
              {props.adjusted && (
                <button type="button" onClick={props.onRestorePage}>
                  {props.side === "left" && "此页已单独挪过，恢复跟随左边页"}
                  {props.side === "right" && "此页已单独挪过，恢复跟随右边页"}
                  {props.side !== "left" && props.side !== "right" && "此页已单独挪过，恢复跟随"}
                </button>
              )}
              <button type="button" className="quiet" onClick={props.onRestoreAll}>恢复初始方案</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ContentScaleField({ scale, onCommit }: { scale: number; onCommit: (scale: number) => void }) {
  const [text, setText] = useState(String(Math.round(scale * 100)));
  useEffect(() => setText(String(Math.round(scale * 100))), [scale]);
  return (
    <label>
      内容缩放
      <input
        value={text}
        inputMode="decimal"
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const parsed = Number(event.currentTarget.value);
          if (!Number.isFinite(parsed)) {
            setText(String(Math.round(scale * 100)));
            return;
          }
          const next = Math.min(150, Math.max(40, Math.round(parsed))) / 100;
          if (Math.abs(next - scale) < 0.005) {
            setText(String(Math.round(scale * 100)));
            return;
          }
          onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      %
    </label>
  );
}

function RatioField({ ratio, onCommit }: { ratio: number; onCommit: (ratio: number) => void }) {
  const [text, setText] = useState(percent(ratio));
  useEffect(() => setText(percent(ratio)), [ratio]);
  return (
    <label>
      切割范围
      <input
        value={text}
        inputMode="decimal"
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const parsed = Number(event.currentTarget.value);
          if (!Number.isFinite(parsed)) {
            setText(percent(ratio));
            return;
          }
          const next = Math.min(95, Math.max(5, parsed)) / 100;
          if (Math.abs(next - ratio) < 0.0005) {
            setText(percent(ratio));
            return;
          }
          onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      %
    </label>
  );
}

function MmField({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(value.toFixed(1));
  useEffect(() => setText(value.toFixed(1)), [value]);
  return (
    <label>
      {label}
      <input
        value={text}
        inputMode="decimal"
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          const parsed = Number(event.currentTarget.value);
          if (!Number.isFinite(parsed)) {
            setText(value.toFixed(1));
            return;
          }
          const next = Math.round(parsed * 10) / 10;
          if (Math.abs(next - value) < 0.05) {
            setText(value.toFixed(1));
            return;
          }
          onCommit(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      毫米
    </label>
  );
}

function percent(ratio: number): string {
  return (Math.round(ratio * 1000) / 10).toString();
}
