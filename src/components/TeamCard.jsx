import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, Field, Input, Select, Tag, ErrorBanner, InfoNote, SectionTitle } from '../ui.jsx';
import { TEAM, CURRENT_USER } from '../data.js';

const MIN_PASSWORD = 8;
const ROLE_LABEL = { saralya_admin: 'Saralya staff', org_admin: 'Admin', org_user: 'Org User', org_manager: 'Org Manager' };
const ROLE_TAG = { org_user: 'blue', org_manager: 'amber', org_admin: 'purple', saralya_admin: 'purple' };
const NEW_ROLES = [
  ['org_user', 'Org User — runs collections operations'],
  ['org_manager', 'Org Manager — views reports only'],
];

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join('');
}

function AddMemberForm({ onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'org_user' });
  const [err, setErr] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSubmit = form.name.trim() && form.email.trim() && form.password.length >= MIN_PASSWORD;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onAdded(form);
        setForm({ name: '', email: '', password: '', role: 'org_user' });
      }}
      className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4"
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Add a team member</div>
      <div className="grid grid-cols-2 gap-3 max-[860px]:grid-cols-1">
        <Field label="Full name" required>
          <Input value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Role" required>
          <Select value={form.role} onChange={set('role')}>
            {NEW_ROLES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Initial password" required hint={`At least ${MIN_PASSWORD} characters. Shown once — pass it on yourself.`}>
          <div className="flex gap-2">
            <Input type="text" autoComplete="off" value={form.password} onChange={set('password')} />
            <Button type="button" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
              Generate
            </Button>
          </div>
        </Field>
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          Add member
        </Button>
      </div>
    </form>
  );
}

export default function TeamCard({ canManage }) {
  const { showToast } = useUI();
  const [team, setTeam] = useState(TEAM);
  const [lastPassword, setLastPassword] = useState(null);

  function setActive(member, isActive) {
    setTeam((list) => list.map((m) => (m.id === member.id ? { ...m, isActive } : m)));
    showToast(isActive ? 'Member reactivated' : 'Member deactivated', 'success');
  }

  return (
    <Card pad>
      <SectionTitle title="Team" />
      <p className="mb-1 text-[11.5px] leading-relaxed text-muted">
        You create the accounts for your organization. <b>Org Users</b> run the day-to-day collections work;{' '}
        <b>Org Managers</b> only see the reports. Organization details and the DLT registration stay with you.
      </p>

      {lastPassword && (
        <InfoNote tone="blue">
          Member added. Their password is <b>{lastPassword}</b> — there is no invite email, so this is the only time it is
          shown.
        </InfoNote>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Name</th>
              <th className="py-2 pr-3 font-semibold">Email</th>
              <th className="py-2 pr-3 font-semibold">Role</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              {canManage && <th className="py-2 font-semibold" />}
            </tr>
          </thead>
          <tbody>
            {team.map((member) => {
              const isSelf = member.id === CURRENT_USER.id;
              const actionable = canManage && (member.role === 'org_user' || member.role === 'org_manager');
              return (
                <tr key={member.id} className="border-b border-[#edf1f5] last:border-0">
                  <td className="py-2.5 pr-3 font-semibold">
                    {member.name}
                    {isSelf && <span className="ml-1.5 text-[10.5px] text-muted">(you)</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-muted">{member.email}</td>
                  <td className="py-2.5 pr-3">
                    <Tag variant={ROLE_TAG[member.role] || 'purple'}>{ROLE_LABEL[member.role] || member.role}</Tag>
                  </td>
                  <td className="py-2.5 pr-3">
                    {member.isActive ? <Tag variant="green">Active</Tag> : <Tag variant="red">Deactivated</Tag>}
                  </td>
                  {canManage && (
                    <td className="py-2.5">
                      {actionable ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="xs" onClick={() => showToast('Password reset', 'success')}>
                            Reset password
                          </Button>
                          <Button size="xs" variant={member.isActive ? 'danger' : 'soft'} onClick={() => setActive(member, !member.isActive)}>
                            {member.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-right text-[10.5px] text-muted">—</div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage && (
        <AddMemberForm
          onAdded={(form) => {
            setLastPassword(form.password);
            setTeam((list) => [...list, { id: 'usr_' + Date.now(), name: form.name, email: form.email, role: form.role, isActive: true }]);
          }}
        />
      )}
    </Card>
  );
}
