import React, { useMemo } from 'react';
import { useUI } from '../store.jsx';
import { Card, SectionTitle, cx } from '../ui.jsx';
import { fmt, isUnreachable } from '../lib.js';
import { BORROWERS, BORROWER_COUNTS, WORKFLOWS } from '../data.js';

// The end-to-end collections pipeline as a flow. Each step jumps to the screen
// that does that work.
export default function JourneyPage() {
  const { goTo } = useUI();

  const stats = useMemo(() => {
    const reachable = BORROWERS.filter((b) => b.ivrReachable || b.coIvrReachable).length;
    const pending = BORROWERS.filter((b) => isUnreachable(b)).length;
    const bureau = BORROWERS.filter((b) => b.bureauPulled).length;
    const active = WORKFLOWS.filter((w) => w.is_active).length;
    return { reachable, pending, bureau, active };
  }, []);

  const STEPS = [
    {
      n: 1,
      title: 'Upload portfolio',
      section: 'viewPortfolio',
      desc: 'Bring the loan book in, sanitize fields, cull the un-collectable.',
      stat: `${fmt(BORROWERS.length)} loans in book`,
    },
    {
      n: 2,
      title: 'Establish contactability',
      section: 'contactability',
      desc: 'IVR-call the applicant / co-applicant to confirm we can reach them.',
      stat: `${fmt(stats.reachable)} reachable · ${fmt(stats.pending)} pending`,
    },
    {
      n: 3,
      title: 'Data enrichment',
      section: 'enrich',
      desc: 'Pull credit bureau reports, resolve addresses, find alternate numbers.',
      stat: `${Math.round((stats.bureau / BORROWERS.length) * 100)}% bureau coverage`,
    },
    {
      n: 4,
      title: 'Segmentation',
      section: 'cohorts',
      desc: 'Score Ability × Intent and place every borrower in a cohort.',
      stat: `${fmt(BORROWER_COUNTS.total)} scored into 4 cohorts`,
    },
    {
      n: 5,
      title: 'Targeted workflows',
      section: 'workflows',
      desc: 'Run the right reminder cadence and journey per cohort.',
      stat: `${fmt(stats.active)} active workflows`,
    },
  ];

  return (
    <div>
      <Card pad>
        <SectionTitle title="Collections journey" note="how a portfolio moves from raw file to targeted outreach" />

        <div className="mt-2 flex items-stretch gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.section}>
              <button
                onClick={() => goTo(s.section)}
                className={cx(
                  'group flex w-[220px] shrink-0 flex-col rounded-xl2 border border-line bg-gradient-to-b from-white to-slate-50 p-4 text-left transition',
                  'hover:-translate-y-0.5 hover:border-brand hover:shadow-card'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] font-black text-white">{s.n}</span>
                  <b className="text-[13px] leading-tight">{s.title}</b>
                </div>
                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted">{s.desc}</p>
                <div className="mt-3 rounded-[8px] bg-white/70 px-2 py-1 text-[11px] font-semibold text-ink ring-1 ring-line">
                  {s.stat}
                </div>
                <span className="mt-2 text-[11px] font-bold text-brand opacity-0 transition group-hover:opacity-100">Open →</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex shrink-0 items-center text-2xl font-bold text-slate-300">→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="mt-1 text-[11px] text-muted">
          Click a step to jump to its screen. Borrowers only reach segmentation once contactability is established —
          anyone the IVR can’t reach is held out until then.
        </p>
      </Card>
    </div>
  );
}
