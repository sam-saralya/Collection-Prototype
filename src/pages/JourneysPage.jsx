import React, { useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import {
  Button, Card, Drawer, DrawerHeader, Empty, ErrorBanner, Field, InfoNote, Input, Modal, ModalHeader,
  PageHead, SectionTitle, Select, Toggle, Tag,
} from '../ui.jsx';
import { JOURNEYS, JOURNEY_STATES, TEMPLATES, WORKFLOWS, JOURNEY_REPORT, JOURNEY_USAGE, DISPOSITION_REPORT } from '../data.js';

const CHANNEL_TAG = { WA: 'green', SMS: 'blue', 'AI Bot call': 'purple' };

function waitLabel(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
  }
  const d = minutes / 1440;
  return `${Number.isInteger(d) ? d : d.toFixed(1)} day${d === 1 ? '' : 's'}`;
}
const WAIT_PRESETS = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 720, label: '12 hours' },
  { minutes: 1440, label: '1 day' },
  { minutes: 2880, label: '2 days' },
  { minutes: 10080, label: '1 week' },
];
function cycleOptions() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 12; i += 1) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}
const pct = (part, whole) => (!whole ? null : Math.round((part / whole) * 100));

function StepRow({ step, states, templates, onChange, onRemove, index }) {
  const meta = states.find((s) => s.state === step.state);
  const isTimer = meta?.kind === 'timer';
  const isTerminal = meta?.terminal;
  const toggleTemplate = (id) =>
    onChange({ ...step, templates: step.templates.includes(id) ? step.templates.filter((x) => x !== id) : [...step.templates, id] });

  return (
    <Card pad className="relative">
      <button onClick={onRemove} className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-md text-[12px] text-danger hover:bg-red-50">
        ✕
      </button>
      <div className="mb-3 flex items-center gap-2 pr-8">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10.5px] font-bold text-muted">{index + 1}</span>
        <Tag variant={isTimer ? 'amber' : 'green'}>{isTimer ? 'Did NOT happen' : 'Happened'}</Tag>
        {isTerminal && <Tag variant="purple">Ends journey</Tag>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="When the borrower…" required>
          <Select value={step.state} onChange={(e) => onChange({ ...step, state: e.target.value })}>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        {isTimer ? (
          <Field label="…for how long?" required hint="How long to wait before deciding they are not going to act">
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value={WAIT_PRESETS.some((w) => w.minutes === step.wait_minutes) ? step.wait_minutes : ''}
                onChange={(e) => onChange({ ...step, wait_minutes: e.target.value ? Number(e.target.value) : step.wait_minutes })}
              >
                <option value="">Custom…</option>
                {WAIT_PRESETS.map((w) => (
                  <option key={w.minutes} value={w.minutes}>
                    {w.label}
                  </option>
                ))}
              </Select>
              <Input type="number" className="w-24" min={5} value={step.wait_minutes ?? ''} onChange={(e) => onChange({ ...step, wait_minutes: Number(e.target.value) })} placeholder="min" />
            </div>
          </Field>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      {isTimer && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Repeat" hint={step.repeat > 1 ? `Chases ${step.repeat}× every ${waitLabel(step.wait_minutes)}, then gives up` : 'Chases once, then gives up'}>
            <Input type="number" min={1} max={30} value={step.repeat ?? 1} onChange={(e) => onChange({ ...step, repeat: Number(e.target.value) })} />
          </Field>
          <Field label="Outcome when it gives up" hint="The label on the final report — what the calling team filters by">
            <Input value={step.outcome || ''} onChange={(e) => onChange({ ...step, outcome: e.target.value })} placeholder="Unreachable — needs call" />
          </Field>
        </div>
      )}
      {!isTimer && isTerminal && (
        <div className="mt-3">
          <Field label="Outcome" hint="The label on the final report">
            <Input value={step.outcome || ''} onChange={(e) => onChange({ ...step, outcome: e.target.value })} placeholder="High intent — collect ASAP" />
          </Field>
        </div>
      )}

      <div className="mt-3">
        <Field label="Send" hint="Optional — leave empty to record the step without messaging">
          <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-[10px] border border-line p-2">
            {templates.map((t) => (
              <label key={t._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50">
                <input type="checkbox" checked={step.templates.includes(t._id)} onChange={() => toggleTemplate(t._id)} />
                <Tag variant={CHANNEL_TAG[t.channel] || 'blue'}>{t.channel}</Tag>
                <span className="font-mono text-[11px]">{t.template_id}</span>
                <span className="truncate text-muted">— {t.template_message}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    </Card>
  );
}

function FunnelTable({ steps, totals }) {
  const max = Math.max(1, ...steps.map((s) => s.borrowers));
  return (
    <div>
      <div className="divide-y divide-line/60 rounded-[10px] border border-line">
        {steps.map((s) => (
          <div key={s.state} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-medium">{s.label}</span>
                  <Tag variant={s.kind === 'timer' ? 'amber' : 'green'}>{s.kind === 'timer' ? 'no action' : 'acted'}</Tag>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted">
                  <span>{s.still_here || 0} still here</span>
                  <span>{s.messages_sent || 0} sent</span>
                  {s.messages_failed ? <span className="font-semibold text-danger">{s.messages_failed} failed</span> : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[15px] font-bold leading-none tabular-nums">{s.borrowers}</div>
                <div className="text-[10px] text-muted">borrowers</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={s.kind === 'timer' ? 'h-full bg-amber-400' : 'h-full bg-emerald-500'} style={{ width: `${Math.round((s.borrowers / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {totals && (
        <p className="mt-2 text-[11px] text-muted">
          {totals.enrolled} enrolled · {totals.in_flight} still being chased · {totals.closed} finished
        </p>
      )}
    </div>
  );
}

function OutcomeChips({ outcomes, total }) {
  if (!outcomes?.length) return <Empty>Nobody has finished a journey yet.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {outcomes.map((o) => (
        <div key={`${o.outcome}-${o.closed_at_state}`} className="rounded-[10px] border border-line bg-slate-50/60 px-3 py-2">
          <div className="text-[15px] font-bold leading-none">{o.borrowers}</div>
          <div className="mt-1 text-[11px] font-semibold">{o.outcome || 'Unlabelled'}</div>
          <div className="text-[10px] text-muted">
            {pct(o.borrowers, total) !== null ? `${pct(o.borrowers, total)}% · ` : ''}
            at {o.closed_at_state || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JourneysPage() {
  const { showToast } = useUI();
  const states = JOURNEY_STATES;
  const templates = TEMPLATES;
  const workflows = WORKFLOWS;
  const [journeys, setJourneys] = useState(JOURNEYS);

  const [drawerId, setDrawerId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('steps');
  const [reportTab, setReportTab] = useState('steps');
  const [cycle, setCycle] = useState('');
  const [report, setReport] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [form, setForm] = useState(null);
  const [formErr, setFormErr] = useState(null);

  const cycles = useMemo(cycleOptions, []);
  const selected = journeys.find((j) => j._id === drawerId) || null;
  const stepCount = (j) => (j.steps || []).filter((s) => s.is_active !== false).length;

  const emptyStep = () => ({ state: states[0]?.state || 'link_not_clicked', templates: [], wait_minutes: 1440, repeat: 1, outcome: '' });

  function openCreate() {
    setForm({ _id: null, name: '', remark: '', send_window_start: '09:00', send_window_end: '20:00', steps: [], is_active: true });
    setFormErr(null);
    setFormModal(true);
  }
  function openEdit(journey) {
    setForm({
      _id: journey._id,
      name: journey.name || '',
      remark: journey.remark || '',
      send_window_start: journey.send_window_start || '',
      send_window_end: journey.send_window_end || '',
      steps: (journey.steps || []).map((s) => ({
        state: s.state,
        templates: (s.templates || []).map((t) => (typeof t === 'string' ? t : t._id)),
        wait_minutes: s.wait_minutes,
        repeat: s.repeat ?? 1,
        outcome: s.outcome || '',
      })),
      is_active: journey.is_active !== false,
    });
    setFormErr(null);
    setFormModal(true);
  }
  function save() {
    if (!form.name.trim()) return setFormErr('Give the journey a name.');
    const steps = form.steps.map((s) => {
      const meta = states.find((x) => x.state === s.state);
      return {
        _id: 's_' + Math.random().toString(36).slice(2, 7),
        state: s.state,
        kind: meta?.kind,
        terminal: meta?.terminal,
        templates: s.templates.map((id) => templates.find((t) => t._id === id) || { _id: id, template_id: id }),
        ...(meta?.kind === 'timer' ? { wait_minutes: Number(s.wait_minutes), repeat: Number(s.repeat) || 1 } : {}),
        outcome: s.outcome || '',
      };
    });
    if (form._id) {
      setJourneys((list) => list.map((j) => (j._id === form._id ? { ...j, ...form, steps, version: (j.version || 1) + 1 } : j)));
      showToast('Journey updated', 'success');
    } else {
      setJourneys((list) => [...list, { ...form, _id: 'jny_' + Date.now(), steps, version: 1 }]);
      showToast('Journey created', 'success');
    }
    setFormModal(false);
  }
  function remove(journey) {
    setJourneys((list) => list.map((j) => (j._id === journey._id ? { ...j, is_active: false } : j)));
    setDrawerOpen(false);
    showToast('Journey deactivated', 'success');
  }

  return (
    <>
      <PageHead
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setTab(tab === 'disposition' ? 'list' : 'disposition')}>
              {tab === 'disposition' ? 'Back to journeys' : 'Final report'}
            </Button>
            <Button variant="primary" onClick={openCreate}>
              New journey
            </Button>
          </div>
        }
      />

      {tab === 'disposition' ? (
        <Card pad>
          <SectionTitle
            title="Final report — every borrower who finished"
            note="Good outcomes and bad in one table. Filter to the buckets that need a human, then hand it over."
          />
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Cycle">
              <Select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                <option value="">All months</option>
                {cycles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Outcome">
              <Select>
                <option value="">All outcomes</option>
                {DISPOSITION_REPORT.filters.outcome_options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Journey">
              <Select>
                <option value="">All journeys</option>
                {journeys.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Workflow">
              <Select>
                <option value="">All workflows</option>
                {workflows.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mb-4">
            <OutcomeChips outcomes={DISPOSITION_REPORT.outcomes} total={DISPOSITION_REPORT.totals?.closed} />
          </div>
          <p className="mb-2 text-[11px] text-muted">
            {DISPOSITION_REPORT.totals.enrolled} enrolled · {DISPOSITION_REPORT.totals.closed} finished ·{' '}
            {DISPOSITION_REPORT.totals.in_flight} still being chased · showing {DISPOSITION_REPORT.rows.length} of {DISPOSITION_REPORT.total}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-muted">
                  <th className="whitespace-nowrap py-2 pr-4">Loan ID</th>
                  <th className="whitespace-nowrap py-2 pr-4">Mobile</th>
                  <th className="whitespace-nowrap py-2 pr-4">Outcome</th>
                  <th className="whitespace-nowrap py-2 pr-4">Ended at</th>
                  <th className="whitespace-nowrap py-2 pr-4">Journey</th>
                  <th className="whitespace-nowrap py-2 pr-4">Workflow</th>
                  <th className="whitespace-nowrap py-2 pr-4">Cycle</th>
                  <th className="whitespace-nowrap py-2 pr-4 text-right">Days</th>
                  <th className="whitespace-nowrap py-2 pr-4 text-right">Msgs</th>
                  <th className="whitespace-nowrap py-2 text-right">Finished</th>
                </tr>
              </thead>
              <tbody>
                {DISPOSITION_REPORT.rows.map((r) => (
                  <tr key={r._id} className="border-b border-line/60 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[11px]">{r.loanId || r.refId}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[11px] text-muted">{r.mobile}</td>
                    <td className="py-2.5 pr-4">
                      <b>{r.outcome}</b>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{r.closed_at_state}</td>
                    <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted">{r.journey?.name}</td>
                    <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted">{r.workflow?.name}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-muted">{r.cycle_month}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{r.days_in_journey}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-muted">
                      {r.sent_count}
                      {r.failed_count ? <span className="text-danger"> +{r.failed_count} failed</span> : null}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right text-muted">{new Date(r.closed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : !journeys.length ? (
        <Card pad>
          <Empty>No journeys yet.</Empty>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {journeys.map((j) => (
            <Card
              key={j._id}
              pad
              className="cursor-pointer hover:border-slate-300"
              onClick={() => {
                setDrawerId(j._id);
                setDrawerOpen(true);
                setReportTab('steps');
                setReport(null);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <b className="text-[13px] leading-tight">{j.name}</b>
                {j.is_active === false ? <Tag>Off</Tag> : <Tag variant="green">Active</Tag>}
              </div>
              {j.remark && <p className="mt-1 line-clamp-2 text-[11px] text-muted">{j.remark}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Tag variant="blue">
                  {stepCount(j)} step{stepCount(j) === 1 ? '' : 's'}
                </Tag>
                {j.send_window_start && (
                  <Tag>
                    {j.send_window_start}–{j.send_window_end}
                  </Tag>
                )}
                <Tag>v{j.version || 1}</Tag>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selected && (
          <>
            <DrawerHeader
              title={selected.name}
              subtitle={selected.send_window_start ? `Sends between ${selected.send_window_start} and ${selected.send_window_end}` : 'No quiet hours set — timers send whenever they come due'}
              onClose={() => setDrawerOpen(false)}
              actions={
                <div className="flex items-center gap-2">
                  <Button onClick={() => openEdit(selected)}>Edit</Button>
                  <Button onClick={() => showToast('Stopped chasing every borrower still in this journey', 'success')}>Stop chasing</Button>
                  <Button variant="danger" onClick={() => remove(selected)}>
                    Deactivate
                  </Button>
                </div>
              }
            />
            <div className="p-6">
              {JOURNEY_USAGE.length ? (
                <InfoNote tone="blue">
                  Attached to{' '}
                  {JOURNEY_USAGE.map((u, i) => (
                    <span key={i}>
                      {i ? ', ' : ''}
                      <b>
                        {u.owner} › {u.rule}
                      </b>
                    </span>
                  ))}
                  . Borrowers messaged by those rules enter this journey.
                </InfoNote>
              ) : (
                <InfoNote>Not attached to any workflow rule yet, so nobody is entering it.</InfoNote>
              )}

              <div className="mt-4 flex gap-2 border-b border-line">
                {[
                  ['steps', 'Steps'],
                  ['report', 'Report'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setReportTab(key);
                      if (key === 'report') setReport(JOURNEY_REPORT);
                    }}
                    className={reportTab === key ? 'border-b-2 border-slate-900 px-3 py-2 text-[12px] font-semibold' : 'px-3 py-2 text-[12px] text-muted hover:text-slate-900'}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {reportTab === 'steps' ? (
                <div className="mt-4 space-y-2">
                  {!(selected.steps || []).filter((s) => s.is_active !== false).length ? (
                    <Empty>No steps yet — edit the journey to add some.</Empty>
                  ) : (
                    (selected.steps || [])
                      .filter((s) => s.is_active !== false)
                      .map((s, i) => {
                        const meta = states.find((x) => x.state === s.state);
                        return (
                          <div key={s._id || i} className="rounded-[10px] border border-line px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-muted">{i + 1}</span>
                              <b className="text-[12.5px]">{meta?.label || s.state}</b>
                              <Tag variant={meta?.kind === 'timer' ? 'amber' : 'green'}>{meta?.kind === 'timer' ? `after ${waitLabel(s.wait_minutes)}` : 'immediately'}</Tag>
                              {meta?.kind === 'timer' && s.repeat > 1 && <Tag>×{s.repeat}</Tag>}
                              {meta?.terminal && <Tag variant="purple">ends journey</Tag>}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {(s.templates || []).length ? (
                                (s.templates || []).map((t) => {
                                  const tpl = typeof t === 'string' ? { _id: t, template_id: t } : t;
                                  return (
                                    <Tag key={tpl._id} variant={CHANNEL_TAG[tpl.channel] || 'blue'}>
                                      {tpl.template_id || tpl.channel}
                                    </Tag>
                                  );
                                })
                              ) : (
                                <span className="text-[11px] text-muted">No message — recorded only</span>
                              )}
                            </div>
                            {s.outcome && (
                              <div className="mt-1.5 text-[11px] text-muted">
                                Outcome: <b>{s.outcome}</b>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3 flex items-end gap-2">
                    <Field label="Cycle" className="w-40">
                      <Select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                        <option value="">All months</option>
                        {cycles.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button onClick={() => setReport(JOURNEY_REPORT)}>Refresh</Button>
                  </div>
                  {!report ? (
                    <Empty />
                  ) : (
                    <>
                      <SectionTitle title="Where borrowers drop off" />
                      <FunnelTable steps={report.steps || []} totals={report.totals} />
                      <div className="mt-5">
                        <SectionTitle title="Outcomes" />
                        <OutcomeChips outcomes={report.outcomes} total={report.totals?.closed} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Drawer>

      <Modal open={formModal} onClose={() => setFormModal(false)} size="lg">
        {form && (
          <>
            <ModalHeader title={form._id ? 'Edit journey' : 'New journey'} subtitle="One row per thing the borrower might do — or not do." onClose={() => setFormModal(false)} />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Name" required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="7-day chase" />
                </Field>
                <Field label="Remark">
                  <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </Field>
              </div>

              <Field label="Only send between" hint="A timer that comes due outside these hours waits for the window to open.">
                <div className="flex items-center gap-2">
                  <Input type="time" value={form.send_window_start} onChange={(e) => setForm({ ...form, send_window_start: e.target.value })} />
                  <span className="text-[12px] text-muted">and</span>
                  <Input type="time" value={form.send_window_end} onChange={(e) => setForm({ ...form, send_window_end: e.target.value })} />
                </div>
              </Field>

              <div className="flex items-center justify-between">
                <SectionTitle title="Steps" note={`${form.steps.length} row(s)`} />
                <Button onClick={() => setForm({ ...form, steps: [...form.steps, emptyStep()] })}>+ Add step</Button>
              </div>

              {!form.steps.length ? (
                <Empty>No steps yet. Add one for each thing you want to answer.</Empty>
              ) : (
                <div className="space-y-2.5">
                  {form.steps.map((s, i) => (
                    <StepRow
                      key={i}
                      index={i}
                      step={s}
                      states={states}
                      templates={templates}
                      onChange={(next) => setForm({ ...form, steps: form.steps.map((x, j) => (j === i ? next : x)) })}
                      onRemove={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}
                    />
                  ))}
                </div>
              )}

              {form._id && (
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-slate-50/60 px-3 py-2.5">
                  <div>
                    <b className="text-[12px]">Active</b>
                    <p className="text-[11px] text-muted">Turning this off stops new borrowers entering. Runs already in flight keep going.</p>
                  </div>
                  <Toggle on={form.is_active} onClick={() => setForm({ ...form, is_active: !form.is_active })} />
                </div>
              )}

              {formErr && <ErrorBanner>{formErr}</ErrorBanner>}
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button onClick={() => setFormModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={!form.name} onClick={save}>
                {form._id ? 'Save journey' : 'Create journey'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
