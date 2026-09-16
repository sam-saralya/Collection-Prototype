import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle } from '../ui.jsx';
import { fmt } from '../lib.js';
import WorklistScope, { useWorklistScope } from '../components/WorklistScope.jsx';

// Operations view: pick the enrichment services to run and who to run them for.
// The borrower list lives on View Portfolio; prices, coverage % and the cost
// estimate live on the Org Manager console.
const ENRICH_SERVICES = [
  { key: 'mobile2upi', label: 'Mobile → UPI' },
  { key: 'mobile2bank', label: 'Mobile → Bank Account' },
  { key: 'crif', label: 'CRIF' },
  { key: 'cibil', label: 'CIBIL' },
  { key: 'equifax', label: 'Equifax' },
  { key: 'experian', label: 'Experian' },
  { key: 'altcontact', label: 'Alternate Mobile Numbers & Addresses' },
];

const PARTIES = ['applicant', 'co_applicant', 'nominee'];
const PARTY_LABELS = { applicant: 'Applicant', co_applicant: 'Co-applicant', nominee: 'Nominee' };

export default function EnrichPortfolioPage() {
  const { showToast } = useUI();
  const scope = useWorklistScope();
  // sel[serviceKey] = { applicant: bool, co_applicant: bool }
  const [sel, setSel] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const togg = (key, party) =>
    setSel((s) => ({ ...s, [key]: { ...(s[key] || {}), [party]: !s[key]?.[party] } }));
  const setRow = (key, on) => setSel((s) => ({ ...s, [key]: Object.fromEntries(PARTIES.map((p) => [p, on])) }));

  const target = scope.rows.length;

  const picked = ENRICH_SERVICES.flatMap((s) => PARTIES.filter((p) => sel[s.key]?.[p]).map((p) => ({ ...s, party: p })));
  const nothingPicked = picked.length === 0;

  function runEnrichment() {
    if (running || nothingPicked || target === 0) return;
    setRunning(true);
    setProgress(0);
    let p = 0;
    const tick = () => {
      p += 10 + Math.random() * 18;
      setProgress(Math.min(100, p));
      if (p < 100) setTimeout(tick, 380);
      else {
        setRunning(false);
        showToast(
          `Enrichment queued for ${fmt(target)} borrowers${scope.worklist ? ` in “${scope.worklist.name}”` : ''} — charged only for data that returns`,
          'success'
        );
      }
    };
    tick();
  }

  return (
    <div>
      <PageHead />

      <WorklistScope scope={scope} />

      <Card pad>
        <SectionTitle title="Run an enrichment batch" />

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th className="py-1.5 text-left font-semibold">Service</th>
                {PARTIES.map((p) => (
                  <th key={p} className="py-1.5 text-center font-semibold">{PARTY_LABELS[p]}</th>
                ))}
                <th className="py-1.5 text-center font-semibold">All</th>
              </tr>
            </thead>
            <tbody>
              {ENRICH_SERVICES.map((s) => {
                const row = sel[s.key] || {};
                return (
                  <tr key={s.key} className="border-b border-[#edf1f5] last:border-0">
                    <td className="py-2 font-semibold">{s.label}</td>
                    {PARTIES.map((p) => (
                      <td key={p} className="py-2 text-center">
                        <input
                          type="checkbox"
                          className="accent-brand"
                          checked={!!row[p]}
                          disabled={running}
                          onChange={() => togg(s.key, p)}
                        />
                      </td>
                    ))}
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        className="accent-brand"
                        checked={PARTIES.every((p) => row[p])}
                        disabled={running}
                        onChange={() => setRow(s.key, !PARTIES.every((p) => row[p]))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button variant="primary" className="mt-4 w-full" disabled={running || nothingPicked || target === 0} onClick={runEnrichment}>
          {running ? 'Enriching…' : `Enrich ${fmt(target)} borrowers`}
        </Button>

        {(running || progress > 0) && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <i className="block h-full bg-gradient-to-r from-brand to-emerald-500 transition-all" style={{ width: progress + '%' }} />
          </div>
        )}
      </Card>
    </div>
  );
}
