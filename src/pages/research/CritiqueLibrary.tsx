/**
 * Critique Library (S11.2) — the six-pass flaw-taxonomy reviews (R1–R5),
 * one entry per audited theory: verdict chips, flaw tables, steelman,
 * key numbers, citations. Skeptic overreach is graded too (R5).
 */

import { useMemo, useState } from 'react';
import { CRITIQUES, CRITIQUE_METHOD_NOTE } from '@/research/critiques';
import type { Critique, Verdict } from '@/research/types';
import { FilterChip, VerdictChip } from '@/research/components/chips';
import { VERDICT_STYLE } from '@/research/components/verdictStyle';
import { ClaimDisciplineNote, KeyReadout, ResearchPage, Section } from '@/research/components/common';
import { useIsMobile } from '@/hooks/use-mobile';

type SourceFilter = 'all' | Critique['source'];

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  high: 'var(--amber)',
  medium: 'var(--text-2)',
  low: 'var(--text-3)',
};

function CritiqueCard({ c }: { c: Critique }) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  return (
    <article className="panel">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>
            {c.source} REVIEW · {c.id}
          </div>
          <h3 className="t-h3">{c.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.verdicts.map((v) => (
            <VerdictChip key={v.scope} verdict={v.verdict} />
          ))}
        </div>
      </header>

      <blockquote
        className="t-body-sm mt-4 border-l-2 pl-3"
        style={{ borderColor: 'var(--line-2)', color: 'var(--text-2)' }}
      >
        {c.claim}
      </blockquote>

      <div className="mt-4 space-y-1.5">
        {c.verdicts.map((v) => (
          <div key={v.scope} className="t-caption flex items-start gap-2" style={{ color: VERDICT_STYLE[v.verdict].color }}>
            <span className="font-mono2 font-semibold uppercase">{v.verdict}:</span>
            <span style={{ color: 'var(--text-2)' }}>{v.scope}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {c.keyNumbers.map((k) => (
          <KeyReadout key={k.label} value={k.value} label={k.label} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="t-label mt-5"
        style={{ color: 'var(--teal-hi)' }}
      >
        {expanded ? '▾ Hide flaw table & steelman' : '▸ Flaw table, steelman & citations'}
      </button>

      {expanded && (
        <div className="mt-4">
          <div className="t-label mb-2">Flaw taxonomy</div>
          {isMobile ? (
            <div className="flex flex-col gap-2" data-testid="flaw-card-list">
              {c.flaws.map((f) => (
                <div
                  key={f.id}
                  className="rounded-sm px-3 py-2"
                  style={{ border: '1px solid var(--line-1)', background: 'var(--ink-1)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono2 text-[11px]" style={{ color: 'var(--text-3)' }}>{f.id}</span>
                    <span
                      className="font-mono2 text-[11px] font-semibold uppercase"
                      style={{ color: SEVERITY_COLOR[f.severity] }}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <div className="t-body-sm mt-1" style={{ color: 'var(--text-1)' }}>{f.flaw}</div>
                  <div className="t-caption mt-0.5" style={{ color: 'var(--text-2)' }}>{f.type}</div>
                </div>
              ))}
            </div>
          ) : (
          <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid var(--line-1)' }}>
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <th className="t-label px-3 py-2" style={{ color: 'var(--text-3)' }}>#</th>
                  <th className="t-label px-3 py-2" style={{ color: 'var(--text-3)' }}>Flaw</th>
                  <th className="t-label px-3 py-2" style={{ color: 'var(--text-3)' }}>Type</th>
                  <th className="t-label px-3 py-2" style={{ color: 'var(--text-3)' }}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {c.flaws.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--line-1)' }}>
                    <td className="font-mono2 px-3 py-2 text-[11px]" style={{ color: 'var(--text-3)' }}>{f.id}</td>
                    <td className="t-body-sm px-3 py-2" style={{ color: 'var(--text-1)' }}>{f.flaw}</td>
                    <td className="t-caption px-3 py-2" style={{ color: 'var(--text-2)' }}>{f.type}</td>
                    <td
                      className="font-mono2 px-3 py-2 text-[11px] font-semibold uppercase"
                      style={{ color: SEVERITY_COLOR[f.severity] }}
                    >
                      {f.severity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <div className="t-label mb-2 mt-5" style={{ color: 'var(--grade-B)' }}>
            Strongest version (steelman — stated before the verdict)
          </div>
          <p className="t-body-sm" style={{ color: 'var(--text-2)' }}>
            {c.steelman}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>Citations</div>
              <ul className="space-y-1">
                {c.citations.map((cit) => (
                  <li key={cit.label} className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
                    {cit.url ? (
                      <a href={cit.url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal-hi)' }} className="hover:underline">
                        {cit.label} ↗
                      </a>
                    ) : (
                      cit.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {c.linkedExperiments.length > 0 && (
              <div>
                <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>Decided by</div>
                <div className="flex gap-1.5">
                  {c.linkedExperiments.map((x) => (
                    <span
                      key={x}
                      className="font-mono2 px-1.5 text-[11px] font-semibold"
                      style={{ color: 'var(--amber)', border: '1px solid var(--amber-dim)', borderRadius: 2, height: 20, display: 'inline-flex', alignItems: 'center' }}
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function CritiqueLibrary() {
  const [source, setSource] = useState<SourceFilter>('all');
  const [verdict, setVerdict] = useState<'all' | Verdict>('all');

  const filtered = useMemo(
    () =>
      CRITIQUES.filter(
        (c) =>
          (source === 'all' || c.source === source) &&
          (verdict === 'all' || c.verdicts.some((v) => v.verdict === verdict)),
      ),
    [source, verdict],
  );

  return (
    <ResearchPage
      crumb="RESEARCH / CRITIQUE LIBRARY"
      title="Critique Library"
      lede="Thirteen audited theories, one entry each: the claim as marketed, the flaw table, the strongest defensible version, and the verdict. The same six-pass protocol grades skeptics too — overreach is flagged in both directions."
    >
      <div className="panel mb-2">
        <p className="t-body-sm" style={{ color: 'var(--text-2)' }}>
          {CRITIQUE_METHOD_NOTE}
        </p>
      </div>

      <Section
        title={`Audited theories · ${filtered.length}`}
        aside={
          <div className="flex flex-wrap gap-2">
            {(['all', 'R1', 'R2', 'R3'] as SourceFilter[]).map((s) => (
              <FilterChip key={s} active={source === s} onClick={() => setSource(s)}>
                {s === 'all' ? 'All' : s}
              </FilterChip>
            ))}
            <span className="mx-1 hidden items-center sm:flex" style={{ color: 'var(--line-2)' }}>|</span>
            {(['all', 'REPAIRABLE', 'DEMOTE', 'DISCARD', 'OPEN'] as const).map((v) => (
              <FilterChip
                key={v}
                active={verdict === v}
                onClick={() => setVerdict(v)}
                color={v === 'all' ? undefined : VERDICT_STYLE[v].color}
              >
                {v === 'all' ? 'Any verdict' : v}
              </FilterChip>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          {filtered.map((c) => (
            <CritiqueCard key={c.id} c={c} />
          ))}
        </div>
      </Section>

      <Section title="Skeptic-overreach register (R5)">
        <div className="panel">
          <ul className="space-y-2">
            {[
              'Dunning (Skeptoid #147): "brain waves don\'t produce brain states" is empirically false as a universal — the tACS/rhythmic-stimulation literature exists precisely because external rhythmic driving can bias states. His anti-"digital-drug" core survives.',
              'Hall (Skeptical Inquirer 2014): guilt-by-association from Gaynor-style mysticism to all rhythmic auditory stimulation; "no evidence" stated where only "no evidence for that mechanism" was available.',
              'Ingendoh 2023: vote-counting across non-comparable operationalizations (band power vs phase-locked ASSR); the nulls are as underpowered as the positives — Button 2013 cuts both ways.',
              'Klichowski 2023 (n=1000): "home use harms cognition" overgeneralizes from one unpleasant bare-tone stimulus class; retained as a usability finding — don\'t listen during high-stakes cognitive work.',
              'Anti-GENUS skeptics citing Soula 2023 as "40 Hz debunked": mouse flicker → human audio wellness is a two-domain leap; the cortical ASSR in humans is unaffected by those nulls.',
            ].map((t) => (
              <li key={t.slice(0, 24)} className="t-body-sm flex gap-2" style={{ color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--amber)' }}>▸</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="mt-10">
        <ClaimDisciplineNote />
      </div>
    </ResearchPage>
  );
}
