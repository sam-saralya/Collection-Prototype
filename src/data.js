// ─────────────────────────────────────────────────────────────────────────────
// DUMMY DATA — the single source of truth for the whole prototype.
//
// Every page imports from here instead of calling an API. Change a number, a
// label, a list here and it flows through the UI. This is the file to hand a
// developer alongside a redesigned page: "these are the shapes the real
// endpoints return".
// ─────────────────────────────────────────────────────────────────────────────

import {
  CATEGORIES,
  CATEGORY_BY_KEY,
  ROUTING_TAG,
  IVR_OUTCOME_BY_KEY,
  IVR_OPTION_BY_KEY,
  IVR_CALL_OUTCOMES,
  IVR_OPTIONS,
} from './lib.js';

/* ------------------------------------------------------------------ account */
export const CURRENT_USER = {
  id: 'usr_9f21',
  _id: 'usr_9f21',
  memberNo: 'Member #1042', // the friendly identifier shown in the UI
  name: 'Ananya Rao',
  email: 'ananya@sugamfinance.in',
  role: 'org_admin',
  createdAt: '2025-02-11T09:00:00Z',
};

export const HEALTH = { status: 'ok', uptime: 148920 };

/* ----------------------------------------------------------------- projects */
export const PROJECTS = [
  { _id: 'prj_main', name: 'Main collections book', remark: 'Production — unsecured personal loans', created_at: '2025-02-12T10:00:00Z' },
  { _id: 'prj_pilot', name: 'Q3 gold-loan pilot', remark: 'Ring-fenced pilot, do not mix with production', created_at: '2025-06-01T10:00:00Z' },
  { _id: 'prj_ncr', name: 'NCR two-wheeler book', remark: '', created_at: '2025-07-20T10:00:00Z' },
];
export const ACTIVE_PROJECT_ID = 'prj_main';

/* ------------------------------------------------------- portfolio / uploads */
export const UPLOADS = [
  { _id: 'up_5', fileName: 'collections_book_aug2026.xlsx', totalRecords: 8421, createdAt: '2026-09-05T06:30:00Z' },
  { _id: 'up_4', fileName: 'collections_book_jul2026.xlsx', totalRecords: 8102, createdAt: '2026-08-03T06:30:00Z' },
  { _id: 'up_3', fileName: 'collections_book_jun2026.xlsx', totalRecords: 7788, createdAt: '2026-07-02T06:30:00Z' },
  { _id: 'up_2', fileName: 'collections_book_may2026.xlsx', totalRecords: 7540, createdAt: '2026-06-04T06:30:00Z' },
  { _id: 'up_1', fileName: 'initial_import.xlsx', totalRecords: 6980, createdAt: '2026-05-06T06:30:00Z' },
];
export const LATEST_UPLOAD = UPLOADS[0];

// Per-category counts for the 2×2 grid + KPIs.
const CATEGORY_COUNTS = {
  oops: { count: 2680, outstanding: 41_20_00_00 },
  wilful_defaulter: { count: 1240, outstanding: 96_40_00_00 },
  cashflow_crunch: { count: 2960, outstanding: 58_70_00_00 },
  lost_cause: { count: 1420, outstanding: 74_10_00_00 },
};

export const BORROWER_COUNTS = {
  total: Object.values(CATEGORY_COUNTS).reduce((s, c) => s + c.count, 0),
  pending: 46, // scored but IVR-unreachable — held out of the grid
  categories: CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    count: CATEGORY_COUNTS[c.key].count,
    outstanding: CATEGORY_COUNTS[c.key].outstanding,
  })),
};

export const PORTFOLIO_STATES = ['Bihar', 'Uttar Pradesh', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Karnataka', 'West Bengal'];

export const PRODUCTS = ['Personal Loan', 'Two-wheeler Loan', 'Business Loan', 'Gold Loan', 'Consumer Durable'];

/* --------------------------------------------------------------- borrowers */
const FIRST = ['Ramesh', 'Sunita', 'Imran', 'Priya', 'Vikram', 'Lakshmi', 'Arjun', 'Fatima', 'Deepak', 'Kavita', 'Manoj', 'Rekha', 'Salim', 'Anita', 'Gopal', 'Nisha'];
const LAST = ['Kumar', 'Devi', 'Sheikh', 'Sharma', 'Singh', 'Patil', 'Reddy', 'Khan', 'Yadav', 'Nair', 'Gupta', 'Das', 'Verma', 'Joshi'];
const DISTRICTS = {
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi'],
  Maharashtra: ['Pune', 'Nashik', 'Nagpur'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Kota'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur'],
  Karnataka: ['Mysuru', 'Hubli', 'Belagavi'],
  'West Bengal': ['Howrah', 'Durgapur', 'Siliguri'],
};
const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const BANKS = ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda', 'Kotak', 'Canara Bank'];
const EMPLOYERS = ['Reliance Retail', 'Self-employed — kirana', 'Tata Motors', 'Local contractor', 'Amazon India', 'State transport dept', 'Zomato (gig)', 'Textile unit'];
const UPI_HANDLES = ['okhdfcbank', 'ybl', 'okaxis', 'paytm', 'oksbi'];

function seeded(i) {
  // deterministic pseudo-random so the list is stable across reloads
  let x = Math.sin(i * 99991) * 10000;
  return x - Math.floor(x);
}
function pick(arr, r) {
  return arr[Math.floor(r * arr.length) % arr.length];
}
function refId(i) {
  let s = '';
  for (let k = 0; k < 5; k++) s += REF_ALPHABET[Math.floor(seeded(i * 7 + k) * REF_ALPHABET.length)];
  return s;
}
const band = (s) => (s >= 50 ? 'High' : 'Low');

// IVR menu the borrower hears once they pick up. Weighted so "will pay" and
// "needs time" dominate, disputes and wrong-number are rare.
const IVR_CHOICE_KEYS = ['will_pay', 'need_time', 'already_paid', 'dispute', 'callback', 'wrong_number', 'no_input'];
const IVR_CHOICE_WEIGHTS = [30, 26, 12, 10, 12, 6, 4];
function ivrResult(rr, seedForChoice) {
  let outcome;
  if (rr > 0.42) outcome = 'answered';
  else if (rr > 0.22) outcome = 'no_answer';
  else if (rr > 0.1) outcome = 'busy';
  else outcome = 'invalid';
  let choice = null;
  if (outcome === 'answered') {
    let t = seeded(seedForChoice) * IVR_CHOICE_WEIGHTS.reduce((a, b) => a + b, 0);
    choice = IVR_CHOICE_KEYS[IVR_CHOICE_KEYS.length - 1];
    for (let k = 0; k < IVR_CHOICE_KEYS.length; k++) {
      if (t < IVR_CHOICE_WEIGHTS[k]) {
        choice = IVR_CHOICE_KEYS[k];
        break;
      }
      t -= IVR_CHOICE_WEIGHTS[k];
    }
  }
  return { outcome, choice };
}

function makeBorrower(i) {
  const r = (n) => seeded(i * 13 + n);
  const cat = CATEGORIES[Math.floor(r(1) * CATEGORIES.length)];
  const state = pick(PORTFOLIO_STATES, r(2));
  const district = pick(DISTRICTS[state], r(3));
  const abilityScore = { high: 72, low: 30 }[cat.ability] + Math.floor(r(4) * 16 - 8);
  const intentScore = { high: 74, low: 28 }[cat.intent] + Math.floor(r(5) * 16 - 8);
  const outstanding = Math.floor(20000 + r(6) * 480000);
  const principal = outstanding + Math.floor(r(13) * 260000);
  const odDays = r(21) > 0.82 ? 0 : Math.floor(15 + r(10) * 245);
  const disbMonth = 1 + Math.floor(r(22) * 22); // months before Sep 2026
  const disbDate = new Date(2026, 8, 12);
  disbDate.setMonth(disbDate.getMonth() - disbMonth);
  const hasPan = r(15) > 0.11;
  const bureauPulled = hasPan && r(16) > 0.44;
  const hasCoApplicant = r(18) > 0.38;
  const applChecked = r(11) > 0.12;
  const coChecked = hasCoApplicant && r(12) > 0.18;
  const applIvr = applChecked ? ivrResult(seeded(i * 17 + 5), i * 31 + 3) : { outcome: null, choice: null };
  const coIvr = coChecked ? ivrResult(seeded(i * 17 + 11), i * 31 + 7) : { outcome: null, choice: null };
  const mobile = '9' + String(600000000 + Math.floor(r(9) * 399999999));
  // enrichment outputs — populated only where a pull returned something
  const bankVerified = r(25) > (bureauPulled ? 0.28 : 0.55);
  const employerFound = r(27) > 0.42;
  const addressResolved = r(28) > 0.52;
  return {
    _id: 'brw_' + (1000 + i),
    refId: refId(i),
    loanId: 'LN-' + (480000 + i * 37),
    name: pick(FIRST, r(7)) + ' ' + pick(LAST, r(8)),
    mobile,
    bankAccount: bankVerified ? `${pick(BANKS, r(26))} ••${String(1000 + Math.floor(r(29) * 8999))}` : null,
    upiId: r(30) > 0.46 ? `${mobile}@${pick(UPI_HANDLES, r(31))}` : null,
    employer: employerFound ? pick(EMPLOYERS, r(32)) : null,
    resolvedAddress: addressResolved ? `${pick(DISTRICTS[state], r(33))} — verified addr.` : null,
    altMobile: r(19) > 0.72 ? '9' + String(700000000 + Math.floor(r(20) * 299999999)) : null,
    // skip-trace style enrichment: the API hands back a raw batch of candidate
    // numbers/addresses, not a single structured record.
    altNumbers: Array.from(
      { length: r(19) > 0.72 ? 1 + Math.floor(r(20) * 3) : 0 },
      (_, k) => '9' + String(700000000 + Math.floor(seeded(i * 13 + 40 + k) * 299999999))
    ),
    altAddresses: Array.from(
      { length: addressResolved ? 1 + Math.floor(r(34) * 2) : 0 },
      (_, k) => `${pick(DISTRICTS[state], seeded(i * 13 + 50 + k))} — verified addr.`
    ),
    odDays,
    abilityScore,
    abilityBand: band(abilityScore),
    intentScore,
    intentBand: band(intentScore),
    category: cat.key,
    routing: cat.routing,
    outstanding,
    principal,
    emiAmount: Math.floor(2500 + r(23) * 13500),
    product: pick(PRODUCTS, r(14)),
    disbursedOn: disbDate.toISOString().slice(0, 10),
    disbMonthsAgo: disbMonth,
    status: odDays === 0 ? 'Current' : odDays > 90 ? 'NPA' : 'Overdue',
    state,
    district,
    hasPan,
    hasCoApplicant,
    bureauPulled,
    bureauScore: bureauPulled ? Math.floor(610 + r(17) * 200) : null,
    bureauName: bureauPulled ? pick(['CRIF', 'CIBIL', 'Equifax'], r(24)) : null,
    ivrCheckedAt: applChecked ? '2026-09-05T08:00:00Z' : null,
    ivrCallOutcome: applIvr.outcome,
    ivrChoice: applIvr.choice,
    ivrReachable: applIvr.outcome === 'answered',
    coIvrCheckedAt: coChecked ? '2026-09-05T08:00:00Z' : null,
    coIvrCallOutcome: coIvr.outcome,
    coIvrChoice: coIvr.choice,
    coIvrReachable: coIvr.outcome === 'answered',
  };
}

export const BORROWERS = Array.from({ length: 220 }, (_, i) => makeBorrower(i + 1));

// A couple of hand-built, fully detailed borrower docs for the borrower page.
export const BORROWER_DETAIL = {
  // keyed by refId (upper-case)
};
function detailDoc(base, overrides) {
  const d = {
    ...base,
    dob: '1987-06-14',
    age: 39,
    gender: 'Male',
    record: {
      name: base.name,
      loanId: base.loanId,
      mobile: base.mobile,
      product: 'Personal Loan',
      source: 'Personal Loan',
      age: 39,
      gender: 'Male',
      dob: '14/06/1987',
      aadhaarStatus: 'Verified',
      applicantAadhaar: 'XXXX XXXX 4521',
      applicantPan: 'ABCPK1234F',
      coApplicantName: 'Sunita ' + base.name.split(' ')[1],
      coApplicantMobile: '9812345678',
      coApplicantPan: 'BCXPK5678L',
      spouseName: 'Sunita ' + base.name.split(' ')[1],
      fatherName: 'Mohan ' + base.name.split(' ')[1],
      nomineeName: 'Sunita ' + base.name.split(' ')[1],
      nomineeDob: '20/03/1990',
      nomineeAge: 36,
      nomineeRelation: 'Spouse',
      address: '14, Gandhi Nagar, Ward 6',
      villageName: 'Gandhi Nagar',
      district: base.district,
      state: base.state,
      ruralUrban: 'Urban',
      loanCreatedOn: '10/01/2024',
      lenderId: 'SUGAM-FIN',
      _disbDate: '15/01/2024',
      purpose: 'Household',
      subPurpose: 'Home renovation',
      _prinTotal: 300000,
      intRate: 22,
      processingFee: 4500,
      _tenure: 36,
      totalInterest: 118000,
      _totalInstal: 36,
      instalOs: 22,
      emiOd: 4,
      _emiPaid: 14,
      _lastEmi: 13139,
      firstDemandDate: '05/02/2024',
      lastMaturityDate: '05/01/2027',
      _od: base.odDays,
      _odBucket: base.odDays > 180 ? '180+' : base.odDays > 90 ? '90-180' : '31-90',
      _status: 'Overdue',
      principalArrear: 41200,
      interestArrear: 9800,
      _totalArrear: 51000,
      _prinColl: 96000,
      _intColl: 38000,
      outstanding: base.outstanding,
      outstandingInterest: 22400,
      _lastCollDate: '18/07/2026',
      lastCollAmount: 13139,
      nextDemandDate: '05/10/2026',
      _daysSince: 52,
      remark: 'Borrower says business is slow this quarter, will clear two EMIs after Diwali.',
      callRemarks: '05 Sep: Answered. Acknowledged dues. Promised ₹15,000 by 20 Sep.',
      abilityScore: base.abilityScore,
      abilityBand: base.abilityBand,
      intentScore: base.intentScore,
      intentBand: base.intentBand,
      routing: base.routing,
      cohort: base.category,
      _dataIssues: [],
      bureau: {
        scoreAtLoan: 712,
        latestScore: 688,
        activeLoans: 3,
        activeLoanAmount: 540000,
        accountsPayingOnTime: 2,
        accountsOverdue: 1,
        accountsWrittenOff: 0,
        loanInquiries365: 4,
      },
      abilityFactors: {
        overdue_severity: { normed: 42 },
        repayment_velocity: { normed: 61 },
        last_payment_recency: { normed: 55 },
        income_stability: { normed: 80 },
        bounce_pressure: { normed: 70 },
        emi_burden: { normed: 48 },
        balance_cover: { normed: 52 },
        exposure_ratio: { normed: 44 },
        employment_tenure: { normed: 66 },
      },
      intentFactors: {
        contactability: { normed: 90 },
        ptp_kept_rate: { normed: 58 },
        broken_ptp: { normed: 40 },
        message_read: { normed: 72 },
      },
      ots: {
        penalChargesDiscount: 1,
        interestDiscount: 0.5,
        principalDiscount: 0,
        principalPayable: 204000,
        interestPayable: 11200,
        totalPayable: 215200,
        readyToPay: 'Yes',
        promiseToPayDate: '20/09/2026',
      },
      emiScheme: {
        arrearsPctPayNow: 0.5,
        payNow: 25500,
        balanceAmount: 25500,
        moratorium: 'No',
        emis: 3,
        emiAmount: 8500,
        readyToPay: 'Maybe',
      },
    },
    otsOffer: {
      rule: { name: 'Half principal repaid — charges waived' },
      lines: [
        { head: 'principal', label: 'Principal outstanding', amount_known: true, gross: 204000, payable: 204000, waive_pct: 0 },
        { head: 'interest', label: 'Interest outstanding', amount_known: true, gross: 22400, payable: 11200, waive_pct: 50 },
        { head: 'bounce_charges', label: 'Bounce charges', amount_known: false, waive_pct: 100 },
        { head: 'penal', label: 'Penal interest', amount_known: false, waive_pct: 100 },
      ],
      total_payable: 215200,
      total_waived: 11200,
      gross_dues: 226400,
      exact: false,
      unpriced_heads: [{ label: 'Bounce charges' }, { label: 'Penal interest' }],
      matched_conditions: ['principal left ≤ 50%', '90+ days overdue'],
    },
    ...overrides,
  };
  BORROWER_DETAIL[base.refId.toUpperCase()] = d;
  return d;
}
detailDoc(BORROWERS[0]);
detailDoc(BORROWERS[1], { record: { ...detailDoc(BORROWERS[1]).record, _dataIssues: ['missing_pan', 'invalid_mobile'] } });
detailDoc(BORROWERS[2]);
// Fallback for any refId not hand-built: synthesise one on demand.
export function getBorrowerDoc(handle) {
  const key = String(handle || '').toUpperCase();
  if (BORROWER_DETAIL[key]) return BORROWER_DETAIL[key];
  const row = BORROWERS.find((b) => b.refId.toUpperCase() === key || b._id === handle);
  return row ? detailDoc(row) : null;
}

/* ----------------------------------------- per-borrower journey / provenance
 * Every pipeline pass (import → contactability → enrichment → segmentation →
 * workflows) just accretes more data onto the one borrower record. This turns a
 * borrower doc into (a) the set of data sources that have landed so far and
 * (b) a time-ordered feed of what each pass actually contributed.
 * ------------------------------------------------------------------------- */
const J_DATE = {
  import: '2026-08-12',
  ivr: '2026-09-05',
  enrich: '2026-09-06',
  score: '2026-09-07',
  workflow: '2026-09-07',
};

export function borrowerJourney(doc) {
  const d = doc || {};
  const rec = d.record || d;
  const catLabel = CATEGORY_BY_KEY[d.category]?.label || d.category || '—';
  const applOutcome = IVR_OUTCOME_BY_KEY[d.ivrCallOutcome]?.label;
  const applChoice = IVR_OPTION_BY_KEY[d.ivrChoice]?.label;
  const coOutcome = IVR_OUTCOME_BY_KEY[d.coIvrCallOutcome]?.label;
  const scored = d.abilityScore != null;

  // ---- event feed (the timeline) ----
  const first = (rec.name || d.name || '').split(' ')[0];
  const emi = rec._lastEmi || d.emiAmount || 0;
  const events = [];

  events.push({
    date: J_DATE.import,
    type: 'import',
    title: 'Loaded from portfolio',
    detail: `Loan ${d.loanId || rec.loanId || '—'} imported in the "Aug-2026 book" upload.`,
    tags: d.hasPan ? [] : [{ variant: 'amber', label: 'missing PAN' }],
  });

  if (d.ivrCheckedAt) {
    events.push({
      date: J_DATE.ivr,
      type: 'contactability',
      title: 'IVR contactability sweep',
      detail:
        `Applicant ${d.mobile || ''}: ${applOutcome || 'no result'}` +
        `${applChoice ? ` — pressed “${applChoice}”` : ''}.` +
        (d.hasCoApplicant ? ` Co-applicant: ${coOutcome || 'not dialled'}.` : ''),
      tags: [
        { variant: d.ivrReachable ? 'green' : 'red', label: d.ivrReachable ? 'reachable' : 'not reachable' },
        applChoice
          ? { variant: IVR_OPTION_BY_KEY[d.ivrChoice]?.variant || 'default', label: applChoice }
          : null,
      ].filter(Boolean),
    });
  }

  const enrichBits = [];
  if (d.bureauPulled) enrichBits.push(`${d.bureauName} bureau report pulled — score ${d.bureauScore}`);
  if (d.altMobile) enrichBits.push(`alternate mobile ${d.altMobile} found`);
  if (d.bankAccount) enrichBits.push(`bank account resolved (${d.bankAccount})`);
  if (d.upiId) enrichBits.push(`UPI ID ${d.upiId}`);
  if (d.employer) enrichBits.push(`employer: ${d.employer}`);
  if (d.resolvedAddress) enrichBits.push(`address verified`);
  if (enrichBits.length) {
    events.push({
      date: J_DATE.enrich,
      type: 'enrichment',
      title: 'Data enrichment',
      detail: enrichBits.join(' · ') + '.',
      tags: [
        d.bureauPulled ? { variant: 'blue', label: `${d.bureauName} ${d.bureauScore}` } : null,
        d.altMobile ? { variant: 'purple', label: '+1 number' } : null,
        d.bankAccount ? { variant: 'blue', label: 'bank a/c' } : null,
      ].filter(Boolean),
    });
  }

  if (scored) {
    events.push({
      date: J_DATE.score,
      type: 'segmentation',
      title: 'Scored & placed in a cohort',
      detail: `Ability ${d.abilityScore} (${d.abilityBand}) × Intent ${d.intentScore} (${d.intentBand}) → ${catLabel}. Routing: ${d.routing}.`,
      tags: [{ variant: ROUTING_TAG[d.routing] || 'purple', label: catLabel }],
    });
    events.push({
      date: J_DATE.workflow,
      type: 'workflow',
      title: `Entered “${catLabel} — standard cadence”`,
      detail: 'Reminder cadence and follow-up journey assigned for this cohort.',
      tags: [{ variant: 'green', label: 'workflow active' }],
    });
    events.push({
      date: '2026-09-08',
      type: 'message',
      title: 'WhatsApp — pre-due nudge',
      detail: `“Hi ${first}, your EMI of ₹${Number(emi).toLocaleString('en-IN')} for ${d.loanId} is due soon.”`,
      tags: [{ variant: 'green', label: 'delivered' }],
    });
    events.push({
      date: '2026-09-09',
      type: 'message',
      title: 'AI bot call — day-9 reminder',
      detail: d.ivrReachable ? 'Connected. Borrower acknowledged dues.' : 'No answer after 3 attempts.',
      tags: [{ variant: d.ivrReachable ? 'green' : 'red', label: d.ivrReachable ? 'connected' : 'failed' }],
    });
  }

  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { events };
}

/* ------------------------------------------------- import funnel breakdown */
function issueMix(i) {
  const r = seeded(i * 3);
  if (r > 0.85) return ['missing_pan'];
  if (r > 0.78) return ['invalid_mobile', 'missing_geography'];
  if (r > 0.72) return ['outstanding_exceeds_principal'];
  return [];
}
export const FUNNEL_RECORDS = BORROWERS.slice(0, 140).map((b, i) => ({
  loanId: b.loanId,
  name: b.name,
  mobile: b.mobile,
  district: b.district,
  state: b.state,
  _od: b.odDays,
  cohort: b.category,
  _dataIssues: issueMix(i),
}));
export const CULLED_RECORDS = Array.from({ length: 18 }, (_, i) => ({
  loanId: 'LN-' + (990000 + i),
  name: pick(FIRST, seeded(i)) + ' ' + pick(LAST, seeded(i + 1)),
  mobile: '9' + String(700000000 + i * 111111),
  district: 'Patna',
  state: 'Bihar',
  _od: 95 + i,
  cullReasons: 'First-installment defaulter — never paid, 90+ days overdue',
  _dataIssues: [],
}));
export const DORMANT_RECORDS = Array.from({ length: 9 }, (_, i) => ({
  loanId: 'LN-' + (880000 + i),
  name: pick(FIRST, seeded(i + 5)) + ' ' + pick(LAST, seeded(i + 6)),
  mobile: '',
  district: '',
  state: '',
  _od: null,
  dormantBucket: 'No contact in 180 days',
  _dataIssues: ['missing_mobile'],
}));
export const REJECTED_ROWS = Array.from({ length: 12 }, (_, i) => ({
  rowNum: 40 + i * 7,
  loanId: i % 3 ? 'LN-' + (770000 + i) : '',
  name: pick(FIRST, seeded(i + 2)) + ' ' + pick(LAST, seeded(i + 3)),
  mobile: i % 2 ? '' : '98123',
  pan: i % 4 ? 'ABCP' : '',
  coMobile: '',
  reasons: i % 2 ? ['missing_mobile'] : ['invalid_pan', 'missing_coapplicant'],
}));

export const BUREAUS = [
  { key: 'crif', label: 'CRIF', price: 55, available: true },
  { key: 'cibil', label: 'CIBIL', price: 60, available: true },
  { key: 'equifax', label: 'Equifax', price: 48, available: true },
  { key: 'experian', label: 'Experian', price: 52, available: false },
];

/* ------------------------------------------------------- data validation */
export const VALIDATION_RESULT = {
  fileName: 'new_applications_sep2026.xlsx',
  totalRecords: 1240,
  flaggedCount: 214,
  rejectedCount: 18,
  summary: [
    { code: 'invalid_mobile', label: 'Invalid mobile', count: 64 },
    { code: 'missing_income', label: 'Income blank', count: 51 },
    { code: 'duplicate_mobile', label: 'Duplicate mobile (in file)', count: 39 },
    { code: 'income_outlier', label: 'Income outlier (>10× median)', count: 22 },
    { code: 'missing_bureau_score', label: 'Bureau score blank', count: 20 },
    { code: 'duplicate_loan_id', label: 'Duplicate loan ID (in file)', count: 18 },
  ],
  rejected: REJECTED_ROWS.map((r) => ({ ...r, loanId: r.loanId || '' })),
  all: Array.from({ length: 120 }, (_, i) => {
    const r = seeded(i);
    const issues = r > 0.82 ? ['invalid_mobile'] : r > 0.7 ? ['missing_income', 'zero_income'] : r > 0.6 ? ['duplicate_mobile'] : [];
    return {
      name: pick(FIRST, seeded(i + 1)) + ' ' + pick(LAST, seeded(i + 2)),
      mobile: '9' + String(600000000 + i * 3333333),
      loanId: 'APP-' + (10000 + i),
      _issues: issues,
    };
  }),
};

/* -------------------------------------------------------------- templates */
export const TEMPLATES = [
  { _id: 't1', template_id: 'WA_01_EMI', template_message: 'Hi $name, your EMI of $amount for loan $loan_id is due on $emi_date. Pay now: $link', channel: 'WA', category: 'communication', language: 'en', is_active: true, updatedAt: '2026-08-20T10:00:00Z' },
  { _id: 't2', template_id: 'SMS_01_EMI', template_message: 'Dear $name, EMI $amount due $emi_date. Pay: $link -Sugam', channel: 'SMS', category: 'communication', language: 'en', is_active: true, updatedAt: '2026-08-20T10:00:00Z' },
  { _id: 't3', template_id: 'WA_02_OVERDUE', template_message: 'Hi $name, loan $loan_id is overdue. Outstanding $amount. Settle today: $link', channel: 'WA', category: 'communication', language: 'en', is_active: true, updatedAt: '2026-08-22T10:00:00Z' },
  { _id: 't4', template_id: 'CALL_01_REMINDER', template_message: 'Namaste $name. Aapka EMI $amount $emi_date ko due hai.', channel: 'AI Bot call', category: 'communication', language: 'hi', is_active: true, updatedAt: '2026-08-18T10:00:00Z' },
  { _id: 't5', template_id: 'SMS_OTP', template_message: '$otp is your Saralya verification code. Valid for $expiry minutes.', channel: 'SMS', category: 'auth', language: 'en', is_active: true, updatedAt: '2026-07-01T10:00:00Z' },
  { _id: 't6', template_id: 'WA_03_SETTLEMENT', template_message: 'Hi $name, a one-time settlement is available on loan $loan_id. View: $link', channel: 'WA', category: 'communication', language: 'en', is_active: false, updatedAt: '2026-06-10T10:00:00Z' },
];

/* -------------------------------------------------------------- workflows */
export const WF_CATEGORIES = CATEGORIES.map((c) => ({ key: c.key, label: c.label }));

export const JOURNEYS = [
  {
    _id: 'jny_1',
    name: '7-day link chase',
    remark: 'Chase borrowers who got the verification link but never opened it',
    send_window_start: '09:00',
    send_window_end: '20:00',
    version: 3,
    is_active: true,
    steps: [
      { _id: 's1', state: 'link_clicked', kind: 'event', templates: [{ _id: 't3', template_id: 'WA_02_OVERDUE', channel: 'WA' }], outcome: '' },
      { _id: 's2', state: 'link_not_clicked', kind: 'timer', wait_minutes: 1440, repeat: 5, templates: [{ _id: 't2', template_id: 'SMS_01_EMI', channel: 'SMS' }], outcome: '' },
      { _id: 's3', state: 'otp_verified', kind: 'event', terminal: true, templates: [], outcome: 'Verified — collect ASAP' },
      { _id: 's4', state: 'gave_up', kind: 'timer', wait_minutes: 2880, repeat: 1, templates: [], outcome: 'Unreachable — needs call' },
    ],
  },
  {
    _id: 'jny_2',
    name: 'Rejected details — dispute triage',
    remark: 'Borrower said their loan details are wrong',
    send_window_start: '10:00',
    send_window_end: '19:00',
    version: 1,
    is_active: true,
    steps: [
      { _id: 's1', state: 'details_rejected', kind: 'event', terminal: true, templates: [], outcome: 'Dispute — ops review' },
    ],
  },
  {
    _id: 'jny_3',
    name: 'Settlement follow-up',
    remark: '',
    send_window_start: '',
    send_window_end: '',
    version: 2,
    is_active: false,
    steps: [
      { _id: 's1', state: 'scheme_viewed', kind: 'event', templates: [{ _id: 't3', template_id: 'WA_02_OVERDUE', channel: 'WA' }], outcome: '' },
      { _id: 's2', state: 'scheme_not_viewed', kind: 'timer', wait_minutes: 4320, repeat: 2, templates: [{ _id: 't2', template_id: 'SMS_01_EMI', channel: 'SMS' }], outcome: 'No response to scheme' },
    ],
  },
];

export const JOURNEY_STATES = [
  { state: 'link_clicked', label: 'opened the link', kind: 'event' },
  { state: 'link_not_clicked', label: 'did NOT open the link', kind: 'timer' },
  { state: 'otp_verified', label: 'verified their OTP', kind: 'event', terminal: true },
  { state: 'details_rejected', label: 'said the details are wrong', kind: 'event', terminal: true },
  { state: 'scheme_viewed', label: 'viewed the settlement scheme', kind: 'event' },
  { state: 'scheme_not_viewed', label: 'did NOT view the scheme', kind: 'timer' },
  { state: 'gave_up', label: 'never responded (final)', kind: 'timer', terminal: true },
];

function wfRules(anchorPrefix) {
  return [
    { _id: anchorPrefix + 'r1', name: 'Pre-due nudge', trigger_offset: -3, run_time: '10:00', templates: [{ _id: 't1', template_id: 'WA_01_EMI', channel: 'WA' }], remark: 'Gentle reminder before the due date', is_active: true },
    { _id: anchorPrefix + 'r2', name: 'Due-day reminder', trigger_offset: 0, run_time: '', templates: [{ _id: 't1', template_id: 'WA_01_EMI', channel: 'WA' }, { _id: 't2', template_id: 'SMS_01_EMI', channel: 'SMS' }], remark: '', is_active: true },
    { _id: anchorPrefix + 'r3', name: 'Day-3 overdue + journey', trigger_offset: 3, run_time: '11:00', templates: [{ _id: 't3', template_id: 'WA_02_OVERDUE', channel: 'WA' }], remark: 'Hands over to the 7-day chase', is_active: true, journey: 'jny_1' },
    { _id: anchorPrefix + 'r4', name: 'Day-8 call', trigger_offset: 8, run_time: '', templates: [{ _id: 't4', template_id: 'CALL_01_REMINDER', channel: 'AI Bot call' }], remark: '', is_active: false },
  ];
}

export const WORKFLOWS = [
  { _id: 'wf_1', name: 'IGL Loans', category: 'oops', reference_day: 5, run_time: '10:00', remark: '', is_active: true, rules: wfRules('a') },
];

export const SUBWORKFLOWS = {
  wf_1: [],
};

export const WF_FILTER_OPTIONS = {
  age_bands: [
    { key: 'UNDER_25', label: 'Under 25' },
    { key: '25_TO_35', label: '25 to 35' },
    { key: '35_TO_50', label: '35 to 50' },
    { key: 'OVER_50', label: 'Over 50' },
    { key: 'Unknown', label: 'Unknown' },
  ],
  states: PORTFOLIO_STATES,
  priority: { MIN: 1, MAX: 5 },
};

export const WF_RUNS = {
  cycles_available: ['2026-09', '2026-08', '2026-07'],
  cycle: '2026-09',
  borrowers_owned_by_journeys: 210,
  runs: [
    { rule_id: 'ar1', rule_name: 'Pre-due nudge', trigger_offset: -3, cycle_month: '2026-09', borrowers: 1840, sent: 1802, failed: 38, messages: 1840, rule_exists: true, has_journey: false, journey: { outcomes: [] }, first_at: '2026-09-02T10:00:00Z', cron_runs: 1 },
    { rule_id: 'ar2', rule_name: 'Due-day reminder', trigger_offset: 0, cycle_month: '2026-09', borrowers: 1840, sent: 3560, failed: 120, messages: 3680, rule_exists: true, has_journey: false, journey: { outcomes: [] }, first_at: '2026-09-05T10:00:00Z', cron_runs: 1 },
    { rule_id: 'ar3', rule_name: 'Day-3 overdue + journey', trigger_offset: 3, cycle_month: '2026-09', borrowers: 640, sent: 620, failed: 20, messages: 640, rule_exists: true, has_journey: true, journey: { enrolled: 620, messages_sent: 480, in_flight: 210, outcomes: [{ outcome: 'Verified — collect ASAP', borrowers: 180 }, { outcome: 'Unreachable — needs call', borrowers: 90 }] }, first_at: '2026-09-08T11:00:00Z', cron_runs: 3 },
  ],
  silent_rules: [
    { rule_id: 'ar4', rule_name: 'Day-8 call', trigger_offset: 8, reason: 'inactive' },
  ],
};

export const WF_ANALYTICS = {
  cycles: [
    { cycle: '2026-07', borrowers: 1720, sent: 4820, failed: 96, engaged: 540 },
    { cycle: '2026-08', borrowers: 1780, sent: 5090, failed: 110, engaged: 610 },
    { cycle: '2026-09', borrowers: 1840, sent: 5210, failed: 178, engaged: 690 },
  ],
  channelSplit: [
    { channel: 'WA', sent: 3100 },
    { channel: 'SMS', sent: 1900 },
    { channel: 'AI Bot call', sent: 210 },
  ],
  topOutcomes: [
    { outcome: 'Verified — collect ASAP', borrowers: 180 },
    { outcome: 'Dispute — ops review', borrowers: 140 },
    { outcome: 'Unreachable — needs call', borrowers: 90 },
  ],
};

export const WF_SIMULATE = {
  cycle: { month: '2026-09' },
  matchedBorrowers: 1840,
  activeRules: 3,
  totalMessages: 5210,
  workflowBorrowers: 1200,
  subWorkflows: [
    { _id: 'sw_1', name: 'Young borrowers — softer tone', priority: 5, filters: { age_bands: ['UNDER_25', '25_TO_35'], states: [] }, matchedBorrowers: 420 },
    { _id: 'sw_2', name: 'Bihar + UP — vernacular', priority: 3, filters: { age_bands: [], states: ['Bihar', 'Uttar Pradesh'] }, matchedBorrowers: 220 },
  ],
  messages: BORROWERS.slice(0, 18).map((b, i) => ({
    borrower: { _id: b._id, name: b.name, mobile: b.mobile },
    source: i % 3 === 0 ? 'subworkflow' : 'workflow',
    subWorkflow: i % 3 === 0 ? { priority: 5, name: 'Young borrowers — softer tone' } : null,
    suppressedSubWorkflows: [],
    channel: i % 2 ? 'WA' : 'SMS',
    rule: { _id: 'ar1', name: i % 2 ? 'Due-day reminder' : 'Pre-due nudge' },
    scheduledAt: '2026-09-05T10:00:00',
    run_time: '10:00',
    renderedMessage: `Hi ${b.name.split(' ')[0]}, your EMI of ₹13,139 for loan ${b.loanId} is due on 05 Sep 2026. Pay now: https://pay.saralya.in/r/${b.refId}`,
  })),
};

/* --------------------------------------------------------- journey reports */
export const JOURNEY_REPORT = {
  totals: { enrolled: 620, in_flight: 210, closed: 410 },
  steps: [
    { state: 'link_clicked', label: 'opened the link', kind: 'event', borrowers: 340, still_here: 0, messages_sent: 340, messages_failed: 4 },
    { state: 'link_not_clicked', label: 'did NOT open the link', kind: 'timer', borrowers: 280, still_here: 120, messages_sent: 900, messages_failed: 30, next_due: '2026-09-12T10:00:00Z' },
    { state: 'otp_verified', label: 'verified their OTP', kind: 'event', borrowers: 180, still_here: 0, messages_sent: 0, messages_failed: 0 },
    { state: 'gave_up', label: 'never responded (final)', kind: 'timer', borrowers: 90, still_here: 0, messages_sent: 0, messages_failed: 0 },
  ],
  outcomes: [
    { outcome: 'Verified — collect ASAP', closed_at_state: 'otp_verified', borrowers: 180 },
    { outcome: 'Unreachable — needs call', closed_at_state: 'gave_up', borrowers: 90 },
    { outcome: 'Dispute — ops review', closed_at_state: 'details_rejected', borrowers: 140 },
  ],
};

export const JOURNEY_USAGE = [
  { owner: 'Procrastinator — standard cadence', rule: 'Day-3 overdue + journey' },
];

export const DISPOSITION_REPORT = {
  totals: { enrolled: 1240, closed: 820, in_flight: 420 },
  total: 820,
  filters: { outcome_options: ['Verified — collect ASAP', 'Unreachable — needs call', 'Dispute — ops review', 'No response to scheme'] },
  outcomes: JOURNEY_REPORT.outcomes,
  rows: BORROWERS.slice(0, 40).map((b, i) => ({
    _id: 'run_' + i,
    loanId: b.loanId,
    refId: b.refId,
    mobile: b.mobile,
    outcome: ['Verified — collect ASAP', 'Unreachable — needs call', 'Dispute — ops review'][i % 3],
    closed_at_state: ['otp_verified', 'gave_up', 'details_rejected'][i % 3],
    journey: { name: i % 2 ? '7-day link chase' : 'Rejected details — dispute triage' },
    workflow: { name: 'Procrastinator — standard cadence' },
    cycle_month: '2026-09',
    days_in_journey: 2 + (i % 6),
    sent_count: 1 + (i % 4),
    failed_count: i % 5 === 0 ? 1 : 0,
    closed_at: '2026-09-1' + (i % 9) + 'T12:00:00Z',
  })),
};

/* --------------------------------------------------------- link analytics */
export const LINK_SUMMARY = {
  totals: {
    linksSentBorrowers: 3200,
    linksSentTotal: 5400,
    openRate: 58,
    totalClicks: 4100,
    uniqueVisits: 2600,
    uniqueBorrowers: 1860,
    totalBorrowers: 8421,
    accepted: 720,
    rejected: 190,
    awaitingResponse: 950,
  },
  funnel: [
    { stage: 'link_sent', label: 'Link sent', reachedBorrowers: 3200, events: 5400, currentBorrowers: 320, conversionFromSent: 100, conversionFromClick: null },
    { stage: 'link_clicked', label: 'Link opened', reachedBorrowers: 1860, events: 4100, currentBorrowers: 210, conversionFromSent: 58, conversionFromClick: 100 },
    { stage: 'otp_verified', label: 'OTP verified', reachedBorrowers: 1320, events: 1500, currentBorrowers: 180, conversionFromSent: 41, conversionFromClick: 71 },
    { stage: 'loan_details_page', label: 'Viewed loan details', reachedBorrowers: 1210, events: 1240, currentBorrowers: 260, conversionFromSent: 38, conversionFromClick: 65 },
    { stage: 'accepted', label: 'Confirmed correct', reachedBorrowers: 720, events: 720, currentBorrowers: 720, conversionFromSent: 22, conversionFromClick: 39 },
    { stage: 'rejected', label: 'Disputed details', reachedBorrowers: 190, events: 190, currentBorrowers: 190, conversionFromSent: 6, conversionFromClick: 10 },
  ],
  devices: [
    { type: 'mobile', events: 3600 },
    { type: 'desktop', events: 380 },
    { type: 'tablet', events: 120 },
  ],
  locations: [
    { city: 'Patna', country: 'India', events: 640 },
    { city: 'Lucknow', country: 'India', events: 520 },
    { city: 'Pune', country: 'India', events: 410 },
    { city: 'Jaipur', country: 'India', events: 300 },
    { city: 'Indore', country: 'India', events: 240 },
  ],
  daily: Array.from({ length: 21 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    clicks: Math.round(80 + 120 * Math.abs(Math.sin(i / 3))),
    borrowers: Math.round(50 + 70 * Math.abs(Math.sin(i / 3))),
  })),
};

export const LINK_BORROWERS = BORROWERS.slice(0, 40).map((b, i) => ({
  _id: b._id,
  refId: b.refId,
  name: b.name,
  loanId: b.loanId,
  stage: ['link_sent', 'link_clicked', 'otp_verified', 'loan_details_page', 'accepted', 'rejected'][i % 6],
  stageLabel: ['Link sent', 'Link opened', 'OTP verified', 'Viewed loan details', 'Confirmed correct', 'Disputed details'][i % 6],
  linkSentCount: 1 + (i % 4),
  lastLinkSentAt: '2026-09-04T10:00:00Z',
  clicks: i % 6 === 0 ? 0 : 1 + (i % 5),
  outstanding: b.outstanding,
  lastSeenAt: '2026-09-0' + (1 + (i % 8)) + 'T14:30:00Z',
  lastKnownLocation: i % 4 === 0 ? { status: 'granted', latitude: 25.5941 + i / 100, longitude: 85.1376 + i / 100, accuracy: 40 } : i % 4 === 1 ? { status: 'denied' } : { status: 'unavailable' },
  remarks: i % 6 === 5 ? 'Amount shown is wrong, I paid on 12 Aug' : '',
  link: `https://pay.saralya.in/br=1&ref=${b.refId}`,
}));

export const LINK_TIMELINE = {
  borrower: { name: BORROWERS[0].name, refId: BORROWERS[0].refId, linkSentCount: 3 },
  events: [
    { _id: 'e1', stage: 'link_sent', stageLabel: 'Link sent', timestamp: '2026-09-01T10:00:00Z', ip: '49.36.x.x', device: { type: 'mobile', os: 'Android', browser: 'Chrome' }, location: { city: 'Patna', country: 'India' } },
    { _id: 'e2', stage: 'link_clicked', stageLabel: 'Link opened', timestamp: '2026-09-01T18:22:00Z', ip: '49.36.x.x', device: { type: 'mobile', os: 'Android', browser: 'Chrome' }, deviceLocation: { status: 'granted', latitude: 25.5941, longitude: 85.1376, accuracy: 35 } },
    { _id: 'e3', stage: 'otp_verified', stageLabel: 'OTP verified', timestamp: '2026-09-01T18:24:00Z', ip: '49.36.x.x', device: { type: 'mobile', os: 'Android', browser: 'Chrome' } },
    { _id: 'e4', stage: 'loan_details_page', stageLabel: 'Viewed loan details', timestamp: '2026-09-01T18:25:00Z', ip: '49.36.x.x', device: { type: 'mobile', os: 'Android', browser: 'Chrome' } },
    { _id: 'e5', stage: 'rejected', stageLabel: 'Disputed details', timestamp: '2026-09-01T18:29:00Z', remarks: 'I already paid this EMI on 28 Aug', ip: '49.36.x.x', device: { type: 'mobile', os: 'Android', browser: 'Chrome' } },
  ],
};

/* ------------------------------------------------------------ whatsapp */
export const WA_CONFIG_STATUS = { configured: true, mode: 'direct', displayName: 'Sugam Finance', defaultTemplate: 'sugam_collection_reminder' };

export const WA_COLLECTION_TEMPLATES = [
  {
    templateKey: 'sugam_collection_reminder', label: 'Collection Reminder (English IN)', metaTemplateName: 'sugam_collection_reminder',
    language: 'en_IN', category: 'UTILITY', isActive: true, metaStatus: 'APPROVED',
    previewTemplate: 'Dear {{1}}, your EMI of ₹{{2}} for loan {{3}} is due. Pay now: {{4}}',
    variableCount: 4,
    variables: { 1: 'Customer', 2: '5,000', 3: 'LN-000000', 4: 'https://pay.saralya.in' },
    variableDescriptions: { 1: 'Customer name', 2: 'EMI amount', 3: 'Loan ID', 4: 'Payment link' },
    variableColumnMapping: { 1: 'name', 2: 'amount', 3: 'loan_id', 4: 'link' },
    sampleXlsxColumns: ['mobile', 'name', 'amount', 'loan_id', 'link'],
    headerType: 'none', buttons: [{ type: 'url', text: 'Pay now', url: 'https://pay.saralya.in' }],
    updatedAt: '2026-08-28T10:00:00Z',
  },
  {
    templateKey: 'saralya_collection_hindi', label: 'Collection Reminder (Hindi)', metaTemplateName: 'saralya_collection_hindi',
    language: 'hi', category: 'MARKETING', isActive: true, metaStatus: 'APPROVED',
    previewTemplate: 'नमस्ते {{1}}, आपका बकाया ₹{{2}} है। भुगतान करें: {{3}}',
    variableCount: 3,
    variables: { 1: 'ग्राहक', 2: '5,000', 3: 'https://pay.saralya.in' },
    variableDescriptions: { 1: 'ग्राहक का नाम', 2: 'राशि', 3: 'लिंक' },
    variableColumnMapping: { 1: 'name', 2: 'amount', 3: 'link' },
    sampleXlsxColumns: ['mobile', 'name', 'amount', 'link'],
    headerType: 'none', buttons: [],
    updatedAt: '2026-08-20T10:00:00Z',
  },
  {
    templateKey: 'settlement_offer_en', label: 'Settlement Offer (English)', metaTemplateName: 'settlement_offer_en',
    language: 'en', category: 'MARKETING', isActive: false, metaStatus: 'PENDING',
    submittedAt: '2026-09-09T08:30:00Z',
    previewTemplate: 'Hi {{1}}, a one-time settlement is available on your loan. View: {{2}}',
    variableCount: 2, variables: { 1: 'Customer', 2: 'https://pay.saralya.in' },
    variableDescriptions: { 1: 'Name', 2: 'Link' }, variableColumnMapping: { 1: 'name', 2: 'link' },
    sampleXlsxColumns: ['mobile', 'name', 'link'], headerType: 'none', buttons: [],
    updatedAt: '2026-09-09T08:30:00Z',
  },
  {
    templateKey: 'final_notice_en', label: 'Final Notice (English)', metaTemplateName: 'final_notice_en',
    language: 'en', category: 'UTILITY', isActive: false, metaStatus: 'REJECTED',
    submittedAt: '2026-09-07T12:00:00Z',
    rejectionReason: 'Content violates WhatsApp Business Policy — threatening / coercive language ("legal action will be taken"). Rephrase as a factual reminder.',
    previewTemplate: 'FINAL NOTICE {{1}}: pay ₹{{2}} immediately or legal action will be taken on loan {{3}}.',
    variableCount: 3, variables: { 1: 'Customer', 2: '5,000', 3: 'LN-000000' },
    variableDescriptions: { 1: 'Name', 2: 'Amount', 3: 'Loan ID' }, variableColumnMapping: { 1: 'name', 2: 'amount', 3: 'loan_id' },
    sampleXlsxColumns: ['mobile', 'name', 'amount', 'loan_id'], headerType: 'none', buttons: [],
    updatedAt: '2026-09-07T12:00:00Z',
  },
];

export const WA_META_TEMPLATES = [
  { name: 'sugam_collection_reminder', language: 'en_IN', status: 'APPROVED' },
  { name: 'saralya_collection_hindi', language: 'hi', status: 'APPROVED' },
  { name: 'settlement_offer_en', language: 'en', status: 'PENDING' },
  { name: 'payment_confirmation', language: 'en_IN', status: 'APPROVED' },
];

export const WA_HISTORY = Array.from({ length: 14 }, (_, i) => ({
  _id: 'wab_' + i,
  fileName: i % 2 ? `reminders_batch_${i}.xlsx` : `overdue_${i}.csv`,
  messageText: i % 2 ? 'sugam_collection_reminder · 4 vars' : 'saralya_collection_hindi · 3 vars',
  totalNumbers: 200 + i * 40,
  sent: 190 + i * 38,
  failed: 10 + (i % 4),
  batchStatus: i === 0 ? 'sending' : 'completed',
  createdAt: `2026-09-0${1 + (i % 8)}T11:0${i % 6}:00Z`,
}));

export const WA_BATCH_DETAIL = {
  ...WA_HISTORY[1],
  durationMs: 42000,
  results: BORROWERS.slice(0, 40).map((b, i) => ({
    mobile: b.mobile,
    success: i % 7 !== 0,
    messageId: i % 7 !== 0 ? 'wamid.' + b.refId : '',
    metaCode: i % 7 === 0 ? '131026' : '',
    error: i % 7 === 0 ? 'Recipient unreachable or blocked' : '',
    errorHint: i % 7 === 0 ? 'Number not on WhatsApp / blocked business' : '',
  })),
};

/* ------------------------------------------------------- organization */
export const ORGANIZATION = {
  _id: 'org_sugam',
  name: 'Sugam Finance Pvt Ltd',
  website: 'https://sugamfinance.in',
  address_line1: '4th Floor, Fortune Tower, Exhibition Road',
  city: 'Patna',
  state: 'Bihar',
  postal_code: '800001',
  is_active: true,
  logo: null,
  sms: { principal_entity_id: '1201178293431218138', sender_id: 'SUGAMF', access_key_set: true },
  whatsapp: { phone_number_id: '1301529993035011', access_token_set: true, api_version: 'v21.0', default_language: 'en_IN', display_name: 'Sugam Finance' },
  documents: {
    pan_card: { path: 'docs/pan.pdf', original_name: 'sugam_pan.pdf' },
    gst_certificate: null,
    udyam_certificate: { path: 'docs/udyam.pdf', original_name: 'udyam.pdf' },
  },
  links: [
    { label: 'Main', url: 'https://pay.saralya.in', is_default: true },
    { label: 'Legacy', url: 'https://collect.sugamfinance.in', is_default: false },
  ],
};

/* --------------------------------------------------------- pricing & billing */
//
// Saralya sets a platform DEFAULT_PRICING sheet from the staff console. Each
// tenant can carry a `pricing` override map; the effective price a tenant pays
// is `override[key] ?? DEFAULT_PRICING[key]`. The org admin sees this sheet and
// their per-project billing computed from usage × effective price.
export const SERVICE_CATALOG = [
  { key: 'crif', label: 'CRIF credit report', group: 'Enrichment', unit: 'per report' },
  { key: 'cibil', label: 'CIBIL credit report', group: 'Enrichment', unit: 'per report' },
  { key: 'equifax', label: 'Equifax credit report', group: 'Enrichment', unit: 'per report' },
  { key: 'experian', label: 'Experian credit report', group: 'Enrichment', unit: 'per report' },
  { key: 'upi', label: 'UPI ID lookup', group: 'Enrichment', unit: 'per lookup' },
  { key: 'mobile2bank', label: 'Mobile → bank account', group: 'Enrichment', unit: 'per lookup' },
  { key: 'altcontact', label: 'Alternate mobile & address', group: 'Enrichment', unit: 'per lookup' },
  { key: 'ivr', label: 'IVR call', group: 'Outreach', unit: 'per connected call' },
  { key: 'sms', label: 'SMS', group: 'Outreach', unit: 'per SMS' },
  { key: 'whatsapp', label: 'WhatsApp message', group: 'Outreach', unit: 'per message' },
];

export const DEFAULT_PRICING = {
  crif: 55, cibil: 60, equifax: 48, experian: 52,
  upi: 3, mobile2bank: 4, altcontact: 6,
  ivr: 1.2, sms: 0.18, whatsapp: 0.85,
};

export const effectivePrice = (overrides, key) =>
  overrides && overrides[key] != null ? overrides[key] : DEFAULT_PRICING[key];

export const BILLING_MONTH = '2026-09';
export const PROJECT_BILLING = [
  { project_id: 'prj_main', usage: { crif: 1840, cibil: 620, equifax: 0, experian: 0, upi: 900, altcontact: 320, ivr: 3100, sms: 24500, whatsapp: 8200 } },
  { project_id: 'prj_pilot', usage: { crif: 210, cibil: 90, equifax: 40, experian: 0, upi: 120, altcontact: 30, ivr: 380, sms: 2600, whatsapp: 900 } },
  { project_id: 'prj_ncr', usage: { crif: 640, cibil: 0, equifax: 220, experian: 0, upi: 300, altcontact: 110, ivr: 1200, sms: 7400, whatsapp: 3100 } },
];

export const TEAM = [
  { id: 'usr_9f21', name: 'Ananya Rao', email: 'ananya@sugamfinance.in', role: 'org_admin', isActive: true },
  { id: 'usr_a1', name: 'Rohit Menon', email: 'rohit@sugamfinance.in', role: 'org_user', isActive: true },
  { id: 'usr_a2', name: 'Priya Nair', email: 'priya@sugamfinance.in', role: 'org_user', isActive: true },
  { id: 'usr_a4', name: 'Deepa Shetty', email: 'deepa@sugamfinance.in', role: 'org_manager', isActive: true },
  { id: 'usr_a3', name: 'Karan Bose', email: 'karan@sugamfinance.in', role: 'org_user', isActive: false },
];

/* --------------------------------------------------------- staff console */
//
// `onboarding` tracks what happens between "tenant created" and "admin is in".
// The staff console never sets a password by hand any more — the server
// generates a one-time temporary password, emails it to the first admin, and
// forces a change on that admin's first login.
//
//   invite_email_status : queued → sent → delivered   (or failed on a bounce)
//   first_login_at      : null until the admin signs in once
//   password_status     : temporary → changed  (after the forced first-login change)
//
// `temp_password` is only carried while password_status === 'temporary' — it is
// the break-glass value staff can reveal when the invite email never arrives.
// Once the admin has changed it, it is gone and onboarding is complete.
export const ALL_ORGANIZATIONS = [
  {
    _id: 'org_sugam', name: 'Sugam Finance Pvt Ltd', is_active: true, created_at: '2025-02-11T09:00:00Z',
    admin: { name: 'Ananya Rao', email: 'ananya@sugamfinance.in', isActive: true },
    sms: { principal_entity_id: '1201178293431218138', sender_id: 'SUGAMF' },
    pricing: { cibil: 52, sms: 0.15, whatsapp: 0.72 }, // negotiated volume rates
    onboarding: {
      invite_email_status: 'delivered', invite_email_to: 'ananya@sugamfinance.in',
      invite_sent_at: '2025-02-11T09:01:00Z', invite_error: null, invite_attempts: 1,
      first_login_at: '2025-02-11T15:22:00Z', password_status: 'changed', temp_password: null,
    },
  },
  {
    _id: 'org_arth', name: 'Arth Credit', is_active: true, created_at: '2025-05-20T09:00:00Z',
    admin: { name: 'Vivek Sharma', email: 'vivek@arthcredit.in', isActive: true },
    sms: { principal_entity_id: '', sender_id: 'ARTHCR' },
    pricing: { crif: 50 },
    onboarding: {
      invite_email_status: 'delivered', invite_email_to: 'vivek@arthcredit.in',
      invite_sent_at: '2025-05-20T09:02:00Z', invite_error: null, invite_attempts: 1,
      first_login_at: null, password_status: 'temporary', temp_password: 'Kf7p-Qm29-wLzR',
    },
  },
  {
    _id: 'org_nidhi', name: 'Nidhi Microfinance', is_active: false, created_at: '2025-08-02T09:00:00Z',
    admin: { name: 'Sneha Gupta', email: 'sneha@nidhimfi.in', isActive: true },
    sms: { principal_entity_id: '', sender_id: '' },
    onboarding: {
      invite_email_status: 'failed', invite_email_to: 'sneha@nidhimfi.in',
      invite_sent_at: '2025-08-02T09:03:00Z', invite_error: 'Mailbox does not exist (SMTP 550)', invite_attempts: 2,
      first_login_at: null, password_status: 'temporary', temp_password: 'Rb3w-Xt58-mHqP',
    },
  },
  {
    _id: 'org_veda', name: 'Veda Housing Finance', is_active: true, created_at: '2026-08-28T09:00:00Z',
    admin: { name: 'Meera Iyer', email: 'meera@vedahfc.in', isActive: true },
    sms: { principal_entity_id: '', sender_id: '' },
    onboarding: {
      invite_email_status: 'sent', invite_email_to: 'meera@vedahfc.in',
      invite_sent_at: '2026-09-07T11:40:00Z', invite_error: null, invite_attempts: 1,
      first_login_at: null, password_status: 'temporary', temp_password: 'Zn4t-Hp72-vKmQ',
    },
  },
  { _id: 'org_test', name: 'Test Tenant', is_active: true, created_at: '2026-01-15T09:00:00Z', admin: null, sms: {}, onboarding: null },
];

// The server's one-time password generator, mirrored so the prototype can show
// a realistic value. Grouped for readability when read aloud over the phone.
export function genPassword() {
  const UP = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const LO = 'abcdefghijkmnpqrstuvwxyz';
  const NU = '23456789';
  const all = UP + LO + NU;
  const at = (s) => s[Math.floor(Math.random() * s.length)];
  let chars = [at(UP), at(LO), at(NU)];
  while (chars.length < 12) chars.push(at(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('').match(/.{1,4}/g).join('-');
}

/* --------------------------------------------------------- borrower portal */
export const PORTAL_INTRO = {
  sessionId: 'sess_demo',
  borrower: { name: 'Ramesh Kumar', maskedMobile: '98•••••210' },
  otp: { length: 6, ttlMinutes: 10 },
  response: null,
};
export const PORTAL_LOAN = {
  name: 'Ramesh Kumar',
  loanId: 'LN-480037',
  outstanding: 226400,
  emiAmount: 13139,
  totalArrear: 51000,
  odDays: 120,
  emiPaidCount: 14,
  totalInstalments: 36,
  lastPaymentDate: '2026-07-18',
  disbursementDate: '2024-01-15',
};
export const PORTAL_SCHEME = {
  note: 'We value your past payments. Here is a one-time settlement to close this loan.',
  total_payable: 215200,
  total_waived: 11200,
  gross_dues: 226400,
  exact: false,
  remaining_charges: ['Bounce charges', 'Penal interest'],
  lines: [
    { label: 'Principal outstanding', amount_known: true, gross: 204000, payable: 204000, waive_pct: 0 },
    { label: 'Interest outstanding', amount_known: true, gross: 22400, payable: 11200, waive_pct: 50 },
    { label: 'Bounce charges', amount_known: false, waive_pct: 100 },
    { label: 'Penal interest', amount_known: false, waive_pct: 100 },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * WhatsApp / Meta — Saralya as a Meta Tech Provider (Solution Partner).
 * Each tenant connects its WABA via Embedded Signup; we mint a System User
 * access token scoped to that WABA and never touch the client's personal token.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const WA_TIERS = [
  { key: 'TIER_250', label: '250 / 24h', limit: 250 },
  { key: 'TIER_1K', label: '1K / 24h', limit: 1000 },
  { key: 'TIER_10K', label: '10K / 24h', limit: 10000 },
  { key: 'TIER_100K', label: '100K / 24h', limit: 100000 },
  { key: 'TIER_UNLIMITED', label: 'Unlimited', limit: Infinity },
];
export const WA_TIER_BY_KEY = Object.fromEntries(WA_TIERS.map((t) => [t.key, t]));

// unverified | pending | verified   ·   quality: green | yellow | red
export const WABA_ACCOUNTS = [
  {
    id: 'waba_sugam',
    org_id: 'org_sugam',
    business_id: '10152•••88431',
    waba_id: '1094•••7762',
    connected_via: 'embedded_signup',
    connected_at: '2025-02-13T10:00:00Z',
    business_verification: 'verified',
    tier: 'TIER_100K',
    quality: 'green',
    token: {
      type: 'system_user',
      ref: 'vault://wa/org_sugam/su-token',
      scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      expires_at: '2026-11-24T00:00:00Z',
      last_rotated_at: '2026-09-25T02:00:00Z',
    },
    profile: { verified_name: 'Sugam Finance', category: 'Finance', about: 'Loan servicing & collections', logo: true, review: 'approved', rejection: null },
    numbers: [
      { id: 'pn_sugam_1', phone_number_id: '10571•••2201', display: '+91 80 4718 2200', verified_name: 'Sugam Finance', name_status: 'approved', reg_status: 'registered', quality: 'green', tier: 'TIER_100K', used_24h: 41280, queue: 120, rate: 78 },
      { id: 'pn_sugam_2', phone_number_id: '10571•••9846', display: '+91 80 4718 2255', verified_name: 'Sugam Collections', name_status: 'pending', reg_status: 'registered', quality: 'yellow', tier: 'TIER_1K', used_24h: 610, queue: 40, rate: 12 },
    ],
  },
  {
    id: 'waba_arth',
    org_id: 'org_arth',
    business_id: '10159•••20114',
    waba_id: '1348•••0021',
    connected_via: 'connect_existing',
    connected_at: '2025-06-01T09:00:00Z',
    business_verification: 'pending',
    tier: 'TIER_1K',
    quality: 'yellow',
    token: {
      type: 'system_user',
      ref: 'vault://wa/org_arth/su-token',
      scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      expires_at: '2026-09-19T00:00:00Z',
      last_rotated_at: '2026-07-21T02:00:00Z',
    },
    profile: { verified_name: 'Arth Credit', category: 'Finance', about: 'Customer support & reminders', logo: true, review: 'pending', rejection: null },
    numbers: [
      { id: 'pn_arth_1', phone_number_id: '11024•••5507', display: '+91 79 6620 1180', verified_name: 'Arth Credit', name_status: 'approved', reg_status: 'registered', quality: 'green', tier: 'TIER_1K', used_24h: 740, queue: 0, rate: 5 },
    ],
  },
  {
    id: 'waba_veda',
    org_id: 'org_veda',
    business_id: '10162•••41909',
    waba_id: '1401•••5530',
    connected_via: 'embedded_signup',
    connected_at: '2026-09-06T09:00:00Z',
    business_verification: 'unverified',
    tier: 'TIER_250',
    quality: 'green',
    token: {
      type: 'system_user',
      ref: 'vault://wa/org_veda/su-token',
      scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      expires_at: '2027-03-05T00:00:00Z',
      last_rotated_at: '2026-09-06T09:05:00Z',
    },
    profile: { verified_name: 'Veda Housing Finance', category: 'Finance', about: '', logo: false, review: 'rejected', rejection: 'Display name does not match the verified business name on the Meta Business Account.' },
    numbers: [
      { id: 'pn_veda_1', phone_number_id: '12880•••3341', display: '+91 22 6140 7788', verified_name: 'Veda HFC', name_status: 'rejected', reg_status: 'pending', quality: 'green', tier: 'TIER_250', used_24h: 12, queue: 0, rate: 0 },
    ],
  },
];

// tenants that have not connected a WABA yet — candidates for the onboarding wizard
export const WA_UNCONNECTED_ORG_IDS = ['org_nidhi', 'org_test'];

export const WA_TEMPLATE_STATUS_BY_WABA = {
  waba_sugam: { approved: 9, pending: 1, rejected: 0 },
  waba_arth: { approved: 4, pending: 2, rejected: 1 },
  waba_veda: { approved: 0, pending: 3, rejected: 0 },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE BUILDER — the 7 event/action steps from the decision-tree spec,
 * composable in any order. A "segment" step is not an action against the
 * borrower — it's a manual, condition-based split, evaluated against
 * whatever fields the earlier steps in THIS pipeline have produced so far
 * (which is why the field picker in the builder is order-dependent).
 * ═══════════════════════════════════════════════════════════════════════════ */

const RECEIVED_FIELD = { key: 'received', label: 'Delivery', type: 'enum', options: [
  { key: 'received', label: 'Received', variant: 'green' },
  { key: 'not_received', label: 'Not received', variant: 'amber' },
] };
const CLICKED_FIELD = { key: 'linkClicked', label: 'Link clicked', type: 'enum', options: [
  { key: 'clicked', label: 'Clicked', variant: 'green' },
  { key: 'not_clicked', label: 'Not clicked', variant: 'amber' },
] };
const VERIFIED_FIELD = { key: 'phoneVerified', label: 'Phone verified', type: 'enum', options: [
  { key: 'verified', label: 'Verified', variant: 'green' },
  { key: 'not_verified', label: 'Not verified', variant: 'amber' },
] };
const RESOLUTION_FIELD = { key: 'resolution', label: 'Resolution', type: 'enum', options: [
  { key: 'accept', label: 'Accept', variant: 'green' },
  { key: 'dispute', label: 'Dispute', variant: 'red' },
  { key: 'do_nothing', label: 'Do nothing', variant: 'amber' },
] };

export const PIPELINE_ACTIONS = [
  {
    key: 'skiptrace', label: 'Skip Trace', icon: '🔍', kind: 'enrichment', parties: false,
    desc: 'Alternate mobile number & address for a borrower.',
    fields: [
      { key: 'altMobile', label: 'Alternate mobile', type: 'text' },
      { key: 'resolvedAddress', label: 'Alternate address', type: 'text' },
    ],
  },
  {
    key: 'mobile2upi', label: 'Mobile → UPI', icon: '📱', kind: 'enrichment', parties: ['applicant', 'co_applicant', 'nominee'],
    desc: "Resolve a UPI ID linked to the borrower's mobile.",
    fields: [{ key: 'upiId', label: 'UPI ID', type: 'text' }],
  },
  {
    key: 'mobile2bank', label: 'Mobile → Bank Account', icon: '🏦', kind: 'enrichment', parties: ['applicant', 'co_applicant', 'nominee'],
    desc: "Resolve the bank account linked to the borrower's mobile.",
    fields: [{ key: 'bankAccount', label: 'Bank account', type: 'text' }],
  },
  {
    key: 'bureau', label: 'Bureau Pull', icon: '📊', kind: 'enrichment', parties: ['applicant', 'co_applicant'],
    desc: 'Soft-pull a credit bureau report.',
    fields: [
      { key: 'bureauScore', label: 'Bureau score', type: 'number' },
      { key: 'bureauActiveLines', label: 'Active credit lines', type: 'number' },
      { key: 'bureauOverdueLines', label: 'Overdue credit lines', type: 'number' },
      { key: 'bureauName', label: 'Bureau used', type: 'text' },
    ],
  },
  {
    key: 'ivr', label: 'Automated Call', icon: '☎', kind: 'contactability', parties: true,
    desc: 'Dial an IVR script; capture pickup + keypad choice.',
    fields: [
      { key: 'ivrCallOutcome', label: 'Call outcome', type: 'enum', options: IVR_CALL_OUTCOMES },
      { key: 'ivrChoice', label: 'Keypad choice', type: 'enum', options: IVR_OPTIONS },
    ],
  },
  {
    key: 'sms', label: 'SMS', icon: '✉', kind: 'contactability', parties: false,
    desc: 'Send a payment link by SMS; track delivery, clicks, verification.',
    fields: [RECEIVED_FIELD, CLICKED_FIELD, VERIFIED_FIELD, RESOLUTION_FIELD],
  },
  {
    key: 'whatsapp', label: 'WhatsApp', icon: '📤', kind: 'contactability', parties: false,
    desc: 'Send a payment link over WhatsApp; track delivery, clicks, verification.',
    fields: [RECEIVED_FIELD, CLICKED_FIELD, VERIFIED_FIELD, RESOLUTION_FIELD],
  },
];
export const PIPELINE_ACTION_BY_KEY = Object.fromEntries(PIPELINE_ACTIONS.map((a) => [a.key, a]));

export const SEGMENT_OPERATORS = [
  { key: 'eq', label: '=' },
  { key: 'neq', label: '≠' },
  { key: 'gt', label: '>' },
  { key: 'gte', label: '≥' },
  { key: 'lt', label: '<' },
  { key: 'lte', label: '≤' },
];

// Which days of the week, and at what time, a Retry step (fed from an SMS
// step's "Message not delivered" or "Link not clicked" branch) re-attempts —
// plus how long (in days) to keep doing so.
export const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

// A couple of pre-built pipelines so the canvas isn't empty on first load.
// Shape matches React Flow: `nodes` (id, type: 'action'|'segment', position,
// data) + `edges` (source → target). The linear run order is derived by
// walking the graph (see `linearize()` in PipelinesPage.jsx) — the graph is
// the source of truth, not array order, so dragging a node / rewiring an
// edge genuinely changes execution order.
export const PIPELINES = [
  {
    id: 'pl_1',
    name: 'Bureau-first collection sweep',
    createdAt: '2026-09-09T10:00:00Z',
    nodes: [
      { id: 'src', type: 'source', position: { x: -300, y: 140 }, data: { dataSource: 'portfolio' }, deletable: false },
      { id: 'n1', type: 'action', position: { x: 40, y: 140 }, data: { action: 'bureau', parties: { applicant: true, co_applicant: false } } },
      {
        id: 'n2', type: 'segment', position: { x: 380, y: 140 },
        data: {
          segments: [
            { id: 'sg1', name: 'High exposure', conditions: [{ field: 'bureauActiveLines', op: 'gt', value: '3' }] },
            { id: 'sg2', name: 'Good standing', conditions: [{ field: 'bureauScore', op: 'gte', value: '650' }] },
          ],
        },
      },
      { id: 'n3', type: 'action', position: { x: 720, y: 140 }, data: { action: 'ivr', parties: { applicant: true, co_applicant: false } } },
    ],
    edges: [
      { id: 'e0', source: 'src', target: 'n1' },
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  {
    id: 'pl_2',
    name: 'Contact-first, enrich the unreachable',
    createdAt: '2026-09-11T10:00:00Z',
    nodes: [
      { id: 'src', type: 'source', position: { x: -300, y: 140 }, data: { dataSource: 'portfolio' }, deletable: false },
      { id: 'n1', type: 'action', position: { x: 40, y: 140 }, data: { action: 'ivr', parties: { applicant: true, co_applicant: false } } },
      { id: 'n2', type: 'segment', position: { x: 380, y: 140 }, data: { segments: [{ id: 'sg1', name: 'Unreachable', conditions: [{ field: 'ivrCallOutcome', op: 'eq', value: 'no_answer' }] }] } },
      { id: 'n3', type: 'action', position: { x: 720, y: 140 }, data: { action: 'skiptrace' } },
      { id: 'n4', type: 'action', position: { x: 1060, y: 140 }, data: { action: 'mobile2bank' } },
    ],
    edges: [
      { id: 'e0', source: 'src', target: 'n1' },
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ],
  },
];
