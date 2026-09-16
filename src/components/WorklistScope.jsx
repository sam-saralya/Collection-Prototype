import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Select, Tag } from '../ui.jsx';
import { fmt } from '../lib.js';
import { BORROWERS } from '../data.js';

// Shared "run this on…" scope selector. A worklist built on View Portfolio is
// available here; picking one narrows the operation to those borrowers.
// `focusWorklist` (set when the user picks an action on a worklist row) is
// consumed once to pre-select.
export function useWorklistScope() {
  const { worklists, focusWorklist, setFocusWorklist } = useUI();
  const [id, setId] = useState(focusWorklist || '');

  useEffect(() => {
    if (focusWorklist) {
      setId(focusWorklist);
      setFocusWorklist(null);
    }
  }, [focusWorklist, setFocusWorklist]);

  const worklist = worklists.find((w) => w.id === id) || null;
  const rows = useMemo(() => {
    if (!worklist) return BORROWERS;
    const set = new Set(worklist.rowIds || []);
    return BORROWERS.filter((b) => set.has(b._id));
  }, [worklist]);

  return { id, setId, worklist, worklists, rows };
}

export default function WorklistScope({ scope }) {
  const { id, setId, worklist, worklists } = scope;
  return (
    <Card pad className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Run on</span>
        <Select className="w-72 max-w-full text-xs" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Whole portfolio ({fmt(BORROWERS.length)})</option>
          {worklists.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({fmt(w.count)})
            </option>
          ))}
        </Select>
        {worklist && (
          <Tag variant="blue">{fmt(worklist.count)} borrowers · {worklist.criteria.length || 'hand-picked'} {worklist.criteria.length ? 'filters' : ''}</Tag>
        )}
      </div>
    </Card>
  );
}
