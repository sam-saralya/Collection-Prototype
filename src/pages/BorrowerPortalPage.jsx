import React, { useState } from 'react';
import { Button, Card, Input, Textarea, cx } from '../ui.jsx';
import { PORTAL_INTRO, PORTAL_LOAN, PORTAL_SCHEME } from '../data.js';

// The public screen a BORROWER lands on from the link we text them. No login,
// no app shell. A single machine with five screens. (Google-translate widget
// from the real app is dropped for the prototype.)

const STEPS = { MOBILE: 'mobile', OTP: 'otp', LOAN: 'loan', SCHEME: 'scheme', DONE: 'done' };
const inr = (n) => (n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const day = (iso) => (!iso ? '—' : new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className={cx('text-right text-xs', strong ? 'font-extrabold text-ink' : 'font-semibold text-slate-700')}>{value}</span>
    </div>
  );
}

export default function BorrowerPortalPage() {
  const [step, setStep] = useState(STEPS.MOBILE);
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showDeny, setShowDeny] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const intro = PORTAL_INTRO;
  const loan = PORTAL_LOAN;

  const otpLen = intro.otp.length;

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-lg font-extrabold tracking-tight text-ink">Saralya</div>
          <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted">Loan verification</div>
        </div>

        <Card className="p-6">
          {step === STEPS.MOBILE && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mobile.replace(/\D/g, '').length >= 10) setStep(STEPS.OTP);
              }}
            >
              <h1 className="text-base font-extrabold text-ink">Hello {intro.borrower.name},</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                We would like you to review the details of your loan. To keep your information safe, please confirm your
                registered mobile number ({intro.borrower.maskedMobile}). We will send you a one-time code.
              </p>
              <div className="mt-5">
                <span className="field-label">Registered mobile number</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  className="text-base tracking-wide"
                  autoFocus
                />
              </div>
              <Button type="submit" variant="primary" className="mt-5 w-full py-3 text-sm" disabled={mobile.replace(/\D/g, '').length < 10}>
                Send verification code
              </Button>
              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                Your browser may ask to share your location. It helps us confirm this request is genuine. You can decline
                — you will still be able to continue.
              </p>
            </form>
          )}

          {step === STEPS.OTP && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === otpLen) setStep(STEPS.LOAN);
              }}
            >
              <h1 className="text-base font-extrabold text-ink">Enter the code</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                We sent a {otpLen}-digit code to {intro.borrower.maskedMobile}. It is valid for {intro.otp.ttlMinutes}{' '}
                minutes.
              </p>
              <div className="mt-5">
                <span className="field-label">Verification code</span>
                <Input
                  inputMode="numeric"
                  maxLength={otpLen}
                  placeholder={'•'.repeat(otpLen)}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, otpLen))}
                  className="text-center text-xl font-bold tracking-[.4em]"
                  autoFocus
                />
              </div>
              <Button type="submit" variant="primary" className="mt-5 w-full py-3 text-sm" disabled={code.length !== otpLen}>
                Verify
              </Button>
              <div className="mt-4 flex items-center justify-between text-[11px] font-semibold">
                <button type="button" className="text-muted hover:text-ink" onClick={() => setStep(STEPS.MOBILE)}>
                  Change number
                </button>
                <button type="button" className="text-brand">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {step === STEPS.LOAN && (
            <div>
              <h1 className="text-base font-extrabold text-ink">Your loan details</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted">Please check the details below and tell us whether they are correct.</p>
              <div className="mt-5">
                <Row label="Name" value={loan.name} />
                <Row label="Loan number" value={loan.loanId} />
                <Row label="Amount outstanding" value={inr(loan.outstanding)} strong />
                <Row label="EMI amount" value={inr(loan.emiAmount)} />
                <Row label="Total arrears" value={inr(loan.totalArrear)} />
                <Row label="Days overdue" value={`${loan.odDays} days`} />
                <Row label="EMIs paid" value={`${loan.emiPaidCount} of ${loan.totalInstalments}`} />
                <Row label="Last payment" value={day(loan.lastPaymentDate)} />
                <Row label="Disbursed on" value={day(loan.disbursementDate)} />
              </div>

              {!showDeny ? (
                <div className="mt-6 space-y-2.5">
                  <Button
                    variant="primary"
                    className="w-full py-3 text-sm"
                    onClick={() => {
                      setOutcome({ status: 'accepted' });
                      setStep(STEPS.SCHEME);
                    }}
                  >
                    Yes, these details are correct
                  </Button>
                  <Button variant="danger" className="w-full py-3 text-sm" onClick={() => setShowDeny(true)}>
                    Something is not correct
                  </Button>
                </div>
              ) : (
                <div className="mt-6">
                  <span className="field-label">What is incorrect?</span>
                  <Textarea
                    rows={4}
                    placeholder="For example: I already paid this EMI on 12 July, or the amount shown is wrong."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value.slice(0, 2000))}
                    autoFocus
                  />
                  <p className="mt-1 text-[10px] text-muted">Our team will review your remarks and get back to you.</p>
                  <div className="mt-4 space-y-2.5">
                    <Button
                      variant="danger"
                      className="w-full py-3 text-sm"
                      disabled={!remarks.trim()}
                      onClick={() => {
                        setOutcome({ status: 'rejected', remarks });
                        setStep(STEPS.DONE);
                      }}
                    >
                      Submit remarks
                    </Button>
                    <Button className="w-full py-3 text-sm" onClick={() => setShowDeny(false)}>
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === STEPS.SCHEME && (
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
              <h1 className="text-center text-base font-extrabold text-ink">Thank you for confirming</h1>
              <p className="mt-2 text-center text-xs leading-relaxed text-muted">{PORTAL_SCHEME.note}</p>

              <div className="mt-5 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-emerald-900/70">Amount to pay to settle</div>
                <div className="mt-1 text-3xl font-extrabold text-emerald-800">
                  {inr(PORTAL_SCHEME.total_payable)}
                  {!PORTAL_SCHEME.exact && <span className="align-top text-base">+</span>}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-emerald-900/80">
                  You save {inr(PORTAL_SCHEME.total_waived)} of {inr(PORTAL_SCHEME.gross_dues)}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[.06em] text-muted">How this is worked out</div>
                {PORTAL_SCHEME.lines.map((l) => (
                  <div key={l.label} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
                    <span className="text-[11px] font-semibold text-muted">
                      {l.label}
                      {l.waive_pct > 0 && <span className="ml-1.5 text-[10px] font-bold text-emerald-700">{l.waive_pct}% off</span>}
                    </span>
                    <span className="text-right text-xs font-extrabold text-ink">
                      {l.amount_known ? (
                        <>
                          {inr(l.payable)}
                          {l.waive_pct > 0 && <span className="ml-1.5 text-[10px] font-semibold text-muted line-through">{inr(l.gross)}</span>}
                        </>
                      ) : l.waive_pct >= 100 ? (
                        <span className="text-emerald-700">Waived in full</span>
                      ) : (
                        <span className="text-slate-600">{l.waive_pct}% off</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {!PORTAL_SCHEME.exact && PORTAL_SCHEME.remaining_charges?.length > 0 && (
                <p className="mt-3 rounded-[10px] bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
                  {PORTAL_SCHEME.remaining_charges.join(', ')} are reduced but not fully waived, so a small amount on top
                  of the figure above may still apply. Our team will confirm the exact total with you.
                </p>
              )}

              <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
                If you would like to take this up, please reply to our message or wait for our call — our team will help
                you complete it.
              </p>
            </div>
          )}

          {step === STEPS.DONE && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-xl text-orange-700">!</div>
              <h1 className="text-base font-extrabold text-ink">Thank you — we have your remarks</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted">Our team will review what you told us and contact you shortly.</p>
              {outcome?.remarks && (
                <div className="mt-4 rounded-[10px] bg-slate-50 px-3 py-2.5 text-left text-[11px] italic leading-relaxed text-slate-600">
                  “{outcome.remarks}”
                </div>
              )}
            </div>
          )}
        </Card>

        <p className="mt-5 text-center text-[10px] leading-relaxed text-muted">This link is personal to you. Please do not share it.</p>
      </div>
    </div>
  );
}
