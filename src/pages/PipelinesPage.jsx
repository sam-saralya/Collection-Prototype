import React, { useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Empty, Tag, Modal, ModalHeader, Field, Select, cx } from '../ui.jsx';
import { fmt, fmtDate, exportCsv, IVR_CALL_OUTCOMES } from '../lib.js';
import { BORROWERS, PIPELINE_ACTION_BY_KEY, SEGMENT_OPERATORS, DAYS_OF_WEEK, TEMPLATES, CURRENT_USER } from '../data.js';

const DAY_LABEL_BY_KEY = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d.key, d.label]));
const TABS = [
  ['workflows', 'Workflows'],
  ['history', 'History'],
];
const newRunId = () => `run_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/* ════════════════════════════════════════════════════════════════════════
 * Pipelines list — a table of each saved pipeline (built in the standalone
 * PipelineBuilderPage) with Edit / Run. Running walks the graph
 * (`linearize`) into an ordered step list and simulates each step's output
 * against the whole portfolio.
 * ════════════════════════════════════════════════════════════════════════ */

const newId = (p) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const OP_LABEL = Object.fromEntries(SEGMENT_OPERATORS.map((o) => [o.key, o.label]));

// The graph is the source of truth. `linearize` walks it (root → following
// one outgoing edge each hop) into the same ordered "step" shape the run
// engine understands — so dragging a node or rewiring an edge in the canvas
// genuinely changes what order things run in. A step can now branch (SMS's
// delivered/not-delivered, and link-clicked/not-clicked when it has a link)
// — for this single-path preview we follow the "happy path" edge at a
// branch (delivered / link clicked) and ignore the retry side, same as
// picking the first edge did for a plain linear chain.
function linearize(nodes, edges) {
  if (!nodes?.length) return [];
  const hasIncoming = new Set(edges.map((e) => e.target));
  const root = nodes.find((n) => !hasIncoming.has(n.id)) || nodes[0];
  const order = [];
  const visited = new Set();
  let current = root;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    order.push(current);
    const outgoing = edges.filter((e) => e.source === current.id);
    const HAPPY_HANDLES = ['delivered', 'link_clicked', 'answered', 'will_pay'];
    const nextEdge = outgoing.find((e) => HAPPY_HANDLES.includes(e.sourceHandle)) || outgoing[0];
    current = nextEdge ? nodes.find((n) => n.id === nextEdge.target) : null;
  }
  return order.map((n) => ({ id: n.id, type: n.type, ...n.data }));
}

/* ── deterministic mock "what the vendor/channel returned" ─────────────── */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function seededRand(key) {
  const x = Math.sin(hashStr(key)) * 10000;
  return x - Math.floor(x);
}
function simulateFieldValue(borrower, field) {
  const r = seededRand(borrower._id + ':' + field.key);
  switch (field.key) {
    case 'altMobile': return borrower.altMobile || null;
    case 'resolvedAddress': return borrower.resolvedAddress || null;
    case 'upiId': return borrower.upiId || null;
    case 'bankAccount': return borrower.bankAccount || null;
    case 'bureauScore': return borrower.bureauScore || Math.floor(560 + r * 240);
    case 'bureauActiveLines': return Math.floor(r * 7);
    case 'bureauOverdueLines': return Math.floor(r * 3);
    case 'bureauName': return borrower.bureauName || (r > 0.5 ? 'CRIF' : 'CIBIL');
    case 'ivrCallOutcome': return borrower.ivrCallOutcome || (r > 0.55 ? 'answered' : r > 0.3 ? 'no_answer' : 'busy');
    case 'ivrChoice': return borrower.ivrChoice || (r > 0.5 ? 'will_pay' : 'need_time');
    case 'received': return r > 0.15 ? 'received' : 'not_received';
    case 'linkClicked': return r > 0.4 ? 'clicked' : 'not_clicked';
    case 'phoneVerified': return r > 0.55 ? 'verified' : 'not_verified';
    case 'resolution': return r > 0.7 ? 'accept' : r > 0.35 ? 'do_nothing' : 'dispute';
    default: return null;
  }
}
function fieldOptionMeta(field, value) {
  return field.options?.find((o) => o.key === value) || null;
}
function matchCondition(value, op, raw) {
  if (value == null || raw === '' || raw == null) return false;
  const numVal = Number(value);
  const numRaw = Number(raw);
  const numeric = !isNaN(numVal) && !isNaN(numRaw);
  switch (op) {
    case 'eq': return numeric ? numVal === numRaw : String(value) === String(raw);
    case 'neq': return numeric ? numVal !== numRaw : String(value) !== String(raw);
    case 'gt': return numeric && numVal > numRaw;
    case 'gte': return numeric && numVal >= numRaw;
    case 'lt': return numeric && numVal < numRaw;
    case 'lte': return numeric && numVal <= numRaw;
    default: return false;
  }
}

function runPipeline(steps, rows) {
  const context = {};
  rows.forEach((b) => (context[b._id] = {}));
  const results = [];
  steps.forEach((step) => {
    if (step.type === 'action') {
      const action = PIPELINE_ACTION_BY_KEY[step.action];
      const perBorrower = rows.map((b) => {
        const values = {};
        action.fields.forEach((f) => (values[f.key] = simulateFieldValue(b, f)));
        Object.assign(context[b._id], values);
        return { borrower: b, values };
      });
      const found = perBorrower.filter((pb) => Object.values(pb.values).some((v) => v != null && v !== '')).length;
      results.push({ step, action, perBorrower, found, total: rows.length });
    } else if (step.type === 'segment') {
      const membership = rows.map((b) => {
        const ctx = context[b._id];
        const segment = (step.segments || []).find((sg) => sg.conditions.length > 0 && sg.conditions.every((c) => matchCondition(ctx[c.field], c.op, c.value)));
        return { borrower: b, segment: segment || null };
      });
      const counts = (step.segments || []).map((sg) => ({ segment: sg, rows: membership.filter((m) => m.segment?.id === sg.id).map((m) => m.borrower) }));
      const unsegmented = membership.filter((m) => !m.segment).map((m) => m.borrower);
      results.push({ step, membership, counts, unsegmented, total: rows.length });
    } else if (step.type === 'sms' || step.type === 'whatsapp') {
      const template = TEMPLATES.find((t) => t._id === step.templateId);
      const hasLink = !!template?.template_message?.includes('$link');
      const perBorrower = rows.map((b) => {
        const delivered = simulateFieldValue(b, { key: 'received' }) === 'received';
        const clicked = hasLink && delivered ? simulateFieldValue(b, { key: 'linkClicked' }) === 'clicked' : null;
        return { borrower: b, delivered, clicked };
      });
      const delivered = perBorrower.filter((p) => p.delivered).map((p) => p.borrower);
      const notDelivered = perBorrower.filter((p) => !p.delivered).map((p) => p.borrower);
      const linkClicked = hasLink ? perBorrower.filter((p) => p.delivered && p.clicked).map((p) => p.borrower) : [];
      const linkNotClicked = hasLink ? perBorrower.filter((p) => p.delivered && !p.clicked).map((p) => p.borrower) : [];
      results.push({ step, template, hasLink, total: rows.length, delivered, notDelivered, linkClicked, linkNotClicked });
    } else if (step.type === 'ivr') {
      const perBorrower = rows.map((b) => ({ borrower: b, outcome: simulateFieldValue(b, { key: 'ivrCallOutcome' }) }));
      const counts = IVR_CALL_OUTCOMES.map((o) => ({ outcome: o, rows: perBorrower.filter((p) => p.outcome === o.key).map((p) => p.borrower) }));
      results.push({ step, total: rows.length, counts });
    } else if (step.type === 'retry') {
      results.push({ step, total: rows.length });
    }
  });
  return results;
}

/* ══════════════════════════════════════════════════════════ run — drawer */

function StepResultBlock({ result, onExport, onCreateReport }) {
  if (result.step.type === 'sms' || result.step.type === 'whatsapp') {
    const { total, delivered, notDelivered, hasLink, linkClicked, linkNotClicked, template } = result;
    const icon = result.step.type === 'sms' ? '✉' : '📤';
    const label = result.step.type === 'sms' ? 'SMS' : 'WhatsApp';
    return (
      <div className="rounded-[10px] border border-line bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[12px]">{icon}</span>
          <b className="text-[12.5px]">{label}{template ? ` — ${template.template_id}` : ''}</b>
        </div>
        <div className="mt-2 space-y-1 text-[11px]">
          <div className="flex items-center justify-between"><span className="font-semibold text-emerald-600">Delivered</span><span>{fmt(delivered.length)} / {fmt(total)}</span></div>
          <div className="flex items-center justify-between text-rose-500">
            <span className="font-semibold">Not delivered → retry</span>
            <span className="flex items-center gap-2">
              {fmt(notDelivered.length)}
              <button className="font-semibold text-brand disabled:text-slate-300" disabled={notDelivered.length === 0} onClick={() => onCreateReport(label, 'Not delivered', notDelivered)}>
                → Create report
              </button>
            </span>
          </div>
          {hasLink && (
            <>
              <div className="flex items-center justify-between"><span className="font-semibold text-emerald-600">Link clicked</span><span>{fmt(linkClicked.length)}</span></div>
              <div className="flex items-center justify-between text-rose-500">
                <span className="font-semibold">Link not clicked → retry</span>
                <span className="flex items-center gap-2">
                  {fmt(linkNotClicked.length)}
                  <button className="font-semibold text-brand disabled:text-slate-300" disabled={linkNotClicked.length === 0} onClick={() => onCreateReport(label, 'Link not clicked', linkNotClicked)}>
                    → Create report
                  </button>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  if (result.step.type === 'ivr') {
    const { total, counts } = result;
    return (
      <div className="rounded-[10px] border border-line bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[12px]">☎</span>
          <b className="text-[12.5px]">Automated Call</b>
        </div>
        <div className="mt-2 space-y-1 text-[11px]">
          {counts.map(({ outcome, rows }) => (
            <div key={outcome.key} className={cx('flex items-center justify-between', outcome.key === 'answered' ? 'font-semibold text-emerald-600' : outcome.key === 'invalid' ? 'text-ink' : 'text-rose-500')}>
              <span className="font-semibold">{outcome.label}{outcome.key !== 'answered' && outcome.key !== 'invalid' ? ' → retry' : ''}</span>
              <span className="flex items-center gap-2">
                {fmt(rows.length)} / {fmt(total)}
                {outcome.key !== 'answered' && (
                  <button className="font-semibold text-brand disabled:text-slate-300" disabled={rows.length === 0} onClick={() => onCreateReport('Automated Call (IVR)', outcome.label, rows)}>
                    → Create report
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (result.step.type === 'retry') {
    const { step, total } = result;
    return (
      <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[11px] text-white">🔁</span>
          <b className="text-[12.5px]">Retry</b>
        </div>
        <div className="mt-1.5 text-[11px] text-muted">
          {fmt(total)} borrowers queued — {(step.schedule || []).length > 0 ? step.schedule.map((s) => `${DAY_LABEL_BY_KEY[s.day]} ${s.time}`).join(', ') : 'no slots set'}, for {step.durationDays ?? 3} day{(step.durationDays ?? 3) === 1 ? '' : 's'}
        </div>
      </div>
    );
  }
  if (result.step.type === 'action') {
    const { action, found, total } = result;
    return (
      <div className="rounded-[10px] border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[12px]">{action.icon}</span>
            <b className="text-[12.5px]">{action.label}</b>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted">{fmt(found)} / {fmt(total)} resolved</span>
            <button className="text-[10.5px] font-semibold text-brand" onClick={() => onExport(result)}>Export Data ↓</button>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <i className="block h-full bg-gradient-to-r from-brand to-emerald-500" style={{ width: `${total ? (found / total) * 100 : 0}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border border-brand-2/40 bg-brand-2/[.04] p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-2 text-[11px] text-white">◆</span>
        <b className="text-[12.5px]">Segmentation</b>
      </div>
      <div className="mt-2 space-y-1.5">
        {result.counts.map(({ segment, rows }) => (
          <div key={segment.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5">
            <div>
              <span className="text-[12px] font-semibold">{segment.name}</span>
              <span className="ml-2 text-[11px] text-muted">{fmt(rows.length)} borrowers</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[10.5px] font-semibold text-brand disabled:text-slate-300" disabled={rows.length === 0} onClick={() => onCreateReport('Segmentation', segment.name, rows)}>→ Create report</button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-muted">
          <span className="text-[12px] font-semibold">Unsegmented</span>
          <span className="text-[11px]">{fmt(result.unsegmented.length)} borrowers</span>
        </div>
      </div>
    </div>
  );
}

function useRunResultActions(pipelineName) {
  const { showToast, addReport } = useUI();
  function exportStep(result) {
    const headers = ['Borrower', 'Ref ID', 'Mobile', ...result.action.fields.map((f) => f.label)];
    const rows = result.perBorrower.map(({ borrower, values }) => [
      borrower.name, borrower.refId, borrower.mobile,
      ...result.action.fields.map((f) => {
        const v = values[f.key];
        const meta = fieldOptionMeta(f, v);
        return meta ? meta.label : v ?? '';
      }),
    ]);
    exportCsv(`${pipelineName.replace(/\s+/g, '_').toLowerCase()}_${result.action.key}.csv`, headers, rows);
  }
  // Pulls the borrowers who reached a given outcome partway through this run
  // out into a Report — a snapshot to hand off and work by hand (a field
  // visit, a tele-calling list), tracked on its own page under "Reports".
  function createReport(stepLabel, outcomeLabel, rows) {
    const assignments = {};
    rows.forEach((b) => (assignments[b._id] = { assignee: null, status: 'pending', remark: '' }));
    addReport({
      id: newId('rpt'),
      name: `${pipelineName} — ${outcomeLabel}`,
      purpose: `${outcomeLabel} on the ${stepLabel} step — needs manual follow-up.`,
      source: { pipelineName, step: stepLabel, outcome: outcomeLabel },
      createdAt: new Date().toISOString(),
      generatedBy: CURRENT_USER.name,
      status: 'open',
      rowIds: rows.map((b) => b._id),
      assignments,
    });
    showToast(`Report “${outcomeLabel}” created — ${fmt(rows.length)} borrowers. See Reports.`, 'success');
  }
  return { exportStep, createReport };
}

// Run dialog — pick the population, kick the run off, then get out of the
// way: it closes itself once the run lands, and the result lives only in
// History from there (see "View analytics").
// Which borrowers reached a given node? Walks the incoming edges back to the
// source, narrowing by each branch handle it came out of.
function borrowersReaching(nodeId, pipeline, results, rows, seen = new Set()) {
  if (seen.has(nodeId)) return [];
  seen.add(nodeId);
  const node = pipeline.nodes.find((n) => n.id === nodeId);
  if (!node || node.type === 'source') return rows;
  const byId = new Set();
  pipeline.edges.filter((e) => e.target === nodeId).forEach((e) => {
    const src = pipeline.nodes.find((n) => n.id === e.source);
    if (!src) return;
    let base = borrowersReaching(src.id, pipeline, results, rows, seen);
    const h = e.sourceHandle;
    const res = results.find((r) => r.step.id === src.id);
    let picked = base;
    if (res && (src.type === 'sms' || src.type === 'whatsapp')) {
      picked = h === 'delivered' ? res.delivered : h === 'not_delivered' ? res.notDelivered : base;
    } else if (res && src.type === 'ivr') {
      picked = res.counts.find((c) => c.outcome.key === h)?.rows ?? base;
    } else if (src.type === 'delivered') {
      const feeder = pipeline.edges.find((x) => x.target === src.id && x.sourceHandle === 'delivered');
      const fres = feeder && results.find((r) => r.step.id === feeder.source);
      if (fres) picked = h === 'link_clicked' ? fres.linkClicked : h === 'link_not_clicked' ? fres.linkNotClicked : base;
    } else if (src.type === 'call_answered' && h) {
      picked = base.filter((b) => simulateFieldValue(b, { key: 'ivrChoice' }) === h);
    }
    const ids = new Set(base.map((b) => b._id));
    picked.filter((b) => ids.has(b._id)).forEach((b) => byId.add(b._id));
  });
  return rows.filter((b) => byId.has(b._id));
}

function RunWorkflowDialog({ pipeline, onClose, onRunStart, onRunComplete }) {
  const { worklists, addReport, showToast } = useUI();
  const allSteps = linearize(pipeline.nodes, pipeline.edges);
  const steps = allSteps.filter((s) => s.type !== 'source');
  const [source, setSource] = useState('portfolio'); // 'portfolio' | worklist id
  const selectedWorklist = source === 'portfolio' ? null : worklists.find((w) => w.id === source) || null;
  const rows = selectedWorklist
    ? BORROWERS.filter((b) => new Set(selectedWorklist.rowIds).has(b._id))
    : BORROWERS;
  const [phase, setPhase] = useState('idle'); // idle | running
  const [progress, setProgress] = useState(0);

  function run() {
    if (phase === 'running' || rows.length === 0) return;
    const runId = newRunId();
    setPhase('running');
    setProgress(0);
    onRunStart?.({ runId, pipeline, borrowers: rows.length });
    let p = 0;
    const tick = () => {
      p += 10 + Math.random() * 16;
      setProgress(Math.min(100, p));
      if (p < 100) setTimeout(tick, 300);
      else {
        const results = runPipeline(steps, rows);
        pipeline.nodes.filter((n) => n.type === 'report').forEach((n) => {
          const reached = borrowersReaching(n.id, pipeline, results, rows);
          const name = n.data.reportName?.trim() || `${pipeline.name} — Report`;
          const assignments = {};
          reached.forEach((b) => (assignments[b._id] = { assignee: null, status: 'pending', remark: '' }));
          addReport({
            id: newId('rpt'),
            name,
            purpose: n.data.reportDescription?.trim() || `Borrowers who reached the “${name}” step of ${pipeline.name}.`,
            source: { pipelineName: pipeline.name, step: 'Generate report', outcome: name },
            createdAt: new Date().toISOString(),
            generatedBy: CURRENT_USER.name,
            status: 'open',
            rowIds: reached.map((b) => b._id),
            assignments,
          });
          showToast(`Report “${name}” created — ${fmt(reached.length)} borrowers. See Reports.`, 'success');
        });
        onRunComplete?.({ runId, results, borrowers: rows.length });
      }
    };
    tick();
  }

  return (
    <Modal open onClose={onClose} size="md">
      <ModalHeader title={`Run — ${pipeline.name}`} subtitle={`${steps.length} steps, in order`} onClose={onClose} />

      <Card pad className="mb-4">
        <Field label="Data source" className="mb-0">
          <Select value={source} disabled={phase === 'running'} onChange={(e) => setSource(e.target.value)}>
            <option value="portfolio">📂 Whole portfolio</option>
            {worklists.map((w) => (
              <option key={w.id} value={w.id}>
                ⊞ {w.name} ({fmt(w.count)})
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-2 text-[11px] text-muted">{fmt(rows.length)} borrowers in this run</div>
      </Card>

      <Button variant="primary" className="w-full" disabled={phase === 'running' || rows.length === 0} onClick={run}>
        {phase === 'running' ? 'Running workflow…' : `Run on ${fmt(rows.length)} borrowers`}
      </Button>
      {phase === 'running' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <i className="block h-full bg-gradient-to-r from-brand to-emerald-500 transition-all" style={{ width: progress + '%' }} />
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════ per-run channel analytics — SMS / WhatsApp / IVR ═══════════════════════════ */

function AnalyticsStat({ label, value, sub }) {
  return (
    <div className="rounded-[10px] border border-line bg-slate-50/60 px-3 py-2.5">
      <div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-muted">{label}</div>
      <div className="mt-1 text-[20px] font-black leading-none text-ink">{value}</div>
      {sub && <div className="mt-1 text-[10px] font-semibold text-muted">{sub}</div>}
    </div>
  );
}

function AnalyticsBars({ rows, labelOf, valueOf }) {
  const max = Math.max(1, ...rows.map(valueOf));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-20 shrink-0 truncate text-[11px] font-semibold text-slate-700">{labelOf(r)}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.round((valueOf(r) / max) * 100)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right text-[11px] font-bold text-ink">{fmt(valueOf(r))}</span>
        </div>
      ))}
    </div>
  );
}

// Deterministic per-run mock breakdown across the three outreach channels —
// keyed off the run so numbers stay stable across re-renders/re-opens.
//
// Framed around the borrower's journey, not raw send/call volume: a channel
// like IVR redials the same borrower in a loop until they pick up (or the
// attempts run out), so "total calls" conflates attempts with people and
// isn't a useful headline number. What matters is how many *borrowers*
// were reached, how many engaged further, and how many were never reached
// despite retries — attempts only show up as a small supporting note.
function buildChannelAnalytics(seedKey, borrowers) {
  const r1 = seededRand(seedKey + ':sms');
  const r2 = seededRand(seedKey + ':wa');
  const r3 = seededRand(seedKey + ':ivr');
  const rJourney = seededRand(seedKey + ':journey');

  const smsTargeted = Math.round(borrowers * (0.55 + r1 * 0.35));
  const smsReached = Math.round(smsTargeted * (0.85 + r1 * 0.1));
  const smsEngaged = Math.round(smsReached * (0.1 + r1 * 0.15));

  const waTargeted = Math.round(borrowers * (0.4 + r2 * 0.35));
  const waReached = Math.round(waTargeted * (0.88 + r2 * 0.08));
  const waEngaged = Math.round(waReached * (0.3 + r2 * 0.3));

  const ivrTargeted = Math.round(borrowers * (0.3 + r3 * 0.3));
  const ivrReached = Math.round(ivrTargeted * (0.55 + r3 * 0.25));
  const ivrEngaged = Math.round(ivrReached * (0.5 + r3 * 0.25));
  const ivrAvgAttempts = +(1.4 + r3 * 1.8).toFixed(1);

  const journeyReached = Math.round(borrowers * (0.62 + rJourney * 0.2));
  const journeyEngaged = Math.round(journeyReached * (0.4 + rJourney * 0.25));
  const journeyResolved = Math.round(journeyEngaged * (0.35 + rJourney * 0.3));

  return {
    journey: [
      { stage: 'Targeted', borrowers },
      { stage: 'Reached', borrowers: journeyReached },
      { stage: 'Engaged', borrowers: journeyEngaged },
      { stage: 'Resolved', borrowers: journeyResolved },
    ],
    sms: { targeted: smsTargeted, reached: smsReached, engaged: smsEngaged, neverReached: smsTargeted - smsReached },
    whatsapp: { targeted: waTargeted, reached: waReached, engaged: waEngaged, neverReached: waTargeted - waReached },
    ivr: { targeted: ivrTargeted, reached: ivrReached, engaged: ivrEngaged, neverReached: ivrTargeted - ivrReached, avgAttempts: ivrAvgAttempts },
  };
}

const CHANNEL_TABS = [
  ['overview', 'Overview'],
  ['steps', 'Step results'],
  ['sms', 'SMS'],
  ['whatsapp', 'WhatsApp'],
  ['ivr', 'IVR'],
];

// A shrinking-bar funnel: each stage's bar is sized relative to the first
// stage, with the count that fell away between consecutive stages called out.
function DropoffFunnel({ stages }) {
  const max = stages[0]?.value || 1;
  return (
    <div className="space-y-3.5">
      {stages.map((s, i) => {
        const pct = max ? Math.round((s.value / max) * 100) : 0;
        const prev = stages[i - 1];
        const dropped = prev ? Math.max(0, prev.value - s.value) : 0;
        const dropPct = prev && prev.value ? Math.round((dropped / prev.value) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-[11.5px]">
              <span className="font-semibold text-ink">{s.label}</span>
              <span className="text-muted">
                {fmt(s.value)}
                {dropPct != null && dropped > 0 && (
                  <span className="ml-1.5 font-semibold text-rose-500">· −{fmt(dropped)} ({dropPct}%) dropped off</span>
                )}
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2" style={{ width: `${Math.max(pct, s.value ? 2 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// A borrower's final state per channel is a status, not an arbitrary
// category — best outcome to worst, so it wears the app's existing
// success/warning/danger colors rather than a generic categorical set.
const OUTCOME_COLOR = { engaged: '#10b981', reachedOnly: '#f59e0b', neverReached: '#f43f5e' };

function outcomeSegments(ch) {
  const reachedOnly = Math.max(0, ch.reached - ch.engaged);
  return [
    { key: 'engaged', label: 'Engaged', value: ch.engaged, color: OUTCOME_COLOR.engaged },
    { key: 'reachedOnly', label: 'Reached, not engaged', value: reachedOnly, color: OUTCOME_COLOR.reachedOnly },
    { key: 'neverReached', label: 'Never reached', value: ch.neverReached, color: OUTCOME_COLOR.neverReached },
  ];
}

// Hand-rolled SVG donut — no chart lib in this project. A 2px surface gap
// separates the arcs (the same spacer used between bars elsewhere), the
// total sits in the center, and every slice is also direct-labeled in the
// legend so nothing here depends on color alone.
function DonutChart({ segments, total, totalLabel, size = 128, thickness = 18 }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gapPx = 3;
  let rawOffset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth={thickness} />
          {segments.map((s) => {
            const frac = total ? s.value / total : 0;
            const rawDash = frac * c;
            const visualDash = Math.max(0, rawDash - gapPx);
            const startOffset = rawOffset + gapPx / 2;
            rawOffset += rawDash;
            if (rawDash <= 0) return null;
            return (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${visualDash} ${c - visualDash}`}
                strokeDashoffset={-startOffset}
              >
                <title>{`${s.label}: ${fmt(s.value)} (${total ? Math.round(frac * 100) : 0}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[20px] font-black leading-none text-ink">{fmt(total)}</div>
            {totalLabel && <div className="mt-1 text-[9px] font-extrabold uppercase tracking-[.06em] text-muted">{totalLabel}</div>}
          </div>
        </div>
      </div>
      <div className="grid gap-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-ink">{s.label}</span>
            <span className="font-bold text-ink">{fmt(s.value)}</span>
            <span className="text-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunAnalyticsPage({ run, onBack }) {
  const { exportStep, createReport } = useRunResultActions(run.pipelineName);
  const [ctab, setCtab] = useState('overview');
  const a = run.channelAnalytics;
  const reachedPct = run.borrowers ? Math.round((a.journey[1].borrowers / run.borrowers) * 100) : 0;
  const engagedPct = a.journey[1].borrowers ? Math.round((a.journey[2].borrowers / a.journey[1].borrowers) * 100) : 0;
  const resolvedPct = a.journey[2].borrowers ? Math.round((a.journey[3].borrowers / a.journey[2].borrowers) * 100) : 0;

  return (
    <div>
      <button type="button" className="mb-2 text-[11.5px] font-semibold text-muted hover:text-ink" onClick={onBack}>
        ← Back to history
      </button>
      <PageHead title={`Analytics — ${run.pipelineName}`} subtitle={`${fmt(run.borrowers)} borrowers · started ${fmtDate(run.startedAt)}`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CHANNEL_TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setCtab(k)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              ctab === k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {ctab === 'overview' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <AnalyticsStat label="Borrowers targeted" value={fmt(run.borrowers)} />
            <AnalyticsStat label="Reached" value={fmt(a.journey[1].borrowers)} sub={`${reachedPct}% of targeted`} />
            <AnalyticsStat label="Engaged" value={fmt(a.journey[2].borrowers)} sub={`${engagedPct}% of reached`} />
            <AnalyticsStat label="Resolved" value={fmt(a.journey[3].borrowers)} sub={`${resolvedPct}% of engaged`} />
          </div>
          <Card pad className="mb-4">
            <SectionTitle title="Borrower journey" note="how far people got, not how many attempts it took" />
            <DropoffFunnel stages={a.journey.map((s) => ({ label: s.stage, value: s.borrowers }))} />
          </Card>
          <Card pad>
            <SectionTitle title="Reached by channel" note="unique borrowers, not send/call attempts" />
            <AnalyticsBars
              rows={[
                { label: 'SMS', value: a.sms.reached },
                { label: 'WhatsApp', value: a.whatsapp.reached },
                { label: 'IVR', value: a.ivr.reached },
              ]}
              labelOf={(r) => r.label}
              valueOf={(r) => r.value}
            />
          </Card>
        </>
      )}

      {ctab === 'steps' && (
        <div className="space-y-2.5">
          {(run.results || []).map((r) => (
            <StepResultBlock key={r.step.id} result={r} onExport={exportStep} onCreateReport={createReport} />
          ))}
        </div>
      )}

      {ctab === 'sms' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card pad>
            <SectionTitle title="Outcome distribution" note={`${fmt(a.sms.targeted)} targeted`} />
            <DonutChart segments={outcomeSegments(a.sms)} total={a.sms.targeted} totalLabel="Targeted" />
          </Card>
          <Card pad>
            <SectionTitle title="Drop-off" note="targeted → reached → engaged, by borrower" />
            <DropoffFunnel
              stages={[
                { label: 'Targeted', value: a.sms.targeted },
                { label: 'Reached', value: a.sms.reached },
                { label: 'Engaged', value: a.sms.engaged },
              ]}
            />
          </Card>
        </div>
      )}

      {ctab === 'whatsapp' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card pad>
            <SectionTitle title="Outcome distribution" note={`${fmt(a.whatsapp.targeted)} targeted`} />
            <DonutChart segments={outcomeSegments(a.whatsapp)} total={a.whatsapp.targeted} totalLabel="Targeted" />
          </Card>
          <Card pad>
            <SectionTitle title="Drop-off" note="targeted → reached → engaged, by borrower" />
            <DropoffFunnel
              stages={[
                { label: 'Targeted', value: a.whatsapp.targeted },
                { label: 'Reached', value: a.whatsapp.reached },
                { label: 'Engaged', value: a.whatsapp.engaged },
              ]}
            />
          </Card>
        </div>
      )}

      {ctab === 'ivr' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card pad>
            <SectionTitle title="Outcome distribution" note={`${fmt(a.ivr.targeted)} targeted`} />
            <DonutChart segments={outcomeSegments(a.ivr)} total={a.ivr.targeted} totalLabel="Targeted" />
            <p className="mt-3 text-[10.5px] text-muted">
              Averaged {a.ivr.avgAttempts} redials per borrower who was eventually reached — the dialer keeps retrying
              a no-pickup, so this is a per-borrower count, not a headline metric.
            </p>
          </Card>
          <Card pad>
            <SectionTitle title="Drop-off" note="targeted → reached → engaged, by borrower" />
            <DropoffFunnel
              stages={[
                { label: 'Targeted', value: a.ivr.targeted },
                { label: 'Reached', value: a.ivr.reached },
                { label: 'Engaged', value: a.ivr.engaged },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ history — runs currently in progress or past ═══════════════════════════════ */

function HistoryTab({ runs, onView }) {
  if (runs.length === 0) {
    return <Empty>No runs yet — run a workflow from the Workflows tab and it'll show up here.</Empty>;
  }
  return (
    <Card pad className="content-start">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Workflow</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Started</th>
              <th className="py-2 pr-3">Borrowers</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <td className="py-2.5 pr-3 font-semibold">{r.pipelineName}</td>
                <td className="py-2.5 pr-3">
                  {r.status === 'running' ? (
                    <Tag variant="amber">● Running</Tag>
                  ) : (
                    <Tag variant="green">Completed</Tag>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-muted">{fmtDate(r.startedAt)}</td>
                <td className="py-2.5 pr-3">{fmt(r.borrowers)}</td>
                <td className="py-2.5 pr-3 text-right">
                  {r.status === 'completed' && (
                    <button className="text-[11px] font-semibold text-brand" onClick={() => onView(r)}>
                      View analytics
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════ main page */

function WorkflowsTable({ pipelines, onEdit, onRun }) {
  return (
    <Card pad className="content-start">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Workflow</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((p) => (
              <tr key={p.id} className="border-b border-line/60">
                <td className="py-2.5 pr-3 font-semibold">{p.name}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="xs" onClick={() => onEdit(p)}>✎ Edit</Button>
                    <Button size="xs" variant="primary" onClick={() => onRun(p)}>▶ Run</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Seed history so the tab isn't empty on first load — a few past runs
// (computed for real through linearize + runPipeline, just against
// fabricated past timestamps) plus one still "in progress".
function buildSeedRuns(pipelines) {
  const byName = (name) => pipelines.find((p) => p.name === name);
  const seeds = [
    { pipeline: byName('High Ability, High Intent Borrowers (Saralya Suggested)'), startedAt: '2026-09-15T08:50:00Z', status: 'running' },
    { pipeline: byName('High Ability, Low Intent Borrowers (Saralya Suggested)'), startedAt: '2026-09-14T09:30:00Z', finishedAt: '2026-09-14T09:34:00Z', status: 'completed' },
    { pipeline: byName('High Ability, High Intent Borrowers (Saralya Suggested)'), startedAt: '2026-09-13T14:05:00Z', finishedAt: '2026-09-13T14:12:00Z', status: 'completed' },
    { pipeline: byName('High Ability, Low Intent Borrowers (Saralya Suggested)'), startedAt: '2026-09-10T11:00:00Z', finishedAt: '2026-09-10T11:05:00Z', status: 'completed' },
  ];
  return seeds
    .filter((s) => s.pipeline)
    .map((s, i) => {
      const allSteps = linearize(s.pipeline.nodes, s.pipeline.edges);
      const steps = allSteps.filter((n) => n.type !== 'source');
      const rows = BORROWERS;
      const id = `run_seed_${i}`;
      return {
        id,
        pipelineName: s.pipeline.name,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt || null,
        status: s.status,
        borrowers: rows.length,
        results: s.status === 'completed' ? runPipeline(steps, rows) : null,
        channelAnalytics: s.status === 'completed' ? buildChannelAnalytics(id, rows.length) : null,
      };
    })
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export default function PipelinesPage() {
  const { pipelines, openPipelineBuilder, showToast } = useUI();
  const [tab, setTab] = useState('workflows');
  const [runningPipeline, setRunningPipeline] = useState(null);
  const [runs, setRuns] = useState(() => buildSeedRuns(pipelines));
  const [viewingRun, setViewingRun] = useState(null);

  function handleRunStart({ runId, pipeline, borrowers }) {
    setRuns((list) => [{ id: runId, pipelineName: pipeline.name, startedAt: new Date().toISOString(), status: 'running', borrowers, results: null, channelAnalytics: null }, ...list]);
  }
  function handleRunComplete({ runId, results, borrowers }) {
    setRuns((list) =>
      list.map((r) =>
        r.id === runId
          ? { ...r, status: 'completed', finishedAt: new Date().toISOString(), results, channelAnalytics: buildChannelAnalytics(runId, borrowers ?? r.borrowers) }
          : r
      )
    );
    // The run dialog's only job was to kick this off — the outcome now lives
    // in History, not inline in the dialog.
    setRunningPipeline(null);
    setTab('history');
    showToast(`Workflow run completed — ${fmt(borrowers)} borrowers. See History.`, 'success');
  }

  if (viewingRun) {
    return <RunAnalyticsPage run={viewingRun} onBack={() => setViewingRun(null)} />;
  }

  return (
    <div>
      <PageHead />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
                tab === k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
              )}
            >
              {l}
              {k === 'history' && runs.some((r) => r.status === 'running') && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
              )}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => openPipelineBuilder('new')}>+ New workflow</Button>
      </div>

      {tab === 'workflows' ? (
        pipelines.length === 0 ? (
          <Empty>No workflows yet — compose one from the 7 action steps + manual segmentation.</Empty>
        ) : (
          <WorkflowsTable pipelines={pipelines} onEdit={openPipelineBuilder} onRun={setRunningPipeline} />
        )
      ) : (
        <HistoryTab runs={runs} onView={setViewingRun} />
      )}

      {runningPipeline && (
        <RunWorkflowDialog
          pipeline={runningPipeline}
          onClose={() => setRunningPipeline(null)}
          onRunStart={handleRunStart}
          onRunComplete={handleRunComplete}
        />
      )}
    </div>
  );
}
