import React, { useState } from 'react';
import OrganizationPage from './OrganizationPage.jsx';
import TeamCard from '../components/TeamCard.jsx';
import BorrowerLinksCard from '../components/BorrowerLinksCard.jsx';
import OrgBillingCard from '../components/OrgBillingCard.jsx';
import { cx } from '../ui.jsx';

// The org-admin console. Its own shell + sidebar; the Org Admin manages the
// tenant here — organisation details, the people in it, borrower links and
// what each service costs / what it's billing per project.
const NAV = [
  { key: 'organization', label: 'Organization', icon: '⌂' },
  { key: 'users', label: 'Users & roles', icon: '☰' },
  { key: 'links', label: 'Borrower links', icon: '🔗' },
  { key: 'billing', label: 'Pricing & billing', icon: '₹' },
];

const TITLES = {
  organization: 'Organization',
  users: 'Users & roles',
  links: 'Borrower links',
  billing: 'Pricing & billing',
};

export default function OrgAdminPage() {
  const [section, setSection] = useState('organization');

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] max-[860px]:grid-cols-[60px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col gap-1 bg-gradient-to-b from-sidebar to-[#0a1020] px-3 py-5 text-[#dbe6ff]">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 font-black text-white shadow-brand">
            A
          </div>
          <div className="max-[860px]:hidden">
            <b className="text-[15px]">Org Admin</b>
            <small className="block text-[9px] uppercase tracking-[.12em] text-[#8291ae]">Sugam Finance</small>
          </div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => !n.soon && setSection(n.key)}
            disabled={n.soon}
            className={cx(
              'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold transition',
              section === n.key
                ? 'bg-gradient-to-r from-brand/25 to-cyan-400/10 text-white shadow-[inset_3px_0_0_#8b5cf6]'
                : n.soon
                  ? 'cursor-default text-[#5c6b88]'
                  : 'text-[#8fa0bf] hover:bg-[#111e35] hover:text-white'
            )}
          >
            <span className="w-5 text-center text-base">{n.icon}</span>
            <span className="max-[860px]:hidden">
              {n.label}
              {n.soon && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-[#5c6b88]">soon</span>}
            </span>
          </button>
        ))}
      </aside>

      <main className="min-w-0 bg-slate-50">
        <header className="sticky top-0 z-[8] flex h-[64px] items-center justify-between border-b border-line bg-white/85 px-7 backdrop-blur">
          <div className="text-xs text-muted">
            Org Admin / <b className="text-ink">{TITLES[section]}</b>
          </div>
          <button className="btn whitespace-nowrap">Logout</button>
        </header>
        <div className="mx-auto max-w-[1200px] p-7 max-[860px]:p-4">
          {section === 'organization' && <OrganizationPage />}
          {section === 'users' && <TeamCard canManage />}
          {section === 'links' && <BorrowerLinksCard />}
          {section === 'billing' && <OrgBillingCard />}
        </div>
      </main>
    </div>
  );
}
