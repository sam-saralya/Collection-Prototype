import React, { useRef, useState } from 'react';
import { useUI } from '../store.jsx';
import {
  Card, Button, SectionTitle, Empty, Tag, Field, Input, Textarea,
  Modal, ModalHeader, cx,
} from '../ui.jsx';
import { TEMPLATES } from '../data.js';

const CHANNELS = ['WA', 'SMS', 'AI Bot call'];
const CHANNEL_CODE = { WA: 'WA', SMS: 'SMS', 'AI Bot call': 'CALL' };

const TEMPLATE_CATEGORIES = [
  { value: 'communication', label: 'Communication', hint: 'Borrower outreach — usable by workflow rules.' },
  { value: 'auth', label: 'Authentication', hint: 'SMS auth / OTP only — never sent by a workflow rule.' },
];
const CATEGORY_LABEL = { communication: 'Communication', auth: 'Authentication' };
const CATEGORY_TAG = { communication: 'blue', auth: 'purple' };
const DEFAULT_CATEGORY = 'communication';

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

function InfoTip({ text }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <span
        tabIndex={0}
        aria-label={text}
        className="inline-flex h-[14px] w-[14px] cursor-help items-center justify-center rounded-full border border-muted text-[9px] font-bold normal-case text-muted"
      >
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden w-56 -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1.5 text-[10.5px] font-normal normal-case leading-snug tracking-normal text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

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

export default function TemplatesPage({ channels = CHANNELS }) {
  const { showToast } = useUI();
  const empty = { template_id: '', dlt_template_id: '', template_message: '', channels: [channels[0]], template_ids: {}, category: DEFAULT_CATEGORY, language: 'en', is_active: true };
  const [items, setItems] = useState(() => TEMPLATES.filter((t) => channels.includes(t.channel)));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const msgRef = useRef(null);

  const activePlaceholders = form.category === 'auth' ? AUTH_PLACEHOLDERS : PLACEHOLDERS;

  const filtered = items;

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
      dlt_template_id: t.dlt_template_id || '',
      template_message: t.template_message || '',
      channels: [t.channel || 'WA'],
      template_ids: {},
      category: t.category || DEFAULT_CATEGORY,
      language: t.language || 'en',
      is_active: t.is_active !== false,
    });
    setModalOpen(true);
  }
  function save() {
    if (editing) {
      setItems((list) =>
        list.map((t) =>
          t._id === editing._id
            ? { ...t, dlt_template_id: form.dlt_template_id, template_message: form.template_message, channel: form.channels[0], category: form.category, language: form.language, is_active: form.is_active, updatedAt: new Date().toISOString() }
            : t
        )
      );
      showToast('Template updated', 'success');
    } else {
      const rows = form.channels.map((c) => ({
        _id: 't' + Math.random().toString(36).slice(2, 7),
        template_id: derivedTemplateId(form.template_id, c, form.channels.length > 1),
        dlt_template_id: form.dlt_template_id,
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
      <Card pad>
        <SectionTitle title="Template registry" note={`${filtered.length} shown`}>
          <Button variant="primary" onClick={openCreate}>
            ＋ New template
          </Button>
        </SectionTitle>

        {filtered.length === 0 ? (
          <Empty>No templates match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Template name</th>
                  <th>DLT Template ID</th>
                  <th>Message</th>
                  <th>Category</th>
                  <th>Language</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id}>
                    <td className="font-mono text-[11px] font-semibold">{t.template_id}</td>
                    <td className="font-mono text-[11px]">{t.dlt_template_id || <span className="text-muted">—</span>}</td>
                    <td className="max-w-[360px]">
                      <span className="line-clamp-2 text-slate-600">{t.template_message}</span>
                    </td>
                    <td>
                      <Tag variant={CATEGORY_TAG[t.category || DEFAULT_CATEGORY] || 'blue'}>
                        {CATEGORY_LABEL[t.category || DEFAULT_CATEGORY] || t.category}
                      </Tag>
                    </td>
                    <td>{t.language || 'en'}</td>
                    <td>
                      <div className="flex justify-end">
                        <Button size="xs" title="Edit template" aria-label="Edit template" onClick={() => openEdit(t)}>
                          ✎ Edit
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
          subtitle={editing ? editing.template_id : undefined}
          onClose={() => setModalOpen(false)}
        />
        <div className="space-y-3.5">
          <Field label="Template name" hint="e.g. emi_due_reminder — cannot be changed after creation">
            <Input
              value={form.template_id}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              placeholder="emi_due_reminder"
              className={cx(editing && 'opacity-60')}
            />
          </Field>
          <Field label={<>DLT Template ID <InfoTip text="The template ID registered with your DLT operator portal" /></>}>
            <Input value={form.dlt_template_id} onChange={(e) => setForm({ ...form, dlt_template_id: e.target.value })} placeholder="1107161234567890123" />
          </Field>
          <Field
            label="Message"
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
              </div>
              {form.template_message.trim() ? (
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-line bg-white px-3 py-2 text-[12.5px] leading-relaxed text-ink shadow-sm">
                  {renderSample(form.template_message, activePlaceholders)}
                </div>
              ) : (
                <p className="text-[11.5px] text-muted">Type a message above to see how it'll look with real values filled in.</p>
              )}
            </div>
          </Field>
          <Field label="Category" hint={TEMPLATE_CATEGORIES.find((c) => c.value === form.category)?.hint}>
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
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          {editing && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                remove(editing);
                setModalOpen(false);
              }}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!form.template_id || !form.template_message || !form.channels.length} onClick={save}>
            {editing ? 'Save changes' : form.channels.length > 1 ? `Create ${form.channels.length} templates` : 'Create template'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
