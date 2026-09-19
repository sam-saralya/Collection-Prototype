import React, { useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Empty, Select, Input, Field, Modal, ModalHeader, Drawer, DrawerHeader, cx } from '../ui.jsx';
import { fmt, fmtI, exportCsv } from '../lib.js';
import { BORROWERS, TEAM, CURRENT_USER, REPORT_STATUSES, REPORT_STATUS_BY_KEY } from '../data.js';

// Reports = a named, filter-defined slice of the loan book (same idea as a
// View Portfolio worklist) generated here or handed off from a workflow run's
// "Generate report" step, then worked by hand: assigned to a person,
// tracked through a status, remarked on.

const BORROWER_BY_ID = Object.fromEntries(BORROWERS.map((b) => [b._id, b]));
const ASSIGNEES = TEAM.filter((t) => t.role === 'org_user' && t.isActive).map((t) => t.name);
const TABS = [
  ['open', 'Open'],
  ['closed', 'Closed'],
  ['all', 'All'],
];

function ReportsTable({ reports, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-line bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-muted">
            <th className="py-2 pl-3 pr-3 font-semibold">Report name</th>
            <th className="py-2 pr-3 font-semibold">Workflow</th>
            <th className="py-2 pr-3 text-center font-semibold">Borrowers</th>
            <th className="min-w-[260px] py-2 pr-3 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr
              key={r.id}
              className="cursor-pointer border-b border-[#edf1f5] align-top last:border-0 hover:bg-slate-50"
              onClick={() => onOpen(r.id)}
            >
              <td className="py-2 pl-3 pr-3 text-[11px] font-medium">{r.name}</td>
              <td className="py-2 pr-3">{r.source.pipelineName}</td>
              <td className="py-2 pr-3 text-center font-semibold">{fmt(r.rowIds.length)}</td>
              <td className="py-2 pr-3 text-[11.5px] leading-snug text-slate-600">{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportDrawer({ report, onClose }) {
  const { openBorrower, updateReportAssignment, setReportStatus, showToast } = useUI();
  const [q, setQ] = useState('');

  if (!report) return null;
  const rows = report.rowIds.map((id) => BORROWER_BY_ID[id]).filter(Boolean);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((b) => `${b.name} ${b.loanId} ${b.mobile}`.toLowerCase().includes(needle)) : rows;

  function exportReport() {
    const headers = ['Name', 'Mobile', 'Loan no.', 'Outstanding', 'Assigned to', 'Status', 'Remark'];
    const data = rows.map((b) => {
      const a = report.assignments[b._id] || {};
      return [b.name, b.mobile, b.loanId, b.outstanding, a.assignee || '', REPORT_STATUS_BY_KEY[a.status]?.label || a.status, a.remark || ''];
    });
    exportCsv(`${report.name.replace(/\s+/g, '_').toLowerCase()}.csv`, headers, data);
  }

  return (
    <Drawer open onClose={onClose} width="xl">
      <DrawerHeader
        title={report.name}
        subtitle={`${fmt(rows.length)} borrowers · from ${report.source.pipelineName}`}
        onClose={onClose}
        actions={
          <>
            <Button size="xs" onClick={exportReport}>⇩ Export CSV</Button>
            <Button
              size="xs"
              variant={report.status === 'open' ? 'soft' : 'primary'}
              onClick={() => {
                setReportStatus(report.id, report.status === 'open' ? 'closed' : 'open');
                showToast(report.status === 'open' ? 'Report closed' : 'Report reopened', 'success');
              }}
            >
              {report.status === 'open' ? 'Close report' : 'Reopen report'}
            </Button>
          </>
        }
      />
      <div className="p-6">
        <p className="mb-4 text-[12px] leading-relaxed text-slate-600">{report.purpose}</p>
        <Input className="mb-3 max-w-[280px]" placeholder="Filter by name, loan no. or mobile…" value={q} onChange={(e) => setQ(e.target.value)} />

        {filtered.length === 0 ? (
          <Empty>Nothing matches that.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-line">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-muted">
                  <th className="py-2 pl-3 pr-3 font-semibold">Borrower</th>
                  <th className="py-2 pr-3 text-right font-semibold">Outstanding</th>
                  <th className="min-w-[150px] py-2 pr-3 font-semibold">Assigned to</th>
                  <th className="min-w-[150px] py-2 pr-3 font-semibold">Status</th>
                  <th className="min-w-[200px] py-2 pr-3 font-semibold">Remark</th>
                  <th className="py-2 pr-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const a = report.assignments[b._id] || { assignee: null, status: 'pending', remark: '' };
                  return (
                    <tr key={b._id} className="border-b border-[#edf1f5] align-top last:border-0">
                      <td className="py-2 pl-3 pr-3">
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-[10.5px] text-muted">{b.loanId} · {b.mobile}</div>
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold">{fmtI(b.outstanding)}</td>
                      <td className="py-2 pr-3">
                        <Select
                          className="!py-1 !text-[11.5px]"
                          value={a.assignee || ''}
                          onChange={(e) => updateReportAssignment(report.id, b._id, { assignee: e.target.value || null })}
                        >
                          <option value="">Unassigned</option>
                          {ASSIGNEES.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          className="!py-1 !text-[11.5px]"
                          value={a.status}
                          onChange={(e) => updateReportAssignment(report.id, b._id, { status: e.target.value })}
                        >
                          {REPORT_STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          className="!py-1 !text-[11.5px]"
                          placeholder="Notes from the visit/call…"
                          value={a.remark || ''}
                          onChange={(e) => updateReportAssignment(report.id, b._id, { remark: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button className="text-[10.5px] font-semibold text-brand" onClick={() => openBorrower(b.refId)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function ReportsPage() {
  const { reports, goTo } = useUI();
  const [tab, setTab] = useState('open');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    if (tab === 'all') return reports;
    return reports.filter((r) => r.status === tab);
  }, [reports, tab]);

  const openCount = reports.filter((r) => r.status === 'open').length;
  const closedCount = reports.filter((r) => r.status === 'closed').length;
  const counts = { open: openCount, closed: closedCount, all: reports.length };
  const opened = reports.find((r) => r.id === openId) || null;

  return (
    <div>
      <PageHead
        title="Reports"
        subtitle="Filter the loan book and generate a report to hand off, or open one already generated — created there, worked by hand here."
        actions={<Button onClick={() => goTo('pipelines')}>Go to Workflows →</Button>}
      />

      <Card pad>
        <SectionTitle title="Generated reports" note={`${reports.length} total`}>
          <div className="flex rounded-[10px] border border-line p-0.5 text-[11px] font-semibold">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cx('rounded-[8px] px-2.5 py-1.5 transition', tab === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
              >
                {l} ({counts[k]})
              </button>
            ))}
          </div>
        </SectionTitle>

        {filtered.length === 0 ? (
          <Empty>
            {tab === 'closed'
              ? 'No closed reports yet.'
              : 'No reports here yet — add a Generate report step to a workflow and run it.'}
          </Empty>
        ) : (
          <ReportsTable reports={filtered} onOpen={setOpenId} />
        )}
      </Card>

      {opened && <ReportDrawer report={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}
