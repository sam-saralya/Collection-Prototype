import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../store.jsx';
import NineBox from '../components/NineBox.jsx';
import { Card, SectionTitle, Tag, cx } from '../ui.jsx';
import { fmt, fmtCr, fmtI, CATEGORIES, CATEGORY_BY_KEY, ROUTING_TAG } from '../lib.js';
import { BORROWER_COUNTS } from '../data.js';

// Analytical view only — the Ability × Intent distribution and per-cohort
// totals. The borrower list lives on View Portfolio (filter by Cohort there).
export default function CohortIntelligencePage() {
  const { focusCategory, setFocusCategory, goTo } = useUI();
  const counts = BORROWER_COUNTS;
  const [category, setCategory] = useState(focusCategory || '');

  useEffect(() => {
    if (focusCategory) {
      setCategory(focusCategory);
      setFocusCategory(null);
    }
  }, [focusCategory, setFocusCategory]);

  const countsMap = useMemo(() => {
    const m = {};
    counts.categories.forEach((c) => (m[c.key] = { count: c.count, outstanding: c.outstanding }));
    return m;
  }, [counts]);

  const pending = counts.pending || 0;
  const totalOutstanding = counts.categories.reduce((s, c) => s + (c.outstanding || 0), 0);
  const totalScored = counts.categories.reduce((s, c) => s + (c.count || 0), 0);

  return (
    <div>
      <Card className="mb-4 p-[18px]">
        <SectionTitle title="Ability × Intent distribution" note="Model threshold · High ≥ 50" />
        <NineBox
          counts={countsMap}
          selected={category}
          onSelect={(key) => setCategory((c) => (c === key ? '' : key))}
        />

        {pending > 0 && (
          <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <strong>{fmt(pending)}</strong> borrowers are awaiting segmentation — the IVR check could not reach them, so
            the system has not placed them in a cohort. Run an IVR sweep on{' '}
            <button className="font-semibold underline" onClick={() => goTo('contactability')}>
              Establish Contactability
            </button>
            .
          </div>
        )}
      </Card>

      <Card pad>
        <SectionTitle title="Cohorts" note={`${fmt(totalScored)} scored · ${fmtCr(totalOutstanding)} outstanding`} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">Cohort</th>
                <th className="py-2 pr-3 font-semibold">Ability × Intent</th>
                <th className="py-2 pr-3 font-semibold">Routing</th>
                <th className="py-2 pr-3 font-semibold">Borrowers</th>
                <th className="py-2 pr-3 font-semibold">Outstanding</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const d = counts.categories.find((x) => x.key === c.key) || { count: 0, outstanding: 0 };
                const share = totalScored ? Math.round((d.count / totalScored) * 100) : 0;
                return (
                  <tr
                    key={c.key}
                    className={cx(
                      'cursor-pointer border-b border-[#edf1f5] last:border-0 hover:bg-brand/[.03]',
                      category === c.key && 'bg-brand/[.06]'
                    )}
                    onClick={() => setCategory((v) => (v === c.key ? '' : c.key))}
                  >
                    <td className="py-2.5 pr-3 font-semibold">{c.label}</td>
                    <td className="py-2.5 pr-3 capitalize text-muted">
                      {c.ability} · {c.intent}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Tag variant={ROUTING_TAG[c.routing] || 'purple'}>{c.routing}</Tag>
                    </td>
                    <td className="py-2.5 pr-3">
                      {fmt(d.count)} <span className="text-muted">· {share}%</span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{fmtI(d.outstanding)}</td>
                    <td className="py-2.5">
                      <button
                        className="text-[11px] font-semibold text-brand"
                        onClick={(e) => {
                          e.stopPropagation();
                          goTo('viewPortfolio');
                        }}
                      >
                        View borrowers →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Open <b>View Portfolio</b> and filter the <b>Cohort</b> column to work with the borrowers in any cohort.
        </p>
      </Card>
    </div>
  );
}
