/**
 * Theory Explorer (S19) — interactive walk through the six-pass derivation
 * chains: claim header with verdict chip → numbered derivation chain (flaw
 * flags inline, weakest arrow highlighted amber) → domain-of-validity map →
 * mundane alternatives → verdict panel → linked experiments.
 *
 * Every entry is an audit record. Discarded claims render as "audited" with
 * their flaw tables — never as live session options. All strings come from
 * src/theory/chains.ts (single source of truth).
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { THEORY_CHAINS, type TheoryChain } from '@/theory/chains';
import { FilterChip, VerdictChip } from '@/research/components/chips';
import { VERDICT_STYLE } from '@/research/components/verdictStyle';
import { ClaimDisciplineNote, ResearchPage, Section } from '@/research/components/common';
import type { Verdict } from '@/research/types';

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  high: 'var(--amber)',
  medium: 'var(--text-2)',
  low: 'var(--text-3)',
};

function hasDiscard(c: TheoryChain): boolean {
  return c.verdicts.some((v) => v.verdict === 'DISCARD');
}

function ChainWalk({ chain }: { chain: TheoryChain }) {
  const weakest = chain.steps[chain.weakestArrow];
  return (
    <article className="panel" data-testid={`chain-${chain.id}`}>
      {/* claim header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>
            {chain.source} SIX-PASS AUDIT · {chain.id}
          </div>
          <h3 className="t-h3">{chain.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chain.verdicts.map((v) => (
            <VerdictChip key={v.scope} verdict={v.verdict} />
          ))}
        </div>
      </header>

      <blockquote
        className="t-body-sm mt-4 border-l-2 pl-3"
        style={{ borderColor: 'var(--line-2)', color: 'var(--text-2)' }}
      >
        {chain.claim}
      </blockquote>

      {hasDiscard(chain) && (
        <div
          role="note"
          className="mt-4 rounded-sm px-3 py-2"
          style={{ background: 'var(--ink-1)', border: '1px solid var(--danger)' }}
        >
          <span className="t-label" style={{ color: 'var(--danger-hi)' }}>
            AUDITED RECORD
          </span>
          <span className="t-body-sm ml-2" style={{ color: 'var(--text-2)' }}>
            A discarded claim is shown with its flaw table for the record. It is not offered as a session,
            preset, or protocol option anywhere in Open Sync.
          </span>
        </div>
      )}

      {/* numbered derivation chain */}
      <ol className="mt-6 space-y-3">
        {chain.steps.map((s, i) => {
          const isWeakest = i === chain.weakestArrow;
          return (
            <li
              key={s.id}
              className="rounded-sm px-4 py-3"
              style={{
                background: 'var(--ink-1)',
                border: `1px solid ${isWeakest ? 'var(--amber)' : 'var(--line-1)'}`,
                boxShadow: isWeakest ? '0 0 0 1px var(--amber-glow)' : undefined,
              }}
              data-testid={isWeakest ? 'weakest-arrow' : undefined}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono2 text-[12px] font-semibold" style={{ color: 'var(--text-3)' }}>
                  {i + 1}.
                </span>
                <span className="t-body-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {s.claim}
                </span>
                {isWeakest && (
                  <span
                    className="font-mono2 px-1.5 text-[10px] font-semibold uppercase"
                    style={{
                      color: 'var(--amber)',
                      border: '1px solid var(--amber-dim)',
                      borderRadius: 2,
                      letterSpacing: '0.1em',
                    }}
                  >
                    weakest arrow
                  </span>
                )}
              </div>
              <p className="t-body-sm mt-1.5" style={{ color: 'var(--text-2)' }}>
                {s.evidence}
              </p>
              {s.flawFlags.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.flawFlags.map((f) => (
                    <li key={f.id} className="t-caption flex items-start gap-2" style={{ color: 'var(--text-2)' }}>
                      <span
                        className="font-mono2 shrink-0 px-1 text-[10px] font-semibold uppercase"
                        style={{ color: SEVERITY_COLOR[f.severity], border: `1px solid ${SEVERITY_COLOR[f.severity]}55`, borderRadius: 2 }}
                      >
                        {f.id} · {f.severity}
                      </span>
                      <span>{f.flaw}</span>
                      <span style={{ color: 'var(--text-3)' }}>({f.type})</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <p className="t-caption mt-3" style={{ color: 'var(--amber)' }}>
        Why the chain breaks at step {chain.weakestArrow + 1} ({weakest.id}): {chain.weakestArrowNote}
      </p>

      {/* domain of validity + mundane alternatives */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-sm px-4 py-3" style={{ background: 'var(--ink-1)', border: '1px solid var(--line-1)' }}>
          <div className="t-label mb-2" style={{ color: 'var(--teal)' }}>
            Domain of validity — what survives
          </div>
          <ul className="space-y-1.5">
            {chain.domainOfValidity.map((d) => (
              <li key={d.slice(0, 24)} className="t-body-sm flex gap-2" style={{ color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--teal)' }}>▸</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm px-4 py-3" style={{ background: 'var(--ink-1)', border: '1px solid var(--line-1)' }}>
          <div className="t-label mb-2" style={{ color: 'var(--amber)' }}>
            Mundane alternatives it must beat
          </div>
          <ul className="space-y-1.5">
            {chain.alternatives.map((a) => (
              <li key={a.slice(0, 24)} className="t-body-sm flex gap-2" style={{ color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--amber)' }}>▸</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* verdict panel */}
      <div className="mt-6 rounded-sm px-4 py-3" style={{ background: 'var(--ink-2)', border: '1px solid var(--line-2)' }}>
        <div className="t-label mb-2" style={{ color: 'var(--text-3)' }}>
          Verdict
        </div>
        {chain.verdicts.map((v) => (
          <div key={v.scope} className="t-caption flex items-start gap-2" style={{ color: VERDICT_STYLE[v.verdict as Verdict].color }}>
            <span className="font-mono2 font-semibold uppercase">{v.verdict}:</span>
            <span style={{ color: 'var(--text-2)' }}>{v.scope}</span>
          </div>
        ))}
        <p className="t-body-sm mt-2" style={{ color: 'var(--text-1)' }}>
          {chain.verdictSummary}
        </p>
        <p className="t-body-sm mt-2" style={{ color: 'var(--text-2)' }}>
          <span className="t-label mr-2" style={{ color: 'var(--grade-B)' }}>
            STRONGEST VERSION
          </span>
          {chain.steelman}
        </p>
      </div>

      {/* linked experiments + citations */}
      <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-3">
        {chain.registryLinks.length > 0 && (
          <div>
            <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>
              Decided by (experiment registry)
            </div>
            <div className="flex gap-1.5">
              {chain.registryLinks.map((x) => (
                <Link
                  key={x}
                  to="/lab"
                  className="font-mono2 px-1.5 text-[11px] font-semibold"
                  style={{
                    color: 'var(--amber)',
                    border: '1px solid var(--amber-dim)',
                    borderRadius: 2,
                    height: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {x} →
                </Link>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="t-label mb-1" style={{ color: 'var(--text-3)' }}>
            Citations
          </div>
          <ul className="space-y-1">
            {chain.citations.map((cit) => (
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
      </div>
    </article>
  );
}

export default function TheoryExplorer() {
  const [selectedId, setSelectedId] = useState(THEORY_CHAINS[0].id);
  const [verdictFilter, setVerdictFilter] = useState<'all' | Verdict>('all');

  const visible = THEORY_CHAINS.filter(
    (c) => verdictFilter === 'all' || c.verdicts.some((v) => v.verdict === verdictFilter),
  );

  // The detail walk must stay inside the active filter: fall back to the
  // first visible chain when the selected one is filtered out (otherwise the
  // panel contradicts the "Audited chains · n" count).
  const chain = useMemo(
    () => visible.find((c) => c.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  return (
    <ResearchPage
      crumb="RESEARCH / THEORY EXPLORER"
      title="Theory Explorer"
      lede="Every load-bearing theory in brainwave-audio, walked link by link: the claim as marketed, the derivation chain with flaw flags inline, the weakest arrow in amber, what survives, the mundane alternatives it never beat, and the experiment that would settle the residue."
    >
      <Section
        title={`Audited chains · ${visible.length}`}
        aside={
          <div className="flex flex-wrap gap-2">
            {(['all', 'REPAIRABLE', 'DEMOTE', 'DISCARD', 'OPEN'] as const).map((v) => (
              <FilterChip
                key={v}
                active={verdictFilter === v}
                onClick={() => setVerdictFilter(v)}
                color={v === 'all' ? undefined : VERDICT_STYLE[v].color}
              >
                {v === 'all' ? 'Any verdict' : v}
              </FilterChip>
            ))}
          </div>
        }
      >
        <div className="mb-6 flex flex-wrap gap-2">
          {visible.map((c) => (
            <FilterChip key={c.id} active={selectedId === c.id} onClick={() => setSelectedId(c.id)}>
              {c.title.length > 44 ? `${c.title.slice(0, 44)}…` : c.title}
            </FilterChip>
          ))}
        </div>
        <ChainWalk chain={chain} />
      </Section>

      <div className="mt-10">
        <ClaimDisciplineNote />
      </div>
    </ResearchPage>
  );
}
