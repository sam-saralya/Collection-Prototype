import React, { useMemo, useState } from 'react';
import { useStaff } from './store.jsx';
import { Card, Button, SectionTitle, Field, Input, Select, Textarea, Tag, Empty, cx } from '../../ui.jsx';
import { fmtDate } from '../../lib.js';
import {
  ALL_ORGANIZATIONS,
  WABA_ACCOUNTS,
  WA_UNCONNECTED_ORG_IDS,
  WA_TIERS,
  WA_TIER_BY_KEY,
  WA_TEMPLATE_STATUS_BY_WABA,
} from '../../data.js';

const TABS = [
  ['onboarding', 'Client onboarding'],
  ['accounts', 'WABA accounts'],
  ['sending', 'Sending & limits'],
];

const TODAY = new Date('2026-09-10');
const orgName = (id) => ALL_ORGANIZATIONS.find((o) => o._id === id)?.name || id;
const daysUntil = (iso) => Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86400000);

const VERIF = {
  verified: { label: 'Business verified', variant: 'green' },
  pending: { label: 'Verification pending', variant: 'amber' },
  unverified: { label: 'Unverified', variant: 'red' },
};
const REVIEW = {
  approved: { label: 'Approved', variant: 'green' },
  pending: { label: 'In review', variant: 'amber' },
  rejected: { label: 'Rejected', variant: 'red' },
};
const NAME_STATUS = {
  approved: { label: 'Name approved', variant: 'green' },
  pending: { label: 'Name in review', variant: 'amber' },
  rejected: { label: 'Name rejected', variant: 'red' },
};
const QUALITY = {
  green: { label: 'High', variant: 'green' },
  yellow: { label: 'Medium', variant: 'amber' },
  red: { label: 'Low', variant: 'red' },
};

function Mono({ children }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{children}</code>;
}
function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-dashed border-line py-1.5 last:border-0">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className="text-right text-[12px] font-semibold text-ink">{children}</span>
    </div>
  );
}

/* ═══════════════════════════════════ 1 · ONBOARDING WIZARD ══════════════════ */

const STEPS = ['Embedded Signup', 'Phone number', 'Business verification', 'Display name & profile'];

function OnboardingWizard({ onConnected }) {
  const { showToast } = useStaff();
  const candidates = WA_UNCONNECTED_ORG_IDS;
  const [orgId, setOrgId] = useState(candidates[0] || '');
  const [step, setStep] = useState(0);

  // step 1 — embedded signup
  const [mode, setMode] = useState('create'); // create | connect
  const [oauth, setOauth] = useState(null); // { business_id, waba_id, phone_number_id }

  // step 2 — phone number
  const [numMode, setNumMode] = useState('new'); // new | migrate
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [numberDone, setNumberDone] = useState(false);

  // step 4 — profile
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('Finance');
  const [pDesc, setPDesc] = useState('');
  const [pLogo, setPLogo] = useState(false);
  const [pSubmitted, setPSubmitted] = useState(false);

  function runEmbeddedSignup() {
    showToast('Meta Embedded Signup — simulating Facebook Login for Business…', 'default');
    setTimeout(() => {
      setOauth({
        business_id: '10164•••' + Math.floor(10000 + Math.random() * 89999),
        waba_id: '14' + Math.floor(10 + Math.random() * 89) + '•••' + Math.floor(1000 + Math.random() * 8999),
        phone_number_id: '128' + Math.floor(10 + Math.random() * 89) + '•••' + Math.floor(1000 + Math.random() * 8999),
      });
      showToast('OAuth exchange complete — System User token minted & vaulted', 'success');
    }, 700);
  }

  function finish() {
    onConnected({
      id: 'waba_' + Date.now(),
      org_id: orgId,
      business_id: oauth.business_id,
      waba_id: oauth.waba_id,
      connected_via: mode === 'create' ? 'embedded_signup' : 'connect_existing',
      connected_at: new Date().toISOString(),
      business_verification: 'pending',
      tier: 'TIER_250',
      quality: 'green',
      token: {
        type: 'system_user',
        ref: `vault://wa/${orgId}/su-token`,
        scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
        expires_at: '2027-03-10T00:00:00Z',
        last_rotated_at: new Date().toISOString(),
      },
      profile: { verified_name: pName, category: pCat, about: pDesc, logo: pLogo, review: 'pending', rejection: null },
      numbers: [
        {
          id: 'pn_' + Date.now(),
          phone_number_id: oauth.phone_number_id,
          display: phone || '+91 •• •••• ••••',
          verified_name: pName,
          name_status: 'pending',
          reg_status: 'registered',
          quality: 'green',
          tier: 'TIER_250',
          used_24h: 0,
          queue: 0,
          rate: 0,
        },
      ],
    });
    showToast(`${orgName(orgId)} connected — WABA now under management`, 'success');
    setStep(0);
    setOauth(null);
    setNumberDone(false);
    setPSubmitted(false);
  }

  if (candidates.length === 0) {
    return <Empty>Every tenant already has a WABA connected. New tenants appear here after onboarding.</Empty>;
  }

  return (
    <div className="grid grid-cols-[240px_1fr] gap-5 max-[900px]:grid-cols-1">
      {/* rail */}
      <div>
        <Field label="Onboard WhatsApp for">
          <Select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="text-xs">
            {candidates.map((id) => (
              <option key={id} value={id}>
                {orgName(id)}
              </option>
            ))}
          </Select>
        </Field>
        <ol className="mt-4 space-y-1">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                onClick={() => setStep(i)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12px] transition',
                  i === step ? 'bg-brand/10 font-bold text-ink' : 'text-muted hover:bg-slate-50'
                )}
              >
                <span
                  className={cx(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black',
                    i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* step body */}
      <Card pad>
        {step === 0 && (
          <div>
            <SectionTitle title="Embedded Signup" note="Facebook Login for Business" />
            <p className="mt-1 text-[12px] text-muted">
              The client completes Meta's popup in their own Facebook session. We receive the granted assets and exchange
              the code for a token — scoped to this WABA only.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              {[
                ['create', 'Create new', 'New Meta Business Account + WhatsApp Business Account.'],
                ['connect', 'Connect existing', 'Client already owns an MBA / WABA and grants us access.'],
              ].map(([k, t, d]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={cx(
                    'rounded-xl2 border p-3 text-left transition',
                    mode === k ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-line hover:border-brand/40'
                  )}
                >
                  <b className="text-[12px]">{t}</b>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{d}</p>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Button variant="primary" onClick={runEmbeddedSignup}>
                {oauth ? '↻ Re-run Embedded Signup' : 'Launch Meta Embedded Signup'}
              </Button>
            </div>

            {oauth && (
              <div className="mt-4 rounded-[10px] border border-emerald-200 bg-emerald-50/60 p-3">
                <b className="text-[12px] text-emerald-800">Captured from the OAuth exchange</b>
                <div className="mt-1.5">
                  <Row label="business_id">
                    <Mono>{oauth.business_id}</Mono>
                  </Row>
                  <Row label="waba_id">
                    <Mono>{oauth.waba_id}</Mono>
                  </Row>
                  <Row label="phone_number_id">
                    <Mono>{oauth.phone_number_id}</Mono>
                  </Row>
                  <Row label="Access token">
                    <Tag variant="green">System User · vaulted</Tag>
                  </Row>
                </div>
                <p className="mt-2 text-[10.5px] text-muted">
                  The client's personal user token is discarded — we store only the long-lived System User token created
                  under Saralya's Tech Provider Business Manager.
                </p>
              </div>
            )}

            <StepNav onNext={() => setStep(1)} nextDisabled={!oauth} />
          </div>
        )}

        {step === 1 && (
          <div>
            <SectionTitle title="Phone number registration" />
            <div className="mt-2 flex gap-2">
              {[
                ['new', 'Register a new number'],
                ['migrate', 'Migrate an existing number'],
              ].map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => {
                    setNumMode(k);
                    setOtpSent(false);
                    setNumberDone(false);
                  }}
                  className={cx(
                    'rounded-lg border px-3 py-1.5 text-[12px] font-semibold',
                    numMode === k ? 'border-brand bg-brand/10' : 'border-line text-muted'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {numMode === 'migrate' && (
              <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
                If the number is already registered on another WABA (BSP or direct), Meta requires a migration request +
                a fresh OTP. The old WABA loses the number when migration completes.
              </div>
            )}

            <div className="mt-3 max-w-sm">
              <Field label="Phone number (E.164)">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 80 4718 2200" />
              </Field>
              {!otpSent ? (
                <Button
                  className="mt-2"
                  disabled={!phone.trim()}
                  onClick={() => {
                    setOtpSent(true);
                    showToast(`OTP sent to ${phone} via ${numMode === 'migrate' ? 'SMS (migration)' : 'SMS'}`, 'success');
                  }}
                >
                  {numMode === 'migrate' ? 'Request migration + send OTP' : 'Send verification OTP'}
                </Button>
              ) : (
                <div className="mt-2">
                  <Field label="6-digit OTP">
                    <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
                  </Field>
                  <Button
                    variant="primary"
                    className="mt-2"
                    disabled={otp.length !== 6}
                    onClick={() => {
                      setNumberDone(true);
                      showToast('Number verified & registered to the WABA', 'success');
                    }}
                  >
                    Verify & register
                  </Button>
                </div>
              )}
              {numberDone && (
                <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700">
                  <span>✓</span> {phone} registered
                </div>
              )}
            </div>

            <StepNav onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!numberDone} />
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionTitle title="Business verification" note="Meta Business Manager" />
            <p className="mt-1 text-[12px] text-muted">
              Messaging limits and the ability to raise them depend on Meta verifying the client's legal business.
              We can't complete this for them — we track it and surface the next step.
            </p>
            <div className="mt-3">
              <Tag variant="amber">Verification pending</Tag>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11.5px] text-slate-600">
              {[
                'Client uploads business documents in Meta Business Settings → Security Center',
                'Meta reviews (typically 2–10 business days)',
                'On approval, the WABA moves to a higher messaging tier automatically',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-slate-300">•</span>
                  {t}
                </li>
              ))}
            </ul>
            <Button className="mt-3" onClick={() => showToast('Opened Meta Security Center in a new tab (stub)', 'default')}>
              Open Meta verification →
            </Button>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionTitle title="Display name & business profile" note="submitted to Meta for review" />
            <div className="mt-3 grid max-w-lg gap-3">
              <Field label="Display name" hint="Must match the verified business name or Meta rejects it.">
                <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Sugam Finance" />
              </Field>
              <Field label="Category">
                <Select value={pCat} onChange={(e) => setPCat(e.target.value)}>
                  {['Finance', 'Banking', 'Non-profit', 'Professional Services', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Description">
                <Textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Loan servicing & collections support" />
              </Field>
              <label className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" className="accent-brand" checked={pLogo} onChange={(e) => setPLogo(e.target.checked)} />
                Logo uploaded (640×640 PNG)
              </label>
            </div>

            {!pSubmitted ? (
              <Button
                variant="primary"
                className="mt-3"
                disabled={!pName.trim()}
                onClick={() => {
                  setPSubmitted(true);
                  showToast('Profile submitted to Meta — review usually within 24h', 'success');
                }}
              >
                Submit for Meta review
              </Button>
            ) : (
              <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px]">
                <Tag variant="amber">Profile in review</Tag>
                <span className="ml-2 text-muted">Rejection reasons, if any, will show on the WABA accounts tab.</span>
              </div>
            )}

            <div className="mt-5 flex justify-between border-t border-line pt-4">
              <Button onClick={() => setStep(2)}>← Back</Button>
              <Button variant="primary" disabled={!oauth || !numberDone || !pSubmitted} onClick={finish}>
                Finish — put WABA under management
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StepNav({ onBack, onNext, nextDisabled }) {
  return (
    <div className="mt-5 flex justify-between border-t border-line pt-4">
      {onBack ? <Button onClick={onBack}>← Back</Button> : <span />}
      {onNext && (
        <Button variant="primary" disabled={nextDisabled} onClick={onNext}>
          Continue →
        </Button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════ 2 · WABA ACCOUNTS ═════════════════════ */

function WabaCard({ waba, onRotate }) {
  const v = VERIF[waba.business_verification];
  const rev = REVIEW[waba.profile.review];
  const exp = daysUntil(waba.token.expires_at);
  const tokenSoon = exp <= 14;

  return (
    <Card pad>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <b className="text-[14px]">{orgName(waba.org_id)}</b>
            <Tag variant={v.variant}>{v.label}</Tag>
            <Tag variant={QUALITY[waba.quality].variant}>Quality: {QUALITY[waba.quality].label}</Tag>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Connected {fmtDate(waba.connected_at)} · {waba.connected_via === 'embedded_signup' ? 'Embedded Signup' : 'Connected existing'}
          </div>
        </div>
        <Tag variant="blue">{WA_TIER_BY_KEY[waba.tier]?.label}</Tag>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-8 max-[640px]:grid-cols-1">
        <div>
          <Row label="business_id"><Mono>{waba.business_id}</Mono></Row>
          <Row label="waba_id"><Mono>{waba.waba_id}</Mono></Row>
          <Row label="Profile review">
            <span className="flex items-center gap-1.5">
              <Tag variant={rev.variant}>{rev.label}</Tag>
            </span>
          </Row>
          {waba.profile.rejection && (
            <div className="mt-1.5 rounded-[8px] bg-red-50 px-2.5 py-1.5 text-[10.5px] text-red-700">
              Rejected: {waba.profile.rejection}
            </div>
          )}
        </div>
        <div>
          <Row label="Access token"><Tag variant="green">System User</Tag></Row>
          <Row label="Vault ref"><Mono>{waba.token.ref}</Mono></Row>
          <Row label="Expires">
            <span className={tokenSoon ? 'text-red-600' : ''}>
              {fmtDate(waba.token.expires_at)} · {exp}d
            </span>
          </Row>
          <Row label="Last rotated">{fmtDate(waba.token.last_rotated_at)}</Row>
          <div className="mt-1.5">
            <Button size="xs" variant={tokenSoon ? 'primary' : 'default'} onClick={() => onRotate(waba.id)}>
              ↻ Rotate token now
            </Button>
            {tokenSoon && <span className="ml-2 text-[10.5px] text-red-600">rotate before expiry — auto-rotation job runs at T-14d</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-muted">
              <th className="py-1.5 font-semibold">Number</th>
              <th className="py-1.5 font-semibold">phone_number_id</th>
              <th className="py-1.5 font-semibold">Verified name</th>
              <th className="py-1.5 font-semibold">Registration</th>
              <th className="py-1.5 font-semibold">Tier</th>
              <th className="py-1.5 font-semibold">Quality</th>
            </tr>
          </thead>
          <tbody>
            {waba.numbers.map((n) => (
              <tr key={n.id} className="border-b border-[#edf1f5] last:border-0">
                <td className="py-2 font-semibold">{n.display}</td>
                <td className="py-2"><Mono>{n.phone_number_id}</Mono></td>
                <td className="py-2">
                  {n.verified_name} <Tag variant={NAME_STATUS[n.name_status].variant}>{NAME_STATUS[n.name_status].label}</Tag>
                </td>
                <td className="py-2">
                  <Tag variant={n.reg_status === 'registered' ? 'green' : 'amber'}>{n.reg_status}</Tag>
                </td>
                <td className="py-2">{WA_TIER_BY_KEY[n.tier]?.label}</td>
                <td className="py-2"><Tag variant={QUALITY[n.quality].variant}>{QUALITY[n.quality].label}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════ 3 · SENDING & LIMITS ══════════════════ */

function Meter({ used, limit }) {
  const pct = limit === Infinity ? 4 : Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <i className={cx('block h-full rounded-full', tone)} style={{ width: pct + '%' }} />
    </div>
  );
}

function SendingTab({ wabas }) {
  const rows = wabas.flatMap((w) => w.numbers.map((n) => ({ ...n, org: orgName(w.org_id), wabaId: w.id })));
  return (
    <div className="space-y-4">
      <Card pad>
        <SectionTitle title="Per-number send limits & queue" note="Meta enforces the 24h messaging limit per number" />
        <div className="mt-2 space-y-3">
          {rows.map((n) => {
            const limit = WA_TIER_BY_KEY[n.tier]?.limit ?? 0;
            return (
              <div key={n.id} className="rounded-[10px] border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b className="text-[12px]">{n.display}</b>{' '}
                    <span className="text-[11px] text-muted">· {n.org}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag variant="blue">{WA_TIER_BY_KEY[n.tier]?.label}</Tag>
                    <Tag variant={QUALITY[n.quality].variant}>Q: {QUALITY[n.quality].label}</Tag>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
                  <Meter used={n.used_24h} limit={limit} />
                  <span className="text-[11px] text-muted">
                    {n.used_24h.toLocaleString('en-IN')} / {limit === Infinity ? '∞' : limit.toLocaleString('en-IN')} in 24h
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted">
                  <span>Queue depth: <b className="text-ink">{n.queue}</b></span>
                  <span>Send rate: <b className="text-ink">{n.rate}/s</b></span>
                  <span>Throttle: <b className="text-ink">{n.rate === 0 ? '—' : 'auto (quality-guarded)'}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card pad>
        <SectionTitle title="Broadcast throttling" />
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Bulk sends are metered into the per-number rate so a large campaign never spikes past the tier limit or trips
          the quality rating. If quality drops to <b>Medium</b>, the scheduler halves the rate; at <b>Low</b> it pauses
          non-transactional templates until quality recovers.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[12px] max-[600px]:grid-cols-1">
          {[
            ['Queued jobs', wabas.reduce((s, w) => s + w.numbers.reduce((a, n) => a + n.queue, 0), 0)],
            ['Active numbers', wabas.reduce((s, w) => s + w.numbers.length, 0)],
            ['Numbers at ≥90% limit', wabas.reduce((s, w) => s + w.numbers.filter((n) => (WA_TIER_BY_KEY[n.tier]?.limit ?? 1) !== Infinity && n.used_24h / (WA_TIER_BY_KEY[n.tier]?.limit ?? 1) >= 0.9).length, 0)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-[10px] border border-line p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{l}</div>
              <div className="mt-1 text-[20px] font-black">{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card pad>
        <SectionTitle title="Template approval" note="submitted to Meta per WABA" />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-muted">
                <th className="py-1.5 font-semibold">Tenant</th>
                <th className="py-1.5 font-semibold">Approved</th>
                <th className="py-1.5 font-semibold">Pending</th>
                <th className="py-1.5 font-semibold">Rejected</th>
              </tr>
            </thead>
            <tbody>
              {wabas.map((w) => {
                const s = WA_TEMPLATE_STATUS_BY_WABA[w.id] || { approved: 0, pending: 0, rejected: 0 };
                return (
                  <tr key={w.id} className="border-b border-[#edf1f5] last:border-0">
                    <td className="py-2 font-semibold">{orgName(w.org_id)}</td>
                    <td className="py-2"><Tag variant="green">{s.approved}</Tag></td>
                    <td className="py-2"><Tag variant={s.pending ? 'amber' : 'default'}>{s.pending}</Tag></td>
                    <td className="py-2"><Tag variant={s.rejected ? 'red' : 'default'}>{s.rejected}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Tenants compose and submit their own templates on their <b>WhatsApp Templates</b> screen — Saralya forwards each
          submission to Meta via the API using that WABA's System User token. This is the read-only roll-up.
        </p>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════ PAGE ═════════════════════════════════ */

export default function WhatsAppMetaPage() {
  const { showToast } = useStaff();
  const [tab, setTab] = useState('onboarding');
  const [wabas, setWabas] = useState(WABA_ACCOUNTS);

  const summary = useMemo(
    () => ({
      connected: wabas.length,
      verifyPending: wabas.filter((w) => w.business_verification !== 'verified').length,
      tokenSoon: wabas.filter((w) => daysUntil(w.token.expires_at) <= 14).length,
      reviewOpen: wabas.filter((w) => w.profile.review !== 'approved').length,
    }),
    [wabas]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
              tab === k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
            )}
          >
            {l}
          </button>
        ))}
        <div className="ml-auto flex gap-1.5 text-[11px]">
          <Tag variant="blue">{summary.connected} WABAs</Tag>
          {summary.verifyPending > 0 && <Tag variant="amber">{summary.verifyPending} verify pending</Tag>}
          {summary.tokenSoon > 0 && <Tag variant="red">{summary.tokenSoon} token expiring</Tag>}
          {summary.reviewOpen > 0 && <Tag variant="amber">{summary.reviewOpen} profile in review</Tag>}
        </div>
      </div>

      {tab === 'onboarding' && (
        <OnboardingWizard
          onConnected={(w) => {
            setWabas((list) => [w, ...list]);
            setTab('accounts');
          }}
        />
      )}

      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[11.5px] text-blue-800">
            Tenant isolation: every send / read is keyed by <Mono>phone_number_id</Mono> → tenant. A token is scoped to
            one WABA and can never address another tenant's numbers.
          </div>
          {wabas.map((w) => (
            <WabaCard
              key={w.id}
              waba={w}
              onRotate={(id) => {
                setWabas((list) =>
                  list.map((x) =>
                    x.id === id ? { ...x, token: { ...x.token, last_rotated_at: new Date().toISOString(), expires_at: '2027-03-10T00:00:00Z' } } : x
                  )
                );
                showToast('System User token rotated — new token vaulted, old revoked', 'success');
              }}
            />
          ))}
        </div>
      )}

      {tab === 'sending' && <SendingTab wabas={wabas} />}
    </div>
  );
}
