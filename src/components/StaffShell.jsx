import React from 'react';
import { cx, Button } from '../ui.jsx';
import { CURRENT_USER } from '../data.js';
import { STAFF_NAV, useStaff } from '../pages/staff/store.jsx';

// The Saralya super-admin ("staff") console shell — its own sidebar, distinct
// from the customer console's. Deliberately dark-with-amber-accent so it never
// gets mistaken for a tenant's console, and roomy enough for the sections that
// are coming (billing, audit, platform settings…).

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default function StaffShell({ children }) {
  const { section, setSection, organizations } = useStaff();

  const activeLabel = STAFF_NAV.find((n) => n.key === section)?.label || 'Staff';
  const pendingOnboarding = organizations.filter((o) => o.onboarding && o.onboarding.password_status === 'temporary').length;

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-[860px]:grid-cols-[64px_1fr]">
      <aside className="sticky top-0 z-10 flex h-screen flex-col bg-gradient-to-b from-[#161311] to-[#0c0a09] px-4 py-5 text-[#f2e9dd]">
        <div className="flex items-center gap-3 px-2 pb-6 pt-1">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white shadow-[0_9px_22px_rgba(245,158,11,.25)]">
            S
          </div>
          <div className="max-[860px]:hidden">
            <b className="text-lg">Saralya</b>
            <small className="mt-0.5 block text-[10px] uppercase tracking-[.12em] text-amber-300/70">Staff console</small>
          </div>
        </div>

        <nav className="grid gap-1.5 overflow-y-auto">
          {STAFF_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={cx(
                'flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold transition',
                section === item.key
                  ? 'bg-gradient-to-r from-amber-400/25 to-orange-500/10 text-white shadow-[inset_3px_0_0_#f59e0b]'
                  : 'text-[#b8ab99] hover:bg-[#211c17] hover:text-white'
              )}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span className="max-[860px]:hidden">{item.label}</span>
              {item.key === 'organizations' && pendingOnboarding > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-extrabold text-amber-950 max-[860px]:hidden">
                  {pendingOnboarding}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#33291f] bg-[#1a140f] p-3.5 max-[860px]:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-400/15 text-[11px] font-extrabold text-amber-300">
              {initials(CURRENT_USER.name)}
            </div>
            <div className="min-w-0">
              <b className="block truncate text-xs">{CURRENT_USER.name}</b>
              <small className="block truncate text-[10px] text-[#b8ab99]">Saralya staff</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-slate-50">
        <header className="sticky top-0 z-[8] flex h-[72px] items-center justify-between border-b border-line bg-white/85 px-7 backdrop-blur max-[860px]:px-4">
          <div className="text-xs text-muted">
            Saralya staff / <b className="text-ink">{activeLabel}</b>
          </div>
          <div className="flex items-center gap-2.5">
            {section !== 'onboard' && (
              <Button variant="primary" onClick={() => setSection('onboard')}>
                ＋ Onboard organization
              </Button>
            )}
            <Button variant="danger" className="whitespace-nowrap">Logout</Button>
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] p-7 max-[860px]:p-4">{children}</div>
      </main>
    </div>
  );
}
