import React from 'react';
import { Card, SectionTitle } from '../ui.jsx';
import { fmt, fmtI } from '../lib.js';
import { DASHBOARD_STATS } from '../data.js';

function Kpi({ label, value, sub, accent }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[24px] font-black tracking-[-.02em] ${accent || ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const s = DASHBOARD_STATS;
  const collectedShare = s.totalAccounts ? Math.round((s.collectedAccounts / s.totalAccounts) * 100) : 0;
  const ptpShare = s.totalAccounts ? Math.round((s.ptpCount / s.totalAccounts) * 100) : 0;

  return (
    <div>
      <Card pad>
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          <Kpi label="Total Arrear" value={fmtI(s.totalArrear)} sub="Overdue balance outstanding" accent="text-danger" />
          <Kpi label="Total Collected" value={fmtI(s.totalCollected)} sub="Recovered this cycle" accent="text-ok" />
          <Kpi label="Collection %" value={`${s.collectionPct.toFixed(1)}%`} sub="Collected vs. collected + arrear" />
          <Kpi label="Total Accounts" value={fmt(s.totalAccounts)} sub="Total borrowers" />
          <Kpi label="Collected Accounts" value={fmt(s.collectedAccounts)} sub={`${collectedShare}% of borrowers`} />
          <Kpi label="PTP Count" value={fmt(s.ptpCount)} sub={`${ptpShare}% promised to pay`} />
        </div>
      </Card>

      <Card pad className="mt-4">
        <SectionTitle title="Promise to Pay (PTP)" />
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          <Kpi label="PTP Count" value={fmt(s.ptpCount)} sub={`${ptpShare}% of borrowers`} />
          <Kpi label="PTP Arrear" value={fmtI(s.ptpArrear)} sub="Overdue balance among PTPs" accent="text-danger" />
          <Kpi label="PTP Collected" value={fmtI(s.ptpCollected)} sub="Recovered from PTPs this cycle" accent="text-ok" />
          <Kpi label="PTP Honour Rate" value={`${s.ptpHonourRate.toFixed(1)}%`} sub={`${fmt(s.ptpHonoured)} of ${fmt(s.ptpCount)} paid`} />
        </div>
      </Card>
    </div>
  );
}
