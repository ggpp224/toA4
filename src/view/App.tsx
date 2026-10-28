import { useRef, useState } from "react";
import { hasPageAdjustment } from "../domain/job/job";
import { effectiveRatio, effectiveSplit } from "../domain/layout/sourceCut";
import type { Preset } from "../domain/preset/preset";
import { useWorkbookSession } from "../viewmodel/useWorkbookSession";
import { AdjustmentBar } from "./AdjustmentBar";
import { OutputPreview } from "./OutputPreview";
import { OutputStrip } from "./OutputStrip";
import { SourcePreview } from "./SourcePreview";

export function App() {
  const session = useWorkbookSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [presetName, setPresetName] = useState("");
  const [cutInk, setCutInk] = useState(false);
  const [pageWarnings, setPageWarnings] = useState({ outside: false, nearEdge: false });
  const job = session.job;
  const file = session.file;
  const selected = session.selected;

  const openPicker = () => inputRef.current?.click();

  return (
    <div
      className="app"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files[0];
        if (dropped) void session.ingestFile(dropped);
      }}
    >
      <header className="topbar">
        <div className="brand">
          <strong>toA4</strong>
          <span>练习册拆页打印</span>
        </div>
        <div className="top-actions">
          <button type="button" onClick={session.undo} disabled={!session.canUndo}>撤销</button>
          <button type="button" onClick={session.redo} disabled={!session.canRedo}>重做</button>
          <button type="button" onClick={openPicker}>导入</button>
          <button type="button" className="primary" onClick={() => void session.exportCurrent()} disabled={!file || session.busy}>
            导出 PDF
          </button>
        </div>
        <form
          className="presets"
          onSubmit={(event) => {
            event.preventDefault();
            void session.savePreset(presetName);
          }}
        >
          <label>
            预设
            <input value={presetName} placeholder="名称" onChange={(event) => setPresetName(event.target.value)} />
          </label>
          <button type="submit" disabled={!job || presetName.trim() === ""}>保存</button>
          <select
            value=""
            onChange={(event) => {
              const preset = session.presets.find((item) => item.id === event.target.value);
              if (!preset) return;
              setPresetName(preset.name);
              session.usePreset(preset);
            }}
          >
            <option value="">套用预设</option>
            {session.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
          {session.presets.length > 0 && (
            <button
              type="button"
              className="quiet"
              onClick={() => {
                const preset = session.presets.find((item) => item.name === presetName.trim());
                if (preset && window.confirm(`删除预设「${preset.name}」？`)) void session.deletePreset(preset.id);
              }}
            >
              删除
            </button>
          )}
        </form>
      </header>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (picked) void session.ingestFile(picked);
        }}
      />

      {session.error && (
        <p className="banner error" role="alert">
          {session.error}
          <button type="button" onClick={session.dismissError}>知道了</button>
        </p>
      )}
      {session.exportNote && (
        <p className="banner note-banner" role="status">
          {session.exportNote}
          <button type="button" onClick={session.dismissNote}>知道了</button>
        </p>
      )}

      {!file || !job || !selected ? (
        <main className="empty">
          <h1>把对开练习册拆成可以书写的 A4</h1>
          <p>导入 PDF、JPG 或 PNG。源文件不会被修改。每一页可以不切，也可以左右切开，切割范围由你定。导出纵向 A4，打印时选择实际大小。</p>
          <button type="button" className="primary" onClick={openPicker}>导入文件</button>
        </main>
      ) : (
        <main className="workspace">
          <SourcePreview
            fileHash={file.hash}
            bytes={file.bytes}
            metrics={session.metrics[session.sourceIndex]!}
            sourceIndex={session.sourceIndex}
            sourceCount={session.metrics.length}
            split={effectiveSplit(job, session.sourceIndex)}
            ratio={effectiveRatio(job, session.sourceIndex)}
            keep={session.currentKeep!}
            hasOwnKeep={session.hasOwnKeep}
            pieces={session.layouts.filter((page) => page.sourceIndex === session.sourceIndex)}
            onSelectSource={session.selectSource}
            onBeginDrag={session.beginDrag}
            onLiveRatio={session.liveRatio}
            onLiveKeep={session.liveKeep}
            onCommitKeep={session.commitKeep}
            onEndDrag={session.endDrag}
            onCutInk={setCutInk}
          />
          <section className="pane output-pane">
            <header className="pane-head">
              <h2>成品 {selected.index} / {session.layouts.length}</h2>
              <span className="file-name">{file.name}</span>
            </header>
            {cutInk && effectiveSplit(job, session.sourceIndex) !== "none" && <p className="warn">切割线可能切到内容</p>}
            {pageWarnings.outside && <p className="warn">有内容在纸外</p>}
            {pageWarnings.nearEdge && <p className="warn">靠近纸边，部分打印机可能印不全</p>}
            <OutputPreview
              fileHash={file.hash}
              bytes={file.bytes}
              pages={session.metrics}
              layout={selected}
              layouts={session.layouts}
              dragging={session.dragging}
              safeMarginMm={job.plan.safeMarginMm}
              contentScale={session.contentScale}
              title={`成品 ${selected.index} / ${session.layouts.length}`}
              onBeginDrag={session.beginDrag}
              onLiveOffset={session.liveOffset}
              onEndDrag={session.endDrag}
              onWarnings={setPageWarnings}
              onContentScale={session.setContentScale}
              onSelectPage={session.selectOutput}
            />
          </section>
          <AdjustmentBar
              split={effectiveSplit(job, session.sourceIndex)}
              scaleMode={job.plan.scaleMode}
              contentScale={session.contentScale}
              ratio={effectiveRatio(job, session.sourceIndex)}
              sourceHasOwnCut={
                job.sourceSplits[session.sourceIndex] !== undefined
                || job.sourceSplitRatios[session.sourceIndex] !== undefined
              }
              outputCount={session.layouts.length}
              cutScope={session.cutScope}
              safeMarginMm={job.plan.safeMarginMm}
              offset={selected.offsetMm}
              side={selected.side}
              adjusted={session.adjusted}
              scope={session.scope}
              includeAdjusted={session.includeAdjusted}
              onSplit={session.setSplit}
              onScale={session.setScale}
              onContentScale={session.setContentScale}
              onRatio={session.commitRatio}
              onCutScope={session.setCutScope}
              onFollowCut={session.followDocumentCut}
              onApplyAll={session.applyCutToAll}
              onSafeMargin={session.setSafeMargin}
              onOffset={session.setOffset}
              onScope={session.setScope}
              onIncludeAdjusted={session.setIncludeAdjusted}
              onRestorePage={session.restorePage}
              onRestoreAll={() => {
                if (window.confirm("恢复初始方案会清掉这份文件上的切割和位移。已保存的预设仍会留下。")) {
                  session.restoreAll();
                }
              }}
            />
          <OutputStrip
            fileHash={file.hash}
            bytes={file.bytes}
            pages={session.metrics}
            layouts={session.layouts}
            selectedIndex={selected.index}
            adjusted={session.layouts
              .filter((page) => hasPageAdjustment(job, page.sourceIndex, page.side))
              .map((page) => page.index)}
            onSelect={session.selectOutput}
          />
        </main>
      )}

      {session.pending && (
        <div className="modal-back">
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const id = String(data.get("preset") ?? "");
              const preset = session.presets.find((item) => item.id === id) ?? null;
              session.confirmPending(id === "" ? null : preset);
            }}
          >
            <h2>用哪套方案打开</h2>
            <p>{session.pending.name}</p>
            <label className="choice">
              <input type="radio" name="preset" value="" defaultChecked />
              空白方案
            </label>
            {session.presets.map((preset: Preset) => (
              <label className="choice" key={preset.id}>
                <input type="radio" name="preset" value={preset.id} />
                {preset.name}
              </label>
            ))}
            <div className="modal-actions">
              <button type="button" onClick={session.cancelPending}>取消</button>
              <button type="submit" className="primary">打开</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
