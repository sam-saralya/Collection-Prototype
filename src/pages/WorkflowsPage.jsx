import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import {
  Card, Button, PageHead, SectionTitle, Empty, Tag, Field, Input, Select, Textarea,
  Modal, ModalHeader, Drawer, DrawerHeader, ErrorBanner, InfoNote, cx,
} from '../ui.jsx';
import { WORKFLOWS, TEMPLATES, WF_SIMULATE } from '../data.js';

const CHANNEL_TAG = { WA: 'green', SMS: 'amber', 'AI Bot call': 'purple' };
const DOT_COLOR = { WA: '#16a34a', SMS: '#f59e0b', 'AI Bot call': '#7c3aed' };
const CHANNEL_SECTIONS = [
  { key: 'WA', label: 'WhatsApp' },
  { key: 'SMS', label: 'SMS' },
  { key: 'AI Bot call', label: 'IVR' },
];
const offsetLabel = (n) => (n === 0 ? 'T' : n > 0 ? `T + ${n}` : `T − ${Math.abs(n)}`);
const ORDINAL = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
function ruleDotColor(rule) {
  const ch = (rule.templates || []).map((t) => (typeof t === 'string' ? null : t.channel)).find(Boolean);
  if (ch && DOT_COLOR[ch]) return DOT_COLOR[ch];
  return rule.trigger_offset < 0 ? '#0891b2' : rule.trigger_offset > 0 ? '#f59e0b' : '#635bff';
}
function triggerDateLabel(refDate, offset) {
  if (!refDate) return null;
  const d = new Date(refDate);
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + Number(offset || 0));
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
function anchorForMonth(referenceDay, year, monthIndex) {
  if (referenceDay == null) return null;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Number(referenceDay), lastDay), 0, 0, 0, 0);
}
const cycleParam = (c) => `${c.year}-${String(c.monthIndex + 1).padStart(2, '0')}`;
const cycleLabel = (c) => new Date(c.year, c.monthIndex, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const thisCycle = () => ({ year: new Date().getFullYear(), monthIndex: new Date().getMonth() });
const shiftCycle = (c, by) => {
  const d = new Date(c.year, c.monthIndex + by, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
};

function DayOfMonthSelect({ value, onChange, emptyLabel = '––' }) {
  return (
    <div className="flex items-center gap-2">
      <Select className="w-24" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{emptyLabel}</option>
        {DAYS_OF_MONTH.map((d) => (
          <option key={d} value={d}>
            {ORDINAL(d)}
          </option>
        ))}
      </Select>
      <span className="text-[10px] text-muted">{value ? 'of every month' : 'not set'}</span>
    </div>
  );
}
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
function TimeSelect({ value, onChange }) {
  const [h = '', m = ''] = (value || '').split(':');
  return (
    <div className="flex items-center gap-1.5">
      <Select className="w-20" value={h} onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m || '00'}` : '')}>
        <option value="">––</option>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      <span className="text-[13px] font-bold text-muted">:</span>
      <Select className="w-20" value={m} onChange={(e) => onChange(e.target.value ? `${h || '00'}:${e.target.value}` : '')}>
        <option value="">––</option>
        {MINUTES.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      <span className="text-[10px] text-muted">{value ? '24-hour' : 'not set'}</span>
    </div>
  );
}
function scheduledLabel(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

function TimelineColumn({ label, sublabel, labelColor, dotColor, children, muted }) {
  return (
    <div className="min-w-[190px] max-w-[280px] flex-1 px-2">
      <div className="mb-2 h-9 text-center">
        <div className="text-[10px] font-extrabold uppercase tracking-[.08em]" style={{ color: labelColor }}>
          {label}
        </div>
        <div className="mt-0.5 text-[9px] font-semibold text-muted">{sublabel || ' '}</div>
      </div>
      <div className="relative flex h-3.5 items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-200" />
        <div className="relative z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white shadow" style={{ background: dotColor, opacity: muted ? 0.5 : 1 }} />
      </div>
      <div className="mx-auto h-4 w-[2px] bg-slate-300" />
      {children}
    </div>
  );
}

function CadenceTimeline({ rules, referenceDate, runTime, anchorNote, onAdd, onEdit, onRemove }) {
  const sorted = [...(rules || [])].sort((a, b) => a.trigger_offset - b.trigger_offset);
  const timeFor = (rule) => rule.run_time || runTime || null;
  const nodes = (() => {
    const arr = sorted.map((r) => ({ type: 'rule', rule: r, offset: r.trigger_offset }));
    const idx = arr.findIndex((n) => n.offset >= 0);
    const anchor = { type: 'anchor', offset: 0 };
    if (idx === -1) arr.push(anchor);
    else arr.splice(idx, 0, anchor);
    return arr;
  })();

  return (
    <>
      <div className="-mx-2 overflow-x-auto pb-2">
        <div className="flex w-full px-2 pt-1">
          {nodes.map((node, i) => {
            if (node.type === 'anchor') {
              return (
                <TimelineColumn key={`anchor-${i}`} label="T · anchor" sublabel={triggerDateLabel(referenceDate, 0) || 'set date'} labelColor="#635bff" dotColor="#635bff">
                  <div className="rounded-2xl border-2 border-brand bg-brand/5 p-3">
                    <b className="text-[12px]">Anchor date (T)</b>
                    <p className="mt-1 text-[10px] leading-snug text-muted">
                      {referenceDate ? referenceDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'No anchor day set'}
                      {runTime ? ` at ${runTime}` : ''}
                    </p>
                    {anchorNote && <p className="mt-1 text-[9.5px] leading-snug text-muted">{anchorNote}</p>}
                  </div>
                </TimelineColumn>
              );
            }
            const rule = node.rule;
            const fireDate = triggerDateLabel(referenceDate, rule.trigger_offset);
            const ruleTime = timeFor(rule);
            return (
              <TimelineColumn
                key={rule._id}
                label={offsetLabel(rule.trigger_offset)}
                sublabel={[fireDate, ruleTime].filter(Boolean).join(' · ')}
                labelColor={ruleDotColor(rule)}
                dotColor={ruleDotColor(rule)}
                muted={rule.is_active === false}
              >
                <div
                  onClick={() => onEdit(rule)}
                  className={cx(
                    'group relative cursor-pointer rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card',
                    rule.is_active === false ? 'border-dashed border-slate-300 opacity-70' : 'border-line'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(rule);
                    }}
                    className="absolute right-2 top-2 hidden h-5 w-5 place-items-center rounded-md text-[11px] text-danger hover:bg-red-50 group-hover:grid"
                  >
                    ✕
                  </button>
                  <b className="block pr-5 text-[12.5px] leading-tight">{rule.name}</b>
                  <div className="mt-1 text-[10px] font-semibold" style={{ color: ruleDotColor(rule) }}>
                    {fireDate ? `Triggers ${fireDate}` : `Fires ${offsetLabel(rule.trigger_offset)}`}
                    {ruleTime ? ` at ${ruleTime}` : ''}
                  </div>
                  {!ruleTime ? (
                    <div className="mt-1 text-[9.5px] font-semibold text-amber-700">No send time — this rule won’t fire</div>
                  ) : (
                    rule.run_time && <div className="mt-1 text-[9.5px] text-muted">Own send time</div>
                  )}
                  {rule.remark && <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted">{rule.remark}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {(rule.templates || []).map((t) => {
                      const tpl = typeof t === 'string' ? { _id: t, template_id: t } : t;
                      return (
                        <Tag key={tpl._id} variant={CHANNEL_TAG[tpl.channel] || 'blue'}>
                          {tpl.channel || tpl.template_id || 'template'}
                        </Tag>
                      );
                    })}
                    {rule.is_active === false && <Tag>Off</Tag>}
                    {rule.journey && <Tag variant="blue">↳ journey</Tag>}
                  </div>
                </div>
              </TimelineColumn>
            );
          })}

          <TimelineColumn label="add" labelColor="#94a3b8" dotColor="#c7d2fe" muted>
            <button onClick={onAdd} className="grid min-h-[92px] w-full place-items-center rounded-2xl border-2 border-dashed border-brand/40 bg-brand/[.04] p-3 text-[12.5px] font-bold text-brand transition hover:bg-brand/10">
              ＋ Add event
            </button>
          </TimelineColumn>
        </div>
      </div>
      {sorted.length === 0 && <p className="mt-1 text-[11px] text-muted">No steps yet — add events before or after the anchor date.</p>}
    </>
  );
}

export default function WorkflowsPage() {
  const { showToast } = useUI();
  const templates = TEMPLATES;

  const [workflows, setWorkflows] = useState(WORKFLOWS);
  const [fActive, setFActive] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cycle, setCycle] = useState(thisCycle);

  const [wfModal, setWfModal] = useState(false);
  const [wfForm, setWfForm] = useState(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState(null);
  const [ruleErr, setRuleErr] = useState(null);
  const [simModal, setSimModal] = useState(false);
  const [simTarget, setSimTarget] = useState(null);

  const selected = workflows.find((w) => w._id === selectedId) || null;

  const list = workflows.filter((w) => {
    if (fActive && String(w.is_active !== false) !== fActive) return false;
    return true;
  });

  function openDetail(id) {
    setSelectedId(id);
    setCycle(thisCycle());
    setDrawerOpen(true);
  }
  function closeDetail() {
    setDrawerOpen(false);
    setSelectedId(null);
  }

  const inheritedRuleTime = selected?.run_time || null;

  /* ------- workflow modal ------- */
  function openCreateWf() {
    setWfForm({ _id: null, name: '', reference_day: '', run_time: '', remark: '', is_active: true });
    setWfModal(true);
  }
  function openEditWf(wf) {
    setWfForm({ _id: wf._id, name: wf.name, reference_day: wf.reference_day ?? '', run_time: wf.run_time || '', remark: wf.remark || '', is_active: wf.is_active !== false });
    setWfModal(true);
  }
  function openDuplicateWf(wf) {
    setWfForm({
      _id: null,
      duplicatedFrom: { name: wf.name },
      name: `${wf.name} (copy)`,
      reference_day: wf.reference_day ?? '',
      run_time: wf.run_time || '',
      remark: wf.remark || '',
      is_active: false,
      rules: wf.rules,
    });
    setWfModal(true);
  }
  function saveWf() {
    if (wfForm._id) {
      setWorkflows((list) =>
        list.map((w) =>
          w._id === wfForm._id
            ? { ...w, name: wfForm.name, reference_day: wfForm.reference_day === '' ? null : Number(wfForm.reference_day), run_time: wfForm.run_time || null, remark: wfForm.remark, is_active: wfForm.is_active }
            : w
        )
      );
      showToast('Workflow updated', 'success');
    } else {
      const id = 'wf_' + Date.now();
      setWorkflows((list) => [
        ...list,
        {
          _id: id,
          name: wfForm.name,
          reference_day: wfForm.reference_day === '' ? null : Number(wfForm.reference_day),
          run_time: wfForm.run_time || null,
          remark: wfForm.remark,
          is_active: wfForm.is_active,
          rules: wfForm.rules || [],
        },
      ]);
      showToast(wfForm.duplicatedFrom ? `Duplicated — saved as inactive` : 'Workflow created', 'success');
      setSelectedId(id);
    }
    setWfModal(false);
  }
  function removeWf(wf) {
    setWorkflows((list) => list.filter((w) => w._id !== wf._id));
    if (selectedId === wf._id) closeDetail();
    showToast('Workflow deleted', 'success');
  }

  /* ------- rule modal ------- */
  function openAddRule() {
    setRuleForm({ _id: null, name: '', trigger_offset: 0, run_time: '', templates: [], journey: '', ignore_journey: false, remark: '', is_active: true });
    setRuleErr(null);
    setRuleModal(true);
  }
  function openEditRule(rule) {
    setRuleForm({
      _id: rule._id,
      name: rule.name || '',
      trigger_offset: rule.trigger_offset ?? 0,
      run_time: rule.run_time || '',
      templates: (rule.templates || []).map((t) => (typeof t === 'string' ? t : t._id)),
      journey: rule.journey ? String(rule.journey) : '',
      ignore_journey: rule.ignore_journey === true,
      remark: rule.remark || '',
      is_active: rule.is_active !== false,
    });
    setRuleErr(null);
    setRuleModal(true);
  }
  function toggleTemplate(id) {
    setRuleForm((f) => ({ ...f, templates: f.templates.includes(id) ? f.templates.filter((x) => x !== id) : [...f.templates, id] }));
  }
  function ruleFromForm() {
    return {
      _id: ruleForm._id || 'r_' + Date.now(),
      name: ruleForm.name,
      trigger_offset: Number(ruleForm.trigger_offset),
      run_time: ruleForm.run_time || null,
      templates: ruleForm.templates.map((id) => templates.find((t) => t._id === id) || { _id: id, template_id: id }),
      journey: ruleForm.journey || null,
      ignore_journey: !!ruleForm.ignore_journey,
      remark: ruleForm.remark,
      is_active: ruleForm.is_active,
    };
  }
  function saveRule() {
    if (!ruleForm.templates.length) {
      setRuleErr('Pick at least one template for this rule.');
      return;
    }
    const nextRule = ruleFromForm();
    setWorkflows((list) =>
      list.map((w) => {
        if (w._id !== selected._id) return w;
        const rules = ruleForm._id ? w.rules.map((r) => (r._id === ruleForm._id ? nextRule : r)) : [...w.rules, nextRule];
        return { ...w, rules };
      })
    );
    showToast(ruleForm._id ? 'Rule updated' : 'Rule added', 'success');
    setRuleModal(false);
  }
  function removeRuleAt(rule) {
    setWorkflows((list) => list.map((w) => (w._id === selected._id ? { ...w, rules: w.rules.filter((r) => r._id !== rule._id) } : w)));
    showToast('Rule removed', 'success');
  }

  function runSimulate() {
    setSimTarget({ name: selected?.name });
    setSimModal(true);
  }

  return (
    <div>
      <PageHead
        actions={
          <Button variant="primary" onClick={openCreateWf}>
            ＋ New workflow
          </Button>
        }
      />

      <Card pad className="content-start">
        <SectionTitle title="Your workflows" note={`${list.length}`}>
          <div className="flex gap-2">
            <Select className="w-24 !py-1.5 !text-[11px]" value={fActive} onChange={(e) => setFActive(e.target.value)}>
              <option value="">Any</option>
              <option value="true">Active</option>
              <option value="false">Off</option>
            </Select>
          </div>
        </SectionTitle>

        {list.length === 0 ? (
          <Empty>No workflows match.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((wf) => (
              <div
                key={wf._id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(wf._id)}
                onKeyDown={(e) => e.key === 'Enter' && openDetail(wf._id)}
                className={cx('cursor-pointer rounded-xl border p-3 text-left transition', selectedId === wf._id ? 'border-brand bg-brand/5' : 'border-line hover:bg-slate-50')}
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[13px]">{wf.name}</b>
                  {wf.is_active !== false ? <Tag variant="green">Active</Tag> : <Tag>Off</Tag>}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                  <span>{wf.rules?.length ?? 0} rule(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer open={drawerOpen} onClose={closeDetail} width="xl">
        {!selected ? (
          <div className="grid flex-1 place-items-center">
            <Empty>Select a workflow to view and edit its rules.</Empty>
          </div>
        ) : (
          <>
            <DrawerHeader
              title={selected.name}
              onClose={closeDetail}
              actions={
                <>
                  <Button size="xs" variant="primary" onClick={() => runSimulate()}>
                    ▷ Simulate
                  </Button>
                  <Button size="xs" onClick={() => openEditWf(selected)}>
                    Edit
                  </Button>
                  <Button size="xs" onClick={() => openDuplicateWf(selected)}>
                    ⧉ Duplicate
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => removeWf(selected)}>
                    Delete
                  </Button>
                </>
              }
            />
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                {selected.reference_day ? <Tag variant="purple">Every month on the {ORDINAL(selected.reference_day)}</Tag> : <Tag>No anchor day set</Tag>}
                {selected.run_time ? <Tag variant="blue">Sends at {selected.run_time}</Tag> : <Tag>No send time set</Tag>}
                {selected.is_active !== false ? <Tag variant="green">Active</Tag> : <Tag>Off</Tag>}
              </div>
              {selected.remark && <p className="mb-4 text-[12px] text-slate-600">{selected.remark}</p>}

              <SectionTitle title="Cadence timeline" note={`${selected.rules?.length ?? 0} rule(s) · repeats monthly`}>
                <Button size="xs" variant="soft" onClick={() => openAddRule()}>
                  ＋ Add event
                </Button>
              </SectionTitle>

              <CadenceTimeline
                rules={selected.rules}
                referenceDate={anchorForMonth(selected.reference_day, cycle.year, cycle.monthIndex)}
                runTime={selected.run_time}
                onAdd={() => openAddRule()}
                onEdit={(r) => openEditRule(r)}
                onRemove={(r) => removeRuleAt(r)}
              />
            </div>
          </>
        )}
      </Drawer>

      {/* Workflow modal */}
      <Modal open={wfModal} onClose={() => setWfModal(false)}>
        {wfForm && (
          <>
            <ModalHeader
              title={wfForm.duplicatedFrom ? 'Duplicate workflow' : wfForm._id ? 'Edit workflow' : 'New workflow'}
              subtitle={wfForm.duplicatedFrom ? `Copy of "${wfForm.duplicatedFrom.name}"` : undefined}
              onClose={() => setWfModal(false)}
            />
            <div className="space-y-3.5">
              {wfForm.duplicatedFrom && (
                <InfoNote tone="blue">
                  Everything below is prefilled from the original, including its <b>{wfForm.rules?.length || 0} rule(s)</b>. It is saved <b>inactive</b>.
                </InfoNote>
              )}
              <Field label="Name" required>
                <Input value={wfForm.name} onChange={(e) => setWfForm({ ...wfForm, name: e.target.value })} placeholder="Escalation Track" />
              </Field>
              <Field label="Anchor day (T)" hint="Repeats monthly — offsets are measured from this day">
                <DayOfMonthSelect value={wfForm.reference_day} onChange={(v) => setWfForm({ ...wfForm, reference_day: v })} />
              </Field>
              <Field label="Send time" hint="Time of day every step of this workflow goes out (24-hour)">
                <TimeSelect value={wfForm.run_time} onChange={(v) => setWfForm({ ...wfForm, run_time: v })} />
              </Field>
              <Field label="Remark">
                <Textarea rows={2} value={wfForm.remark} onChange={(e) => setWfForm({ ...wfForm, remark: e.target.value })} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button onClick={() => setWfModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={!wfForm.name} onClick={saveWf}>
                {wfForm.duplicatedFrom ? 'Create copy' : wfForm._id ? 'Save' : 'Create'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Rule modal */}
      <Modal open={ruleModal} onClose={() => setRuleModal(false)}>
        {ruleForm && (
          <>
            <ModalHeader
              title={ruleForm._id ? 'Edit rule' : 'Add rule'}
              subtitle={selected?.name}
              onClose={() => setRuleModal(false)}
            />
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rule name" required>
                  <Input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Pre-due nudge" />
                </Field>
                <Field label="Trigger offset (days)" required hint="−2 = 2 days before T · 1 = day after">
                  <Input type="number" value={ruleForm.trigger_offset} onChange={(e) => setRuleForm({ ...ruleForm, trigger_offset: e.target.value })} />
                </Field>
              </div>
              <Field
                label="Send time"
                hint={inheritedRuleTime ? `Leave unset to inherit the workflow's (${inheritedRuleTime})` : 'No time is set on the workflow either — without one here this rule will never fire.'}
              >
                <TimeSelect value={ruleForm.run_time} onChange={(v) => setRuleForm({ ...ruleForm, run_time: v })} />
              </Field>
              <Field label="Templates" required hint="A rule can fire several at once (e.g. WhatsApp + SMS)">
                <div className="max-h-56 space-y-3 overflow-y-auto rounded-[10px] border border-line p-2">
                  {CHANNEL_SECTIONS.map(({ key, label }) => {
                    const group = templates.filter((t) => t.channel === key);
                    if (!group.length) return null;
                    return (
                      <div key={key}>
                        <div className="mb-1 px-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-muted">{label}</div>
                        <div className="space-y-1.5">
                          {group.map((t) => (
                            <label key={t._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50">
                              <input type="checkbox" checked={ruleForm.templates.includes(t._id)} onChange={() => toggleTemplate(t._id)} />
                              <span className="font-mono text-[11px]">{t.template_id}</span>
                              <span className="truncate text-muted">— {t.template_message}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Field>
              {ruleErr && <ErrorBanner>{ruleErr}</ErrorBanner>}
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button onClick={() => setRuleModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={!ruleForm.name} onClick={saveRule}>
                {ruleForm._id ? 'Save rule' : 'Add rule'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Simulate modal */}
      <Modal open={simModal} onClose={() => setSimModal(false)} size="lg">
        <ModalHeader title="Simulate workflow" subtitle={simTarget?.name} onClose={() => setSimModal(false)} />
        <InfoNote tone="blue">
          Dry run for the <b>{cycleLabel(cycle)}</b> cycle — this previews exactly what <b>would</b> be sent that month.
          Nothing is sent and nothing is stored.
        </InfoNote>
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {[
            ['Borrowers matched', WF_SIMULATE.matchedBorrowers],
            ['Active rules', WF_SIMULATE.activeRules],
            ['Messages generated', WF_SIMULATE.totalMessages],
          ].map(([l, v]) => (
            <div key={l} className="rounded-[10px] border border-line bg-slate-50/60 px-3 py-2.5 text-center">
              <div className="text-lg font-extrabold text-brand">{v}</div>
              <small className="text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">{l}</small>
            </div>
          ))}
        </div>

        <div className="max-h-[52vh] overflow-y-auto rounded-[10px] border border-line">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th className="text-left">Borrower</th>
                <th className="text-left">Handled by</th>
                <th className="text-left">Channel</th>
                <th className="text-left">Step</th>
                <th className="text-left">Sends at</th>
                <th className="text-left">Message preview</th>
              </tr>
            </thead>
            <tbody>
              {WF_SIMULATE.messages.map((m, i) => (
                <tr key={i}>
                  <td>
                    <b className="text-[12px]">{m.borrower?.name}</b>
                    <div className="text-[10px] text-muted">{m.borrower?.mobile}</div>
                  </td>
                  <td>
                    {m.source === 'subworkflow' ? (
                      <>
                        <Tag variant="blue">P{m.subWorkflow?.priority}</Tag>
                        <div className="mt-0.5 text-[10px] text-muted">{m.subWorkflow?.name}</div>
                      </>
                    ) : (
                      <Tag variant="purple">Main</Tag>
                    )}
                  </td>
                  <td>
                    <Tag variant={CHANNEL_TAG[m.channel] || 'blue'}>{m.channel}</Tag>
                  </td>
                  <td className="text-[11px]">{m.rule?.name}</td>
                  <td className="whitespace-nowrap text-[11px]">{scheduledLabel(m.scheduledAt)}</td>
                  <td className="max-w-[320px] text-[11.5px] leading-snug text-slate-700">{m.renderedMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={() => setSimModal(false)}>Close</Button>
        </div>
      </Modal>

    </div>
  );
}
