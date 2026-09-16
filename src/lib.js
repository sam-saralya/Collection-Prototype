// Shared helpers + domain vocabulary, merged from the production client's
// src/utils/{format,categories,scoreDefs,contactability,dataIssues}.js.
// Pure functions and constant tables — safe to copy verbatim.

/* ------------------------------------------------------------------ format */
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
export const fmtI = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// Client-side CSV download — stands in for a real export endpoint. Runs
// entirely in the browser (Blob + object URL), no backend involved.
export function exportCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Compact Indian currency: ₹1.25Cr / ₹3.4L / ₹8,200.
export function fmtCr(n) {
  const v = Number(n || 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
  return '₹' + v.toLocaleString('en-IN');
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt)
    ? '—'
    : dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* -------------------------------------------------------------- categories */
// 2×2 Ability × Intent segmentation — two bands each (High ≥ 50, Low < 50).
export const CATEGORIES = [
  { key: 'oops', label: 'The Oops', ability: 'high', intent: 'high', routing: 'Rule-Based Routing' },
  { key: 'wilful_defaulter', label: 'The Wilful Defaulter', ability: 'high', intent: 'low', routing: 'ML + LLM Review' },
  { key: 'cashflow_crunch', label: 'The Cashflow Crunch', ability: 'low', intent: 'high', routing: 'ML Routing' },
  { key: 'lost_cause', label: 'The Lost Cause', ability: 'low', intent: 'low', routing: 'ML + LLM Review' },
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const ROUTING_COLOR = {
  'Rule-Based Routing': '#13b8a6',
  'ML Routing': '#f59e0b',
  'ML + LLM Review': '#e5484d',
};
export const ROUTING_TAG = {
  'Rule-Based Routing': 'green',
  'ML Routing': 'amber',
  'ML + LLM Review': 'red',
};

export const ABILITY_ROWS = ['high', 'low'];
export const INTENT_COLS = ['low', 'high'];
export const BAND_LABEL = { high: 'High', low: 'Low' };
export const BAND_RANGE = { high: '≥ 50', low: '< 50', High: '50–100', Low: '0–49' };

export function categoryAt(ability, intent) {
  return CATEGORIES.find((c) => c.ability === ability && c.intent === intent);
}

/* --------------------------------------------------------------- scoreDefs */
export const AF = [
  { key: 'overdue_severity', label: 'Overdue Severity', w: 0.2, desc: 'Days overdue (0-210). Lower = better.' },
  { key: 'repayment_velocity', label: 'Repayment Velocity', w: 0.15, desc: 'How much principal has been repaid.' },
  { key: 'last_payment_recency', label: 'Last Payment Recency', w: 0.12, desc: 'Days since last collection (0-180). Lower = better.' },
  { key: 'income_stability', label: 'Income Stability', w: 0.11, desc: 'Whether income data exists on file.' },
  { key: 'bounce_pressure', label: 'Bounce Pressure', w: 0.1, desc: 'NACH/cheque bounces in last 90 days.' },
  { key: 'emi_burden', label: 'EMI Burden (FOIR)', w: 0.1, desc: 'EMI-to-income ratio. Lower = better.' },
  { key: 'balance_cover', label: 'Balance Cover', w: 0.09, desc: 'Bank balance vs EMI amount.' },
  { key: 'exposure_ratio', label: 'Exposure Ratio', w: 0.08, desc: 'Outstanding vs total principal. Lower = better.' },
  { key: 'employment_tenure', label: 'Employment Tenure', w: 0.05, desc: 'Months at current employer.' },
];

export const IIF = [
  { key: 'contactability', label: 'Contactability', w: 0.25, desc: 'Is mobile number valid and reachable?' },
  { key: 'ptp_kept_rate', label: 'PTP Kept Rate', w: 0.25, desc: 'Ratio of EMIs actually paid vs scheduled.' },
  { key: 'broken_ptp', label: 'Broken PTP (OD Severity)', w: 0.25, desc: 'OD bucket severity as proxy for broken promises.' },
  { key: 'message_read', label: 'Message Read Rate', w: 0.25, desc: 'Account status as proxy for engagement.' },
];

/* ---------------------------------------------------------- contactability */
export const CONTACTABILITY_FILTERS = [
  ['', 'Any contactability'],
  ['reachable', 'Reachable'],
  ['unreachable', 'Segmentation pending'],
  ['unchecked', 'IVR not checked'],
];

export function isUnreachable(b) {
  return !!(b && b.ivrCheckedAt && !b.ivrReachable && !b.coIvrReachable);
}

// Which enrichment data points a borrower is still missing.
export function enrichGaps(b) {
  const g = [];
  if (!b.hasPan) g.push('PAN');
  if (!b.bureauPulled) g.push('Bureau report');
  if (!b.hasCoApplicant) g.push('Co-applicant');
  if (!b.altMobile) g.push('Alternate mobile');
  return g;
}

export const DPD_BUCKETS = ['1–30', '31–60', '61–90', '90+'];
export function dpdBucket(d) {
  if (d == null) return '—';
  if (d <= 0) return 'Current';
  if (d <= 30) return '1–30';
  if (d <= 60) return '31–60';
  if (d <= 90) return '61–90';
  return '90+';
}

export function partyReachability(reachable, checkedAt) {
  if (!checkedAt) return { label: 'Not checked', variant: 'default' };
  return reachable
    ? { label: 'Reachable', variant: 'green' }
    : { label: 'Not reachable', variant: 'red' };
}

// What happened when the IVR system dialled the number.
export const IVR_CALL_OUTCOMES = [
  { key: 'answered', label: 'Answered', variant: 'green' },
  { key: 'no_answer', label: 'No answer', variant: 'default' },
  { key: 'busy', label: 'Busy / rejected', variant: 'amber' },
  { key: 'invalid', label: 'Invalid number', variant: 'red' },
];
export const IVR_OUTCOME_BY_KEY = Object.fromEntries(IVR_CALL_OUTCOMES.map((o) => [o.key, o]));

// Which key the borrower pressed in the IVR menu once they picked up.
export const IVR_OPTIONS = [
  { key: 'will_pay', digit: '1', label: 'Will pay now / shortly', variant: 'green' },
  { key: 'need_time', digit: '2', label: 'Needs more time', variant: 'amber' },
  { key: 'already_paid', digit: '3', label: 'Says already paid', variant: 'blue' },
  { key: 'dispute', digit: '4', label: 'Disputes loan / amount', variant: 'red' },
  { key: 'callback', digit: '5', label: 'Wants an agent callback', variant: 'purple' },
  { key: 'wrong_number', digit: '9', label: 'Wrong number / not me', variant: 'red' },
  { key: 'no_input', digit: '—', label: 'Hung up, no selection', variant: 'default' },
];
export const IVR_OPTION_BY_KEY = Object.fromEntries(IVR_OPTIONS.map((o) => [o.key, o]));

// Recorded IVR scripts the sweep can dial. Each maps its keypad digits to the
// outcome keys above, so the console can show "what this script captures".
export const IVR_SCRIPTS = [
  {
    id: 'std_reminder',
    name: 'Standard collections reminder',
    language: 'Hindi + English',
    body:
      'Namaste {name}. Aapke loan {loan_id} par ₹{amount} baaki hai. Turant bhugtan ke liye 1 dabayein, aur samay ke liye 2, ' +
      'agar pehle hi bhar diya hai to 3, kisi samasya ke liye 4, agent se baat karne ke liye 5.',
    digits: [
      ['1', 'will_pay'],
      ['2', 'need_time'],
      ['3', 'already_paid'],
      ['4', 'dispute'],
      ['5', 'callback'],
    ],
  },
  {
    id: 'identity_check',
    name: 'Identity confirmation only',
    language: 'English',
    body: 'Hello, this is a call for {name} regarding loan {loan_id}. Press 1 if this is you, or 9 if this is a wrong number.',
    digits: [
      ['1', 'will_pay'],
      ['9', 'wrong_number'],
    ],
  },
  {
    id: 'settlement',
    name: 'Settlement offer',
    language: 'Hindi + English',
    body:
      'Namaste {name}. Aapke loan {loan_id} ke liye ek one-time settlement offer hai. Details ke liye 1 dabayein, ' +
      'baad me sochne ke liye 2, agent se baat karne ke liye 5.',
    digits: [
      ['1', 'will_pay'],
      ['2', 'need_time'],
      ['5', 'callback'],
    ],
  },
];
export const IVR_SCRIPT_BY_ID = Object.fromEntries(IVR_SCRIPTS.map((s) => [s.id, s]));

/* -------------------------------------------------------------- dataIssues */
export const ISSUE_LABELS = {
  missing_name: 'Missing borrower name',
  missing_loan_id: 'Missing loan ID',
  duplicate_loan_id: 'Duplicate loan ID',
  missing_mobile: 'Missing mobile number',
  invalid_mobile: 'Invalid mobile number',
  missing_aadhaar: 'Missing Aadhaar',
  missing_pan: 'Missing PAN (no credit report possible)',
  invalid_aadhaar: 'Invalid Aadhaar format',
  invalid_age: 'Age outside plausible range',
  negative_amount: 'Negative amount field',
  outstanding_exceeds_principal: 'Outstanding exceeds principal',
  missing_geography: 'Missing district & state',
  future_disbursement: 'Disbursement date in the future',
};

export const REJECT_LABELS = {
  missing_mobile: 'Mobile number missing',
  invalid_mobile: 'Mobile not 10 digits / non-numeric',
  invalid_pan: 'PAN format invalid (ABCDE1234F)',
  missing_coapplicant: 'No co-applicant details',
  invalid_coapplicant_mobile: 'Invalid co-applicant mobile',
};
