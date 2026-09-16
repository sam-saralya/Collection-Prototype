import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, SectionTitle, Tag, Field, Input } from '../ui.jsx';
import { fmtDate } from '../lib.js';
import { CURRENT_USER } from '../data.js';

const MIN_PASSWORD = 8;

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf1f5] py-2.5 text-[12.5px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

function ChangePasswordCard() {
  const { showToast } = useUI();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= MIN_PASSWORD && next === confirm && next !== current;

  return (
    <Card pad>
      <SectionTitle title="Change password" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setCurrent('');
          setNext('');
          setConfirm('');
          showToast('Password updated', 'success');
        }}
        className="grid gap-3"
      >
        <Field label="Current password" required>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" required hint={`At least ${MIN_PASSWORD} characters, and different from the current one.`}>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" required>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {mismatch && <div className="text-[11px] text-danger">Those two passwords don’t match.</div>}
        <div>
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function SettingsPage() {
  const me = CURRENT_USER;

  return (
    <div className="grid max-w-[960px] grid-cols-2 items-start gap-4 max-[860px]:grid-cols-1">
        <Card pad>
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[15px] font-black text-white shadow-brand">
              {initials(me.name)}
            </div>
            <div className="min-w-0">
              <b className="block truncate text-[15px]">{me.name}</b>
              <span className="text-[12px] text-muted">{me.email}</span>
            </div>
          </div>
          <Row label="Role">
            <Tag variant="purple">Organization admin</Tag>
          </Row>
          <Row label="Member ID">{me.memberNo}</Row>
          <Row label="Member since">{fmtDate(me.createdAt)}</Row>
        </Card>

        <ChangePasswordCard />
    </div>
  );
}
