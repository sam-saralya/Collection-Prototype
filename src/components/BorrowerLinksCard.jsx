import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import { Card, Button, PageHead, SectionTitle, Field, Input } from '../ui.jsx';
import { ORGANIZATION } from '../data.js';

// Borrower-link configuration — its own Org Admin section.
export default function BorrowerLinksCard() {
  const { showToast } = useUI();
  const [links, setLinks] = useState(ORGANIZATION.links || []);

  const patch = (i, key, value) => setLinks((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const makeDefault = (i) => setLinks((rows) => rows.map((r, j) => ({ ...r, is_default: j === i })));

  return (
    <div>
      <PageHead
        actions={
          <Button variant="primary" onClick={() => showToast('Borrower links saved', 'success')}>
            Save changes
          </Button>
        }
      />

      <Card pad className="max-w-[760px]">
        <SectionTitle title="Links" />
        <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
          The one marked default is what <span className="font-mono">$link</span> becomes in every message — the rest stay
          listed so links already sent keep working.
        </p>
        <div className="grid gap-3">
          {links.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-end gap-2 max-[860px]:grid-cols-1">
              <Field label="Label">
                <Input placeholder="e.g. Main" value={row.label} onChange={(e) => patch(i, 'label', e.target.value)} />
              </Field>
              <Field label="Link">
                <Input
                  type="url"
                  placeholder="https://pay.example.com"
                  value={row.url}
                  onChange={(e) => patch(i, 'url', e.target.value)}
                />
              </Field>
              <div className="flex items-center gap-3 pb-2">
                <label className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                  <input
                    type="radio"
                    name="default-link"
                    checked={Boolean(row.is_default)}
                    onChange={() => makeDefault(i)}
                  />
                  Default
                </label>
                <button
                  type="button"
                  onClick={() => setLinks((rows) => rows.filter((_, j) => j !== i))}
                  className="text-[11.5px] font-semibold text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div>
            <Button
              type="button"
              onClick={() => setLinks((rows) => [...rows, { label: '', url: '', is_default: rows.length === 0 }])}
            >
              Add link
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
