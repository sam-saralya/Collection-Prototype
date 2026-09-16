import React, { useMemo, useState } from 'react';
import { Card, SectionTitle, cx } from '../ui.jsx';
import { fmt, fmtCr, fmtI, CATEGORIES, enrichGaps } from '../lib.js';
import { BORROWERS, BORROWER_COUNTS, PORTFOLIO_STATES, effectivePrice, ALL_ORGANIZATIONS } from '../data.js';
import ContactabilityReport from '../components/ContactabilityReport.jsx';
import LinkAnalyticsPage from './LinkAnalyticsPage.jsx';

// The org-manager console — reports only, no operational actions. Aggregate
// reads that used to sit on the console pages (View Portfolio KPIs, the IVR
// sweep totals & graphs, the enrichment coverage / cost view) live here now.
const NAV = [
  { key: 'overview', label: 'Portfolio overview', icon: '▤' },
  { key: 'contactability', label: 'Contactability', icon: '☎' },
  { key: 'enrichment', label: 'Enrichment coverage', icon: '⊕' },
  { key: 'userAnalytics', label: 'User Analytics', icon: '⇗' },
  { key: 'collections', label: 'Collections report', icon: '₹', soon: true },
  { key: 'engagement', label: 'Engagement report', icon: '⇉', soon: true },
];

const ORG_PRICING = ALL_ORGANIZATIONS.find((o) => o._id === 'org_sugam')?.pricing || {};

function Kpi({ label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-black tracking-[-.02em]">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

function Bar({ label, value, max, sub }) {
  return (
    <div className="grid grid-cols-[160px_1fr_120px] items-center gap-3 text-[12px] max-[700px]:grid-cols-1">
      <b>{label}</b>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <i className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-2" style={{ width: (value / max) * 100 + '%' }} />
      </div>
      <span className="text-right text-muted max-[700px]:text-left">{sub}</span>
    </div>
  );
}

function Overview() {
  const stats = useMemo(() => {
    const book = BORROWERS.reduce((s, b) => s + b.outstanding, 0);
    const overdue = BORROWERS.filter((b) => b.odDays > 0);
    const npa = BORROWERS.filter((b) => b.odDays > 90);
    const avgDpd = Math.round(overdue.reduce((s, b) => s + b.odDays, 0) / (overdue.length || 1));
    const byState = PORTFOLIO_STATES.map((st) => {
      const rows = BORROWERS.filter((b) => b.state === st);
      return { st, count: rows.length, outstanding: rows.reduce((s, b) => s + b.outstanding, 0) };
    }).sort((a, b) => b.outstanding - a.outstanding);
    return { book, overdue: overdue.length, npa: npa.length, avgDpd, byState };
  }, []);

  const cohortMax = Math.max(...BORROWER_COUNTS.categories.map((c) => c.count));
  const stateMax = Math.max(...stats.byState.map((s) => s.outstanding));

  return (
    <div>
      <div className="mb-4 grid grid-cols-5 gap-3 max-[1180px]:grid-cols-3 max-[720px]:grid-cols-2">
        <Kpi label="Loans" value={fmt(BORROWERS.length)} sub="Current book" />
        <Kpi label="Book outstanding" value={fmtCr(stats.book)} sub="Across all loans" />
        <Kpi label="Overdue loans" value={fmt(stats.overdue)} sub={`${Math.round((stats.overdue / BORROWERS.length) * 100)}% of book`} />
        <Kpi label="Avg DPD" value={`${stats.avgDpd} days`} sub="Overdue loans only" />
        <Kpi label="NPA (90+ DPD)" value={fmt(stats.npa)} sub="Recovery track" />
      </div>

      <Card pad className="mb-4">
        <SectionTitle title="By cohort" note={`${fmt(BORROWER_COUNTS.total)} scored`} />
        <div className="grid gap-3 pt-1">
          {CATEGORIES.map((c) => {
            const d = BORROWER_COUNTS.categories.find((x) => x.key === c.key) || { count: 0, outstanding: 0 };
            return <Bar key={c.key} label={c.label} value={d.count} max={cohortMax} sub={`${fmt(d.count)} · ${fmtCr(d.outstanding)}`} />;
          })}
        </div>
      </Card>

      <Card pad>
        <SectionTitle title="By state" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">State</th>
                <th className="py-2 pr-3 font-semibold">Loans</th>
                <th className="py-2 pr-3 font-semibold">Outstanding</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {stats.byState.map((s) => (
                <tr key={s.st} className="border-b border-[#edf1f5] last:border-0">
                  <td className="py-2 pr-3 font-semibold">{s.st}</td>
                  <td className="py-2 pr-3">{fmt(s.count)}</td>
                  <td className="py-2 pr-3">{fmtI(s.outstanding)}</td>
                  <td className="py-2">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                      <i className="block h-full rounded-full bg-brand" style={{ width: (s.outstanding / stateMax) * 100 + '%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Enrichment coverage + cost — moved here from the operations Enrich Portfolio
// page, which now only lets the user pick services to run.
function Enrichment() {
  const cov = useMemo(() => {
    const n = BORROWERS.length;
    return {
      n,
      pan: BORROWERS.filter((b) => b.hasPan).length,
      bureau: BORROWERS.filter((b) => b.bureauPulled).length,
      co: BORROWERS.filter((b) => b.hasCoApplicant).length,
      alt: BORROWERS.filter((b) => b.altMobile).length,
      thin: BORROWERS.filter((b) => enrichGaps(b).length >= 2).length,
    };
  }, []);
  const pct = (x) => Math.round((x / cov.n) * 100);

  const bureauPrice = effectivePrice(ORG_PRICING, 'crif');
  const altPrice = effectivePrice(ORG_PRICING, 'altcontact');
  const bureauMissing = cov.n - cov.bureau;
  const altMissing = cov.n - cov.alt;
  const lines = [
    { label: `Bureau report · ${fmt(bureauMissing)} missing`, unit: bureauPrice, total: bureauMissing * bureauPrice },
    { label: `Alternate contact · ${fmt(altMissing)} missing`, unit: altPrice, total: altMissing * altPrice },
  ];
  const ceiling = lines.reduce((s, l) => s + l.total, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        <Kpi label="PAN on file" value={`${pct(cov.pan)}%`} sub={`${fmt(cov.n - cov.pan)} missing`} />
        <Kpi label="Bureau report" value={`${pct(cov.bureau)}%`} sub={`${fmt(bureauMissing)} not pulled`} />
        <Kpi label="Co-applicant" value={`${pct(cov.co)}%`} sub={`${fmt(cov.n - cov.co)} single-borrower`} />
        <Kpi label="Thin files" value={fmt(cov.thin)} sub="2 or more data gaps" />
      </div>

      <Card pad className="mb-4">
        <SectionTitle title="Coverage today" />
        <div className="grid gap-3 pt-1">
          <Bar label="PAN on file" value={cov.pan} max={cov.n} sub={`${fmt(cov.pan)} · ${pct(cov.pan)}%`} />
          <Bar label="Bureau report" value={cov.bureau} max={cov.n} sub={`${fmt(cov.bureau)} · ${pct(cov.bureau)}%`} />
          <Bar label="Co-applicant" value={cov.co} max={cov.n} sub={`${fmt(cov.co)} · ${pct(cov.co)}%`} />
          <Bar label="Alternate mobile" value={cov.alt} max={cov.n} sub={`${fmt(cov.alt)} · ${pct(cov.alt)}%`} />
        </div>
      </Card>

      <Card pad>
        <SectionTitle title="Cost to close the gaps" note="at this org's price sheet" />
        <div className="pt-1 text-[12.5px]">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between border-b border-line py-2">
              <span>{l.label}</span>
              <span className="text-muted">
                {fmtI(l.unit)} / call · <b className="text-ink">{fmtI(l.total)}</b>
              </span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-[14px]">
            <span>Estimated ceiling</span>
            <b>{fmtI(ceiling)}</b>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Charged only for data that actually returns. A bureau report needs PAN on file first.
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function OrgManagerPage() {
  const [section, setSection] = useState('overview');

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] max-[860px]:grid-cols-[60px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col gap-1 bg-gradient-to-b from-sidebar to-[#0a1020] px-3 py-5 text-[#dbe6ff]">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 font-black text-white shadow-brand">
            M
          </div>
          <div className="max-[860px]:hidden">
            <b className="text-[15px]">Org Manager</b>
            <small className="block text-[9px] uppercase tracking-[.12em] text-[#8291ae]">Sugam Finance</small>
          </div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => !n.soon && setSection(n.key)}
            disabled={n.soon}
            className={cx(
              'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold transition',
              section === n.key
                ? 'bg-gradient-to-r from-brand/25 to-cyan-400/10 text-white shadow-[inset_3px_0_0_#8b5cf6]'
                : n.soon
                  ? 'cursor-default text-[#5c6b88]'
                  : 'text-[#8fa0bf] hover:bg-[#111e35] hover:text-white'
            )}
          >
            <span className="w-5 text-center text-base">{n.icon}</span>
            <span className="max-[860px]:hidden">
              {n.label}
              {n.soon && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-[#5c6b88]">soon</span>}
            </span>
          </button>
        ))}
      </aside>

      <main className="min-w-0 bg-slate-50">
        <header className="sticky top-0 z-[8] flex h-[64px] items-center justify-between border-b border-line bg-white/85 px-7 backdrop-blur">
          <div className="text-xs text-muted">
            Org Manager / <b className="text-ink">{NAV.find((n) => n.key === section)?.label}</b>
          </div>
          <button className="btn whitespace-nowrap">Logout</button>
        </header>
        <div className="mx-auto max-w-[1200px] p-7 max-[860px]:p-4">
          {section === 'overview' && <Overview />}
          {section === 'contactability' && <ContactabilityReport />}
          {section === 'enrichment' && <Enrichment />}
          {section === 'userAnalytics' && <LinkAnalyticsPage />}
        </div>
      </main>
    </div>
  );
}
