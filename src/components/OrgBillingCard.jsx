import React, { useMemo } from 'react';
import { Card, SectionTitle, Tag, cx } from '../ui.jsx';
import {
  SERVICE_CATALOG,
  DEFAULT_PRICING,
  effectivePrice,
  PROJECT_BILLING,
  BILLING_MONTH,
  PROJECTS,
  ALL_ORGANIZATIONS,
} from '../data.js';

const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const rupee0 = (n) => '₹' + Math.round(Number(n)).toLocaleString('en-IN');
const GROUPS = [...new Set(SERVICE_CATALOG.map((s) => s.group))];

// The logged-in org's negotiated rates (Sugam Finance in the prototype).
const ORG_PRICING = ALL_ORGANIZATIONS.find((o) => o._id === 'org_sugam')?.pricing || {};

export default function OrgBillingCard() {
  const overrides = ORG_PRICING;

  const projectCosts = useMemo(
    () =>
      PROJECT_BILLING.map((pb) => {
        const project = PROJECTS.find((p) => p._id === pb.project_id);
        const lines = SERVICE_CATALOG.map((s) => {
          const qty = pb.usage[s.key] || 0;
          const price = effectivePrice(overrides, s.key);
          return { ...s, qty, price, cost: qty * price };
        }).filter((l) => l.qty > 0);
        const total = lines.reduce((n, l) => n + l.cost, 0);
        return { project, lines, total };
      }),
    [overrides]
  );
  const grand = projectCosts.reduce((n, p) => n + p.total, 0);

  return (
    <div className="grid gap-4">
      <Card pad>
        <SectionTitle title="Your price sheet" note="set by Saralya" />
        <p className="mb-3 text-[11px] text-muted">
          What each service costs your organization. A <Tag variant="blue">Negotiated</Tag> rate differs from the Saralya
          default — contact your Saralya account manager to renegotiate.
        </p>
        {GROUPS.map((g) => (
          <div key={g} className="mt-2">
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">{g}</div>
            <table className="w-full text-[12px]">
              <tbody>
                {SERVICE_CATALOG.filter((s) => s.group === g).map((s) => {
                  const price = effectivePrice(overrides, s.key);
                  const negotiated = overrides && overrides[s.key] != null && overrides[s.key] !== DEFAULT_PRICING[s.key];
                  return (
                    <tr key={s.key} className="border-b border-[#edf1f5] last:border-0">
                      <td className="py-1.5">
                        <span className="font-semibold">{s.label}</span>
                        <span className="ml-1.5 text-[10px] text-muted">{s.unit}</span>
                      </td>
                      <td className="py-1.5 text-right">
                        {negotiated && <span className="mr-2 text-[10px] text-muted line-through">{rupee(DEFAULT_PRICING[s.key])}</span>}
                        <b className={cx(negotiated && 'text-brand')}>{rupee(price)}</b>
                        {negotiated && <Tag variant="blue" className="ml-2">Negotiated</Tag>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      <Card pad>
        <SectionTitle title="Billing by project" note={BILLING_MONTH}>
          <span className="text-[13px] font-bold">
            Total {rupee0(grand)}
          </span>
        </SectionTitle>

        <div className="grid gap-3">
          {projectCosts.map(({ project, lines, total }) => (
            <div key={project?._id} className="rounded-[10px] border border-line">
              <div className="flex items-center justify-between border-b border-line bg-slate-50 px-3 py-2">
                <b className="text-[12.5px]">{project?.name || 'Project'}</b>
                <b className="text-[13px]">{rupee0(total)}</b>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-1.5 text-left font-semibold">Service</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Used</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Rate</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key} className="border-t border-[#edf1f5]">
                      <td className="px-3 py-1.5 font-semibold">{l.label}</td>
                      <td className="px-3 py-1.5 text-right">{l.qty.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-1.5 text-right text-muted">{rupee(l.price)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{rupee0(l.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-muted">
          Usage-based, billed monthly. Charges are only for calls and reports that actually returned data.
        </p>
      </Card>
    </div>
  );
}
