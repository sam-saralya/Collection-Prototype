import React, { useMemo, useState } from 'react';
import { Card, PageHead, SectionTitle, Field, Input, Select, Tag, Empty } from '../ui.jsx';
import { fmtDate } from '../lib.js';
import { API_LOGS } from '../data.js';

const METHOD_TAG = { GET: 'blue', POST: 'green', PATCH: 'amber', DELETE: 'red' };
const STATUS_TAG = (s) => (s < 300 ? 'green' : s < 500 ? 'amber' : 'red');

const API_OPTIONS = [...new Set(API_LOGS.map((l) => l.label))].sort();

export default function ApiLogsPage() {
  const [q, setQ] = useState('');
  const [api, setApi] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return API_LOGS.filter((l) => {
      if (api && l.label !== api) return false;
      if (status === 'ok' && l.status >= 300) return false;
      if (status === 'error' && l.status < 300) return false;
      if (needle && !(`${l.borrowerName} ${l.loanId} ${l.path}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [q, api, status]);

  return (
    <div>
      <PageHead title="API logs" subtitle="Every call the platform made against a borrower, plus who or what triggered it." />

      <Card pad>
        <SectionTitle title="Request log" note={`${rows.length} of ${API_LOGS.length}`} />

        <div className="mb-4 grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
          <Field label="Search">
            <Input placeholder="Borrower, loan no., endpoint…" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="API">
            <Select value={api} onChange={(e) => setApi(e.target.value)}>
              <option value="">All APIs</option>
              {API_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="ok">Success (2xx/3xx)</option>
              <option value="error">Error (4xx/5xx)</option>
            </Select>
          </Field>
        </div>

        {rows.length === 0 ? (
          <Empty>No calls match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Timestamp</th>
                  <th className="py-2 pr-3 font-semibold">Borrower / Loan no.</th>
                  <th className="py-2 pr-3 font-semibold">API</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Latency</th>
                  <th className="py-2 pr-3 font-semibold">Triggered by</th>
                  <th className="py-2 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l._id} className="border-b border-[#edf1f5] last:border-0 align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{fmtDate(l.createdAt)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold">{l.borrowerName}</div>
                      <div className="text-muted">{l.loanId}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <Tag variant={METHOD_TAG[l.method] || 'default'}>{l.method}</Tag>
                        <span className="font-semibold">{l.label}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted">{l.path}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Tag variant={STATUS_TAG(l.status)}>{l.status}</Tag>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{l.latencyMs} ms</td>
                    <td className="py-2.5 pr-3">{l.actor}</td>
                    <td className="whitespace-nowrap py-2.5 font-mono text-[11px] text-muted">{l.ip}</td>
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
