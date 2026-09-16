import React, { useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Empty, Tag, Input, Drawer, DrawerHeader, cx } from '../ui.jsx';
import { fmt, fmtCr, fmtDate } from '../lib.js';
import { LINK_SUMMARY, LINK_BORROWERS, LINK_TIMELINE } from '../data.js';

const STAGE_TONE = {
  link_sent: 'default',
  link_clicked: 'blue',
  otp_verified: 'purple',
  loan_details_page: 'amber',
  accepted: 'green',
  rejected: 'red',
};

function DeviceLocation({ deviceLocation, fallback }) {
  const status = deviceLocation?.status;
  if (status === 'granted' && deviceLocation.latitude != null) {
    const { latitude, longitude } = deviceLocation;
    return (
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand underline decoration-dotted hover:no-underline"
      >
        📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </a>
    );
  }
  if (status === 'denied') return <span>Location: Not available (declined)</span>;
  if (status === 'unavailable') return <span>Location: Not available</span>;
  return fallback ? <span>{fallback}</span> : null;
}

function Stat({ label, value, sub, tone }) {
  return (
    <Card className="p-4">
      <div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-muted">{label}</div>
      <div className={cx('mt-1.5 text-[26px] font-black leading-none', tone)}>{value}</div>
      {sub && <div className="mt-1.5 text-[10px] font-semibold text-muted">{sub}</div>}
    </Card>
  );
}

function FunnelRow({ row, max, active, onClick }) {
  const pct = max ? Math.round((row.reachedBorrowers / max) * 100) : 0;
  const conversion =
    row.stage === 'link_sent' ? 'top of the funnel' : `${row.conversionFromSent}% of those we sent to`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('w-full rounded-[10px] border px-3 py-2.5 text-left transition', active ? 'border-brand bg-[#f1f0ff]' : 'border-transparent hover:bg-slate-50')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-extrabold text-ink">{row.label}</span>
        <span className="text-[10px] font-semibold text-muted">
          {fmt(row.reachedBorrowers)} borrowers · {fmt(row.events)} events
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2" style={{ width: `${Math.max(pct, row.reachedBorrowers ? 2 : 0)}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-muted">
        <span>{conversion}</span>
        <span>{fmt(row.currentBorrowers)} stuck here</span>
      </div>
    </button>
  );
}

function Bars({ rows, labelOf, valueOf }) {
  const max = Math.max(1, ...rows.map(valueOf));
  if (!rows.length) return <Empty>No data yet.</Empty>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 truncate text-[11px] font-semibold text-slate-700">{labelOf(r)}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.round((valueOf(r) / max) * 100)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right text-[11px] font-bold text-ink">{fmt(valueOf(r))}</span>
        </div>
      ))}
    </div>
  );
}

export default function LinkAnalyticsPage() {
  const { showToast, openBorrower } = useUI();
  const summary = LINK_SUMMARY;
  const [range, setRange] = useState({ from: '', to: '' });
  const [stage, setStage] = useState(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const rows = useMemo(() => (stage ? LINK_BORROWERS.filter((r) => r.stage === stage) : LINK_BORROWERS), [stage]);

  const t = summary.totals;
  const maxReach = Math.max(1, ...summary.funnel.map((f) => f.reachedBorrowers));
  const maxDailyClicks = Math.max(1, ...summary.daily.map((d) => d.clicks));

  return (
    <div className="space-y-5">
      <PageHead
        actions={
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="field-label">From</span>
              <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="py-2 text-xs" />
            </label>
            <label className="block">
              <span className="field-label">To</span>
              <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="py-2 text-xs" />
            </label>
            {(range.from || range.to) && (
              <Button size="xs" onClick={() => setRange({ from: '', to: '' })}>
                Clear
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Links sent" value={fmt(t.linksSentBorrowers)} sub={`${fmt(t.linksSentTotal)} messages · ${t.openRate}% opened`} />
        <Stat label="Total clicks" value={fmt(t.totalClicks)} sub={`${fmt(t.uniqueVisits)} separate visits`} />
        <Stat label="Unique borrowers" value={fmt(t.uniqueBorrowers)} sub={`of ${fmt(t.totalBorrowers)} in your portfolio`} />
        <Stat label="Accepted" value={fmt(t.accepted)} tone="text-emerald-600" sub={`${fmt(t.awaitingResponse)} yet to respond`} />
        <Stat label="Rejected" value={fmt(t.rejected)} tone="text-danger" sub="with remarks" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Drop-off funnel" note="Click a step to see the borrowers sitting there" />
          <div className="mt-3 space-y-1">
            {summary.funnel.map((row) => (
              <FunnelRow key={row.stage} row={row} max={maxReach} active={stage === row.stage} onClick={() => setStage(stage === row.stage ? null : row.stage)} />
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Devices" />
            <div className="mt-3">
              <Bars rows={summary.devices} labelOf={(d) => d.type || 'unknown'} valueOf={(d) => d.events} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Top locations" note="from the click IP" />
            <div className="mt-3">
              <Bars rows={summary.locations.slice(0, 8)} labelOf={(l) => [l.city, l.country].filter(Boolean).join(', ')} valueOf={(l) => l.events} />
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle title="Clicks per day" />
        <div className="mt-4 flex h-28 items-end gap-1.5 overflow-x-auto">
          {summary.daily.map((d) => (
            <div key={d.date} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
              <div
                title={`${d.date}: ${d.clicks} clicks, ${d.borrowers} borrowers`}
                className="w-full rounded-t bg-gradient-to-t from-brand to-brand-2"
                style={{ height: `${Math.max(3, (d.clicks / maxDailyClicks) * 92)}px` }}
              />
              <span className="text-[8px] font-semibold text-muted">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          title={stage ? `Borrowers at "${summary.funnel.find((f) => f.stage === stage)?.label}"` : 'All borrowers who opened a link'}
          note={`${fmt(rows.length)} total`}
        >
          {stage && (
            <Button size="xs" onClick={() => setStage(null)}>
              Show all
            </Button>
          )}
        </SectionTitle>

        {!rows.length ? (
          <Empty>No borrower has reached this stage yet.</Empty>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-extrabold">Borrower</th>
                  <th className="py-2 pr-3 font-extrabold">Ref</th>
                  <th className="py-2 pr-3 font-extrabold">Stage</th>
                  <th className="py-2 pr-3 text-right font-extrabold">Sent</th>
                  <th className="py-2 pr-3 text-right font-extrabold">Clicks</th>
                  <th className="py-2 pr-3 text-right font-extrabold">Outstanding</th>
                  <th className="py-2 pr-3 font-extrabold">Last seen</th>
                  <th className="py-2 pr-3 font-extrabold">Remarks</th>
                  <th className="py-2 font-extrabold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-ink">{r.name || '—'}</div>
                      <div className="text-[10px] text-muted">{r.loanId}</div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] font-bold">{r.refId}</td>
                    <td className="py-2.5 pr-3">
                      <Tag variant={STAGE_TONE[r.stage] || 'default'}>{r.stageLabel}</Tag>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-bold">{fmt(r.linkSentCount)}</td>
                    <td className="py-2.5 pr-3 text-right font-bold">{fmt(r.clicks)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{r.outstanding == null ? '—' : fmtCr(r.outstanding)}</td>
                    <td className="py-2.5 pr-3 text-[10px] text-muted">
                      <div>{fmtDate(r.lastSeenAt)}</div>
                      <div className="mt-0.5">
                        <DeviceLocation deviceLocation={r.lastKnownLocation} />
                      </div>
                    </td>
                    <td className="max-w-[220px] py-2.5 pr-3 text-[10px] italic text-slate-600">{r.remarks || '—'}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="xs" onClick={() => openBorrower(r.refId || r._id)}>
                          Open
                        </Button>
                        <Button size="xs" onClick={() => setTimelineOpen(true)}>
                          History
                        </Button>
                        <Button size="xs" onClick={() => showToast('Link copied', 'success')}>
                          Copy link
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer open={timelineOpen} onClose={() => setTimelineOpen(false)}>
        <DrawerHeader
          title={LINK_TIMELINE.borrower.name}
          subtitle={`Ref ${LINK_TIMELINE.borrower.refId} · link sent ${fmt(LINK_TIMELINE.borrower.linkSentCount)}×`}
          onClose={() => setTimelineOpen(false)}
        />
        <div className="p-5">
          <ol className="space-y-3">
            {LINK_TIMELINE.events.map((e) => (
              <li key={e._id} className="border-l-2 border-line pl-3">
                <div className="flex items-center gap-2">
                  <Tag variant={STAGE_TONE[e.stage] || 'default'}>{e.stageLabel}</Tag>
                  <span className="text-[10px] font-semibold text-muted">{fmtDate(e.timestamp)}</span>
                </div>
                {e.remarks && <p className="mt-1.5 text-[11px] italic text-slate-600">“{e.remarks}”</p>}
                <div className="mt-1 text-[10px] text-muted">
                  {[e.ip, [e.device?.type, e.device?.os, e.device?.browser].filter(Boolean).join(' · ')].filter(Boolean).join('  •  ')}
                </div>
                <div className="mt-0.5 text-[10px] text-muted">
                  <DeviceLocation deviceLocation={e.deviceLocation} fallback={[e.location?.city, e.location?.country].filter(Boolean).join(', ')} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Drawer>
    </div>
  );
}
