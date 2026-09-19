import React, { useState } from 'react';
import { EditGate, useDraft } from './shared.jsx';
import { Card, SectionTitle, Input } from '../../ui.jsx';
import { SERVICE_CATALOG, DEFAULT_PRICING } from '../../data.js';

const GROUPS = [...new Set(SERVICE_CATALOG.map((s) => s.group))];

export default function PricingPage() {
  const { draft: defaults, setDraft: setDefaults, commit, reset } = useDraft(DEFAULT_PRICING);
  const setDefault = (key, v) => setDefaults((d) => ({ ...d, [key]: v === '' ? '' : Number(v) }));
  return (
    <div>
      <div>
        <Card pad>
          <SectionTitle title="Platform default price sheet" />
          <EditGate label="Platform default prices" onSave={commit} onCancel={reset}>
          {GROUPS.map((g) => (
            <div key={g} className="mt-3">
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">{g}</div>
              {SERVICE_CATALOG.filter((s) => s.group === g).map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3 border-b border-[#edf1f5] py-1.5 last:border-0">
                  <div>
                    <div className="text-[12.5px] font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted">{s.unit}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-muted">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={defaults[s.key] ?? ''}
                      onChange={(e) => setDefault(s.key, e.target.value)}
                      className="h-8 w-24 py-0 text-right text-[12px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
          </EditGate>
        </Card>

      </div>
    </div>
  );
}
