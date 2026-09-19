import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Empty, Drawer, DrawerHeader } from '../ui.jsx';
import { fmt, fmtI } from '../lib.js';
import { BORROWERS } from '../data.js';
import LoansTable from '../components/LoansTable.jsx';

// Standalone page for the worklists saved from View Portfolio (name a
// filter-defined slice of the loan book, then act on it as a unit). Reached
// via the "Worklists" button next to "Create worklist" on View Portfolio.

function worklistArrears(wl) {
  const memberIds = new Set(wl.rowIds || []);
  return BORROWERS.reduce((sum, b) => (memberIds.has(b._id) ? sum + (b.totalArrear || 0) : sum), 0);
}

function WorklistRow({ wl, onEdit }) {
  return (
    <tr className="cursor-pointer border-b border-[#edf1f5] last:border-0 hover:bg-brand/[.03]" onClick={() => onEdit(wl.id)}>
      <td className="py-2.5 pr-3">
        <div className="font-semibold text-[13px]">{wl.name}</div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {wl.criteria.map((c) => (
            <span key={c.label} className="text-[10.5px] text-muted">
              <span className="font-semibold">{c.label}:</span> {c.text}
            </span>
          ))}
        </div>
      </td>
      <td className="py-2.5 pr-3 text-muted">{wl.createdAt}</td>
      <td className="py-2.5 pr-3">{fmt(wl.count)}</td>
      <td className="py-2.5 pr-3">{fmtI(worklistArrears(wl))}</td>
      <td className="py-2.5 text-right">
        <Button size="xs" onClick={(e) => { e.stopPropagation(); onEdit(wl.id); }}>
          ✎ Edit
        </Button>
      </td>
    </tr>
  );
}

// The same View Portfolio grid (LoansTable), scoped to just this worklist's
// members — select rows and remove them from the worklist, same selection
// mechanics as creating one there in the first place.
function WorklistEditDrawer({ worklist, onClose }) {
  const { openBorrower, showToast, removeWorklistMembers } = useUI();
  if (!worklist) return null;
  const memberIds = new Set(worklist.rowIds || []);
  const rows = BORROWERS.filter((b) => memberIds.has(b._id));

  return (
    <Drawer open onClose={onClose} width="xl">
      <DrawerHeader title={worklist.name} subtitle={`${fmt(rows.length)} borrowers in this worklist`} onClose={onClose} />
      <div className="p-6">
        <LoansTable
          rows={rows}
          onRowClick={(b) => openBorrower(b.refId)}
          renderToolbarActions={(res) => (
            <Button
              size="xs"
              variant="danger"
              disabled={res.selectedCount === 0}
              onClick={() => {
                const ids = res.selectedRows.map((r) => r._id);
                removeWorklistMembers(worklist.id, ids);
                showToast(`Removed ${fmt(ids.length)} borrower${ids.length === 1 ? '' : 's'} from “${worklist.name}”`, 'success');
                res.clearSelection();
              }}
            >
              Remove from worklist
            </Button>
          )}
        />
      </div>
    </Drawer>
  );
}

export default function WorklistsPage() {
  const { goTo, worklists } = useUI();
  const [editingId, setEditingId] = useState(null);
  const editing = worklists.find((w) => w.id === editingId) || null;

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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-semibold">Name</th>
                    <th className="py-2 pr-3 font-semibold">Date created</th>
                    <th className="py-2 pr-3 font-semibold">Total borrows</th>
                    <th className="py-2 pr-3 font-semibold">Total arrears</th>
                    <th className="py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {worklists.map((wl) => (
                    <WorklistRow key={wl.id} wl={wl} onEdit={setEditingId} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <WorklistEditDrawer worklist={editing} onClose={() => setEditingId(null)} />
    </div>
  );
}
