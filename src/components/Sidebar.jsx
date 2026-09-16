import React from 'react';
import { useUI, NAV_GROUPS } from '../store.jsx';
import { cx } from '../ui.jsx';
import { CURRENT_USER } from '../data.js';

export default function Sidebar() {
  const { navSection, setSection } = useUI();

  return (
    <aside className="sticky top-0 z-10 flex h-screen flex-col bg-gradient-to-b from-sidebar to-[#0a1020] px-4 py-5 text-[#dbe6ff]">
      <div className="flex items-center gap-3 px-2 pb-6 pt-1">
        <div className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 font-black text-white shadow-brand">
          S
        </div>
        <div className="max-[860px]:hidden">
          <b className="text-lg">Saralya</b>
          <small className="mt-0.5 block text-[10px] uppercase tracking-[.12em] text-[#8291ae]">Collections OS</small>
        </div>
      </div>

      <nav className="grid gap-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label || `g${gi}`} className="grid gap-1">
            {group.label && (
              <div className="px-3 pb-0.5 text-[9px] font-extrabold uppercase tracking-[.14em] text-[#5c6b88] max-[860px]:hidden">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold transition',
                  navSection === item.key
                    ? 'bg-gradient-to-r from-brand/25 to-cyan-400/10 text-white shadow-[inset_3px_0_0_#8b5cf6]'
                    : 'text-[#8fa0bf] hover:bg-[#111e35] hover:text-white'
                )}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span className="max-[860px]:hidden">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-[#1f2d47] bg-sidebar2 p-3.5 max-[860px]:hidden">
        <div className="flex items-center justify-between">
          <b className="truncate text-xs">Sugam Finance</b>
          <span className="flex items-center gap-1.5 text-[10px] text-[#8291ae]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> LIVE
          </span>
        </div>
        <small className="mt-1.5 block leading-relaxed text-[#8291ae]">Signed in as {CURRENT_USER.email}</small>
      </div>
    </aside>
  );
}
