import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, PageHead, SectionTitle, Button, Tag, Toggle, Field, Input, Select, Modal, ModalHeader, Empty, cx } from '../ui.jsx';
import { PTP_REMINDERS, TEMPLATES } from '../data.js';

// Same idea as an EMI Reminders workflow (a rule fires a channel + template at
// some day offset) except the anchor isn't one shared calendar day — it's each
// borrower's own promised date (`ptpDate`). An offset ≥ 0 only actually fires
// for someone who still hasn't paid.

const CHANNEL_TAG = { WA: 'green', SMS: 'amber', 'AI Bot call': 'purple' };
const CHANNEL_LABEL = { WA: 'WhatsApp', SMS: 'SMS', 'AI Bot call': 'Automated call' };
const OFFSET_OPTIONS = [-3, -2, -1, 0, 1, 2, 3, 5, 7];

function offsetLabel(n) {
  if (n === 0) return 'On the promised day';
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} before`;
  return `${n} day${n === 1 ? '' : 's'} after — if still unpaid`;
}
function offsetChip(n) {
  return n === 0 ? 'T' : n > 0 ? `T + ${n}` : `T − ${Math.abs(n)}`;
}

function ReminderCard({ reminder, template, onEdit, onToggle, onRemove }) {
  return (
    <div className={cx('relative rounded-2xl border bg-white p-3 shadow-sm', reminder.is_active === false ? 'border-dashed border-slate-300 opacity-70' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <Tag variant="blue">{offsetChip(reminder.trigger_offset)}</Tag>
        <Toggle on={reminder.is_active !== false} onClick={() => onToggle(reminder)} />
      </div>
      <b className="mt-2 block text-[12.5px] leading-tight">{reminder.name}</b>
      <div className="mt-1 text-[10.5px] text-muted">{offsetLabel(reminder.trigger_offset)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Tag variant={CHANNEL_TAG[reminder.channel] || 'blue'}>{CHANNEL_LABEL[reminder.channel] || reminder.channel}</Tag>
      </div>
      {template && <p className="mt-2 line-clamp-2 text-[10.5px] leading-snug text-muted">{template.template_message}</p>}
      <div className="mt-2.5 flex gap-2">
        <Button size="xs" onClick={() => onEdit(reminder)}>Edit</Button>
        <Button size="xs" variant="danger" onClick={() => onRemove(reminder)}>Delete</Button>
      </div>
    </div>
  );
}

export default function PTPRemindersPage() {
  const { showToast } = useUI();

  const [reminders, setReminders] = useState(PTP_REMINDERS);
  const [form, setForm] = useState(null); // null | {..fields}
  const templateById = Object.fromEntries(TEMPLATES.map((t) => [t._id, t]));
  const sorted = [...reminders].sort((a, b) => a.trigger_offset - b.trigger_offset);

  function openCreate() {
    const waTemplate = TEMPLATES.find((t) => t.channel === 'WA' && t.template_id.includes('PTP')) || TEMPLATES.find((t) => t.channel === 'WA');
    setForm({ _id: null, name: '', trigger_offset: -1, channel: 'WA', templateId: waTemplate?._id || '', is_active: true });
  }
  function openEdit(r) {
    setForm({ ...r });
  }
  function channelTemplates(channel) {
    return TEMPLATES.filter((t) => t.channel === channel && t.is_active !== false);
  }
  function saveForm() {
    if (form._id) {
      setReminders((list) => list.map((r) => (r._id === form._id ? { ...form } : r)));
      showToast('Reminder updated', 'success');
    } else {
      setReminders((list) => [...list, { ...form, _id: 'ptpr_' + Date.now() }]);
      showToast('Reminder added', 'success');
    }
    setForm(null);
  }
  function toggleReminder(r) {
    setReminders((list) => list.map((x) => (x._id === r._id ? { ...x, is_active: x.is_active === false } : x)));
  }
  function removeReminder(r) {
    setReminders((list) => list.filter((x) => x._id !== r._id));
    showToast('Reminder deleted', 'success');
  }

  return (
    <div>
      <PageHead
        title="PTP Reminders"
        subtitle="Rules that nudge a borrower relative to their own promised-to-pay date, not one shared calendar day."
      />

      <Card pad>
        <SectionTitle title="Reminder rules" note={`${sorted.length} rule(s), relative to each borrower's promised date`}>
          <Button size="xs" variant="primary" onClick={openCreate}>＋ Add reminder</Button>
        </SectionTitle>

        {sorted.length === 0 ? (
          <Empty>No PTP reminders yet — add one to start nudging borrowers around their promised date.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((r) => (
              <ReminderCard key={r._id} reminder={r} template={templateById[r.templateId]} onEdit={openEdit} onToggle={toggleReminder} onRemove={removeReminder} />
            ))}
          </div>
        )}

      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} size="sm">
        {form && (
          <>
            <ModalHeader title={form._id ? 'Edit reminder' : 'Add PTP reminder'} onClose={() => setForm(null)} />
            <div className="space-y-3.5">
              <Field label="Name" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Reminder, the day before" />
              </Field>
              <Field label="When" required hint="Relative to the borrower's own promised date (T)">
                <Select value={form.trigger_offset} onChange={(e) => setForm({ ...form, trigger_offset: Number(e.target.value) })}>
                  {OFFSET_OPTIONS.map((n) => (
                    <option key={n} value={n}>{offsetChip(n)} — {offsetLabel(n)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Channel" required>
                <Select
                  value={form.channel}
                  onChange={(e) => {
                    const channel = e.target.value;
                    setForm({ ...form, channel, templateId: channelTemplates(channel)[0]?._id || '' });
                  }}
                >
                  {Object.keys(CHANNEL_LABEL).map((c) => (
                    <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Template" required>
                <Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                  {channelTemplates(form.channel).map((t) => (
                    <option key={t._id} value={t._id}>{t.template_id}</option>
                  ))}
                </Select>
                {templateById[form.templateId] && <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{templateById[form.templateId].template_message}</p>}
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="primary" disabled={!form.name.trim() || !form.templateId} onClick={saveForm}>
                {form._id ? 'Save' : 'Add reminder'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
