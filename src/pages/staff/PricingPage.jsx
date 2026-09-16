import React, { useMemo, useState } from 'react';
import { useStaff } from './store.jsx';
import { Card, Button, SectionTitle, Input, Select, Tag, cx } from '../../ui.jsx';
import { SERVICE_CATALOG, DEFAULT_PRICING, effectivePrice } from '../../data.js';

const GROUPS = [...new Set(SERVICE_CATALOG.map((s) => s.group))];
const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PricingPage() {
  const { organizations, showToast } = useStaff();
  const [defaults, setDefaults] = useState(DEFAULT_PRICING);
  const [orgId, setOrgId] = useState(organizations[0]?._id || '');
  const [overrides, setOverrides] = useState(() =>
    Object.fromEntries(organizations.map((o) => [o._id, { ...(o.pricing || {}) }]))
  );

  const org = organizations.find((o) => o._id === orgId);
  const ov = overrides[orgId] || {};
  const overriddenCount = Object.keys(ov).filter((k) => ov[k] != null && ov[k] !== '').length;

  const setDefault = (key, v) => setDefaults((d) => ({ ...d, [key]: v === '' ? '' : Number(v) }));
  const setOverride = (key, v) =>
    setOverrides((o) => {
      const row = { ...(o[orgId] || {}) };
      if (v === '') delete row[key];
      else row[key] = Number(v);
      return { ...o, [orgId]: row };
    });

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
        <Card pad>
          <SectionTitle title="Platform default price sheet" note="applies to every tenant unless overridden" />
          {GROUPS.map((g) => (
            <div key={g} className="mt-3">
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">{g}</div>
              {SERVICE_CATALOG.filter((s) => s.group === g).map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3 border-b border-[#edf1f5] py-1.5 last:border-0">
                  <div>
                    <div className="text-[12.5px] font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted">{s.unit}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-muted">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={defaults[s.key] ?? ''}
                      onChange={(e) => setDefault(s.key, e.target.value)}
                      className="h-8 w-24 py-0 text-right text-[12px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
          <Button variant="primary" className="mt-4" onClick={() => showToast('Platform default prices saved', 'success')}>
            Save platform defaults
          </Button>
        </Card>

        <Card pad>
          <SectionTitle title="Per-tenant pricing">
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-52 text-xs">
              {organizations.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </SectionTitle>

          <p className="mb-2 text-[11px] text-muted">
            {org?.name} · <b>{overriddenCount}</b> service{overriddenCount === 1 ? '' : 's'} on a negotiated rate. Leave a
            field blank to use the platform default.
          </p>

          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="py-1.5 text-left font-semibold">Service</th>
                <th className="py-1.5 text-right font-semibold">Default</th>
                <th className="py-1.5 text-right font-semibold">This tenant</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_CATALOG.map((s) => {
                const has = ov[s.key] != null && ov[s.key] !== '';
                return (
                  <tr key={s.key} className={cx('border-b border-[#edf1f5] last:border-0', has && 'bg-brand/[.04]')}>
                    <td className="py-1.5 font-semibold">{s.label}</td>
                    <td className="py-1.5 text-right text-muted">{money(defaults[s.key] || 0)}</td>
                    <td className="py-1.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={String(defaults[s.key] ?? '')}
                        value={ov[s.key] ?? ''}
                        onChange={(e) => setOverride(s.key, e.target.value)}
                        className="ml-auto h-8 w-24 py-0 text-right text-[12px]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => showToast(`Pricing saved for ${org?.name}`, 'success')}>
              Save tenant overrides
            </Button>
            <Button onClick={() => setOverrides((o) => ({ ...o, [orgId]: {} }))}>Reset to default</Button>
          </div>
        </Card>
      </div>

      <Card pad className="mt-4">
        <SectionTitle title="Where each tenant stands" />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="py-1.5 pr-3 text-left font-semibold">Tenant</th>
                {SERVICE_CATALOG.map((s) => (
                  <th key={s.key} className="py-1.5 px-2 text-right font-semibold">
                    {s.label.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o._id} className="border-b border-[#edf1f5] last:border-0">
                  <td className="py-1.5 pr-3 font-semibold">{o.name}</td>
                  {SERVICE_CATALOG.map((s) => {
                    const row = overrides[o._id] || {};
                    const has = row[s.key] != null && row[s.key] !== '';
                    return (
                      <td key={s.key} className={cx('py-1.5 px-2 text-right', has ? 'font-bold text-brand' : 'text-muted')}>
                        {money(effectivePrice(has ? row : null, s.key))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          <Tag variant="blue">Blue</Tag> = negotiated rate for that tenant; grey = platform default.
        </p>
      </Card>
    </div>
  );
}
