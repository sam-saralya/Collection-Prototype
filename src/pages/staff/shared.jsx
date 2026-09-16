import React, { useState } from 'react';
import { useUI } from '../../store.jsx';
import { Button, Field, Modal, ModalHeader, Tag } from '../../ui.jsx';
import { fmtDate } from '../../lib.js';

/* ------------------------------------------------------------------ helpers */

export function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

export const EMAIL_STATUS = {
  delivered: { label: 'Email delivered', variant: 'green', icon: '✓' },
  sent: { label: 'Email sent', variant: 'blue', icon: '➜' },
  queued: { label: 'Email queued', variant: 'default', icon: '⏳' },
  failed: { label: 'Email failed', variant: 'red', icon: '✕' },
};

export function dltStatus(organization) {
  const sms = organization?.sms || {};
  const entity = (sms.principal_entity_id || '').trim();
  const sender = (sms.sender_id || '').trim();
  if (entity && sender) return { label: `Own DLT · ${sender}`, variant: 'green' };
  if (entity || sender) return { label: 'DLT incomplete', variant: 'amber' };
  return { label: 'Saralya default', variant: 'default' };
}

export function useClipboard() {
  const { showToast } = useUI();
  return (text, what = 'Copied') => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`${what} to clipboard`, 'success'),
        () => showToast('Could not copy', 'error')
      );
    } else {
      showToast('Clipboard not available', 'error');
    }
  };
}

/* --------------------------------------------------------- onboarding cell */

export function OnboardingCell({ ob }) {
  if (!ob) return <span className="text-[11px] text-muted">—</span>;

  if (ob.password_status === 'changed') {
    return (
      <div className="text-[11px] leading-relaxed">
        <Tag variant="green">Onboarded</Tag>
        <div className="mt-1 text-muted">Admin signed in {fmtDate(ob.first_login_at)}</div>
      </div>
    );
  }

  const es = EMAIL_STATUS[ob.invite_email_status] || EMAIL_STATUS.queued;
  return (
    <div className="space-y-1 text-[11px] leading-relaxed">
      <div className="flex items-center gap-1.5">
        <Tag variant={es.variant}>
          {es.icon} {es.label}
        </Tag>
        <span className="text-muted">{relTime(ob.invite_sent_at)}</span>
      </div>
      {ob.invite_error && <div className="text-danger">{ob.invite_error}</div>}
      <div className="text-muted">{ob.first_login_at ? <>First login {fmtDate(ob.first_login_at)}</> : <>Awaiting first login</>}</div>
      <div>
        {ob.first_login_at ? (
          <Tag variant="amber">Password change pending</Tag>
        ) : (
          <Tag variant="amber">Temporary password — must be changed on first login</Tag>
        )}
      </div>
      {ob.invite_attempts > 1 && <div className="text-muted">{ob.invite_attempts} send attempts</div>}
    </div>
  );
}

/* --------------------------------------------------------- reveal password */

export function RevealPasswordModal({ open, org, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const copy = useClipboard();
  const ob = org?.onboarding;
  const close = () => {
    setRevealed(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} size="sm">
      <ModalHeader title="Reveal temporary password" subtitle={org?.name} onClose={close} />
      <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
        <b>Break-glass only.</b> The temporary password is emailed to <span className="font-mono">{ob?.invite_email_to}</span>{' '}
        automatically. Reveal it here only when that email has not arrived and cannot be re-sent. Read it to the admin
        over a trusted channel — they must still set their own password on first login before they can use the console.
      </div>

      <div className="mt-4">
        <span className="field-label">Temporary password</span>
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line bg-slate-50 px-3 py-3 text-[12px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            👁 Click to reveal
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-[10px] border border-line bg-white px-3 py-2.5 text-[15px] font-bold tracking-wide text-ink">
              {ob?.temp_password}
            </code>
            <Button onClick={() => copy(ob?.temp_password, 'Password')}>Copy</Button>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">Revealing a password is written to the audit log against your login.</p>

      <div className="mt-5 flex justify-end">
        <Button onClick={close}>Done</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------- just-created card */

export function JustCreatedCard({ created, onResend, onDismiss, compact }) {
  const [revealed, setRevealed] = useState(false);
  const copy = useClipboard();
  const es = EMAIL_STATUS[created.onboarding.invite_email_status] || EMAIL_STATUS.queued;

  return (
    <div className={'rounded-xl2 border border-emerald-200 bg-emerald-50/50 p-5 ' + (compact ? '' : 'shadow-card')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-[13px] text-emerald-700">✓</span>
            <b className="text-[15px]">{created.name} created</b>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-700">
            A temporary password was generated for <b>{created.admin.name}</b> and{' '}
            <Tag variant={es.variant}>
              {es.icon} {es.label.toLowerCase()}
            </Tag>{' '}
            to <span className="font-mono">{created.onboarding.invite_email_to}</span>. They must set their own password
            on first login.
          </p>
        </div>
        {onDismiss && (
          <Button size="xs" onClick={onDismiss}>
            ✕
          </Button>
        )}
      </div>

      <div className="mt-3 rounded-[10px] border border-line bg-white p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="field-label mb-0">Temporary password (fallback if the email fails)</span>
          {revealed && (
            <Button size="xs" onClick={() => copy(created.onboarding.temp_password, 'Password')}>
              Copy
            </Button>
          )}
        </div>
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-[8px] border border-dashed border-line bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            👁 Reveal
          </button>
        ) : (
          <code className="block rounded-[8px] border border-line bg-slate-50 px-3 py-2 text-[15px] font-bold tracking-wide text-ink">
            {created.onboarding.temp_password}
          </code>
        )}
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
          Only share this if the invite email does not arrive. After the admin's first login it stops working.
        </p>
      </div>

      {onResend && (
        <div className="mt-3">
          <Button size="xs" onClick={onResend}>
            ↻ Resend invite email
          </Button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- coming soon */

export function ComingSoon({ title, children }) {
  return (
    <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-white py-20 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-400">◔</div>
        <b className="text-[15px]">{title}</b>
        <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">{children}</p>
        <Tag className="mt-3">Coming soon</Tag>
      </div>
    </div>
  );
}
