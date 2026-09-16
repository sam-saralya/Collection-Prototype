import React from 'react';
import { ABILITY_ROWS, INTENT_COLS, BAND_LABEL, BAND_RANGE, categoryAt, ROUTING_COLOR, fmtCr } from '../lib.js';
import { cx } from '../ui.jsx';

// `counts` is a map of category key -> { count, outstanding }.
export default function NineBox({ counts = {}, selected, onSelect }) {
  return (
    <div className="grid grid-cols-[104px_repeat(2,1fr)] gap-[7px] max-[860px]:grid-cols-[70px_repeat(2,1fr)]">
      <div className="grid place-items-center text-center text-[9px] font-extrabold uppercase tracking-[.08em] text-muted">
        Ability ↓ / Intent →
      </div>
      {INTENT_COLS.map((intent) => (
        <div key={intent} className="grid place-items-center text-[9px] font-extrabold uppercase tracking-[.08em] text-muted">
          {BAND_LABEL[intent]} intent
        </div>
      ))}

      {ABILITY_ROWS.map((ability) => (
        <React.Fragment key={ability}>
          <div className="flex flex-col items-end justify-center pr-2 text-right text-[11px] font-extrabold">
            {BAND_LABEL[ability]} ability
            <small className="mt-0.5 text-[8px] text-muted">{BAND_RANGE[ability]}</small>
          </div>
          {INTENT_COLS.map((intent) => {
            const cat = categoryAt(ability, intent);
            const d = counts[cat.key] || { count: 0, outstanding: 0 };
            const color = ROUTING_COLOR[cat.routing] || '#94a3b8';
            const active = selected === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onSelect?.(cat.key)}
                title={cat.routing}
                style={{ '--c': color }}
                className={cx(
                  'relative min-h-[105px] overflow-hidden rounded-[13px] border bg-gradient-to-b from-white to-[#fbfcff] p-3 text-left transition',
                  'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--c)]',
                  'hover:-translate-y-0.5 hover:shadow-card',
                  active ? 'border-[var(--c)] -translate-y-0.5 shadow-card' : 'border-line'
                )}
              >
                <div className="text-[11px] font-black">{cat.label}</div>
                <div className="mt-0.5 text-[8px] text-muted">{cat.routing}</div>
                <div className="mt-3 text-[22px] font-black">{d.count.toLocaleString('en-IN')}</div>
                <div className="text-[9px] text-muted">{fmtCr(d.outstanding)} outstanding</div>
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
