import React, { useMemo } from 'react';
import { useUI } from '../store.jsx';
import { Card, PageHead, SectionTitle, Tag, Button } from '../ui.jsx';
import { fmt, fmtI, fmtCr, dpdBucket, enrichGaps } from '../lib.js';
import { BORROWERS, BORROWER_COUNTS, UPLOADS } from '../data.js';
import NineBox from '../components/NineBox.jsx';

// The portfolio review a Credit Head / Collections Head pulls together the
// morning after a book lands — the KPIs and cut-by-cut breakdowns they'd
// otherwise build as pivot tables and charts in Excel: aging waterfall,
// geography & product exposure, bureau risk bands, arrear composition, book
// growth, and a top-N concentration-risk list to action first.

const STATUS_TAG = { Current: 'green', Overdue: 'amber', NPA: 'red' };
const SEVERITY = { Current: '#16a34a', '1–30': '#f59e0b', '31–60': '#f59e0b', '61–90': '#f59e0b', '90+': '#e5484d' };
const DPD_ORDER = ['Current', '1–30', '31–60', '61–90', '90+'];

function Kpi({ label, value, sub, accent }) {
  return (
    <Card className="p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[21px] font-black leading-none tracking-[-.02em] ${accent || ''}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

// Horizontal rank/severity bar — 4px rounded data-end, square baseline,
// value label sits outside the track so it never clips.
function RankBar({ label, value, max, sub, color = '#635bff' }) {
  const pct = max ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[150px_1fr_170px] items-center gap-3 text-[12px] max-[700px]:grid-cols-1">
      <b className="truncate" title={label}>{label}</b>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <i className="block h-full rounded-r-[4px]" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-right text-muted max-[700px]:text-left">{sub}</span>
    </div>
  );
}

// Small SVG area/line trend — single series, so no legend; the card title
// already says what's plotted. Hairline gridlines, clean-number y-ticks, a
// single direct label on the latest point, hover title on each marker.
function TrendChart({ points }) {
  const W = 680;
  const H = 170;
  const padL = 48;
  const padR = 14;
  const padT = 18;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yFor = (v) => padT + innerH - ((v - min) / span) * innerH;
  const xFor = (i) => padL + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(p.value)}`).join(' ');
  const areaPath = `${linePath} L${xFor(points.length - 1)},${padT + innerH} L${xFor(0)},${padT + innerH} Z`;
  const tickCount = 4;
  const tickVals = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((min + (span * i) / tickCount) / 100) * 100);
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {tickVals.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke="#eef2f7" strokeWidth="1" />
          <text x={padL - 8} y={yFor(t) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {fmt(t)}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="#635bff" fillOpacity="0.1" stroke="none" />
      <path d={linePath} fill="none" stroke="#635bff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={xFor(i)} cy={yFor(p.value)} r="4" fill="#635bff" stroke="#fff" strokeWidth="2">
            <title>{`${p.label} — ${fmt(p.value)} accounts on the book`}</title>
          </circle>
          <text x={xFor(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
            {p.label}
          </text>
        </g>
      ))}
      <text x={xFor(points.length - 1) - 6} y={yFor(last.value) - 10} textAnchor="end" fontSize="10.5" fontWeight="800" fill="#0f172a">
        {fmt(last.value)}
      </text>
    </svg>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          <b className="font-semibold">{it.label}</b>
          <span className="text-muted">{it.sub}</span>
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { openBorrower, goTo } = useUI();

  const stats = useMemo(() => {
    const n = BORROWERS.length;
    const totalPOS = BORROWERS.reduce((s, b) => s + b.outstanding, 0);
    const totalPrincipal = BORROWERS.reduce((s, b) => s + b.principal, 0);
    const par30Amt = BORROWERS.filter((b) => b.odDays > 30).reduce((s, b) => s + b.outstanding, 0);
    const npaAmt = BORROWERS.filter((b) => b.odDays > 90).reduce((s, b) => s + b.outstanding, 0);
    const npaCount = BORROWERS.filter((b) => b.odDays > 90).length;

    const scored = BORROWERS.filter((b) => b.bureauPulled);
    const avgBureau = scored.length ? Math.round(scored.reduce((s, b) => s + b.bureauScore, 0) / scored.length) : null;

    const byBucket = DPD_ORDER.map((key) => {
      const rows = BORROWERS.filter((b) => (b.odDays === 0 ? 'Current' : dpdBucket(b.odDays)) === key);
      return { key, count: rows.length, outstanding: rows.reduce((s, b) => s + b.outstanding, 0) };
    });

    const bureauBands = [
      { key: 'Not pulled', color: '#94a3b8', test: (b) => !b.bureauPulled },
      { key: '< 650 · high risk', color: '#e5484d', test: (b) => b.bureauPulled && b.bureauScore < 650 },
      { key: '650–729 · watch', color: '#f59e0b', test: (b) => b.bureauPulled && b.bureauScore >= 650 && b.bureauScore < 730 },
      { key: '730+ · low risk', color: '#16a34a', test: (b) => b.bureauPulled && b.bureauScore >= 730 },
    ].map((b) => ({ ...b, count: BORROWERS.filter(b.test).length }));

    const principalArrear = BORROWERS.reduce((s, b) => s + (b.principalArrear || 0), 0);
    const interestArrear = BORROWERS.reduce((s, b) => s + (b.interestArrear || 0), 0);

    const cov = {
      n,
      pan: BORROWERS.filter((b) => b.hasPan).length,
      bureau: BORROWERS.filter((b) => b.bureauPulled).length,
      co: BORROWERS.filter((b) => b.hasCoApplicant).length,
      alt: BORROWERS.filter((b) => b.altMobile).length,
      thin: BORROWERS.filter((b) => enrichGaps(b).length >= 2).length,
    };

    const topRisk = BORROWERS.filter((b) => b.odDays > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    const growth = [...UPLOADS]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((u) => ({
        label: new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short' }),
        value: u.totalRecords,
      }));

    return {
      n,
      totalPOS,
      totalPrincipal,
      par30Amt,
      npaAmt,
      npaCount,
      avgBureau,
      byBucket,
      bureauBands,
      principalArrear,
      interestArrear,
      cov,
      topRisk,
      growth,
    };
  }, []);

  const pct = (x, of = stats.n) => (of ? Math.round((x / of) * 100) : 0);
  const bucketMax = Math.max(...stats.byBucket.map((b) => b.outstanding));
  const bureauMax = Math.max(...stats.bureauBands.map((b) => b.count));
  const arrearMax = Math.max(stats.principalArrear, stats.interestArrear);

  const quadrantCounts = useMemo(() => {
    const m = {};
    BORROWER_COUNTS.categories.forEach((c) => (m[c.key] = { count: c.count, outstanding: c.outstanding }));
    return m;
  }, []);

  return (
    <div>
      <PageHead title="Analytics" />

      {/* ---- hero KPI strip ------------------------------------------------ */}
      <Card pad>
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          <Kpi label="Total POS" value={fmtCr(stats.totalPOS)} sub={`${fmt(stats.n)} accounts`} />
          <Kpi label="PAR 30+" value={`${pct(stats.par30Amt, stats.totalPOS)}%`} sub={`${fmtCr(stats.par30Amt)} at risk`} accent="text-amber" />
          <Kpi label="NPA (90+ DPD)" value={`${pct(stats.npaAmt, stats.totalPOS)}%`} sub={`${fmt(stats.npaCount)} accounts · ${fmtCr(stats.npaAmt)}`} accent="text-danger" />
          <Kpi label="Avg ticket size" value={fmtI(Math.round(stats.totalPrincipal / stats.n))} sub="Avg principal disbursed" />
          <Kpi label="Avg bureau score" value={stats.avgBureau ?? '—'} sub={`${pct(stats.cov.bureau)}% of book scored`} />
          <Kpi label="Thin files" value={fmt(stats.cov.thin)} sub="2+ data gaps — underwriting risk" accent="text-amber" />
        </div>
      </Card>

      {/* ---- DPD aging waterfall + risk quadrant --------------------------- */}
      <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        <Card pad>
          <SectionTitle title="DPD aging waterfall" note="Outstanding by days-past-due bucket" />
          <div className="grid gap-2.5">
            {stats.byBucket.map((b) => (
              <RankBar
                key={b.key}
                label={b.key}
                value={b.outstanding}
                max={bucketMax}
                color={SEVERITY[b.key]}
                sub={`${fmtCr(b.outstanding)} · ${fmt(b.count)} accts`}
              />
            ))}
          </div>
          <div className="mt-3">
            <Legend
              items={[
                { color: '#16a34a', label: 'Current', sub: 'on schedule' },
                { color: '#f59e0b', label: 'Overdue', sub: '1–90 dpd' },
                { color: '#e5484d', label: 'NPA', sub: '90+ dpd' },
              ]}
            />
          </div>
        </Card>

        <Card pad>
          <SectionTitle title="Risk quadrant" note="Ability × Intent">
            <Button size="xs" onClick={() => goTo('cohorts')}>
              Cohort Intelligence →
            </Button>
          </SectionTitle>
          <NineBox counts={quadrantCounts} />
        </Card>
      </div>

      {/* ---- credit risk bands + arrear composition ------------------------ */}
      <div className="mt-4 grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
        <Card pad>
          <SectionTitle title="Bureau risk bands" note="Credit risk of the scored book" />
          <div className="grid gap-2.5">
            {stats.bureauBands.map((b) => (
              <RankBar key={b.key} label={b.key} value={b.count} max={bureauMax} color={b.color} sub={`${fmt(b.count)} · ${pct(b.count)}%`} />
            ))}
          </div>
        </Card>

        <Card pad>
          <SectionTitle title="Arrear composition" note="What the overdue balance is made of" />
          <div className="grid gap-2.5">
            <RankBar label="Principal arrear" value={stats.principalArrear} max={arrearMax} color="#635bff" sub={fmtCr(stats.principalArrear)} />
            <RankBar label="Interest arrear" value={stats.interestArrear} max={arrearMax} color="#0891b2" sub={fmtCr(stats.interestArrear)} />
          </div>
          <div className="mt-3">
            <Legend
              items={[
                { color: '#635bff', label: 'Principal', sub: `${fmtCr(stats.principalArrear)}` },
                { color: '#0891b2', label: 'Interest', sub: `${fmtCr(stats.interestArrear)}` },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* ---- book growth ----------------------------------------------------- */}
      <Card pad className="mt-4">
        <SectionTitle title="Portfolio growth" note="Accounts on the book, by upload" />
        <TrendChart points={stats.growth} />
      </Card>

      {/* ---- top concentration risk ------------------------------------------ */}
      <Card pad className="mt-4">
        <SectionTitle title="Top concentration risk" note="Largest overdue exposures — action these first" />
        <div className="overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th>Loan no.</th>
                <th>State</th>
                <th>Status</th>
                <th className="text-right">OD days</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {stats.topRisk.map((b, i) => (
                <tr key={b._id} className="cursor-pointer hover:bg-slate-50" onClick={() => openBorrower(b.refId)}>
                  <td className="text-[10px] text-muted">{i + 1}</td>
                  <td className="font-semibold">{b.name}</td>
                  <td className="font-mono text-[11px]">{b.loanId}</td>
                  <td>{b.state}</td>
                  <td>
                    <Tag variant={STATUS_TAG[b.status]}>{b.status}</Tag>
                  </td>
                  <td className="text-right">{b.odDays}d</td>
                  <td className="text-right font-semibold">{fmtI(b.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---- data coverage / underwriting readiness --------------------------- */}
      <Card pad className="mt-4">
        <SectionTitle title="Data coverage" note="Fields captured on the uploaded book" />
        <div className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
          <Kpi label="PAN on file" value={`${pct(stats.cov.pan)}%`} sub={`${fmt(stats.cov.n - stats.cov.pan)} missing`} />
          <Kpi label="Bureau report" value={`${pct(stats.cov.bureau)}%`} sub={`${fmt(stats.cov.n - stats.cov.bureau)} not pulled`} />
          <Kpi label="Co-applicant" value={`${pct(stats.cov.co)}%`} sub={`${fmt(stats.cov.n - stats.cov.co)} single-borrower`} />
          <Kpi label="Thin files" value={fmt(stats.cov.thin)} sub="2 or more data gaps" accent="text-amber" />
        </div>
        <div className="grid gap-2.5">
          <RankBar label="PAN on file" value={stats.cov.pan} max={stats.cov.n} sub={`${fmt(stats.cov.pan)} · ${pct(stats.cov.pan)}%`} />
          <RankBar label="Bureau report" value={stats.cov.bureau} max={stats.cov.n} sub={`${fmt(stats.cov.bureau)} · ${pct(stats.cov.bureau)}%`} />
          <RankBar label="Co-applicant" value={stats.cov.co} max={stats.cov.n} sub={`${fmt(stats.cov.co)} · ${pct(stats.cov.co)}%`} />
          <RankBar label="Alternate mobile" value={stats.cov.alt} max={stats.cov.n} sub={`${fmt(stats.cov.alt)} · ${pct(stats.cov.alt)}%`} />
        </div>
      </Card>
    </div>
  );
}
