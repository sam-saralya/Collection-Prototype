import React, { useMemo, useState } from 'react';
import { Card, SectionTitle, Tag, Button, cx } from '../ui.jsx';
import { BORROWERS } from '../data.js';
import { CATEGORIES, QUADRANT_PARAM_DEFS, DEFAULT_QUADRANT_RULES, computeAxisScore, categoryAt } from '../lib.js';
import NineBox from './NineBox.jsx';

// Staff-facing config for the Ability × Intent split. Each axis can carry any
// number of parameters, each a pass/fail check on one loan-schema field with
// its own weight. Weights don't need to sum to 100 — the score normalises by
// however they actually add up — so an admin can add or drop a parameter
// without having to re-balance every other slider by hand.

const AXIS_META = {
  // Tailwind's scanner needs literal class strings, not template-built ones.
  ability: { label: 'Ability', dotClass: 'bg-mint', barClass: 'bg-mint', rangeClass: 'accent-mint' },
  intent: { label: 'Intent', dotClass: 'bg-brand', barClass: 'bg-brand', rangeClass: 'accent-brand' },
};

function cloneDefaults() {
  return {
    ability: { ...DEFAULT_QUADRANT_RULES.ability, weights: { ...DEFAULT_QUADRANT_RULES.ability.weights }, values: { ...DEFAULT_QUADRANT_RULES.ability.values } },
    intent: { ...DEFAULT_QUADRANT_RULES.intent, weights: { ...DEFAULT_QUADRANT_RULES.intent.weights }, values: { ...DEFAULT_QUADRANT_RULES.intent.values } },
  };
}

// Every parameter's pass/fail agrees -> no conflict. Anything split (some
// pass, some fail) is a genuine disagreement between signals on that axis.
function hasConflict(paramsResult) {
  const verdicts = Object.values(paramsResult).map((p) => p.pass);
  return verdicts.some((v) => v !== verdicts[0]);
}

function AxisCard({ axis, rules, onChange }) {
  const meta = AXIS_META[axis];
  const defs = QUADRANT_PARAM_DEFS[axis];
  const totalWeight = defs.reduce((s, p) => s + (rules.weights[p.key] || 0), 0) || 1;

  const setValue = (key, v) => onChange({ ...rules, values: { ...rules.values, [key]: v } });
  const setWeight = (key, v) => onChange({ ...rules, weights: { ...rules.weights, [key]: v } });
  const setThreshold = (v) => onChange({ ...rules, threshold: v });

  return (
    <Card pad>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] font-bold">
          <i className={cx('inline-block h-2.5 w-2.5 rounded-full', meta.dotClass)} />
          {meta.label}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          score ≥
          <input
            type="number"
            min={1}
            max={99}
            value={rules.threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="w-[52px] rounded-md border border-line px-1.5 py-1 text-center font-mono text-[12px]"
          />
          → High
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {defs.map((p) => {
          const weight = rules.weights[p.key] || 0;
          const share = Math.round((weight / totalWeight) * 100);
          return (
            <div key={p.key}>
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="min-w-[168px] font-semibold">{p.label}</span>
                <span className="text-muted">{p.comparator === 'gte' ? '≥' : '≤'}</span>
                <input
                  type="number"
                  value={rules.values[p.key]}
                  onChange={(e) => setValue(p.key, Number(e.target.value) || 0)}
                  className="w-[78px] rounded-md border border-line px-2 py-1 font-mono text-[12px]"
                />
                <span className="text-muted">{p.unit}</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted">{p.sourceField}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(p.key, Number(e.target.value))}
                  className={cx('w-full', meta.rangeClass)}
                />
                <span className="w-[70px] shrink-0 text-right font-mono text-[10.5px] text-muted">
                  wt {weight} · {share}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={cx('h-full rounded-full', meta.barClass)} style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-muted">
        {meta.label.toLowerCase()} = Σ (parameter weight × pass?100:0) ÷ Σ (parameter weight), across{' '}
        {defs.map((p) => p.label.toLowerCase()).join(', ')}
      </p>
    </Card>
  );
}

function ConflictList({ axis, rows }) {
  const meta = AXIS_META[axis];
  const defs = QUADRANT_PARAM_DEFS[axis];
  if (rows.length === 0) {
    return <p className="text-[12px] text-muted">Every parameter on this axis currently agrees for every borrower.</p>;
  }
  return (
    <div className="grid gap-2">
      {rows.slice(0, 5).map((row) => (
        <div key={row.borrower._id} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[12px]">
          <b className="min-w-[132px]">{row.borrower.name}</b>
          {defs.map((p) => (
            <Tag key={p.key} variant={row.params[p.key].pass ? 'green' : 'red'}>
              {p.label} {row.params[p.key].value ?? '—'}
            </Tag>
          ))}
          <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-muted">
            score {row.score.toFixed(0)} / {row.threshold}
            <Tag variant={row.band === 'high' ? 'green' : 'red'}>{row.band === 'high' ? `High ${meta.label}` : `Low ${meta.label}`}</Tag>
          </span>
        </div>
      ))}
      {rows.length > 5 && <p className="text-[11px] text-muted">+{rows.length - 5} more borrowers currently split this way.</p>}
    </div>
  );
}

export default function QuadrantRulesCard() {
  const [rules, setRules] = useState(cloneDefaults());

  const result = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, { count: 0, outstanding: 0 }]));
    const abilityConflicts = [];
    const intentConflicts = [];

    BORROWERS.forEach((b) => {
      const ability = computeAxisScore(b, 'ability', rules.ability);
      const intent = computeAxisScore(b, 'intent', rules.intent);
      const cat = categoryAt(ability.band, intent.band);
      counts[cat.key].count += 1;
      counts[cat.key].outstanding += b.outstanding;

      if (hasConflict(ability.params)) abilityConflicts.push({ borrower: b, ...ability, threshold: rules.ability.threshold });
      if (hasConflict(intent.params)) intentConflicts.push({ borrower: b, ...intent, threshold: rules.intent.threshold });
    });

    abilityConflicts.sort((x, y) => y.borrower.outstanding - x.borrower.outstanding);
    intentConflicts.sort((x, y) => y.borrower.outstanding - x.borrower.outstanding);
    return { counts, abilityConflicts, intentConflicts };
  }, [rules]);

  return (
    <div className="grid gap-4">
      <SectionTitle title="Quadrant rules" note="Ability × Intent worklist split">
        <Button size="xs" onClick={() => setRules(cloneDefaults())}>
          Reset to defaults
        </Button>
      </SectionTitle>
      <p className="-mt-2 text-[12px] text-muted">
        Set the parameters that decide each borrower's worklist. Each parameter is a pass/fail check on one loan-schema
        field; when parameters on an axis disagree, their weights — not a priority order — decide which way the axis
        leans.
      </p>

      <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
        <AxisCard axis="ability" rules={rules.ability} onChange={(v) => setRules((r) => ({ ...r, ability: v }))} />
        <AxisCard axis="intent" rules={rules.intent} onChange={(v) => setRules((r) => ({ ...r, intent: v }))} />
      </div>

      <Card pad>
        <SectionTitle title="Live book — 220 accounts" note="recomputed as you move the sliders above" />
        <NineBox counts={result.counts} />
      </Card>

      <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
        <Card pad>
          <SectionTitle title="Where Ability's parameters disagree" note={`${result.abilityConflicts.length} of 220 accounts`} />
          <ConflictList axis="ability" rows={result.abilityConflicts} />
        </Card>
        <Card pad>
          <SectionTitle title="Where Intent's parameters disagree" note={`${result.intentConflicts.length} of 220 accounts`} />
          <ConflictList axis="intent" rows={result.intentConflicts} />
        </Card>
      </div>
    </div>
  );
}
