/**
 * Hypothesis Tracker (S11.3) — public view of the claims registry:
 * current grade, grade-change audit trail, and exactly what evidence would
 * promote or demote each claim. Every entry is pre-registered, awaiting data.
 */

import { useMemo, useState } from 'react';
import { TRACKED_HYPOTHESES, TRACKER_STATUS_LABEL } from '@/research/hypotheses';
import type { Grade, TrackedHypothesis } from '@/research/types';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { FilterChip, Led } from '@/research/components/chips';
import { ClaimDisciplineNote, HonestyBar, ResearchPage, Section } from '@/research/components/common';
import { GRADE_COLOR } from '@/ui/theme';

type GradeFilter = Grade | 'all';

function HypothesisCard({ h }: { h: TrackedHypothesis }) {
  const [showTrail, setShowTrail] = useState(false);
  return (
    <article className="panel">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-label mb-1 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            <Led tone="amber" />
            {h.id} · {h.status}
          </div>
          <h3 className="t-body font-medium" style={{ color: 'var(--text-1)' }}>
            {h.claim}
          </h3>
        </div>
        <GradeBadge
          grade={h.currentGrade}
          minus={h.gradeMinus}
          citation={{
            verdict: `Current evidence grade: ${h.currentGrade}${h.gradeMinus ? '−' : ''}`,
            summary:
              'Grades apply to the claim\u2019s supporting evidence and change only via the audit trail below \u2014 on data, not on vibes.',
          }}
        />
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-sm px-3 py-2.5" style={{ background: 'var(--ink-1)', border: '1px solid var(--line-1)' }}>
          <div className="t-label mb-1" style={{ color: 'var(--grade-A)' }}>
            Promotes if
          </div>
          <p className="t-body-sm" style={{ color: 'var(--text-2)' }}>{h.promoteIf}</p>
        </div>
        <div className="rounded-sm px-3 py-2.5" style={{ background: 'var(--ink-1)', border: '1px solid var(--line-1)' }}>
          <div className="t-label mb-1" style={{ color: 'var(--danger)' }}>
            Demotes if
          </div>
          <p className="t-body-sm" style={{ color: 'var(--text-2)' }}>{h.demoteIf}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="t-label" style={{ color: 'var(--text-3)' }}>Decided by</span>
          {h.linkedExperiments.map((x) => (
            <span
              key={x}
              className="font-mono2 px-1.5 text-[11px] font-semibold"
              style={{ color: 'var(--amber)', border: '1px solid var(--amber-dim)', borderRadius: 2, height: 20, display: 'inline-flex', alignItems: 'center' }}
            >
              {x}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowTrail((x) => !x)}
          className="t-label"
          style={{ color: 'var(--teal-hi)' }}
        >
          {showTrail ? '▾ Hide grade-change audit trail' : '▸ Grade-change audit trail'}
        </button>
        <InfoPopover featureId="hypothesis-tracker" label="About the grade-change timeline" />
      </div>

      {showTrail && (
        <ol className="mt-4 space-y-0">
          {h.gradeHistory.map((g, i) => (
            <li key={`${g.date}-${i}`} className="relative flex gap-4 pb-4 pl-5" style={{ borderLeft: '1px solid var(--line-2)', marginLeft: 6 }}>
              <span
                aria-hidden
                className="absolute"
                style={{ left: -5, top: 4, width: 9, height: 9, borderRadius: '50%', background: GRADE_COLOR[g.to] }}
              />
              <div>
                <div className="font-mono2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {g.date} ·{' '}
                  <span style={{ color: GRADE_COLOR[g.from] }}>{g.from}</span>
                  {' → '}
                  <span style={{ color: GRADE_COLOR[g.to] }}>{g.to}</span>
                </div>
                <p className="t-body-sm mt-1" style={{ color: 'var(--text-2)' }}>
                  {g.reason}
                </p>
              </div>
            </li>
          ))}
          <li className="relative flex gap-4 pl-5" style={{ borderLeft: '1px solid var(--line-1)', marginLeft: 6 }}>
            <span aria-hidden className="absolute" style={{ left: -4, top: 4, width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-4)' }} />
            <span className="t-caption" style={{ color: 'var(--text-3)' }}>
              Next change: only on {h.linkedExperiments.join(' / ')} data — status: {TRACKER_STATUS_LABEL}.
            </span>
          </li>
        </ol>
      )}
    </article>
  );
}

export default function HypothesisTracker() {
  const [grade, setGrade] = useState<GradeFilter>('all');
  const filtered = useMemo(
    () => TRACKED_HYPOTHESES.filter((h) => grade === 'all' || h.currentGrade === grade),
    [grade],
  );

  return (
    <ResearchPage
      crumb="RESEARCH / HYPOTHESIS TRACKER"
      title="Hypothesis Tracker"
      lede="Every claim Open Sync might one day make, with its current evidence grade, the audit trail of past grade changes, and the pre-registered experiments that will move it. Grades move on data — never on marketing."
    >
      <HonestyBar context="All tracked claims" />

      <Section
        title={`Tracked claims · ${filtered.length}`}
        aside={
          <div className="flex flex-wrap gap-2">
            {(['all', 'A', 'B', 'C', 'D'] as GradeFilter[]).map((g) => (
              <FilterChip
                key={g}
                active={grade === g}
                onClick={() => setGrade(g)}
                color={g === 'all' ? undefined : GRADE_COLOR[g]}
              >
                {g === 'all' ? 'All grades' : `Grade ${g}`}
              </FilterChip>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          {filtered.map((h) => (
            <HypothesisCard key={h.id} h={h} />
          ))}
        </div>
      </Section>

      <div className="mt-10">
        <ClaimDisciplineNote />
      </div>
    </ResearchPage>
  );
}
