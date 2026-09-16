import React, { useMemo, useRef, useState } from 'react';
import { useUI } from '../store.jsx';
import {
  Card, Button, PageHead, SectionTitle, Empty, Tag, Field, Input, Select, Textarea,
  Modal, ModalHeader, Toggle, InfoNote, cx,
} from '../ui.jsx';
import { fmtDate } from '../lib.js';
import { TEMPLATES } from '../data.js';

const CHANNELS = ['WA', 'SMS', 'AI Bot call'];
const CHANNEL_TAG = { WA: 'green', SMS: 'amber', 'AI Bot call': 'purple' };
const CHANNEL_CODE = { WA: 'WA', SMS: 'SMS', 'AI Bot call': 'CALL' };

const TEMPLATE_CATEGORIES = [
  { value: 'communication', label: 'Communication', hint: 'Borrower outreach — usable by workflow rules.' },
  { value: 'auth', label: 'Authentication', hint: 'SMS auth / OTP only — never sent by a workflow rule.' },
];
const CATEGORY_LABEL = { communication: 'Communication', auth: 'Authentication' };
const CATEGORY_TAG = { communication: 'blue', auth: 'purple' };
const DEFAULT_CATEGORY = 'communication';

const empty = { template_id: '', template_message: '', channels: ['WA'], template_ids: {}, category: DEFAULT_CATEGORY, language: 'en', is_active: true };

const PLACEHOLDERS = [
  { token: '$name', desc: "The borrower's name will be placed here", sample: 'Ramesh Kumar' },
  { token: '$loan_id', desc: "The borrower's loan ID will be placed here", sample: 'LN-483201' },
  { token: '$amount', desc: 'The overdue / EMI amount will be placed here', sample: '₹4,250' },
  { token: '$emi_date', desc: 'The EMI due date will be placed here', sample: '05 Aug 2026' },
  { token: '$link', desc: 'A secure payment link will be placed here', sample: 'https://pay.saralya.in/r/8f2k' },
];
const AUTH_PLACEHOLDERS = [
  { token: '$otp', desc: 'The one-time verification code will be placed here', sample: '482913' },
  { token: '$expiry', desc: 'How many minutes the code stays valid will be placed here', sample: '10' },
];

function renderSample(msg, placeholders) {
  const order = [...placeholders].sort((a, b) => b.token.length - a.token.length);
  let out = msg || '';
  order.forEach((p) => (out = out.split(p.token).join(p.sample)));
  return out;
}
function derivedTemplateId(baseId, channel, multi) {
  if (!multi) return baseId;
  return `${baseId}_${CHANNEL_CODE[channel] || channel}`;
}

export default function TemplatesPage() {
  const { showToast } = useUI();
  const [items, setItems] = useState(TEMPLATES);
  const [fChannel, setFChannel] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fActive, setFActive] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [bulkOpen, setBulkOpen] = useState(false);
  const msgRef = useRef(null);

  const activePlaceholders = form.category === 'auth' ? AUTH_PLACEHOLDERS : PLACEHOLDERS;

  const filtered = useMemo(
    () =>
      items.filter((t) => {
        if (fChannel && t.channel !== fChannel) return false;
        if (fCategory && (t.category || DEFAULT_CATEGORY) !== fCategory) return false;
        if (fActive && String(t.is_active !== false) !== fActive) return false;
        return true;
      }),
    [items, fChannel, fCategory, fActive]
  );

  function insertPlaceholder(token) {
    const el = msgRef.current;
    const cur = form.template_message || '';
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const pad = start > 0 && !/\s$/.test(cur.slice(0, start)) ? ' ' : '';
    setForm((f) => ({ ...f, template_message: cur.slice(0, start) + pad + token + cur.slice(end) }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + pad.length + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  }
  function openEdit(t) {
    setEditing(t);
    setForm({
      template_id: t.template_id || '',
      template_message: t.template_message || '',
      channels: [t.channel || 'WA'],
      template_ids: {},
      category: t.category || DEFAULT_CATEGORY,
      language: t.language || 'en',
      is_active: t.is_active !== false,
    });
    setModalOpen(true);
  }
  function toggleChannel(c) {
    setForm((f) => {
      const on = f.channels.includes(c);
      if (on && f.channels.length === 1) return f;
      return { ...f, channels: on ? f.channels.filter((x) => x !== c) : [...f.channels, c] };
    });
  }
  function save() {
    if (editing) {
      setItems((list) =>
        list.map((t) =>
          t._id === editing._id
            ? { ...t, template_message: form.template_message, channel: form.channels[0], category: form.category, language: form.language, is_active: form.is_active, updatedAt: new Date().toISOString() }
            : t
        )
      );
      showToast('Template updated', 'success');
    } else {
      const rows = form.channels.map((c) => ({
        _id: 't' + Math.random().toString(36).slice(2, 7),
        template_id: derivedTemplateId(form.template_id, c, form.channels.length > 1),
        template_message: form.template_message,
        channel: c,
        category: form.category,
        language: form.language,
        is_active: form.is_active,
        updatedAt: new Date().toISOString(),
      }));
      setItems((list) => [...rows, ...list]);
      showToast(rows.length > 1 ? `${rows.length} templates created — one per channel` : 'Template created', 'success');
    }
    setModalOpen(false);
  }
  function remove(t) {
    setItems((list) => list.filter((x) => x._id !== t._id));
    showToast('Template deleted', 'success');
  }

  return (
    <div>
      <PageHead
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setBulkOpen(true)}>⭱ Bulk upload CSV</Button>
            <Button variant="primary" onClick={openCreate}>
              ＋ New template
            </Button>
          </div>
        }
      />

      <InfoNote>
        <span className="font-mono">$name</span>-style placeholders <b>are</b> substituted at send time — the workflow
        runner fills them from the borrower's own record. An <b>Authentication</b> template is the exception: it takes{' '}
        <span className="font-mono">$otp</span> and <span className="font-mono">$expiry</span> instead.
      </InfoNote>

      <Card pad>
        <SectionTitle title="Template registry" note={`${filtered.length} shown`}>
          <div className="flex items-center gap-2">
            <Select className="w-40" value={fChannel} onChange={(e) => setFChannel(e.target.value)}>
              <option value="">All channels</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select className="w-44" value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
              <option value="">All categories</option>
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select className="w-32" value={fActive} onChange={(e) => setFActive(e.target.value)}>
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </SectionTitle>

        {filtered.length === 0 ? (
          <Empty>No templates match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Message</th>
                  <th>Channel</th>
                  <th>Category</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id}>
                    <td className="font-mono text-[11px] font-semibold">{t.template_id}</td>
                    <td className="max-w-[360px]">
                      <span className="line-clamp-2 text-slate-600">{t.template_message}</span>
                    </td>
                    <td>
                      <Tag variant={CHANNEL_TAG[t.channel] || 'blue'}>{t.channel}</Tag>
                    </td>
                    <td>
                      <Tag variant={CATEGORY_TAG[t.category || DEFAULT_CATEGORY] || 'blue'}>
                        {CATEGORY_LABEL[t.category || DEFAULT_CATEGORY] || t.category}
                      </Tag>
                    </td>
                    <td>{t.language || 'en'}</td>
                    <td>{t.is_active !== false ? <Tag variant="green">Active</Tag> : <Tag>Inactive</Tag>}</td>
                    <td className="text-muted">{fmtDate(t.updatedAt)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button size="xs" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button size="xs" variant="danger" onClick={() => remove(t)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader
          title={editing ? 'Edit template' : 'New template'}
          subtitle={editing ? editing.template_id : 'template_id must be globally unique'}
          onClose={() => setModalOpen(false)}
        />
        <div className="space-y-3.5">
          <Field label="Template ID" required hint="e.g. WA_01_EMI — cannot be changed after creation">
            <Input
              value={form.template_id}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              placeholder="WA_01_EMI"
              className={cx(editing && 'opacity-60')}
            />
          </Field>
          <Field
            label="Message"
            required
            hint={
              form.category === 'auth'
                ? 'Filled in when a borrower-portal OTP is sent.'
                : 'Placeholders below are filled in from the borrower’s record at send time.'
            }
          >
            <Textarea
              ref={msgRef}
              rows={3}
              value={form.template_message}
              onChange={(e) => setForm({ ...form, template_message: e.target.value })}
              placeholder={
                form.category === 'auth'
                  ? '$otp is your verification code. It is valid for $expiry minutes.'
                  : 'Hi $name, your EMI of $amount is pending. Pay now: $link'
              }
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted">Insert:</span>
              {activePlaceholders.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  title={p.desc}
                  onClick={() => insertPlaceholder(p.token)}
                  className="rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-brand transition hover:bg-brand/15"
                >
                  {p.token}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-line bg-slate-50/70 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-muted">Sample preview</span>
                {form.channels.map((c) => (
                  <Tag key={c} variant={CHANNEL_TAG[c] || 'blue'}>
                    {c}
                  </Tag>
                ))}
              </div>
              {form.template_message.trim() ? (
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-emerald-500 px-3 py-2 text-[12.5px] leading-relaxed text-white shadow-sm">
                  {renderSample(form.template_message, activePlaceholders)}
                </div>
              ) : (
                <p className="text-[11.5px] text-muted">Type a message above to see how it'll look with real values filled in.</p>
              )}
            </div>
          </Field>
          <Field label="Category" required hint={TEMPLATE_CATEGORIES.find((c) => c.value === form.category)?.hint}>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_CATEGORIES.map((c) => {
                const on = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.value })}
                    className={cx(
                      'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition',
                      on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-white text-slate-500 hover:border-brand/40'
                    )}
                  >
                    <span className="mr-1.5">{on ? '✓' : '＋'}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel" required>
                <Select value={form.channels[0]} onChange={(e) => setForm({ ...form, channels: [e.target.value] })}>
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Language">
                <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="en" />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Channels" required hint="Pick one or more — a separate template is stored per channel.">
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => {
                    const on = form.channels.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleChannel(c)}
                        className={cx(
                          'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition',
                          on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-white text-slate-500 hover:border-brand/40'
                        )}
                      >
                        <span className="mr-1.5">{on ? '✓' : '＋'}</span>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Language">
                <Input className="w-40" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="en" />
              </Field>
            </>
          )}
          <div className="flex items-center justify-between rounded-[10px] border border-line bg-slate-50/60 px-3 py-2.5">
            <div>
              <b className="text-[12px]">Active</b>
              <div className="text-[10px] text-muted">Inactive templates stay in the registry but are filtered out by default.</div>
            </div>
            <Toggle on={form.is_active} onClick={() => setForm({ ...form, is_active: !form.is_active })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!form.template_id || !form.template_message || !form.channels.length} onClick={save}>
            {editing ? 'Save changes' : form.channels.length > 1 ? `Create ${form.channels.length} templates` : 'Create template'}
          </Button>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} size="lg">
        <ModalHeader title="Bulk upload templates" subtitle="Import many templates at once from a CSV or Excel file" onClose={() => setBulkOpen(false)} />
        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-slate-50/70 p-3">
            <div>
              <b className="text-[12px]">Start from the sample</b>
              <div className="mt-0.5 text-[11px] leading-snug text-muted">
                Columns: <span className="font-mono">template_id</span>, <span className="font-mono">template_message</span>,{' '}
                <span className="font-mono">channels</span>, <span className="font-mono">category</span>,{' '}
                <span className="font-mono">language</span>, <span className="font-mono">is_active</span>.
              </div>
            </div>
            <Button className="shrink-0" onClick={() => showToast('Sample CSV downloaded', 'success')}>
              ⭳ Sample CSV
            </Button>
          </div>
          <Field label="File" required hint="CSV, XLSX or XLS. The first sheet is read.">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="block w-full cursor-pointer rounded-[10px] border border-line bg-white px-3 py-2 text-[12px] text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-brand"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setBulkOpen(false);
              showToast('Imported 6 templates', 'success');
            }}
          >
            Import templates
          </Button>
        </div>
      </Modal>
    </div>
  );
}
