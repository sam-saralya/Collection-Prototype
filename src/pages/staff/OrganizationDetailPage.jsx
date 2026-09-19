import React, { useState } from 'react';
import { Card, Button, Field, Input, SectionTitle, Tag, Empty, Modal, ModalHeader, Toggle, cx } from '../../ui.jsx';
import { fmtDate, fmtI } from '../../lib.js';
import { SERVICE_CATALOG, DEFAULT_PRICING, ORGANIZATION, TEAM } from '../../data.js';
import ApiLogsPage from '../ApiLogsPage.jsx';
import { IvrConfigForm } from './IvrConfigPage.jsx';
import { useStaff } from './store.jsx';
import { EditGate, useDraft, OnboardingCell, RevealPasswordModal, WalletCreditModal, dltStatus } from './shared.jsx';

const TABS = [
  ['general', 'General'],
  ['users', 'Users'],
  ['dlt', 'DLT'],
  ['waba', 'WABA'],
  ['ivr', 'IVR'],
  ['rates', 'API Rates'],
  ['wallet', 'Wallet Recharge'],
  ['logs', 'API Logs'],
];
const GROUPS = [...new Set(SERVICE_CATALOG.map((s) => s.group))];

function Row({ label, children }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Overview({ org, onReveal }) {
  const { resendInvite, toggleActive, showToast } = useStaff();
  const suspended = org.is_active === false;
  const pending = org.onboarding?.password_status === 'temporary';
  const dlt = dltStatus(org);
  return (
    <Card pad>
      <dl className="grid grid-cols-[160px_1fr] gap-x-3 gap-y-3 text-[12.5px]">
        <Row label="Tenant ID"><span className="font-mono text-[11.5px]">{org._id}</span></Row>
        <Row label="Legal name">{org.legal_name || org.name}</Row>
        <Row label="Created">{fmtDate(org.created_at)}</Row>
        <Row label="First admin">
          {org.admin ? (
            <>
              <div className="font-semibold">{org.admin.name}</div>
              <div className="text-[11px] text-muted">{org.admin.email}</div>
            </>
          ) : (
            <Tag variant="red">No admin</Tag>
          )}
        </Row>
        <Row label="Plan">{org.plan?.tier ? <Tag variant="purple">{org.plan.tier}</Tag> : '—'}</Row>
        <Row label="Tenant">{suspended ? <Tag variant="red">Suspended</Tag> : <Tag variant="green">Active</Tag>}</Row>
        <Row label="Sending as"><Tag variant={dlt.variant}>{dlt.label}</Tag></Row>
        <Row label="Onboarding & access">
          <OnboardingCell ob={org.onboarding} />
          {pending && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="xs" onClick={() => resendInvite(org)}>↻ Resend invite</Button>
              <Button size="xs" variant="soft" onClick={onReveal}>👁 Reveal password</Button>
            </div>
          )}
        </Row>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button size="xs" variant="soft" disabled={suspended} onClick={() => showToast('Impersonating ' + org.name)}>Impersonate</Button>
        <Button size="xs" variant={suspended ? 'default' : 'danger'} onClick={() => toggleActive(org)}>
          {suspended ? 'Reinstate' : 'Suspend'}
        </Button>
      </div>
    </Card>
  );
}

const SERVICES = [
  ['dlt', 'DLT (SMS)', 'Send SMS through this tenant’s DLT entity and sender ID.'],
  ['waba', 'WABA (WhatsApp)', 'Send WhatsApp messages through this tenant’s business account.'],
  ['ivr', 'IVR', 'Place automated IVR calls for this tenant.'],
];
const serviceOn = (org, key) => org.services?.[key] !== false;

function ServicesCard({ org }) {
  const { patchOrg, showToast } = useStaff();
  const flip = (key, label) => {
    const on = serviceOn(org, key);
    patchOrg(org._id, { services: { ...(org.services || {}), [key]: !on } });
    showToast(`${label} ${on ? 'disabled' : 'enabled'} for ${org.name}`, 'success');
  };
  return (
    <Card pad>
      <SectionTitle title="Services" note="turn a channel off to stop this tenant using it" />
      <div className="grid gap-2">
        {SERVICES.map(([key, label, desc]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-slate-50/60 px-3 py-2.5">
            <div>
              <b className="text-[12.5px]">{label}</b>
              <div className="text-[10.5px] text-muted">{desc}</div>
            </div>
            <Toggle on={serviceOn(org, key)} onClick={() => flip(key, label)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function WalletTab({ org, onCredit }) {
  const w = org.wallet;
  const recharges = (w?.transactions || []).filter((t) => t.type === 'credit');
  if (!w) return <Card pad><Empty>This tenant has no wallet yet.</Empty></Card>;
  return (
    <Card pad>
      <SectionTitle title="Recharge history" note={`low-balance alert at ${fmtI(w.low_balance_threshold || 0)}`}>
        <Button size="xs" variant="primary" onClick={onCredit}>＋ Credit</Button>
      </SectionTitle>
      <div className={cx('mb-4 text-[26px] font-black', w.balance < 0 && 'text-danger')}>{fmtI(w.balance)}</div>
      {recharges.length ? (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-muted">
              <th className="py-1.5 font-semibold">When</th>
              <th className="py-1.5 font-semibold">Note</th>
              <th className="py-1.5 text-right font-semibold">Amount</th>
              <th className="py-1.5 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {recharges.map((t) => (
              <tr key={t.id} className="border-b border-[#edf1f5] last:border-0">
                <td className="py-1.5">{fmtDate(t.at)}</td>
                <td className="py-1.5">{t.note || t.purpose}</td>
                <td className="py-1.5 text-right font-semibold text-emerald-600">+{fmtI(t.amount)}</td>
                <td className="py-1.5 text-right text-muted">{fmtI(t.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No recharges yet.</Empty>
      )}
    </Card>
  );
}

const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PricingTab({ org }) {
  const { showToast } = useStaff();
  const [saved, setSaved] = useState({ ...DEFAULT_PRICING, ...(org.pricing || {}) });
  const [ov, setOv] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'save' | 'discard' | 'reset'
  const set = (key, v) => setOv((o) => ({ ...o, [key]: v === '' ? '' : Number(v) }));

  const changes = SERVICE_CATALOG.filter((s) => Number(ov[s.key] || 0) !== Number(saved[s.key] || 0));
  const invalid = SERVICE_CATALOG.some((s) => ov[s.key] === '' || ov[s.key] == null || Number(ov[s.key]) < 0);

  function startSave() {
    if (invalid) return showToast('Every rate needs a value of 0 or more', 'error');
    if (changes.length === 0) return showToast('No changes to save');
    setConfirm('save');
  }
  function cancelEdit() {
    if (changes.length > 0) return setConfirm('discard');
    setEditing(false);
  }
  function apply() {
    if (confirm === 'save') {
      setSaved(ov);
      setEditing(false);
      showToast(`API rates updated for ${org.name} — ${changes.length} change${changes.length === 1 ? '' : 's'}`, 'success');
    } else if (confirm === 'discard') {
      setOv(saved);
      setEditing(false);
    } else if (confirm === 'reset') {
      setOv({ ...DEFAULT_PRICING });
    }
    setConfirm(null);
  }

  return (
    <Card pad>
      <SectionTitle title="API rates" note={editing ? 'editing — changes apply once you save and confirm' : 'locked'}>
        {!editing && <Button size="xs" variant="primary" onClick={() => setEditing(true)}>✎ Edit rates</Button>}
      </SectionTitle>
      {GROUPS.map((g) => (
        <div key={g} className="mt-3">
          <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">{g}</div>
          {SERVICE_CATALOG.filter((s) => s.group === g).map((s) => {
            const dirty = editing && Number(ov[s.key] || 0) !== Number(saved[s.key] || 0);
            return (
              <div key={s.key} className={cx('flex items-center justify-between gap-3 border-b border-[#edf1f5] py-1.5 last:border-0', dirty && 'bg-amber-50')}>
                <div className="text-[12.5px] font-semibold">{s.label}</div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!editing}
                  value={ov[s.key] ?? ''}
                  onChange={(e) => set(s.key, e.target.value)}
                  className={cx('h-8 w-28 py-0 text-right text-[12px]', !editing && 'cursor-not-allowed bg-slate-50 text-slate-500')}
                />
              </div>
            );
          })}
        </div>
      ))}
      {editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={startSave}>Save rates</Button>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button className="ml-auto" onClick={() => setConfirm('reset')}>Reset to default</Button>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} size="sm">
        <ModalHeader
          title={confirm === 'save' ? 'Confirm rate changes' : confirm === 'discard' ? 'Discard changes?' : 'Reset to platform defaults?'}
          subtitle={org.name}
          onClose={() => setConfirm(null)}
        />
        {confirm === 'save' && (
          <div className="space-y-1.5 text-[12.5px]">
            <p className="mb-2 text-muted">These rates will be billed to this tenant from now on.</p>
            {changes.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5">
                <span className="font-semibold">{s.label}</span>
                <span>
                  <span className="text-muted line-through">{rupees(saved[s.key])}</span> → <b>{rupees(ov[s.key])}</b>
                </span>
              </div>
            ))}
          </div>
        )}
        {confirm === 'discard' && <p className="text-[12.5px] text-muted">You have {changes.length} unsaved change{changes.length === 1 ? '' : 's'}. They will be lost.</p>}
        {confirm === 'reset' && <p className="text-[12.5px] text-muted">Every rate will be set back to the platform default. Nothing is saved until you click Save rates.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setConfirm(null)}>{confirm === 'save' ? 'Go back' : 'Keep editing'}</Button>
          <Button variant={confirm === 'save' ? 'primary' : 'danger'} onClick={apply}>
            {confirm === 'save' ? 'Confirm & save' : confirm === 'discard' ? 'Discard' : 'Reset'}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

const ROLE_LABEL = { org_admin: 'Admin', org_user: 'Org User', org_manager: 'Org Manager' };
const ROLE_TAG = { org_admin: 'purple', org_user: 'blue', org_manager: 'amber' };

function UsersTab({ org }) {
  const { showToast } = useStaff();
  const [users, setUsers] = useState(() =>
    org._id === 'org_sugam'
      ? TEAM
      : org.admin
        ? [{ id: 'adm_' + org._id, name: org.admin.name, email: org.admin.email, role: 'org_admin', isActive: org.admin.isActive !== false }]
        : []
  );
  const toggle = (u) => {
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    showToast(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`, 'success');
  };
  return (
    <Card pad>
      <SectionTitle title="Users & roles" note={`${users.length} user${users.length === 1 ? '' : 's'}`} />
      {users.length === 0 ? (
        <Empty>No users in this tenant yet.</Empty>
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Name</th>
              <th className="py-2 pr-3 font-semibold">Email</th>
              <th className="py-2 pr-3 font-semibold">Role</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#edf1f5] last:border-0">
                <td className="py-2.5 pr-3 font-semibold">{u.name}</td>
                <td className="py-2.5 pr-3 text-muted">{u.email}</td>
                <td className="py-2.5 pr-3"><Tag variant={ROLE_TAG[u.role] || 'blue'}>{ROLE_LABEL[u.role] || u.role}</Tag></td>
                <td className="py-2.5 pr-3">{u.isActive ? <Tag variant="green">Active</Tag> : <Tag>Inactive</Tag>}</td>
                <td className="py-2.5 text-right">
                  <Button size="xs" variant={u.isActive ? 'danger' : 'default'} onClick={() => toggle(u)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function DltTab({ org }) {
  const { draft: sms, setDraft: setSms, commit, reset } = useDraft({ principal_entity_id: org.sms?.principal_entity_id || '', sender_id: org.sms?.sender_id || '', access_key: '' });
  return (
    <Card pad>
      <SectionTitle title="SMS · DLT" note="leave empty to send through Saralya's default entity" />
      <EditGate label="DLT settings" onSave={commit} onCancel={reset}>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <Field label="Principal entity ID">
          <Input value={sms.principal_entity_id} onChange={(e) => setSms({ ...sms, principal_entity_id: e.target.value })} />
        </Field>
        <Field label="Sender ID (header)">
          <Input value={sms.sender_id} onChange={(e) => setSms({ ...sms, sender_id: e.target.value })} />
        </Field>
        <Field label="API Access Key" hint={org.sms?.access_key_set ? 'A key is already saved — enter a new one to replace it.' : 'Stored encrypted; never shown again after saving.'}>
          <Input type="password" autoComplete="off" placeholder={org.sms?.access_key_set ? '••••••••••••' : ''} value={sms.access_key} onChange={(e) => setSms({ ...sms, access_key: e.target.value })} />
        </Field>
      </div>
      </EditGate>
    </Card>
  );
}

function WabaTab({ org }) {
  const w = org.whatsapp || {};
  const { draft: wa, setDraft: setWa, commit, reset } = useDraft({
    waba_id: w.waba_id || '',
    phone_number_id: w.phone_number_id || '',
    display_name: w.display_name || '',
    api_version: w.api_version || 'v21.0',
    default_language: w.default_language || 'en',
  });
  const set = (k) => (e) => setWa({ ...wa, [k]: e.target.value });
  return (
    <Card pad>
      <SectionTitle title="WhatsApp Business Account" />
      <EditGate label="WABA settings" onSave={commit} onCancel={reset}>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <Field label="WABA ID"><Input value={wa.waba_id} onChange={set('waba_id')} /></Field>
        <Field label="Phone number ID"><Input value={wa.phone_number_id} onChange={set('phone_number_id')} /></Field>
        <Field label="Display name"><Input value={wa.display_name} onChange={set('display_name')} /></Field>
        <Field label="Default language"><Input value={wa.default_language} onChange={set('default_language')} /></Field>
        <Field label="API version"><Input value={wa.api_version} onChange={set('api_version')} /></Field>
      </div>
      </EditGate>
    </Card>
  );
}

function LinksTab({ org }) {
  const { showToast } = useStaff();
  const links = org.links || (org._id === 'org_sugam' ? ORGANIZATION.links : []) || [];
  const [url, setUrl] = useState((links.find((l) => l.is_default) || links[0])?.url || '');
  return (
    <Card pad>
      <SectionTitle title="Borrower link" />
      <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
        This is what <span className="font-mono">$link</span> becomes in every message sent for this tenant.
      </p>
      <div className="flex items-end gap-2">
        <Field label="Link" className="flex-1">
          <Input type="url" placeholder="https://pay.example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Button variant="primary" disabled={!url.trim()} onClick={() => showToast('Borrower link saved', 'success')}>Save link</Button>
      </div>
    </Card>
  );
}

export default function OrganizationDetailPage() {
  const { organizations, viewOrgId, setViewOrgId, addWalletCredit } = useStaff();
  const org = organizations.find((o) => o._id === viewOrgId);
  const [tab, setTab] = useState('general');
  const [revealOpen, setRevealOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  if (!org) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button size="xs" onClick={() => setViewOrgId(null)}>← All tenants</Button>
        <h1 className="m-0 text-[22px] font-bold tracking-[-.02em]">{org.name}</h1>
        {org.is_active === false ? <Tag variant="red">Suspended</Tag> : <Tag variant="green">Active</Tag>}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              '-mb-px border-b-2 px-3.5 py-2 text-[12.5px] font-semibold transition',
              tab === k ? 'border-amber-500 text-ink' : 'border-transparent text-muted hover:text-ink'
            )}
          >
            {l}
            {['dlt', 'waba', 'ivr'].includes(k) && !serviceOn(org, k) && (
              <span className="ml-1.5 rounded bg-slate-200 px-1 text-[9px] font-bold uppercase text-slate-500">off</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="grid gap-4">
          <Overview org={org} onReveal={() => setRevealOpen(true)} />
          <ServicesCard org={org} />
          <LinksTab org={org} />
        </div>
      )}
      {tab === 'users' && <UsersTab org={org} />}
      {tab === 'dlt' && <DltTab org={org} />}
      {tab === 'waba' && <WabaTab org={org} />}
      {tab === 'ivr' && <IvrConfigForm orgId={org._id} />}
      {tab === 'rates' && <PricingTab org={org} />}
      {tab === 'wallet' && <WalletTab org={org} onCredit={() => setCreditOpen(true)} />}
      {tab === 'logs' && <ApiLogsPage />}

      <RevealPasswordModal open={revealOpen} org={org} onClose={() => setRevealOpen(false)} />
      <WalletCreditModal open={creditOpen} org={org} onClose={() => setCreditOpen(false)} onConfirm={(payload) => addWalletCredit(org, payload)} />
    </div>
  );
}
