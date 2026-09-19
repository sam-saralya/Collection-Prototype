import React, { useState } from 'react';
import { partyReachability, exportCsv, fmtDate, IVR_OUTCOME_BY_KEY, IVR_OPTION_BY_KEY } from '../lib.js';
import { Tag, Button, Spinner, cx, Field, Input, Textarea } from '../ui.jsx';
import { useUI } from '../store.jsx';
import { BUREAU_SAMPLE } from '../bureauSample.js';
import { borrowerJourney, callLogStats, messageLogStats } from '../data.js';

// Adapted from the production client's src/components/BorrowerDetail.jsx.
// Same layout; the two async sub-fetches (credit report, comms history) are
// replaced with static dummy blocks.

const EMPTY = (v) => v == null || v === '' || (typeof v === 'number' && isNaN(v));
const money = (v) => (EMPTY(v) ? null : '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const int = (v) => (EMPTY(v) ? null : Number(v).toLocaleString('en-IN'));
const text = (v) => (EMPTY(v) ? null : String(v));
const days = (v) => (EMPTY(v) ? null : `${Number(v).toLocaleString('en-IN')}d`);
const rate = (v) => (EMPTY(v) ? null : `${Number(v)}%`);
function day(v) {
  if (EMPTY(v)) return null;
  const raw = String(v).replace(/^'+/, '').trim();
  let d;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(raw);
  if (v instanceof Date) d = v;
  else if (dmy) {
    let dd = Number(dmy[1]);
    let mm = Number(dmy[2]);
    if (mm > 12) [dd, mm] = [mm, dd];
    const yy = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    d = new Date(yy, mm - 1, dd);
  } else d = new Date(raw);
  if (isNaN(d.getTime())) return raw || null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Line({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-1.5">
      <span className="text-[11px] font-semibold leading-snug text-muted">{label}</span>
      <span className="text-right text-[12px] font-bold leading-snug text-ink">{value}</span>
    </div>
  );
}

const TONES = {
  default: { bar: 'bg-ink text-white', body: 'bg-white' },
  bureau: { bar: 'bg-brand-2 text-white', body: 'bg-brand-2/[.04]' },
  scheme: { bar: 'bg-mint text-white', body: 'bg-mint/[.05]' },
};

function Section({ title, note, rows = [], tone = 'default', cols = 3, className = '', children }) {
  const shown = rows.filter(([, v]) => !EMPTY(v));
  if (!shown.length && !children) return null;
  const t = TONES[tone] || TONES.default;
  return (
    <section className={cx('mt-4 overflow-hidden rounded-[10px] border border-line', className)}>
      <header className={cx('flex items-baseline justify-between gap-3 px-3 py-1.5', t.bar)}>
        <h3 className="text-[12px] font-extrabold tracking-tight">{title}</h3>
        {note && <span className="text-[10px] font-semibold opacity-80">{note}</span>}
      </header>
      <div className={cx('px-3 pb-2 pt-1', t.body)}>
        {shown.length > 0 && (
          <div
            className={cx(
              'grid gap-x-6',
              cols === 3
                ? 'grid-cols-3 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1'
                : cols === 2
                ? 'grid-cols-2 max-[700px]:grid-cols-1'
                : 'grid-cols-1'
            )}
          >
            {shown.map(([l, v]) => (
              <Line key={l} label={l} value={v} />
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

// Label/value pairs as an actual table — keeps the value column aligned
// regardless of label length, unlike a flex-row grid (Section/Line above).
// rows may be [label, value] or [label, value, tone] where tone is 'danger' | 'ok'.
const VALUE_TONE = { danger: 'text-danger', ok: 'text-ok' };
function KVTable({ title, note, rows = [], tone = 'default', className = '' }) {
  const shown = rows.filter(([, v]) => !EMPTY(v));
  if (!shown.length) return null;
  const t = TONES[tone] || TONES.default;
  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className={cx('flex items-baseline justify-between gap-3 px-3 py-1.5', t.bar)}>
        <h3 className="text-[12px] font-extrabold tracking-tight">{title}</h3>
        {note && <span className="text-[10px] font-semibold opacity-80">{note}</span>}
      </header>
      <div className={cx('overflow-x-auto', t.body)}>
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            {shown.map(([l, v, rowTone], i) => (
              <tr key={l} className={cx('border-b border-line last:border-0', i % 2 === 1 && 'bg-black/[.025]')}>
                <td className="w-px whitespace-nowrap px-3 py-1.5 font-semibold text-muted">{l}</td>
                <td className={cx('w-full px-3 py-1.5 pl-6 text-left font-bold', VALUE_TONE[rowTone] || 'text-ink')}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Single-borrower sibling of QuickLookupCard: run → see result → Export Data.
// Terminal, single-step — no branching, no segmentation.
function ResultList({ title, items, empty, tone = 'default' }) {
  const t = TONES[tone] || TONES.default;
  return (
    <section className="overflow-hidden rounded-[10px] border border-line">
      <header className={cx('flex items-baseline justify-between gap-3 px-3 py-1.5', t.bar)}>
        <h3 className="text-[12px] font-extrabold tracking-tight">{title}</h3>
        {items.length > 0 && <span className="text-[10px] font-semibold opacity-80">{items.length} found</span>}
      </header>
      <div className={cx('px-3 py-2', t.body)}>
        {items.length ? (
          <ul className="space-y-1.5">
            {items.map((v, idx) => (
              <li
                key={idx}
                className="truncate rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-ink"
              >
                {v}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-2 text-[11.5px] font-medium text-muted">{empty}</div>
        )}
      </div>
    </section>
  );
}

function LookupRow({ label, mobile, value, exportRow }) {
  const [state, setState] = useState(value ? 'done' : 'idle');
  const [result, setResult] = useState(value ?? null);
  const [running, setRunning] = useState(false);

  function run() {
    setRunning(true);
    setTimeout(() => {
      setResult(value ?? null);
      setRunning(false);
      setState('done');
    }, 650);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-line py-1.5 last:border-0">
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-muted">{label}</span>
        <div className="truncate text-[12px] font-bold text-ink">
          {state === 'idle' && <span className="font-normal text-muted">Not run</span>}
          {state === 'done' && (result ? result : <span className="font-normal text-muted">Not found</span>)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {running ? (
          <Spinner className="h-3.5 w-3.5 text-muted" />
        ) : (
          <Button size="xs" onClick={run}>
            {state === 'done' ? 'Re-run' : 'Run'}
          </Button>
        )}
        {state === 'done' && result && (
          <button className="text-[10px] font-semibold text-brand" onClick={() => exportRow(result)}>
            Export ↓
          </button>
        )}
      </div>
    </div>
  );
}

// ── full bureau pull — real Experian FCIR response shape ────────────────────
const ACCOUNT_TYPE = {
  '01': 'Auto loan', '02': 'Housing loan', '05': 'Personal loan', '06': 'Consumer loan',
  '07': 'Gold loan', '08': 'Education loan', '10': 'Credit card', '13': 'Two-wheeler loan',
  '31': 'Secured credit card', '36': 'Kisan credit card', '40': 'Microfinance — business',
  '41': 'Microfinance — personal', '42': 'Microfinance — housing', '43': 'Microfinance — other',
  '50': 'Business loan — priority sector', '61': 'Business loan — unsecured', '69': 'Consumer loan',
};

function parseYmd(v) {
  if (!v || String(v).length !== 8) return null;
  const s = String(v);
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  return isNaN(d.getTime()) ? null : d;
}

function bureauAccounts(details) {
  return (details || []).map((a) => {
    const balance = Number(a.Current_Balance || 0);
    const pastDue = Number(a.Amount_Past_Due || 0);
    const writtenOff = a.Written_off_Settled_Status === '02' || a.Written_off_Settled_Status === '08' || Number(a.Written_Off_Amt_Total || 0) > 0;
    const closed = !!a.Date_Closed;
    const status = writtenOff ? { label: 'Written-off/Settled', tag: 'red' } : closed ? { label: 'Closed', tag: 'default' } : pastDue > 0 ? { label: 'Overdue', tag: 'amber' } : { label: 'Active', tag: 'green' };
    const latestDpd = a.CAIS_Account_History?.[0]?.Days_Past_Due;
    return {
      lender: a.Subscriber_Name,
      type: ACCOUNT_TYPE[a.Account_Type] || `Type ${a.Account_Type}`,
      opened: parseYmd(a.Open_Date),
      reported: parseYmd(a.Date_Reported),
      balance,
      pastDue,
      status,
      latestDpd: latestDpd === '' || latestDpd == null ? null : Number(latestDpd),
    };
  });
}

const TRADELINE_COLS = [
  { key: 'lender', label: 'Lender', align: 'left', get: (a) => a.lender?.toLowerCase() || '' },
  { key: 'type', label: 'Type', align: 'left', get: (a) => a.type?.toLowerCase() || '' },
  { key: 'opened', label: 'Opened', align: 'left', get: (a) => a.opened?.getTime() ?? -Infinity },
  { key: 'status', label: 'Status', align: 'left', get: (a) => a.status.label },
  { key: 'balance', label: 'Outstanding', align: 'right', get: (a) => a.balance },
  { key: 'pastDue', label: 'Past due', align: 'right', get: (a) => a.pastDue },
  { key: 'latestDpd', label: 'Latest DPD', align: 'right', get: (a) => a.latestDpd ?? -Infinity },
];

function sortAccounts(accounts, sort) {
  const col = TRADELINE_COLS.find((c) => c.key === sort.key);
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...accounts].sort((a, b) => {
    const av = col.get(a);
    const bv = col.get(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

// Fixed status → color mapping (active = good, default = critical, closed = neutral),
// reusing the app's existing status tokens rather than inventing new ones.
const ACCOUNT_STATUS_COLORS = [
  { key: 'active', label: 'Active', color: '#16a34a' },
  { key: 'default', label: 'Default', color: '#e5484d' },
  { key: 'closed', label: 'Closed', color: '#64748b' },
];

function AccountStatusDonut({ active, closed, deflt, total }) {
  const segments = [
    { ...ACCOUNT_STATUS_COLORS[0], value: active },
    { ...ACCOUNT_STATUS_COLORS[1], value: deflt },
    { ...ACCOUNT_STATUS_COLORS[2], value: closed },
  ];
  const R = 38;
  const STROKE = 14;
  const C = 2 * Math.PI * R;
  let cumulative = 0;

  return (
    <div className="flex shrink-0 flex-col justify-center px-3 py-2.5">
      <small className="mb-1.5 block text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
        Accounts by status
      </small>
      <div className="flex flex-wrap items-center gap-4">
        <svg width="92" height="92" viewBox="0 0 100 100" className="shrink-0" role="img" aria-label="Accounts by status">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
          {total > 0 &&
            segments.map((s) => {
              if (s.value <= 0) return null;
              const len = (s.value / total) * C;
              const el = (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-cumulative}
                  transform="rotate(-90 50 50)"
                >
                  <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
                </circle>
              );
              cumulative += len;
              return el;
            })}
          <text x="50" y="47" textAnchor="middle" className="fill-ink" style={{ font: '700 20px Inter, sans-serif' }}>
            {total}
          </text>
          <text x="50" y="62" textAnchor="middle" className="fill-muted" style={{ font: '600 8px Inter, sans-serif' }}>
            TOTAL
          </text>
        </svg>
        <div className="flex flex-col gap-1 text-[11px]">
          {segments.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} <b className="text-ink">{s.value}</b>
              {total > 0 && <span className="text-muted">({Math.round((s.value / total) * 100)}%)</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecuredSplitBar({ bal }) {
  const secured = Number(bal.Outstanding_Balance_Secured || 0);
  const unsecured = Number(bal.Outstanding_Balance_UnSecured || 0);
  const securedPct = Number(bal.Outstanding_Balance_Secured_Percentage || 0);
  const unsecuredPct = Number(bal.Outstanding_Balance_UnSecured_Percentage || 0);
  return (
    <div className="flex min-w-[220px] flex-1 flex-col justify-center px-3 py-2.5">
      <small className="mb-1 block text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
        Secured vs unsecured outstanding
      </small>
      {securedPct + unsecuredPct > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-line bg-slate-100">
          {securedPct > 0 && <div className="h-full bg-mint" style={{ width: `${securedPct}%` }} title={`Secured ${securedPct}%`} />}
          {unsecuredPct > 0 && <div className="h-full bg-brand" style={{ width: `${unsecuredPct}%` }} title={`Unsecured ${unsecuredPct}%`} />}
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-mint" />
          Secured <b className="text-ink">{securedPct}%</b> · {money(secured) || '₹0'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Unsecured <b className="text-ink">{unsecuredPct}%</b> · {money(unsecured) || '₹0'}
        </span>
      </div>
    </div>
  );
}

function CreditReportCard({ className = '' }) {
  const r = BUREAU_SAMPLE.response;
  const cr = r.credit_report;
  const header = cr.CreditProfileHeader;
  const summary = cr.CAIS_Account.CAIS_Summary;
  const bal = summary.Total_Outstanding_Balance;
  const acct = summary.Credit_Account;

  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="flex items-baseline justify-between gap-3 bg-brand-2 px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">Credit Report · Applicant · Experian</h3>
        <span className="text-[10px] font-semibold opacity-80">
          Pulled {parseYmd(String(header.ReportDate))?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || '—'}
        </span>
      </header>
      <div className="bg-brand-2/[.04] px-3 py-2.5">
        <div className="flex flex-wrap items-stretch divide-x divide-line rounded-lg border border-line bg-white">
          <AccountStatusDonut
            active={Number(acct.CreditAccountActive) || 0}
            closed={Number(acct.CreditAccountClosed) || 0}
            deflt={Number(acct.CreditAccountDefault) || 0}
            total={Number(acct.CreditAccountTotal) || 0}
          />

          <SecuredSplitBar bal={bal} />
        </div>
      </div>
    </section>
  );
}

function TradelinesCard({ className = '' }) {
  const [sort, setSort] = useState({ key: 'balance', dir: 'desc' });
  const cr = BUREAU_SAMPLE.response.credit_report;
  const accounts = sortAccounts(bureauAccounts(cr.CAIS_Account.CAIS_Account_DETAILS), sort);
  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="flex items-baseline justify-between gap-3 bg-ink px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">Tradelines</h3>
        <span className="text-[10px] font-semibold opacity-80">{accounts.length} accounts</span>
      </header>
      <div className="max-h-72 overflow-auto bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {TRADELINE_COLS.map((c) => (
                <th key={c.key} className={cx('border-b border-line px-2.5 py-1.5 text-left font-bold text-muted', c.align === 'right' && 'text-right')}>
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={cx('inline-flex items-center gap-1 hover:text-ink', c.align === 'right' && 'flex-row-reverse')}
                  >
                    {c.label}
                    <span className={cx('text-[9px]', sort.key === c.key ? 'text-brand' : 'text-slate-300')}>
                      {sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={i} className={cx('border-b border-line last:border-0', i % 2 === 1 && 'bg-black/[.02]')}>
                <td className="px-2.5 py-1.5">{a.lender}</td>
                <td className="px-2.5 py-1.5 text-muted">{a.type}</td>
                <td className="px-2.5 py-1.5 text-muted">{a.opened ? a.opened.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-2.5 py-1.5"><Tag variant={a.status.tag}>{a.status.label}</Tag></td>
                <td className="px-2.5 py-1.5 text-right font-semibold">{money(a.balance) || '—'}</td>
                <td className={cx('px-2.5 py-1.5 text-right', a.pastDue > 0 && 'font-semibold text-danger')}>{a.pastDue > 0 ? money(a.pastDue) : '—'}</td>
                <td className={cx('px-2.5 py-1.5 text-right', a.latestDpd > 0 && 'font-semibold text-danger')}>{a.latestDpd != null ? `${a.latestDpd}d` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Log a follow-up against the loan — collection amount, PTP date, call/visit
// remarks. Each is its own quick action: click a button to open just that
// entry field, save it, and it's timestamped and added to the history below.
function LogUpdateForm({ onSave, className = '' }) {
  const [open, setOpen] = useState(null); // 'amount' | 'ptp' | 'remarks' | null
  const [amount, setAmount] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [callRemarks, setCallRemarks] = useState('');
  const [visitRemarks, setVisitRemarks] = useState('');

  function toggle(key) {
    setOpen((o) => (o === key ? null : key));
  }
  function cancel() {
    setOpen(null);
    setAmount('');
    setPtpDate('');
    setCallRemarks('');
    setVisitRemarks('');
  }
  function save(fields) {
    onSave({ amount: null, ptpDate: null, callRemarks: null, visitRemarks: null, ...fields, loggedAt: new Date().toISOString() });
    cancel();
  }

  const ACTIONS = [
    { key: 'amount', label: '₹ Payment collected' },
    { key: 'ptp', label: 'Log PTP' },
    { key: 'remarks', label: 'Call/visit remarks' },
  ];

  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="bg-ink px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">Log an update</h3>
      </header>
      <div className={cx('flex flex-wrap gap-1.5 bg-white px-3 py-2.5', open && 'border-b border-line')}>
        {ACTIONS.map((a) => (
          <Button key={a.key} size="xs" variant={open === a.key ? 'primary' : 'default'} onClick={() => toggle(a.key)}>
            {a.label}
          </Button>
        ))}
      </div>

      {open === 'amount' && (
        <div className="bg-white px-3 pb-2.5 pt-1">
          <Field label="Collection amount">
            <Input
              type="number"
              min="0"
              placeholder="₹ amount collected"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="xs" onClick={cancel}>Cancel</Button>
            <Button size="xs" variant="primary" disabled={amount === ''} onClick={() => save({ amount: Number(amount) })}>
              Save
            </Button>
          </div>
        </div>
      )}

      {open === 'ptp' && (
        <div className="bg-white px-3 pb-2.5 pt-1">
          <Field label="PTP date">
            <Input type="date" value={ptpDate} onChange={(e) => setPtpDate(e.target.value)} autoFocus />
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="xs" onClick={cancel}>Cancel</Button>
            <Button size="xs" variant="primary" disabled={!ptpDate} onClick={() => save({ ptpDate })}>
              Save
            </Button>
          </div>
        </div>
      )}

      {open === 'remarks' && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-white px-3 pb-2.5 pt-1 max-[700px]:grid-cols-1">
          <Field label="Call remarks" className="col-span-2">
            <Textarea
              rows={2}
              placeholder="What did the borrower say on the call?"
              value={callRemarks}
              onChange={(e) => setCallRemarks(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Visit remarks" className="col-span-2">
            <Textarea rows={2} placeholder="Field visit outcome" value={visitRemarks} onChange={(e) => setVisitRemarks(e.target.value)} />
          </Field>
          <div className="col-span-2 flex justify-end gap-2">
            <Button size="xs" onClick={cancel}>Cancel</Button>
            <Button
              size="xs"
              variant="primary"
              disabled={!callRemarks.trim() && !visitRemarks.trim()}
              onClick={() => save({ callRemarks: callRemarks.trim() || null, visitRemarks: visitRemarks.trim() || null })}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function UpdatesLog({ items, className = '' }) {
  if (!items.length) return null;
  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="flex items-baseline justify-between gap-3 bg-brand-2 px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">Update history</h3>
        <span className="text-[10px] font-semibold opacity-80">{items.length} logged</span>
      </header>
      <div className="divide-y divide-line bg-white">
        {items.map((u, i) => (
          <div key={i} className="px-3 py-2.5 text-[12px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-ink">{fmtDate(u.loggedAt)}</span>
              <div className="flex flex-wrap gap-1.5">
                {u.amount != null && <Tag variant="green">Collected {money(u.amount)}</Tag>}
              </div>
            </div>
            {u.callRemarks && (
              <p className="mt-1 leading-snug text-muted">
                <span className="font-semibold text-ink">Call: </span>
                {u.callRemarks}
              </p>
            )}
            {u.visitRemarks && (
              <p className="mt-1 leading-snug text-muted">
                <span className="font-semibold text-ink">Visit: </span>
                {u.visitRemarks}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── PTP History — every promise-to-pay date the borrower has given, and
// whatever was actually collected against it. Seeded from the IVR sweep's own
// promise (doc.ptpDate / doc.collectedThisCycle); anything logged later via
// "Log an update" → Log PTP is appended, newest first, and shows "Not yet
// recorded" until a collection is logged against it.
function PTPHistoryCard({ rows, className = '' }) {
  if (!rows.length) return null;
  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="flex items-baseline justify-between gap-3 bg-mint px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">PTP History</h3>
        <span className="text-[10px] font-semibold opacity-80">{rows.length} promise{rows.length === 1 ? '' : 's'}</span>
      </header>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-muted">
              <th className="px-3 py-1.5 font-semibold">PTP date</th>
              <th className="px-3 py-1.5 font-semibold">Amount collected</th>
              <th className="px-3 py-1.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={cx('border-b border-line last:border-0', i % 2 === 1 && 'bg-black/[.02]')}>
                <td className="px-3 py-1.5 font-bold text-ink">{day(row.date)}</td>
                <td className="px-3 py-1.5 font-semibold">
                  {row.amount != null ? money(row.amount) : <span className="font-normal text-muted">Not yet recorded</span>}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {row.honoured === true && <Tag variant="green">Honoured</Tag>}
                  {row.honoured === false && <Tag variant="amber">Not paid yet</Tag>}
                  {row.honoured == null && <Tag>Logged</Tag>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── last contact per channel — a compact strip on the Summary tab showing
// when each outreach channel last touched this borrower, and how it went.
function LastContactByChannel({ channels, className = '' }) {
  if (!channels?.length) return null;
  return (
    <section className={cx('overflow-hidden rounded-[10px] border border-line', className)}>
      <header className="flex items-baseline justify-between gap-3 bg-ink px-3 py-1.5 text-white">
        <h3 className="text-[12px] font-extrabold tracking-tight">Last contact by channel</h3>
      </header>
      <div className="divide-y divide-line bg-white">
        {channels.map((c) => (
          <div key={c.channel} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[11.5px] font-bold text-ink">{c.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted">{day(c.date)}</span>
              <Tag variant={c.statusVariant}>{c.status}</Tag>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── borrower timeline — every workflow/contactability pass that has run for
// this borrower, newest first. Each IVR-backed event carries the individual
// dial attempts behind its summary; CallDetailHoverCard reveals them without
// cluttering the row itself.
const EVENT_TONE = {
  import: '#64748b',
  contactability: '#2563eb',
  enrichment: '#7c3aed',
  segmentation: '#d97706',
  workflow: '#16a34a',
  message: '#0f766e',
};

function CallDetailHoverCard({ calls }) {
  const [open, setOpen] = useState(false);
  if (!calls?.length) return null;
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-extrabold text-brand hover:bg-brand/5"
      >
        {calls.length} call{calls.length === 1 ? '' : 's'} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-[21rem] rounded-[10px] border border-line bg-white p-2 shadow-lg">
          <div className="mb-1.5 px-1 text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
            Call attempts · {calls.length}
          </div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {calls.map((c) => {
              const outcome = IVR_OUTCOME_BY_KEY[c.outcome];
              const choice = c.choice ? IVR_OPTION_BY_KEY[c.choice] : null;
              return (
                <div key={c.id} className="rounded-lg border border-line bg-slate-50/60 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">
                      {c.party === 'applicant' ? 'Applicant' : 'Co-applicant'} · Attempt {c.attempt}/{c.totalAttempts}
                    </span>
                    <Tag variant={outcome?.variant || 'default'}>{outcome?.label || c.outcome}</Tag>
                  </div>
                  <div className="mt-1 text-muted">
                    {fmtDate(c.dialedAt)} · {c.mobile}
                  </div>
                  <div className="mt-0.5 text-muted">
                    {c.script}
                    {c.durationSec ? ` · ${c.durationSec}s` : ''}
                  </div>
                  {choice && (
                    <div className="mt-1">
                      <Tag variant={choice.variant}>{choice.label}</Tag>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

function TimelineEventRow({ event, isLast }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EVENT_TONE[event.type] || '#94a3b8' }} />
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-line" />}
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="rounded-[10px] border border-line bg-white px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold text-ink">{event.title}</span>
            <span className="text-[10px] font-semibold text-muted">{day(event.date)}</span>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted">{event.detail}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {event.tags?.map((t, i) => (
              <Tag key={i} variant={t.variant}>
                {t.label}
              </Tag>
            ))}
            <CallDetailHoverCard calls={event.calls} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStatsStrip({ callStats, msgStats }) {
  const items = [
    ['Total calls', callStats.total || 0],
    ['Total SMS', msgStats.smsTotal || 0],
    ['Total WhatsApp', msgStats.whatsappTotal || 0],
    ['Connected', callStats.connectedCount || 0],
    ['Connect rate', callStats.connectRate != null ? `${callStats.connectRate}%` : '—'],
    ['Contactability established', callStats.contactEstablishedAt ? day(callStats.contactEstablishedAt) : 'Not yet'],
  ];
  return (
    <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-[10px] border border-line bg-white px-3 py-2.5">
          <div className="text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">{label}</div>
          <div className="mt-0.5 text-[15px] font-extrabold leading-none text-ink">{value}</div>
        </div>
      ))}
      <div className="col-span-2 rounded-[10px] border border-line bg-white px-3 py-2.5">
        <div className="text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
          Latest SMS — how far it reached
        </div>
        <div className="mt-1 flex items-center gap-2">
          {msgStats.latestSms ? (
            <>
              <Tag variant={msgStats.latestSms.variant}>{msgStats.latestSms.label}</Tag>
              <span className="text-[11px] font-semibold text-muted">{day(msgStats.latestSms.date)}</span>
            </>
          ) : (
            <span className="text-[13px] font-bold text-muted">No SMS sent yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  ['summary', 'Summary'],
  ['timeline', 'Timeline'],
  ['personal', 'Personal Information'],
  ['loan', 'Loan Information'],
  ['bureau', 'Credit Bureau'],
  ['bankUpi', 'Bank/UPI Details'],
  ['altContact', 'Alternate numbers & Addresses'],
];

export default function BorrowerDetail({ borrower }) {
  const { showToast, borrowerHandle, borrowerUpdates, addBorrowerUpdate } = useUI();
  const [tab, setTab] = useState('summary');
  const updates = borrowerUpdates[borrowerHandle] || [];
  if (!borrower) return null;
  const doc = borrower;
  const r = doc.record || doc;
  const bureau = r.bureau || {};
  const journey = borrowerJourney(doc);
  const callStats = callLogStats(doc);
  const msgStats = messageLogStats(doc);

  const bankNameSplitIdx = doc.bankAccount ? doc.bankAccount.lastIndexOf(' ') : -1;
  const bankName = bankNameSplitIdx > -1 ? doc.bankAccount.slice(0, bankNameSplitIdx) : doc.bankAccount;
  const accountNumber = bankNameSplitIdx > -1 ? doc.bankAccount.slice(bankNameSplitIdx + 1) : null;

  // Skip-trace style enrichment: raw candidate numbers/addresses, not structured fields.
  const altNumbers = doc.altNumbers?.length ? doc.altNumbers : doc.altMobile ? [doc.altMobile] : [];
  const altAddresses = doc.altAddresses?.length ? doc.altAddresses : doc.resolvedAddress ? [doc.resolvedAddress] : [];
  const applicantRows = [
    ['Applicant name', text(r.name || doc.name)],
    ['Date of birth', day(r.dob)],
    ['Age', int(r.age)],
    ['Gender', text(r.gender)],
    ['Mobile number', text(r.mobile || doc.mobile)],
    ['PAN', text(r.applicantPan)],
    ['Aadhaar', text(r.applicantAadhaar)],
    ['Aadhaar status', text(r.aadhaarStatus)],
    ['Spouse name', text(r.spouseName)],
    ['Father name', text(r.fatherName)],
    ['IVR reachability', partyReachability(doc.ivrReachable, doc.ivrCheckedAt).label],
  ];
  const coApplicantRows = [
    ['Co-applicant name', text(r.coApplicantName)],
    ['Co-applicant mobile', text(r.coApplicantMobile)],
    ['Co-applicant PAN', text(r.coApplicantPan)],
    ['Co-applicant IVR reachability', partyReachability(doc.coIvrReachable, doc.coIvrCheckedAt).label],
  ];
  const nomineeRows = [
    ['Nominee name', text(r.nomineeName)],
    ['Nominee date of birth', day(r.nomineeDob)],
    ['Nominee age', int(r.nomineeAge)],
    ['Nominee relation', text(r.nomineeRelation)],
  ];
  const addressRows = [
    ['Address', text(r.address)],
    ['Village', text(r.villageName)],
    ['District', text(r.district)],
    ['State', text(r.state)],
    ['Rural / urban', text(r.ruralUrban)],
  ];

  const scoreDrift =
    bureau.scoreAtLoan != null && bureau.latestScore != null ? bureau.latestScore - bureau.scoreAtLoan : null;
  const scoreTone = scoreDrift == null || scoreDrift === 0 ? null : scoreDrift > 0 ? 'ok' : 'danger';

  const bureauRows = [
    ['Bureau score at the time of loan', int(bureau.scoreAtLoan)],
    ['Latest bureau report score', int(bureau.latestScore), scoreTone],
    ['Accounts paying on time', int(bureau.accountsPayingOnTime)],
    ['Accounts currently overdue', int(bureau.accountsOverdue), 'danger'],
    ['Accounts written off', int(bureau.accountsWrittenOff), 'danger'],
    ['Loan inquiries (last 365 days)', int(bureau.loanInquiries365)],
  ];

  const loanIdentification = [
    ['Loan no.', text(r.loanId || doc.loanId)],
    ['Product', text(r.product || r.source)],
    ['Lender', text(r.lenderId)],
    ['Purpose', text(r.purpose)],
    ['Sub-purpose', text(r.subPurpose)],
    ['Loan created on', day(r.loanCreatedOn)],
    ['Disbursement date', day(r._disbDate)],
  ];
  const loanTerms = [
    ['Principal total', money(r._prinTotal)],
    ['Interest rate', rate(r.intRate)],
    ['Processing fee', money(r.processingFee)],
    ['Tenure', int(r._tenure)],
    ['Total interest', money(r.totalInterest)],
    ['Total instalments', int(r._totalInstal)],
  ];
  const repaymentProgress = [
    ['EMIs paid', int(r._emiPaid)],
    ['Last EMI', money(r._lastEmi)],
    ['Instalments outstanding', int(r.instalOs)],
    ['EMI O/D', int(r.emiOd)],
    ['First demand date', day(r.firstDemandDate)],
    ['Last maturity date', day(r.lastMaturityDate)],
  ];

  const overdue = [
    ['OD days', days(r._od ?? doc.odDays)],
    ['OD bucket', text(r._odBucket)],
    ['Status', text(r._status)],
    ['Principal arrear', money(r.principalArrear)],
    ['Interest arrear', money(r.interestArrear)],
    ['Total arrear', money(r._totalArrear)],
    ['Principal collected', money(r._prinColl)],
    ['Interest collected', money(r._intColl)],
    ['Outstanding principal', money(r.outstanding ?? doc.outstanding)],
    ['Outstanding interest', money(r.outstandingInterest)],
    ['Last collection date', day(r._lastCollDate)],
    ['Last collection amount', money(r.lastCollAmount)],
    ['Next demand date', day(r.nextDemandDate)],
    ['Days since last payment', days(r._daysSince)],
  ];

  const ptpRows = [];
  if (doc.ptpDate) {
    ptpRows.push({ date: doc.ptpDate, amount: doc.collectedThisCycle ?? null, honoured: (doc.collectedThisCycle ?? 0) > 0 });
  }
  updates.forEach((u) => {
    if (u.ptpDate) ptpRows.push({ date: u.ptpDate, amount: u.amount, honoured: u.amount != null ? u.amount > 0 : null });
  });
  ptpRows.sort((a, b) => new Date(b.date) - new Date(a.date));

  const currentPosition = [
    ['Status', text(r._status)],
    ['OD days', days(r._od ?? doc.odDays)],
    ['OD bucket', text(r._odBucket)],
    ['Outstanding principal', money(r.outstanding ?? doc.outstanding)],
    ['Total arrear', money(r._totalArrear)],
    ['EMI amount', money(r._lastEmi)],
    ['Last collection', r._lastCollDate ? `${day(r._lastCollDate)} · ${money(r.lastCollAmount) || '—'}` : null],
    ['Next demand date', day(r.nextDemandDate)],
    ['Days since last payment', days(r._daysSince)],
  ];

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              '-mb-px whitespace-nowrap border-b-2 px-3.5 py-2 text-[12px] font-bold transition',
              tab === k ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div>
          <Section title="Current position" rows={currentPosition} />
          <PTPHistoryCard rows={ptpRows} className="mt-4" />
          <LastContactByChannel channels={journey.channels} className="mt-4" />
          <LogUpdateForm
            className="mt-4"
            onSave={(entry) => {
              addBorrowerUpdate(borrowerHandle, entry);
              showToast('Update logged for ' + (r.name || doc.name || 'borrower'), 'success');
            }}
          />
          <UpdatesLog items={updates.filter((u) => !u.ptpDate)} className="mt-4" />
        </div>
      )}

      {tab === 'timeline' && (
        <div className="mt-4">
          <TimelineStatsStrip callStats={callStats} msgStats={msgStats} />
          {journey.events.length ? (
            <div className="mt-4">
              {journey.events.map((ev, i) => (
                <TimelineEventRow key={`${ev.type}-${ev.date}-${i}`} event={ev} isLast={i === journey.events.length - 1} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[11.5px] font-medium text-muted">No workflow or contact activity recorded yet.</p>
          )}
        </div>
      )}

      {tab === 'personal' && (
        <div className="mt-4">
          <div className="grid grid-cols-3 items-start gap-4 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1">
            <KVTable title="Applicant" rows={applicantRows} />
            <KVTable title="Co-applicant" rows={coApplicantRows} />
            <KVTable title="Nominee" rows={nomineeRows} />
          </div>
          <KVTable title="Address" rows={addressRows} className="mt-4" />
        </div>
      )}

      {tab === 'loan' && (
        <div className="mt-4">
          <div className="grid grid-cols-2 items-start gap-4 max-[900px]:grid-cols-1">
            <KVTable title="Loan identification" rows={loanIdentification} />
            <KVTable title="Loan terms" rows={loanTerms} />
          </div>
          <div className="mt-4 grid grid-cols-2 items-start gap-4 max-[900px]:grid-cols-1">
            <KVTable title="Repayment progress" rows={repaymentProgress} />
            <KVTable title="Outstanding & overdue balance" rows={overdue} />
          </div>
        </div>
      )}

      {tab === 'bureau' && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <KVTable title="Bureau report" tone="bureau" rows={bureauRows} />
            <CreditReportCard />
          </div>
          <TradelinesCard className="mt-4" />
        </div>
      )}

      {tab === 'bankUpi' && (
        <div>
          <Section title="Bank/UPI Details">
            <div className="grid grid-cols-2 gap-x-8 max-[700px]:grid-cols-1 max-[700px]:gap-y-4">
              <div>
                <small className="mb-1 block text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
                  Bank Accounts
                </small>
                <LookupRow
                  label="Mobile → Bank Name"
                  mobile={doc.mobile}
                  value={bankName}
                  exportRow={(value) =>
                    exportCsv(`${doc.refId}_bank_name.csv`, ['Borrower', 'Ref ID', 'Mobile', 'Bank name'], [[doc.name, doc.refId, doc.mobile, value]])
                  }
                />
                <LookupRow
                  label="Mobile → Account Number"
                  mobile={doc.mobile}
                  value={accountNumber}
                  exportRow={(value) =>
                    exportCsv(`${doc.refId}_account_number.csv`, ['Borrower', 'Ref ID', 'Mobile', 'Account number'], [[doc.name, doc.refId, doc.mobile, value]])
                  }
                />
              </div>
              <div>
                <small className="mb-1 block text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
                  UPI IDs
                </small>
                <LookupRow
                  label="Mobile → UPI ID"
                  mobile={doc.mobile}
                  value={doc.upiId}
                  exportRow={(value) =>
                    exportCsv(`${doc.refId}_upi.csv`, ['Borrower', 'Ref ID', 'Mobile', 'UPI ID'], [[doc.name, doc.refId, doc.mobile, value]])
                  }
                />
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === 'altContact' && (
        <div className="mt-4 grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
          <ResultList title="Alternate numbers" items={altNumbers} empty="No alternate numbers found" />
          <ResultList title="Alternate addresses" items={altAddresses} empty="No alternate addresses found" />
        </div>
      )}
    </div>
  );
}
