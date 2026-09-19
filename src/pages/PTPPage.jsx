import React from 'react';
import { useUI } from '../store.jsx';
import { Card, PageHead } from '../ui.jsx';
import { fmt, fmtI } from '../lib.js';
import { BORROWERS, DASHBOARD_STATS } from '../data.js';
import LoansTable from '../components/LoansTable.jsx';

// Promise-to-Pay — borrowers who said "will pay" on the IVR sweep, and
// whether that promise was honoured (collectedThisCycle > 0) this cycle.
// The KPI strip mirrors the PTP card on the Dashboard; this page is the
// drill-down into the actual borrower list behind those numbers. The rules
// that nudge these borrowers around their promised date live on the
// separate PTP Reminders page (below this one in the sidebar).

function Kpi({ label, value, sub, accent }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[24px] font-black tracking-[-.02em] ${accent || ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </Card>
  );
}

const PTP_BORROWERS = BORROWERS.filter((b) => b.ivrChoice === 'will_pay');
const PTP_COLUMNS = ['loanId', 'name', 'mobile', 'ptpDate', 'collectedThisCycle', 'totalArrear', 'odDays'];
const PTP_HIGHLIGHT_COLUMNS = ['ptpDate', 'collectedThisCycle'];

export default function PTPPage() {
  const { openBorrower } = useUI();
  const s = DASHBOARD_STATS;
  const ptpShare = s.totalAccounts ? Math.round((s.ptpCount / s.totalAccounts) * 100) : 0;

  return (
    <div>
      <PageHead title="Promise to Pay" />

      <Card pad>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          <Kpi label="PTP Count" value={fmt(s.ptpCount)} sub={`${ptpShare}% of borrowers`} />
          <Kpi label="PTP Arrear" value={fmtI(s.ptpArrear)} sub="Overdue balance among PTPs" accent="text-danger" />
          <Kpi label="PTP Collected" value={fmtI(s.ptpCollected)} sub="Recovered from PTPs this cycle" accent="text-ok" />
          <Kpi
            label="PTP Honour Rate"
            value={`${s.ptpHonourRate.toFixed(1)}%`}
            sub={`${fmt(s.ptpHonoured)} of ${fmt(s.ptpCount)} paid`}
          />
        </div>
      </Card>

      <Card pad className="mt-4">
        <LoansTable
          rows={PTP_BORROWERS}
          onRowClick={(b) => openBorrower(b.refId)}
          defaultVisible={PTP_COLUMNS}
          highlightColumns={PTP_HIGHLIGHT_COLUMNS}
        />
      </Card>
    </div>
  );
}
