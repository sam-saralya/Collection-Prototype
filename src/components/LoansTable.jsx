import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Empty, Tag, cx } from '../ui.jsx';
import { fmt, fmtI } from '../lib.js';

// A spreadsheet-style loans grid. Columns are organised into groups —
// general loan info, applicant / co-applicant / nominee, then bureau data —
// shown as banded group headers.
// Every column header has an Excel-style dropdown: Sort ↑ / ↓, a search box,
// and a checkbox list of that column's distinct values (number & date columns
// also get a "between" range). Several column filters apply at once; active
// ones show as chips.

const PAGE = 50;
const STATUS_TAG = { Current: 'green', Overdue: 'amber', NPA: 'red' };
const shortDate = (x) =>
  x ? new Date(x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const GROUPS = ['General loan information', 'Applicant information', 'Co-applicant information', 'Nominee information', 'Bureau'];
export const GROUP_TINT = {
  'General loan information': 'bg-slate-100 text-slate-600',
  'Applicant information': 'bg-sky-50 text-sky-700',
  'Co-applicant information': 'bg-amber-50 text-amber-700',
  'Nominee information': 'bg-emerald-50 text-emerald-700',
  Bureau: 'bg-fuchsia-50 text-fuchsia-700',
};

const money = (get) => ({ type: 'number', money: true, get, cell: (b) => fmtI(get(b)), align: 'right' });
const date = (get) => ({ type: 'date', get, cell: (b) => <span className="text-muted">{shortDate(get(b))}</span> });

export const COLUMNS = [
  // ── General loan information ────────────────────────────────────────────
  { key: 'companyId', group: 'General loan information', label: 'Company ID', type: 'text', get: (b) => b.companyId },
  { key: 'customerId', group: 'General loan information', label: 'Customer ID', type: 'text', get: (b) => b.customerId },
  { key: 'loanId', group: 'General loan information', label: 'Loan no.', type: 'text', get: (b) => b.loanId, cell: (b) => <span className="font-mono text-[11px]">{b.loanId}</span> },
  { key: 'disbursedOn', group: 'General loan information', label: 'Disbursement date', ...date((b) => b.disbursedOn) },
  { key: 'purpose', group: 'General loan information', label: 'Purpose', type: 'text', get: (b) => b.purpose },
  { key: 'subPurpose', group: 'General loan information', label: 'Sub-purpose', type: 'text', get: (b) => b.subPurpose },
  { key: 'villageName', group: 'General loan information', label: 'Village', type: 'text', get: (b) => b.villageName },
  { key: 'district', group: 'General loan information', label: 'District', type: 'text', get: (b) => b.district },
  { key: 'state', group: 'General loan information', label: 'State', type: 'text', get: (b) => b.state },
  { key: 'pincode', group: 'General loan information', label: 'Pincode', type: 'text', get: (b) => b.pincode },
  { key: 'lastCollDate', group: 'General loan information', label: 'Last collection date', ...date((b) => b.lastCollDate) },
  { key: 'lastCollAmount', group: 'General loan information', label: 'Last collection amount', ...money((b) => b.lastCollAmount) },
  { key: 'odDays', group: 'General loan information', label: 'OD days', type: 'number', get: (b) => b.odDays, cell: (b) => (b.odDays === 0 ? '—' : `${b.odDays} d`), align: 'right' },
  { key: 'odBucket', group: 'General loan information', label: 'OD bucket', type: 'text', get: (b) => b.odBucket },
  { key: 'repaymentFrequency', group: 'General loan information', label: 'Repayment frequency', type: 'text', get: (b) => b.repaymentFrequency },
  { key: 'lastContactDate', group: 'General loan information', label: 'Last contact date', ...date((b) => b.lastContactDate) },

  { key: 'totalInstallment', group: 'General loan information', label: 'Total installment', type: 'number', get: (b) => b.totalInstallment, align: 'right' },
  { key: 'outstandingInstallment', group: 'General loan information', label: 'Outstanding installment', type: 'number', get: (b) => b.outstandingInstallment, align: 'right' },
  { key: 'paidInstallment', group: 'General loan information', label: 'Paid installment', type: 'number', get: (b) => b.paidInstallment, align: 'right' },

  { key: 'totalPrincipal', group: 'General loan information', label: 'Total principal', ...money((b) => b.totalPrincipal) },
  { key: 'totalInterest', group: 'General loan information', label: 'Total interest', ...money((b) => b.totalInterest) },
  { key: 'totalAmount', group: 'General loan information', label: 'Total amount', ...money((b) => b.totalAmount) },

  { key: 'principalCollected', group: 'General loan information', label: 'Principal collected', ...money((b) => b.principalCollected) },
  { key: 'interestCollected', group: 'General loan information', label: 'Interest collected', ...money((b) => b.interestCollected) },
  { key: 'totalCollected', group: 'General loan information', label: 'Total collected', ...money((b) => b.totalCollected) },

  { key: 'principalArrear', group: 'General loan information', label: 'Principal arrear', ...money((b) => b.principalArrear) },
  { key: 'interestArrear', group: 'General loan information', label: 'Interest arrear', ...money((b) => b.interestArrear) },
  { key: 'totalArrear', group: 'General loan information', label: 'Total arrear', ...money((b) => b.totalArrear) },

  { key: 'principalOutstanding', group: 'General loan information', label: 'Principal outstanding', ...money((b) => b.principalOutstanding) },
  { key: 'outstandingInterest', group: 'General loan information', label: 'Interest outstanding', ...money((b) => b.outstandingInterest) },
  { key: 'totalOutstanding', group: 'General loan information', label: 'Total outstanding', ...money((b) => b.totalOutstanding) },

  { key: 'status', group: 'General loan information', label: 'Status', type: 'text', get: (b) => b.status, cell: (b) => <Tag variant={STATUS_TAG[b.status]}>{b.status}</Tag> },
  { key: 'collectedThisCycle', group: 'General loan information', label: 'Amount collected', ...money((b) => b.collectedThisCycle ?? 0) },
  { key: 'ptpDate', group: 'General loan information', label: 'Last PTP date', ...date((b) => b.ptpDate) },

  // ── Applicant information ───────────────────────────────────────────────
  { key: 'name', group: 'Applicant information', label: 'Applicant name', type: 'text', get: (b) => b.name },
  { key: 'dob', group: 'Applicant information', label: 'Date of birth', ...date((b) => b.dob) },
  { key: 'age', group: 'Applicant information', label: 'Age', type: 'number', get: (b) => b.age, align: 'right' },
  { key: 'gender', group: 'Applicant information', label: 'Gender', type: 'text', get: (b) => b.gender },
  { key: 'mobile', group: 'Applicant information', label: 'Applicant mobile', type: 'text', get: (b) => b.mobile },
  { key: 'applicantPan', group: 'Applicant information', label: 'Applicant PAN', type: 'text', get: (b) => b.applicantPan || '' },
  { key: 'applicantAadhaar', group: 'Applicant information', label: 'Applicant Aadhaar', type: 'text', get: (b) => b.applicantAadhaar || '' },
  { key: 'spouseName', group: 'Applicant information', label: 'Spouse name', type: 'text', get: (b) => b.spouseName || '' },

  // ── Co-applicant information ────────────────────────────────────────────
  { key: 'coApplicantName', group: 'Co-applicant information', label: 'Co-applicant name', type: 'text', get: (b) => b.coApplicantName || '' },
  { key: 'coApplicantMobile', group: 'Co-applicant information', label: 'Co-applicant mobile', type: 'text', get: (b) => b.coApplicantMobile || '' },
  { key: 'coApplicantPan', group: 'Co-applicant information', label: 'Co-applicant PAN', type: 'text', get: (b) => b.coApplicantPan || '' },

  // ── Nominee information ─────────────────────────────────────────────────
  { key: 'nomineeName', group: 'Nominee information', label: 'Nominee name', type: 'text', get: (b) => b.nomineeName || '' },
  { key: 'nomineeDob', group: 'Nominee information', label: 'Nominee date of birth', ...date((b) => b.nomineeDob) },
  { key: 'nomineeAge', group: 'Nominee information', label: 'Nominee age', type: 'number', get: (b) => b.nomineeAge ?? '', align: 'right' },
  { key: 'nomineeRelation', group: 'Nominee information', label: 'Nominee relation', type: 'text', get: (b) => b.nomineeRelation || '' },

  // ── Bureau ───────────────────────────────────────────────────────────────
  { key: 'bureauScore', group: 'Bureau', label: 'Bureau score', type: 'number', get: (b) => b.bureauScore ?? '', cell: (b) => b.bureauScore ?? '—', align: 'right' },
  { key: 'bureauName', group: 'Bureau', label: 'Bureau', type: 'text', get: (b) => b.bureauName || '', cell: (b) => b.bureauName || '—' },
];

const COL_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
const DEFAULT_VISIBLE = [
  'loanId',
  'name',
  'age',
  'mobile',
  'totalPrincipal',
  'totalInterest',
  'totalAmount',
  'principalCollected',
  'interestCollected',
  'totalCollected',
  'principalArrear',
  'interestArrear',
  'totalArrear',
  'odDays',
];

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const CHECK_W = 36;

// Default column width = whichever is wider, the header label or the widest
// value actually in the column — measured with canvas so headers and data
// both show in full, without a resize, instead of a hardcoded per-column guess.
const HEADER_FONT = '700 12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const DATA_FONT = '400 12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HEADER_CHROME = 20 /* px-2.5 both sides */ + 34 /* sort arrow + filter icon */;
const CELL_CHROME = 20 /* px-2.5 both sides */;
const MIN_COL_W = 72;
const MAX_COL_W = 280;
let measureCtx = null;
function measureText(text, font) {
  if (!measureCtx) {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    measureCtx = canvas ? canvas.getContext('2d') : { measureText: (s) => ({ width: s.length * 6.5 }) };
  }
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
const measureLabelWidth = (label) => measureText(label, HEADER_FONT);
const defaultWidth = (c) => Math.max(MIN_COL_W, Math.ceil(measureLabelWidth(c.label) + HEADER_CHROME));
// Plain-text version of what a cell shows, for width measurement — mirrors
// each column's `cell` renderer without the JSX.
function cellText(c, row) {
  const raw = c.get(row);
  if (c.key === 'odDays') return raw === 0 ? '—' : `${raw} d`;
  if (c.money) return fmtI(raw);
  if (c.type === 'date') return shortDate(raw);
  return raw === '' || raw == null ? '—' : String(raw);
}
const alignClass = () => 'text-center';

function TriCheck({ checked, indeterminate, onChange, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && !!indeterminate;
  }, [checked, indeterminate]);
  return <input ref={ref} type="checkbox" className="accent-brand" checked={checked} onChange={onChange} title={title} />;
}

function valueLabel(col, raw) {
  if (raw === '' || raw == null) return '(blank)';
  if (col.type === 'date') return shortDate(raw);
  if (col.money) return fmtI(raw);
  return String(raw);
}

function filterActive(f) {
  return !!f && (Array.isArray(f.selected) || f.min || f.max || f.from || f.to);
}

function matchRow(col, f, row) {
  if (!filterActive(f)) return true;
  const raw = col.get(row);
  if (Array.isArray(f.selected) && !f.selected.includes(String(raw))) return false;
  if (col.type === 'number' && (f.min || f.max)) {
    const n = Number(raw);
    if (f.min && !(n >= Number(f.min))) return false;
    if (f.max && !(n <= Number(f.max))) return false;
  }
  if (col.type === 'date' && (f.from || f.to)) {
    const t = raw ? new Date(raw).getTime() : NaN;
    if (f.from && !(t >= new Date(f.from).getTime())) return false;
    if (f.to && !(t <= new Date(f.to).getTime() + 86399999)) return false;
  }
  return true;
}

function ColumnMenu({ col, items, value, onChange, onSort, onClose }) {
  const [search, setSearch] = useState('');
  const allKeys = items.map((i) => i.key);
  const selected = value?.selected ? new Set(value.selected) : new Set(allKeys);
  const shown = items.filter((i) => valueLabel(col, i.raw).toLowerCase().includes(search.toLowerCase()));

  const commit = (keys) => {
    const next = keys.length >= allKeys.length ? null : keys;
    onChange({ ...(value || {}), selected: next });
  };
  const toggle = (key) => {
    const s = new Set(selected);
    s.has(key) ? s.delete(key) : s.add(key);
    commit([...s]);
  };
  const sortLabels =
    col.type === 'number'
      ? ['Sort smallest first', 'Sort largest first']
      : col.type === 'date'
      ? ['Sort oldest first', 'Sort newest first']
      : ['Sort A → Z', 'Sort Z → A'];

  const setAll = (on) => {
    const s = new Set(selected);
    shown.forEach((i) => (on ? s.add(i.key) : s.delete(i.key)));
    commit([...s]);
  };

  return (
    <>
      <div className="fixed inset-0 z-[40]" onMouseDown={onClose} />
      <div className="absolute right-0 top-full z-[41] mt-1 w-60 rounded-[10px] border border-line bg-white py-1 text-left font-normal normal-case text-ink shadow-pop">
        {[sortLabels[0], sortLabels[1]].map((lbl, k) => (
          <button
            key={lbl}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-slate-50"
            onClick={() => {
              onSort(k === 0 ? 'asc' : 'desc');
              onClose();
            }}
          >
            <span className="text-[10px] text-muted">{k === 0 ? '↑' : '↓'}</span>
            {lbl}
          </button>
        ))}

        <div className="my-1 border-t border-line" />

        {(col.type === 'number' || col.type === 'date') && (
          <div className="flex items-center gap-1.5 px-3 pb-2 pt-1">
            {col.type === 'number' ? (
              <>
                <Input type="number" placeholder="Min" value={value?.min ?? ''} onChange={(e) => onChange({ ...(value || {}), min: e.target.value })} className="h-7 py-0 text-[11px]" />
                <span className="text-[10px] text-muted">to</span>
                <Input type="number" placeholder="Max" value={value?.max ?? ''} onChange={(e) => onChange({ ...(value || {}), max: e.target.value })} className="h-7 py-0 text-[11px]" />
              </>
            ) : (
              <>
                <Input type="date" value={value?.from ?? ''} onChange={(e) => onChange({ ...(value || {}), from: e.target.value })} className="h-7 py-0 text-[11px]" />
                <Input type="date" value={value?.to ?? ''} onChange={(e) => onChange({ ...(value || {}), to: e.target.value })} className="h-7 py-0 text-[11px]" />
              </>
            )}
          </div>
        )}

        <div className="px-3 pt-1">
          <Input className="h-7 py-0 text-[11px]" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-1 flex gap-3 text-[10.5px] font-semibold text-brand">
            <button onClick={() => setAll(true)} className="hover:underline">Select all</button>
            <button onClick={() => setAll(false)} className="hover:underline">Clear</button>
          </div>
        </div>

        <div className="mt-1 max-h-52 overflow-y-auto px-3 pb-1">
          {shown.length === 0 ? (
            <div className="py-1 text-[11px] text-muted">No matching values</div>
          ) : (
            shown.map((i) => (
              <label key={i.key} className="flex items-center gap-2 py-[3px] text-[12px]">
                <input type="checkbox" className="accent-brand" checked={selected.has(i.key)} onChange={() => toggle(i.key)} />
                <span className="truncate">{valueLabel(col, i.raw)}</span>
              </label>
            ))
          )}
        </div>

        <div className="mt-1 flex justify-between border-t border-line px-3 pt-1.5">
          <button className="py-0.5 text-[11px] font-semibold text-muted hover:text-danger" onClick={() => onChange(null)}>
            Reset
          </button>
          <button className="rounded-md bg-brand px-3 py-1 text-[11px] font-semibold text-white" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </>
  );
}

export default function LoansTable({ rows: allRows, onRowClick, renderAbove, renderToolbarActions, defaultVisible, highlightColumns }) {
  const highlighted = useMemo(() => new Set(highlightColumns || []), [highlightColumns]);
  const [visible, setVisible] = useState(defaultVisible || DEFAULT_VISIBLE);
  const [sort, setSort] = useState({ key: 'totalArrear', dir: 'desc' });
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [colsOpen, setColsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [widths, setWidths] = useState({});
  const [dragOverKey, setDragOverKey] = useState(null);
  const colsRef = useRef(null);
  const dragKeyRef = useRef(null);

  const hideColumn = (key) => setVisible((v) => (v.length > 1 ? v.filter((k) => k !== key) : v));
  const reorderColumn = (from, to) =>
    setVisible((v) => {
      if (from === to) return v;
      const arr = [...v];
      const fromIdx = arr.indexOf(from);
      const toIdx = arr.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return v;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, from);
      return arr;
    });

  useEffect(() => {
    if (!colsOpen) return;
    const onDoc = (e) => colsRef.current && !colsRef.current.contains(e.target) && setColsOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colsOpen]);

  const cols = visible.map((k) => COL_BY_KEY[k]).filter(Boolean);

  // marks the first column of each contiguous group run, for a thin divider
  // between groups (e.g. loan info vs. applicant info) without a labeled row
  const groupStart = new Set();
  let lastGroup;
  cols.forEach((c) => {
    const g = c.group || '';
    if (g !== lastGroup) groupStart.add(c.key);
    lastGroup = g;
  });

  // Auto-fit width per column — whichever is wider, the header or the widest
  // value in that column across all rows — capped so one outlier value can't
  // blow a column out.
  const autoWidths = useMemo(() => {
    const m = {};
    COLUMNS.forEach((c) => {
      let maxDataW = 0;
      allRows.forEach((r) => {
        const w = measureText(cellText(c, r), DATA_FONT);
        if (w > maxDataW) maxDataW = w;
      });
      const headerW = measureLabelWidth(c.label) + HEADER_CHROME;
      m[c.key] = Math.max(MIN_COL_W, Math.min(MAX_COL_W, Math.ceil(Math.max(headerW, maxDataW + CELL_CHROME))));
    });
    return m;
  }, [allRows]);

  const distinct = useMemo(() => {
    const m = {};
    COLUMNS.forEach((c) => {
      const seen = new Map();
      allRows.forEach((r) => {
        const raw = c.get(r);
        const key = String(raw);
        if (!seen.has(key)) seen.set(key, raw);
      });
      m[c.key] = [...seen.entries()]
        .map(([key, raw]) => ({ key, raw }))
        .sort((a, b) => {
          if (c.type === 'number') return Number(a.raw || 0) - Number(b.raw || 0);
          if (c.type === 'date') return new Date(a.raw || 0) - new Date(b.raw || 0);
          return a.key.localeCompare(b.key);
        });
    });
    return m;
  }, [allRows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allRows.filter((row) => {
      if (needle.length >= 2) {
        const hay = `${row.name} ${row.loanId} ${row.mobile}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return COLUMNS.every((c) => matchRow(c, filters[c.key], row));
    });
  }, [allRows, filters, q]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = COL_BY_KEY[sort.key];
    if (!col) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const num = col.type === 'number';
    const date = col.type === 'date';
    return [...filtered].sort((a, b) => {
      let av = col.get(a);
      let bv = col.get(b);
      if (num) {
        av = av === '' || av == null ? -Infinity : Number(av);
        bv = bv === '' || bv == null ? -Infinity : Number(bv);
      } else if (date) {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      return cmp(av, bv) * dir;
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(Math.floor(skip / PAGE) + 1, pages);
  const pageRows = sorted.slice((page - 1) * PAGE, (page - 1) * PAGE + PAGE);

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setSkip(0);
  };
  const activeChips = COLUMNS.filter((c) => filterActive(filters[c.key]));

  const searchActive = q.trim().length >= 2;
  const criteria = [
    ...(searchActive ? [{ label: 'Search', text: `"${q.trim()}"` }] : []),
    ...activeChips.map((c) => {
      const f = filters[c.key];
      const text = Array.isArray(f.selected)
        ? f.selected.length <= 3
          ? f.selected.map((v) => valueLabel(c, v)).join(', ')
          : `${f.selected.length} values`
        : f.min || f.max
        ? `${f.min || '−∞'} – ${f.max || '∞'}`
        : `${f.from || '…'} – ${f.to || '…'}`;
      return { label: c.label, text };
    }),
  ];
  const filteredIds = sorted.map((r) => r._id);
  const selInFilter = filteredIds.filter((id) => selected.has(id)).length;
  const allSelected = filteredIds.length > 0 && selInFilter === filteredIds.length;
  const someSelected = selInFilter > 0 && !allSelected;

  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) filteredIds.forEach((id) => n.delete(id));
      else filteredIds.forEach((id) => n.add(id));
      return n;
    });
  const toggleRow = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSelection = () => setSelected(new Set());

  const colW = (c) => widths[c.key] ?? autoWidths[c.key] ?? defaultWidth(c);
  const tableW = CHECK_W + cols.reduce((s, c) => s + colW(c), 0);
  function startResize(e, key, cur) {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const move = (ev) => setWidths((w) => ({ ...w, [key]: Math.max(56, cur + (ev.clientX - x0)) }));
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  const resultInfo = {
    rows: sorted,
    count: total,
    criteria,
    filtered: searchActive || activeChips.length > 0,
    selectedRows: allRows.filter((r) => selected.has(r._id)),
    selectedCount: selected.size,
    clearSelection,
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-72 max-w-full"
          placeholder="Search name, loan ID or mobile…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSkip(0);
          }}
        />
        <div className="relative" ref={colsRef}>
          <Button onClick={() => setColsOpen((v) => !v)}>▦ Columns ({visible.length}/{COLUMNS.length})</Button>
          {colsOpen && (
            <div className="absolute left-0 top-full z-[42] mt-1 max-h-96 w-64 overflow-y-auto rounded-[10px] border border-line bg-white p-2 shadow-pop">
              {GROUPS.map((group) => {
                const groupCols = COLUMNS.filter((c) => c.group === group);
                const allOn = groupCols.every((c) => visible.includes(c.key));
                return (
                  <div key={group} className="mb-1.5 last:mb-0">
                    <div className="flex items-center justify-between px-1 pb-0.5">
                      <span className={cx('rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[.06em]', GROUP_TINT[group])}>
                        {group}
                      </span>
                      <button
                        className="text-[10px] font-semibold text-brand"
                        onClick={() =>
                          setVisible((v) => {
                            const keys = groupCols.map((c) => c.key);
                            const next = allOn ? v.filter((k) => !keys.includes(k)) : [...new Set([...v, ...keys])];
                            return COLUMNS.map((x) => x.key).filter((k) => next.includes(k));
                          })
                        }
                      >
                        {allOn ? 'none' : 'all'}
                      </button>
                    </div>
                    {groupCols.map((c) => {
                      const on = visible.includes(c.key);
                      return (
                        <label key={c.key} className="flex items-center gap-2 py-0.5 pl-1 text-[12px]">
                          <input
                            type="checkbox"
                            className="accent-brand"
                            checked={on}
                            onChange={() =>
                              setVisible((v) => (on ? v.filter((k) => k !== c.key) : COLUMNS.map((x) => x.key).filter((k) => v.includes(k) || k === c.key)))
                            }
                          />
                          {c.label}
                        </label>
                      );
                    })}
                  </div>
                );
              })}
              <div className="mt-1 flex justify-between border-t border-line pt-1">
                <button className="text-[11px] font-semibold text-brand" onClick={() => setVisible(COLUMNS.map((c) => c.key))}>
                  Show all
                </button>
                <button className="text-[11px] font-semibold text-muted" onClick={() => setVisible(defaultVisible || DEFAULT_VISIBLE)}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="text-[12px] text-muted">{fmt(total)} rows</span>
        {selected.size > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
            {fmt(selected.size)} selected
            <button onClick={clearSelection} className="text-brand/70 hover:text-brand" title="Clear selection">
              ✕
            </button>
          </span>
        )}
        {renderToolbarActions && <div className="ml-auto flex items-center gap-1.5">{renderToolbarActions(resultInfo)}</div>}
      </div>

      {activeChips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-1 font-semibold text-brand">
            <span>⚑</span>
            Filtered on {activeChips.map((c) => c.label).join(', ')}
          </span>
          <button onClick={() => setFilters({})} className="font-semibold text-muted underline">
            Clear
          </button>
        </div>
      )}

      {renderAbove?.(resultInfo)}

      <div className="max-h-[66vh] overflow-auto rounded-[10px] border border-line">
        <table className="border-collapse text-[12px] table-fixed" style={{ width: tableW }}>
          <colgroup>
            <col style={{ width: CHECK_W }} />
            {cols.map((c) => (
              <col key={c.key} style={{ width: colW(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 z-30 border-b border-line bg-slate-50 px-2.5 py-1.5 text-center align-bottom">
                <TriCheck
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                  title="Select all rows matching the current filters"
                />
              </th>
              {cols.map((c) => {
                const sortedHere = sort?.key === c.key;
                const active = filterActive(filters[c.key]);
                return (
                  <th
                    key={c.key}
                    draggable
                    onDragStart={(e) => {
                      dragKeyRef.current = c.key;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', c.key);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (dragKeyRef.current && dragKeyRef.current !== c.key) setDragOverKey(c.key);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragKeyRef.current;
                      dragKeyRef.current = null;
                      setDragOverKey(null);
                      if (from) reorderColumn(from, c.key);
                    }}
                    onDragEnd={() => {
                      dragKeyRef.current = null;
                      setDragOverKey(null);
                    }}
                    className={cx(
                      'group relative sticky top-0 z-20 cursor-grab border-b border-line text-center font-bold active:cursor-grabbing',
                      highlighted.has(c.key) ? 'bg-amber-100' : 'bg-slate-50',
                      groupStart.has(c.key) && 'border-l border-line',
                      dragOverKey === c.key && 'bg-brand/10'
                    )}
                    title="Drag to reorder"
                  >
                    <button
                      className="flex w-full items-center justify-center gap-1.5 px-5 py-1.5 hover:bg-slate-100"
                      onClick={() => setOpenFilter(openFilter === c.key ? null : c.key)}
                      title="Sort & filter"
                    >
                      <span className="truncate">{c.label}</span>
                      {sortedHere && <span className="shrink-0 text-[9px] text-brand">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                    <button
                      draggable={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        hideColumn(c.key);
                      }}
                      className="absolute left-1 top-1/2 -translate-y-1/2 shrink-0 rounded p-0.5 text-[11px] leading-none text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-brand group-hover:opacity-100"
                      title="Hide column"
                    >
                      👁
                    </button>
                    <span
                      className={cx(
                        'pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 shrink-0 text-[10px] transition',
                        active
                          ? 'text-brand'
                          : openFilter === c.key
                          ? 'text-slate-500'
                          : 'text-slate-300 opacity-0 group-hover:opacity-100'
                      )}
                    >
                      {active ? '⚑' : '▾'}
                    </span>
                    <span
                      draggable={false}
                      onMouseDown={(e) => startResize(e, c.key, colW(c))}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -right-[3px] top-0 z-10 h-full w-[6px] cursor-col-resize touch-none border-r-2 border-transparent hover:border-brand/50"
                      title="Drag to resize column"
                    />
                    {openFilter === c.key && (
                      <ColumnMenu
                        col={c}
                        items={distinct[c.key] || []}
                        value={filters[c.key]}
                        onChange={(val) => setFilter(c.key, val)}
                        onSort={(dir) => setSort({ key: c.key, dir })}
                        onClose={() => setOpenFilter(null)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1}>
                  <Empty>No loans match these filters.</Empty>
                </td>
              </tr>
            ) : (
              pageRows.map((b) => (
                <tr
                  key={b._id}
                  className={cx(
                    'cursor-pointer border-b border-[#edf1f5] last:border-0 hover:bg-brand/[.03]',
                    selected.has(b._id) && 'bg-brand/[.06]'
                  )}
                  onClick={() => onRowClick?.(b)}
                >
                  <td className="px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="accent-brand"
                      checked={selected.has(b._id)}
                      onChange={() => toggleRow(b._id)}
                    />
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={cx(
                        'overflow-hidden text-ellipsis whitespace-nowrap px-2.5 py-2',
                        alignClass(c),
                        groupStart.has(c.key) && 'border-l border-[#edf1f5]',
                        highlighted.has(c.key) && 'bg-amber-50 font-semibold text-amber-800'
                      )}
                    >
                      {c.cell ? c.cell(b) : String(c.get(b) ?? '—') || '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
        <span>
          Page {page} of {pages} · {fmt(total)} loans
        </span>
        {pages > 1 && (
          <div className="flex gap-2">
            <Button size="xs" disabled={page <= 1} onClick={() => setSkip((page - 2) * PAGE)}>
              ← Prev
            </Button>
            <Button size="xs" disabled={page >= pages} onClick={() => setSkip(page * PAGE)}>
              Next →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
