import React from 'react';
import { useUI, NAV_ITEMS } from '../store.jsx';
import { Button, Select } from '../ui.jsx';
import { PROJECTS, ACTIVE_PROJECT_ID } from '../data.js';

export default function Topbar() {
  const { section, navSection, pipelineDraft } = useUI();
  const parent = NAV_ITEMS.find((n) => n.key === navSection)?.label || 'View Portfolio';
  const label =
    section === 'borrower'
      ? `${parent} / Borrower`
      : section === 'pipelineBuilder'
      ? `${parent} / ${pipelineDraft === 'new' ? 'New workflow' : 'Edit workflow'}`
      : parent;

  // Builder is a full-screen canvas tool — drop the project switcher/logout
  // and shrink to a thin strip so the canvas keeps as much vertical space as
  // possible; the page itself carries its own Back/Save toolbar.
  if (section === 'pipelineBuilder') {
    return (
      <header className="flex h-10 shrink-0 items-center border-b border-line bg-white/85 px-4 backdrop-blur">
        <div className="text-[11px] text-muted">
          Collections / <b className="text-ink">{label}</b>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-[8] flex h-[72px] items-center justify-between border-b border-line bg-white/85 px-7 backdrop-blur">
      <div className="text-xs text-muted">
        Collections / <b className="text-ink">{label}</b>
      </div>
      <div className="flex items-center gap-2.5">
        <Select
          defaultValue={ACTIVE_PROJECT_ID}
          className="h-9 max-w-[220px] py-0 text-xs font-semibold"
          title="The project everything on this screen belongs to"
        >
          {PROJECTS.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button className="whitespace-nowrap">Logout</Button>
      </div>
    </header>
  );
}
