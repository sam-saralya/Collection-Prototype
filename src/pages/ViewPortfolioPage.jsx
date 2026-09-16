import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Modal, ModalHeader, Field, Input } from '../ui.jsx';
import { fmt } from '../lib.js';
import { BORROWERS } from '../data.js';
import ImportPortfolioDialog from '../components/ImportPortfolioDialog.jsx';
import LoansTable from '../components/LoansTable.jsx';

// A "worklist" = a named, filter-defined slice of the loan book the user
// assembles in the grid (multiple column filters) and then acts on as a unit —
// assign a workflow, run a campaign, enrich, export. Distinct from the
// analytical "cohorts" (auto Ability × Intent segments). Saved worklists are
// listed on their own page (WorklistsPage.jsx), reached via the "Worklists"
// button next to "Create worklist" below.

const stamp = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function CreateWorklistDialog({ open, onClose, info, onSave }) {
  const count = info.selectedCount ?? info.count;
  const crit = info.criteria.length > 0 ? info.criteria : [{ label: 'Selection', text: 'hand-picked rows' }];
  const suggested =
    info.criteria.length > 0
      ? info.criteria.map((c) => c.label).slice(0, 3).join(' · ')
      : `Portfolio worklist`;
  const [name, setName] = useState(suggested);

  // reset the field each time the dialog is opened for a fresh selection
  React.useEffect(() => {
    if (open) setName(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title="Create a worklist" subtitle={`${fmt(count)} loans selected`} onClose={onClose} />

      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bihar · 31–60 DPD · Cashflow Crunch" autoFocus />
      </Field>

      <div className="mt-3">
        <small className="mb-1.5 block text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted">
          {info.criteria.length > 0 ? 'Filters in effect' : 'Selection'}
        </small>
        <div className="flex flex-wrap gap-1.5">
          {crit.map((c) => (
            <span key={c.label} className="rounded-full border border-line bg-slate-50 px-2 py-1 text-[11px] font-semibold">
              {c.label}: <span className="font-normal text-muted">{c.text}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!name.trim()}
          onClick={() => {
            onSave({
              id: 'wl_' + Date.now(),
              name: name.trim(),
              count,
              criteria: info.criteria,
              rowIds: (info.selectedRows || []).map((r) => r._id),
              createdAt: stamp(),
            });
            onClose();
          }}
        >
          Create worklist
        </Button>
      </div>
    </Modal>
  );
}

export default function ViewPortfolioPage() {
  const { openBorrower, goTo, showToast, worklists, addWorklist } = useUI();
  const [importOpen, setImportOpen] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [info, setInfo] = useState({ count: BORROWERS.length, criteria: [], filtered: false });

  return (
    <div>
      <PageHead />

      <ImportPortfolioDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <Card pad>
        <SectionTitle title="Loans">
          <Button variant="primary" onClick={() => setImportOpen(true)}>
            ⇧ Upload portfolio
          </Button>
        </SectionTitle>
        <LoansTable
          rows={BORROWERS}
          onRowClick={(b) => openBorrower(b.refId)}
          renderToolbarActions={(res) => (
            <>
              <Button
                size="xs"
                variant="primary"
                disabled={res.selectedCount === 0}
                onClick={() => {
                  setInfo(res);
                  setDlgOpen(true);
                }}
              >
                ✦ Create worklist
              </Button>
              <Button size="xs" onClick={() => goTo('worklists')}>
                Worklists{worklists.length > 0 ? ` (${worklists.length})` : ''}
              </Button>
            </>
          )}
          renderAbove={(res) =>
            res.selectedCount === 0 && !res.filtered ? null : (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed border-line bg-slate-50/70 px-3 py-2">
                <div className="text-[12px] text-muted">
                  {res.selectedCount > 0 ? (
                    <>
                      <b className="text-ink">{fmt(res.selectedCount)}</b> loan{res.selectedCount === 1 ? '' : 's'} selected
                      {res.filtered && <> · {res.criteria.length} filter{res.criteria.length === 1 ? '' : 's'} in effect</>}
                    </>
                  ) : (
                    <>
                      Tick rows, or the header checkbox to take all <b className="text-ink">{fmt(res.count)}</b> filtered loans
                    </>
                  )}
                </div>
                {res.selectedCount > 0 && (
                  <Button size="xs" onClick={res.clearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            )
          }
        />
      </Card>

      <CreateWorklistDialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        info={info}
        onSave={(wl) => {
          addWorklist(wl);
          showToast(`Worklist “${wl.name}” created — ${fmt(wl.count)} borrowers`, 'success');
        }}
      />
    </div>
  );
}
