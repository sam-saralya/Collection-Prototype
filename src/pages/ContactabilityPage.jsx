import React, { useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, SectionTitle, Tag, Select, Input, Modal, ModalHeader, cx } from '../ui.jsx';
import { fmt, IVR_OPTION_BY_KEY, IVR_SCRIPTS, IVR_SCRIPT_BY_ID } from '../lib.js';
import WorklistScope, { useWorklistScope } from '../components/WorklistScope.jsx';

function Field({ title, children }) {
  return (
    <div>
      <b className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-muted">{title}</b>
      {children}
    </div>
  );
}

function Info({ label, children }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[#edf1f5] py-2 text-[12px] last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}

export default function ContactabilityPage() {
  const { showToast } = useUI();
  const scope = useWorklistScope();
  const [callAppl, setCallAppl] = useState(true);
  const [callCo, setCallCo] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scriptId, setScriptId] = useState('std_reminder');
  const [days, setDays] = useState(7);
  const [times, setTimes] = useState(['11:00', '16:00']);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const script = IVR_SCRIPT_BY_ID[scriptId];
  const attemptsPerBorrower = Math.max(1, days) * Math.max(1, times.length);
  const setTime = (i, v) => setTimes((t) => t.map((x, j) => (j === i ? v : x)));
  const addTime = () => setTimes((t) => [...t, '12:00']);
  const removeTime = (i) => setTimes((t) => (t.length > 1 ? t.filter((_, j) => j !== i) : t));

  const call = useMemo(() => {
    const a = callAppl ? scope.rows.length : 0;
    const c = callCo ? scope.rows.filter((b) => b.hasCoApplicant).length : 0;
    return { applCalls: a, coCalls: c, total: a + c };
  }, [callAppl, callCo, scope.rows]);

  function runSweep() {
    if (running || call.total === 0) return;
    setRunning(true);
    setProgress(0);
    let p = 0;
    const tick = () => {
      p += 12 + Math.random() * 20;
      setProgress(Math.min(100, p));
      if (p < 100) setTimeout(tick, 360);
      else {
        setRunning(false);
        showToast(
          `IVR sweep scheduled · ${fmt(call.total)} calls${scope.worklist ? ` on “${scope.worklist.name}”` : ''} · "${script.name}" · ${times.join(' & ')} daily for ${days} days`,
          'success'
        );
      }
    };
    tick();
  }

  return (
    <div>
      <WorklistScope scope={scope} />

      <Card pad>
        <SectionTitle title="Run an IVR sweep" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-5 max-[860px]:grid-cols-1">
          <Field title="Who to call">
            <div className="flex flex-wrap gap-2">
              <label
                className={cx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[12px]',
                  callAppl ? 'border-brand bg-brand/10 font-semibold' : 'border-line'
                )}
              >
                <input type="checkbox" className="accent-brand" checked={callAppl} onChange={() => setCallAppl((v) => !v)} />
                Applicant
              </label>
              <label
                className={cx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[12px]',
                  callCo ? 'border-brand bg-brand/10 font-semibold' : 'border-line'
                )}
              >
                <input type="checkbox" className="accent-brand" checked={callCo} onChange={() => setCallCo((v) => !v)} />
                Co-applicant <span className="font-normal text-muted">· where present</span>
              </label>
            </div>
            {!callAppl && !callCo && <div className="mt-2 text-[11px] text-danger">Pick at least one party.</div>}
          </Field>

          <Field title="IVR content">
            <div className="flex flex-wrap items-center gap-3">
              <Select className="max-w-[300px] text-xs" value={scriptId} onChange={(e) => setScriptId(e.target.value)}>
                {IVR_SCRIPTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.language}
                  </option>
                ))}
              </Select>
              <button type="button" className="text-[11px] font-semibold text-brand" onClick={() => setPreviewOpen(true)}>
                View script →
              </button>
            </div>
          </Field>

          <Field title="Dialing schedule">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px]">
              <span>Dial for the next</span>
              <Input
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="h-8 w-14 py-0 text-center text-[12px]"
              />
              <span>days at</span>
              {times.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px]">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => setTime(i, e.target.value)}
                    className="border-0 bg-transparent text-[11px] outline-none"
                  />
                  {times.length > 1 && (
                    <button onClick={() => removeTime(i)} className="text-danger">
                      ✕
                    </button>
                  )}
                </span>
              ))}
              <button
                onClick={addTime}
                className="rounded-lg border border-dashed border-line px-2 py-1 text-[11px] font-semibold text-brand"
              >
                + time
              </button>
            </div>
          </Field>
        </div>

        <div className="mt-5 flex justify-end border-t border-line pt-3.5">
          <Button
            variant="primary"
            disabled={running || call.total === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {running ? 'Scheduling…' : 'Schedule IVR sweep'}
          </Button>
        </div>

        {(running || progress > 0) && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <i className="block h-full bg-gradient-to-r from-brand to-emerald-500 transition-all" style={{ width: progress + '%' }} />
          </div>
        )}
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} size="md">
        <ModalHeader
          title="Review IVR sweep"
          subtitle="Check the plan before the first calls go out."
          onClose={() => setConfirmOpen(false)}
        />
        <div className="grid">
          <Info label="Target">
            {scope.worklist ? `${scope.worklist.name} · ${fmt(scope.worklist.count)} borrowers` : `Whole portfolio · ${fmt(scope.rows.length)} borrowers`}
          </Info>
          <Info label="IVR script">{script.name}</Info>
          <Info label="Calling">
            {[callAppl && 'Applicant', callCo && 'Co-applicant'].filter(Boolean).join(' + ') || '—'}
          </Info>
          <Info label="Schedule">
            {times.join(' & ')} · daily for {days} days
          </Info>
          <Info label="Attempts / borrower">
            Up to {attemptsPerBorrower} ({times.length}×/day × {days} days) — stops on answer
          </Info>
          <Info label="Calls per cycle">
            {fmt(call.total)} — {fmt(call.applCalls)} applicant + {fmt(call.coCalls)} co-applicant
          </Info>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setConfirmOpen(false);
              runSweep();
            }}
          >
            Start sweep
          </Button>
        </div>
      </Modal>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} size="md">
        <ModalHeader title={script.name} subtitle={script.language} onClose={() => setPreviewOpen(false)} />
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Spoken message</div>
        <p className="mt-1 rounded-[8px] bg-slate-50 px-3 py-2.5 text-[12px] italic leading-relaxed text-slate-600">
          “{script.body}”
        </p>
        <div className="mt-4 text-[10px] font-bold uppercase tracking-wide text-muted">Keypad → captured response</div>
        <div className="mt-1.5 grid gap-1.5">
          {script.digits.map(([d, key]) => {
            const o = IVR_OPTION_BY_KEY[key];
            return (
              <div key={d} className="flex items-center gap-2 rounded-[8px] border border-line px-2.5 py-1.5 text-[12px]">
                <span className="grid h-5 w-5 place-items-center rounded bg-slate-100 text-[10px] font-bold">{d}</span>
                <span className="text-muted">→</span>
                {o ? <Tag variant={o.variant}>{o.label}</Tag> : key}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
