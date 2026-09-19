import React from 'react';
import { Card, Button, Tag, Empty, SectionTitle } from '../../ui.jsx';
import { fmtI } from '../../lib.js';
import { useStaff } from './store.jsx';

export default function OrganizationsPage() {
  const { organizations, setViewOrgId, setSection } = useStaff();
  const filtered = organizations;

  return (
    <div>
      <Card pad>
        <SectionTitle title="Tenant list">
          <Button variant="primary" onClick={() => setSection('onboard')}>
            ＋ Onboard tenant
          </Button>
        </SectionTitle>

        {!filtered.length ? (
          <Empty>No tenants yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Tenant name</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 text-right font-semibold">Wallet balance</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((organization) => (
                  <tr key={organization._id} className="border-b border-[#edf1f5] last:border-0">
                    <td className="py-3 pr-3 font-semibold">{organization.name}</td>
                    <td className="py-3 pr-3">
                      {organization.is_active === false ? <Tag variant="red">Suspended</Tag> : <Tag variant="green">Active</Tag>}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {organization.wallet ? (
                        <b className={organization.wallet.balance < 0 ? 'text-danger' : ''}>{fmtI(organization.wallet.balance)}</b>
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button size="xs" onClick={() => setViewOrgId(organization._id)}>
                        Configure Tenant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
