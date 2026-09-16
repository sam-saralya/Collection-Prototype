import React, { useRef, useState } from 'react';
import { useUI } from '../store.jsx';
import { Modal, ModalHeader, Button, cx } from '../ui.jsx';

// The "import section" of the old Portfolio Import page, packaged as a dialog so
// View Portfolio is the single place a book is uploaded and re-scored.
export default function ImportPortfolioDialog({ open, onClose }) {
  const { showToast } = useUI();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  const reset = () => {
    setFile(null);
    setRunning(false);
    setProgress(0);
    setLog([]);
    setDone(false);
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = () => {
    reset();
    onClose?.();
  };

  function handleRun() {
    if (!file || running) return;
    setRunning(true);
    setProgress(0);
    setLog([]);
    const steps = [
      { pct: 20, msg: 'Uploading & reading file…' },
      { pct: 45, msg: 'Sanitising fields & applying cull rules…' },
      { pct: 70, msg: 'Scoring Ability & Intent…' },
      { pct: 92, msg: 'Assigning cohorts…' },
      { pct: 100, msg: 'Engine complete.' },
    ];
    let i = 0;
    const tick = () => {
      const s = steps[i];
      setProgress(s.pct);
      setLog((l) => [...l.map((x) => ({ ...x, done: true })), { msg: s.msg, done: s.pct === 100 }]);
      i++;
      if (i < steps.length) setTimeout(tick, 500);
      else {
        setRunning(false);
        setDone(true);
        showToast('Portfolio processed — the book below is refreshed', 'success');
      }
    };
    tick();
  }

  return (
    <Modal open={open} onClose={close} size="lg">
      <ModalHeader
        title="Upload portfolio"
        onClose={close}
      />

      {done ? (
        <div className="py-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-xl text-emerald-600">✓</div>
          <h3 className="mt-3 text-[15px] font-semibold">Portfolio processed</h3>
          <p className="mt-1 text-[12px] text-muted">
            {file?.name} is in. The loan book, KPIs and cohorts now reflect the new import.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={reset}>Import another file</Button>
            <Button variant="primary" onClick={close}>
              View the book
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cx(
              'relative rounded-xl2 border-[1.5px] border-dashed bg-gradient-to-b from-white to-slate-50 p-7 text-center transition',
              drag ? 'border-brand bg-brand/5' : 'border-slate-300'
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv"
              className="hidden"
              onChange={(e) => e.target.files[0] && setFile(e.target.files[0])}
            />
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-xl text-brand">⇧</div>
            <h3 className="mt-2.5 text-[14px] font-semibold">Drop CSV or XLSX portfolio here</h3>
            <p className="mt-1 text-[11px] text-muted">.xlsx / .csv up to 50 MB · processed by your Saralya engine.</p>
            <Button
              variant="primary"
              type="button"
              className="mt-3"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Choose portfolio file
            </Button>
            {file && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                <button
                  className="text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 text-right text-[11.5px] text-muted">
            <button
              type="button"
              className="font-semibold text-brand underline"
              onClick={() => showToast('Sample portfolio file downloaded', 'success')}
            >
              ⭳ Download sample file
            </button>
          </div>

          <Button variant="primary" className="mt-4 w-full" disabled={!file || running} onClick={handleRun}>
            {running ? 'Processing…' : 'Run validation & scoring'}
          </Button>

          {(running || log.length > 0) && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <i className="block h-full bg-gradient-to-r from-brand to-emerald-500 transition-all" style={{ width: progress + '%' }} />
              </div>
              <div className="mt-2 space-y-1 text-[11.5px] leading-relaxed">
                {log.map((s, i) => (
                  <div key={i} className={s.done ? 'text-ok' : 'text-muted'}>
                    {s.done ? '✓' : '⏳'} {s.msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
