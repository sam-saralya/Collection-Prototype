import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Empty, Tag } from '../ui.jsx';
import { fmt } from '../lib.js';

// Standalone page for the worklists saved from View Portfolio (name a
// filter-defined slice of the loan book, then act on it as a unit). Reached
// via the "Worklists" button next to "Create worklist" on View Portfolio.

const ACTIONS = [
  { key: 'workflow', label: 'Assign a workflow', section: 'workflows', verb: 'Assigning a workflow to' },
  { key: 'whatsapp', label: 'Send a WhatsApp campaign', section: 'whatsapp', verb: 'Starting a WhatsApp campaign for' },
  { key: 'journey', label: 'Enrol in a journey', section: 'journeys', verb: 'Enrolling' },
  { key: 'contactability', label: 'Establish contactability', section: 'contactability', verb: 'Running an IVR sweep on' },
  { key: 'enrich', label: 'Enrich these borrowers', section: 'enrich', verb: 'Opening enrichment for' },
  { key: 'export', label: 'Export to CSV', verb: 'Exporting' },
];

function WorklistRow({ wl, onAction, onDelete }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1f5] py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <b className="text-[13px]">{wl.name}</b>
          <Tag variant="blue">{fmt(wl.count)} loans</Tag>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {wl.criteria.length === 0 ? (
            <span className="text-[11px] text-muted">Whole book</span>
          ) : (
            wl.criteria.map((c) => (
              <span key={c.label} className="text-[10.5px] text-muted">
                <span className="font-semibold">{c.label}:</span> {c.text}
              </span>
            ))
          )}
        </div>
        <div className="mt-0.5 text-[10px] text-muted">Created {wl.createdAt}</div>
      </div>

      <div className="relative flex items-center gap-1.5">
        <div className="relative">
          <Button size="xs" variant="primary" onClick={() => setMenu((v) => !v)}>
            Actions ▾
          </Button>
          {menu && (
            <>
              <div className="fixed inset-0 z-[40]" onMouseDown={() => setMenu(false)} />
              <div className="absolute right-0 top-full z-[41] mt-1 w-56 rounded-[10px] border border-line bg-white p-1 shadow-pop">
                {ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-slate-50"
                    onClick={() => {
                      setMenu(false);
                      onAction(a, wl);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Button size="xs" onClick={() => onDelete(wl.id)} title="Delete worklist">
          ✕
        </Button>
      </div>
    </div>
  );
}

export default function WorklistsPage() {
  const { goTo, showToast, worklists, removeWorklist, setFocusWorklist } = useUI();

  function runAction(a, wl) {
    showToast(`${a.verb} “${wl.name}” — ${fmt(wl.count)} borrowers`, 'success');
    if (a.section) {
      setFocusWorklist(wl.id);
      goTo(a.section);
    }
  }

  return (
    <div>
      <PageHead
        title="Worklists"
        subtitle="Named, filter-defined slices of the loan book, built on View Portfolio."
        actions={<Button onClick={() => goTo('viewPortfolio')}>← View Portfolio</Button>}
      />

      <Card pad>
        {worklists.length === 0 ? (
          <Empty>No worklists yet — filter or select rows on View Portfolio, then Create worklist.</Empty>
        ) : (
          <>
            <SectionTitle title="Saved worklists" note={`${worklists.length} saved`} />
            <div className="mt-1">
              {worklists.map((wl) => (
                <WorklistRow key={wl.id} wl={wl} onAction={runAction} onDelete={removeWorklist} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
