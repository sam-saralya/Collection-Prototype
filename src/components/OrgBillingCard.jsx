import React, { useMemo, useState } from 'react';
import { Card, SectionTitle, Tag, Button, Field, Input, Modal, ModalHeader, cx } from '../ui.jsx';
import { useUI } from '../store.jsx';
import { fmtCr, fmtDate } from '../lib.js';
import {
  SERVICE_CATALOG,
  DEFAULT_PRICING,
  effectivePrice,
  PROJECT_BILLING,
  BILLING_MONTH,
  BILLING_HISTORY,
  PROJECTS,
  ALL_ORGANIZATIONS,
  WALLET_PURPOSE_BY_KEY,
} from '../data.js';

const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const rupee0 = (n) => '₹' + Math.round(Number(n)).toLocaleString('en-IN');
const GROUPS = [...new Set(SERVICE_CATALOG.map((s) => s.group))];
// Fixed categorical assignment (never re-derived from array position) — a
// group not in this map falls back to a neutral slate so a future service
// group doesn't silently collide with an existing one.
const GROUP_COLORS = { Enrichment: '#635bff', Outreach: '#13b8a6' };
const groupColor = (g) => GROUP_COLORS[g] || '#94a3b8';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m) => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} '${m.slice(2, 4)}`;

// The logged-in org's negotiated rates and wallet (Sugam Finance in the prototype).
const LOGGED_IN_ORG = ALL_ORGANIZATIONS.find((o) => o._id === 'org_sugam');
const ORG_PRICING = LOGGED_IN_ORG?.pricing || {};
const EMPTY_WALLET = { balance: 0, low_balance_threshold: 0, auto_recharge: { enabled: false }, transactions: [], updated_at: null };
const ORG_WALLET = LOGGED_IN_ORG?.wallet || EMPTY_WALLET;

const SECTIONS = [
  ['wallet', 'Wallet'],
  ['pricing', 'API Pricing'],
  ['projects', 'Project Cost'],
  ['history', 'Monthly Usage'],
];

const TOPUP_PRESETS = [10000, 25000, 50000, 100000];

function TopUpModal({ open, onClose, onConfirm }) {
  const [amount, setAmount] = useState('');
  const value = Number(amount) || 0;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title="Top up wallet" subtitle="Simulated in this prototype — no payment is actually taken." onClose={onClose} />
      <div className="mb-3 flex flex-wrap gap-2">
        {TOPUP_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              Number(amount) === p ? 'bg-ink text-white' : 'bg-slate-50 text-muted ring-1 ring-line hover:text-ink'
            )}
          >
            {rupee0(p)}
          </button>
        ))}
      </div>
      <Field label="Amount">
        <Input type="number" min="0" placeholder="₹ amount to add" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={value <= 0} onClick={() => onConfirm(value)}>
          Add {value > 0 ? rupee0(value) : 'funds'}
        </Button>
      </div>
    </Modal>
  );
}

function WalletSection({ wallet, onTopUp }) {
  const low = wallet.balance < wallet.low_balance_threshold;
  const [topUpOpen, setTopUpOpen] = useState(false);

  return (
    <div className="grid gap-4">
      <Card pad className={cx(low && 'ring-1 ring-amber-300')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Wallet balance</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cx('text-[28px] font-extrabold', wallet.balance < 0 ? 'text-red-600' : 'text-ink')}>
                {rupee0(wallet.balance)}
              </span>
              {low && <Tag variant="amber">Low balance</Tag>}
            </div>
            <p className="mt-1 text-[11px] text-muted">Debited daily against the API pricing sheet below. Last updated {fmtDate(wallet.updated_at)}.</p>
          </div>
          <Button variant="primary" onClick={() => setTopUpOpen(true)}>
            Top up
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px]">
          <span className="text-muted">Auto-recharge</span>
          {wallet.auto_recharge.enabled ? (
            <>
              <Tag variant="green">On</Tag>
              <span className="text-muted">
                adds {rupee0(wallet.auto_recharge.top_up_amount)} whenever balance drops below {rupee0(wallet.auto_recharge.threshold)}
              </span>
            </>
          ) : (
            <Tag variant="default">Off</Tag>
          )}
        </div>
      </Card>

      <Card pad>
        <SectionTitle title="Recent transactions" note="most recent first" />
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-muted">
              <th className="py-1.5 pr-3 font-semibold">Date</th>
              <th className="py-1.5 pr-3 font-semibold">Description</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Amount</th>
              <th className="py-1.5 text-right font-semibold">Balance after</th>
            </tr>
          </thead>
          <tbody>
            {wallet.transactions.map((t) => (
              <tr key={t.id} className="border-b border-[#edf1f5] last:border-0">
                <td className="py-2 pr-3 text-muted">{fmtDate(t.at)}</td>
                <td className="py-2 pr-3">
                  <span className="font-semibold">{t.note}</span>
                  <Tag variant={t.type === 'credit' ? (t.purpose === 'recharge' ? 'green' : 'blue') : 'default'} className="ml-2">
                    {t.type === 'credit' ? WALLET_PURPOSE_BY_KEY[t.purpose]?.label || 'Credit' : 'Debit'}
                  </Tag>
                </td>
                <td className={cx('py-2 pr-3 text-right font-semibold', t.type === 'credit' ? 'text-emerald-600' : 'text-ink')}>
                  {t.type === 'credit' ? '+' : '−'}
                  {rupee0(t.amount)}
                </td>
                <td className={cx('py-2 text-right', t.balance_after < 0 ? 'text-red-600' : 'text-muted')}>{rupee0(t.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onConfirm={(amount) => {
          onTopUp(amount);
          setTopUpOpen(false);
        }}
      />
    </div>
  );
}

export default function OrgBillingCard() {
  const { showToast } = useUI();
  const overrides = ORG_PRICING;
  const [section, setSection] = useState('wallet');
  const [wallet, setWallet] = useState(ORG_WALLET);

  function topUpWallet(amount) {
    setWallet((w) => {
      const balance = w.balance + amount;
      return {
        ...w,
        balance,
        updated_at: new Date().toISOString(),
        transactions: [
          { id: 'wtx_' + Date.now(), type: 'credit', purpose: 'recharge', amount, balance_after: balance, note: 'Manual top-up · UPI', at: new Date().toISOString() },
          ...w.transactions,
        ],
      };
    });
    showToast(`${rupee0(amount)} added to wallet`, 'success');
  }

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

  const history = useMemo(
    () =>
      BILLING_HISTORY.map((h) => {
        const byGroup = {};
        let total = 0;
        SERVICE_CATALOG.forEach((s) => {
          const cost = (h.usage[s.key] || 0) * effectivePrice(overrides, s.key);
          byGroup[s.group] = (byGroup[s.group] || 0) + cost;
          total += cost;
        });
        return { month: h.month, byGroup, total };
      }),
    [overrides]
  );
  const maxHistoryTotal = Math.max(...history.map((h) => h.total), 1);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {SECTIONS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSection(k)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              section === k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {section === 'wallet' && <WalletSection wallet={wallet} onTopUp={topUpWallet} />}

      {section === 'pricing' && (
        <Card pad>
          <SectionTitle title="Your price sheet" note="set by Saralya" />
          <p className="mb-3 text-[11px] text-muted">
            What each service costs your organization. A <Tag variant="blue">Negotiated</Tag> rate differs from the
            Saralya default — contact your Saralya account manager to renegotiate.
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
                          {negotiated && (
                            <span className="mr-2 text-[10px] text-muted line-through">{rupee(DEFAULT_PRICING[s.key])}</span>
                          )}
                          <b className={cx(negotiated && 'text-brand')}>{rupee(price)}</b>
                          {negotiated && (
                            <Tag variant="blue" className="ml-2">
                              Negotiated
                            </Tag>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </Card>
      )}

      {section === 'projects' && (
        <Card pad>
          <SectionTitle title="Billing by project" note={BILLING_MONTH}>
            <span className="text-[13px] font-bold">Total {rupee0(grand)}</span>
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
      )}

      {section === 'history' && (
        <Card pad>
          <SectionTitle title="Monthly usage" note="last 6 months, all projects" />

          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {history.map((h) => {
              const isCurrent = h.month === BILLING_MONTH;
              return (
                <div key={h.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-semibold text-muted">{fmtCr(h.total)}</span>
                  <div
                    className="flex w-full max-w-[46px] flex-col-reverse overflow-hidden rounded-t-[4px] bg-slate-100"
                    style={{ height: `${(h.total / maxHistoryTotal) * 100}%` }}
                    title={`${monthLabel(h.month)}: ${rupee0(h.total)}`}
                  >
                    {GROUPS.map((g) => {
                      const cost = h.byGroup[g] || 0;
                      if (!cost) return null;
                      return (
                        <div
                          key={g}
                          title={`${g}: ${rupee0(cost)}`}
                          style={{ height: `${(cost / h.total) * 100}%`, background: groupColor(g) }}
                          className="w-full"
                        />
                      );
                    })}
                  </div>
                  <span className={cx('text-[10px] font-semibold', isCurrent ? 'text-ink' : 'text-muted')}>
                    {monthLabel(h.month)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-[11px] text-muted">
            {GROUPS.map((g) => (
              <span key={g} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: groupColor(g) }} />
                {g}
              </span>
            ))}
          </div>

          <table className="mt-4 w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted">
                <th className="px-3 py-1.5 text-left font-semibold">Month</th>
                {GROUPS.map((g) => (
                  <th key={g} className="px-3 py-1.5 text-right font-semibold">
                    {g}
                  </th>
                ))}
                <th className="px-3 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((h) => {
                const isCurrent = h.month === BILLING_MONTH;
                return (
                  <tr key={h.month} className={cx('border-t border-[#edf1f5]', isCurrent && 'bg-brand/5')}>
                    <td className="px-3 py-1.5 font-semibold">
                      {monthLabel(h.month)}
                      {isCurrent && (
                        <Tag variant="blue" className="ml-2">
                          Current
                        </Tag>
                      )}
                    </td>
                    {GROUPS.map((g) => (
                      <td key={g} className="px-3 py-1.5 text-right text-muted">
                        {rupee0(h.byGroup[g] || 0)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold">{rupee0(h.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
