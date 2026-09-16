import React, { useMemo } from 'react';
import { Card, SectionTitle, cx } from '../ui.jsx';
import { fmt, fmtCr, isUnreachable, IVR_CALL_OUTCOMES, IVR_OPTIONS } from '../lib.js';
import { BORROWERS } from '../data.js';

// The aggregate read of the IVR contactability sweep — lives on the Org Manager
// reports screen (the operational sweep + per-borrower table stay on the
// Establish Contactability console page).

const OUTCOME_CLS = {
  answered: 'bg-emerald-500',
  no_answer: 'bg-slate-300',
  busy: 'bg-amber-400',
  invalid: 'bg-danger',
};

function Kpi({ label, value, sub, tone }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={cx('mt-1 text-[22px] font-black tracking-[-.02em]', tone)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

function StackBar({ label, counts, total }) {
  const t = total || 1;
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 text-[11px]">
      <b>{label}</b>
      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
          {IVR_CALL_OUTCOMES.map((o) => (
            <i key={o.key} className={cx('block h-full', OUTCOME_CLS[o.key])} style={{ width: ((counts[o.key] || 0) / t) * 100 + '%' }} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
          {IVR_CALL_OUTCOMES.map((o) => (
            <span key={o.key}>
              <i className={cx('mr-1 inline-block h-2 w-2 rounded-full align-middle', OUTCOME_CLS[o.key])} />
              {o.label} {fmt(counts[o.key] || 0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContactabilityReport() {
  const agg = useMemo(() => {
    const appl = { answered: 0, no_answer: 0, busy: 0, invalid: 0, _checked: 0 };
    const co = { answered: 0, no_answer: 0, busy: 0, invalid: 0, _checked: 0, _none: 0 };
    const choices = {};
    IVR_OPTIONS.forEach((o) => (choices[o.key] = { appl: 0, co: 0 }));
    let pending = 0,
      pendingOutstanding = 0,
      reachable = 0;
    BORROWERS.forEach((b) => {
      if (b.ivrCallOutcome) {
        appl._checked++;
        appl[b.ivrCallOutcome]++;
        if (b.ivrChoice) choices[b.ivrChoice].appl++;
      }
      if (!b.hasCoApplicant) co._none++;
      else if (b.coIvrCallOutcome) {
        co._checked++;
        co[b.coIvrCallOutcome]++;
        if (b.coIvrChoice) choices[b.coIvrChoice].co++;
      }
      if (b.ivrReachable || b.coIvrReachable) reachable++;
      if (isUnreachable(b)) {
        pending++;
        pendingOutstanding += b.outstanding;
      }
    });
    return { appl, co, choices, pending, pendingOutstanding, reachable, answeredTotal: appl.answered + co.answered };
  }, []);

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        <Kpi label="Calls placed" value={fmt(agg.appl._checked + agg.co._checked)} sub={`${fmt(agg.appl._checked)} appl · ${fmt(agg.co._checked)} co-appl`} />
        <Kpi label="Answered" value={fmt(agg.answeredTotal)} sub="Picked up + pressed a key" tone="text-ok" />
        <Kpi label="Reachable borrowers" value={fmt(agg.reachable)} sub="At least one party answered" />
        <Kpi label="Segmentation pending" value={fmt(agg.pending)} sub={`${fmtCr(agg.pendingOutstanding)} held out of cohorts`} tone="text-danger" />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4 max-[1080px]:grid-cols-1">
        <Card pad>
          <SectionTitle title="Did they pick up?" note="by party" />
          <div className="grid gap-4 pt-1">
            <StackBar label="Applicant" counts={agg.appl} total={agg.appl._checked} />
            <StackBar label="Co-applicant" counts={agg.co} total={agg.co._checked} />
          </div>
          <div className="mt-3 text-[11px] text-muted">{fmt(agg.co._none)} borrowers have no co-applicant on file.</div>
        </Card>

        <Card pad>
          <SectionTitle title="What they pressed" note={`${fmt(agg.answeredTotal)} answered calls`} />
          <div className="grid gap-2 pt-1">
            {IVR_OPTIONS.map((o) => {
              const c = agg.choices[o.key];
              const n = c.appl + c.co;
              const pct = agg.answeredTotal ? Math.round((n / agg.answeredTotal) * 100) : 0;
              return (
                <div key={o.key} className="grid grid-cols-[150px_1fr_84px] items-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="grid h-4 w-4 place-items-center rounded bg-slate-100 text-[9px] font-bold">{o.digit}</span>
                    {o.label}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <i className="block h-full rounded-full bg-brand" style={{ width: pct + '%' }} />
                  </div>
                  <span className="text-right text-muted">
                    {fmt(n)} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <b>{fmt(agg.choices.will_pay.appl + agg.choices.will_pay.co)}</b> pressed “will pay” and{' '}
            <b>{fmt(agg.choices.callback.appl + agg.choices.callback.co)}</b> asked for an agent — route these to a
            workflow first.
          </div>
        </Card>
      </div>
    </div>
  );
}
