import React, { useMemo, useState } from 'react';
import { Card, Button, Input, Tag, Empty, InfoNote, SectionTitle, cx } from '../../ui.jsx';
import { fmtDate } from '../../lib.js';
import { useStaff } from './store.jsx';
import { OnboardingCell, RevealPasswordModal, dltStatus } from './shared.jsx';

export default function OrganizationsPage() {
  const { organizations, resendInvite, toggleActive, setSection, showToast } = useStaff();
  const [revealOrg, setRevealOrg] = useState(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all'); // all | onboarding | live

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = organizations;
    if (tab === 'onboarding') list = list.filter((o) => o.onboarding && o.onboarding.password_status === 'temporary');
    if (tab === 'live') list = list.filter((o) => o.onboarding?.password_status === 'changed');
    if (q) list = list.filter((o) => (o.name || '').toLowerCase().includes(q) || (o.admin?.email || '').toLowerCase().includes(q));
    return list;
  }, [organizations, query, tab]);

  const onboardingCount = organizations.filter((o) => o.onboarding && o.onboarding.password_status === 'temporary').length;
  const liveCount = organizations.filter((o) => o.onboarding?.password_status === 'changed').length;
  const failedCount = organizations.filter((o) => o.onboarding?.invite_email_status === 'failed').length;

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        {[
          ['Tenants', organizations.length, ''],
          ['Live', liveCount, 'text-emerald-600'],
          ['Onboarding', onboardingCount, 'text-amber-600'],
          ['Email failures', failedCount, failedCount ? 'text-danger' : 'text-muted'],
        ].map(([l, v, tone]) => (
          <Card key={l} className="p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-muted">{l}</div>
            <div className={cx('mt-1 text-[22px] font-black', tone)}>{v}</div>
          </Card>
        ))}
      </div>

      {failedCount > 0 && (
        <InfoNote>
          {failedCount} organization{failedCount === 1 ? '' : 's'} could not be reached by email. Re-send the invite, or
          reveal the temporary password and pass it on over a trusted channel.
        </InfoNote>
      )}

      <Card pad>
        <SectionTitle title="Tenant list" note="/v1/organizations">
          <div className="flex items-center gap-2">
            <div className="flex rounded-[10px] border border-line p-0.5 text-[11px] font-semibold">
              {[
                ['all', `All (${organizations.length})`],
                ['onboarding', `Onboarding (${onboardingCount})`],
                ['live', `Live (${liveCount})`],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cx('rounded-[8px] px-2.5 py-1.5 transition', tab === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
                >
                  {l}
                </button>
              ))}
            </div>
            <Input className="max-w-[220px]" placeholder="Filter by name or admin…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </SectionTitle>

        {!filtered.length ? (
          <Empty>{query || tab !== 'all' ? 'Nothing matches that.' : 'No organizations yet.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Organization</th>
                  <th className="py-2 pr-3 font-semibold">First admin</th>
                  <th className="py-2 pr-3 font-semibold">Plan</th>
                  <th className="py-2 pr-3 font-semibold">Tenant</th>
                  <th className="min-w-[240px] py-2 pr-3 font-semibold">Onboarding &amp; access</th>
                  <th className="py-2 pr-3 font-semibold">Sending as</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((organization) => {
                  const dlt = dltStatus(organization);
                  const suspended = organization.is_active === false;
                  const ob = organization.onboarding;
                  const pending = ob && ob.password_status === 'temporary';
                  return (
                    <tr key={organization._id} className="border-b border-[#edf1f5] align-top last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-semibold">{organization.name}</div>
                        {organization.legal_name && organization.legal_name !== organization.name && (
                          <div className="text-[10.5px] text-muted">{organization.legal_name}</div>
                        )}
                        <div className="font-mono text-[10.5px] text-muted">{organization._id}</div>
                        <div className="mt-0.5 text-[10.5px] text-muted">Created {fmtDate(organization.created_at)}</div>
                      </td>
                      <td className="py-3 pr-3">
                        {organization.admin ? (
                          <>
                            <div className="font-semibold">{organization.admin.name}</div>
                            <div className="text-[11px] text-muted">{organization.admin.email}</div>
                          </>
                        ) : (
                          <Tag variant="red">No admin</Tag>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {organization.plan?.tier ? <Tag variant="purple">{organization.plan.tier}</Tag> : <span className="text-[11px] text-muted">—</span>}
                      </td>
                      <td className="py-3 pr-3">{suspended ? <Tag variant="red">Suspended</Tag> : <Tag variant="green">Active</Tag>}</td>
                      <td className="py-3 pr-3">
                        <OnboardingCell ob={ob} />
                        {pending && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Button size="xs" onClick={() => resendInvite(organization)}>
                              ↻ Resend invite
                            </Button>
                            <Button size="xs" variant="soft" onClick={() => setRevealOrg(organization)}>
                              👁 Reveal password
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Tag variant={dlt.variant}>{dlt.label}</Tag>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="xs" variant="soft" disabled={suspended} onClick={() => showToast('Impersonating ' + organization.name)}>
                            Impersonate
                          </Button>
                          <Button size="xs" variant={suspended ? 'default' : 'danger'} onClick={() => toggleActive(organization)}>
                            {suspended ? 'Reinstate' : 'Suspend'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
        The first admin's password is generated by the server and emailed — staff never see or set it unless they
        explicitly reveal it here (which is audited). On first login the admin is forced to replace the temporary
        password before the console opens. Suspending a tenant locks out its users, stops its outreach, and blocks its
        borrowers' portal logins.
      </p>

      <RevealPasswordModal open={!!revealOrg} org={revealOrg} onClose={() => setRevealOrg(null)} />
    </div>
  );
}
