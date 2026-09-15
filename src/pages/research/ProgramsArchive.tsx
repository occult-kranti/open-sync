/**
 * Programs Archive (S11.4) — 42 government programs touching entrainment,
 * auditory stimulation, "psychotronics" and cognitive enhancement. Two
 * independent grading axes: DOCUMENTED PROGRAM? and VALIDATED EFFECT?
 * Mandatory framing: history & funding — not validation.
 */

import { useMemo, useState } from 'react';
import {
  ALL_PROGRAMS,
  OFFICIAL_NEGATIVES_NOTE,
  PROGRAMS_BANNER,
  TORSION_CASE,
} from '@/research/programs';
import type { Program, ValidatedGrade } from '@/research/types';
import { AxisChip, FilterChip, Led } from '@/research/components/chips';
import { ClaimDisciplineNote, ResearchPage, Section } from '@/research/components/common';
import { useIsMobile } from '@/hooks/use-mobile';

type EraFilter = Program['era'] | 'all';
const ERAS: readonly EraFilter[] = ['all', '1950s–70s', '1980s–90s', '2000s', '2010s', '2020s'];

function docTone(p: Program): 'yes' | 'no' | 'na' {
  if (p.documented === 'NEGATIVE') return 'no';
  return 'yes';
}

function valTone(v: ValidatedGrade): 'yes' | 'partial' | 'no' | 'na' {
  if (v === 'YES') return 'yes';
  if (v === 'PARTIAL') return 'partial';
  if (v === 'NA') return 'na';
  return 'no'; // NO / DISPROVED / NEGATIVE
}

const VALIDATED_LABEL: Record<ValidatedGrade, string> = {
  YES: 'VALIDATED',
  PARTIAL: 'PARTIAL',
  NO: 'NOT VALIDATED',
  DISPROVED: 'DISPROVED',
  NEGATIVE: 'NULL RESULT',
  NA: 'N/A',
};

function ProgramRow({ p }: { p: Program }) {
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--line-1)',
        background: p.officialNegative ? 'rgba(79,140,130,0.05)' : undefined,
      }}
    >
      <td className="font-mono2 px-3 py-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
        {String(p.n).padStart(2, '0')}
      </td>
      <td className="px-3 py-3">
        <div className="t-body-sm" style={{ color: 'var(--text-1)' }}>
          {p.name}
          {p.officialNegative && (
            <span className="t-label ml-2" style={{ color: 'var(--teal-hi)' }}>
              official negative
            </span>
          )}
        </div>
        <div className="t-caption mt-0.5" style={{ color: 'var(--text-3)' }}>
          {p.agency}
        </div>
      </td>
      <td className="t-body-sm px-3 py-3 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
        {p.country}
      </td>
      <td className="font-mono2 px-3 py-3 text-[11px] whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
        {p.years}
      </td>
      <td className="px-3 py-3">
        <AxisChip
          label={p.documented === 'NEGATIVE' ? 'NONE FOUND' : p.documented === 'YES-T1' ? 'YES · TIER 1' : 'YES'}
          tone={docTone(p)}
        />
      </td>
      <td className="px-3 py-3">
        <AxisChip label={VALIDATED_LABEL[p.validated]} tone={valTone(p.validated)} />
      </td>
      <td className="t-caption max-w-[380px] px-3 py-3" style={{ color: 'var(--text-2)' }}>
        {p.verdict}
      </td>
      <td className="px-3 py-3">
        {p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="t-caption font-mono2 hover:underline"
            style={{ color: 'var(--teal-hi)' }}
          >
            source ↗
          </a>
        ) : (
          <span className="t-caption" style={{ color: 'var(--text-3)' }}>
            see review file
          </span>
        )}
      </td>
    </tr>
  );
}

/** Mobile card rendering of a registry row (same data as ProgramRow). */
function ProgramCard({ p }: { p: Program }) {
  return (
    <article
      className="panel"
      style={{
        borderLeft: p.officialNegative ? '3px solid var(--teal)' : undefined,
        background: p.officialNegative ? 'rgba(79,140,130,0.05)' : undefined,
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono2 text-[11px]" style={{ color: 'var(--text-3)' }}>
          {String(p.n).padStart(2, '0')}
        </span>
        <div className="t-body-sm font-medium" style={{ color: 'var(--text-1)' }}>
          {p.name}
          {p.officialNegative && (
            <span className="t-label ml-2" style={{ color: 'var(--teal-hi)' }}>
              official negative
            </span>
          )}
        </div>
      </div>
      <div className="t-caption mt-0.5" style={{ color: 'var(--text-3)' }}>
        {p.agency}
      </div>
      <div className="font-mono2 mt-2 text-[11px]" style={{ color: 'var(--text-2)' }}>
        {p.country} · {p.years}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <AxisChip
          label={p.documented === 'NEGATIVE' ? 'NONE FOUND' : p.documented === 'YES-T1' ? 'YES · TIER 1' : 'YES'}
          tone={docTone(p)}
        />
        <AxisChip label={VALIDATED_LABEL[p.validated]} tone={valTone(p.validated)} />
      </div>
      <p className="t-caption mt-2" style={{ color: 'var(--text-2)' }}>
        {p.verdict}
      </p>
      <div className="mt-2">
        {p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="t-caption font-mono2 hover:underline"
            style={{ color: 'var(--teal-hi)' }}
          >
            source ↗
          </a>
        ) : (
          <span className="t-caption" style={{ color: 'var(--text-3)' }}>
            see review file
          </span>
        )}
      </div>
    </article>
  );
}

export default function ProgramsArchive() {
  const [era, setEra] = useState<EraFilter>('all');
  const filtered = useMemo(
    () => ALL_PROGRAMS.filter((p) => era === 'all' || p.era === era),
    [era],
  );
  const negatives = ALL_PROGRAMS.filter((p) => p.officialNegative);
  const isMobile = useIsMobile();

  return (
    <ResearchPage
      crumb="RESEARCH / PROGRAMS ARCHIVE"
      title="Programs Archive"
      lede="Forty-two government programs, statutes and funding lines touching brainwave audio, psychotronics and cognitive enhancement — graded on two independent axes: does a document prove the program existed, and does independent evidence validate the claimed effect?"
    >
      {/* Mandatory framing banner (S11.4 AC) */}
      <div
        role="note"
        className="mb-8 rounded-sm px-5 py-4"
        style={{
          background: 'var(--ink-2)',
          border: '1px solid var(--line-1)',
          borderLeft: '3px solid var(--danger)',
        }}
      >
        <div className="t-label mb-1.5 flex items-center gap-2" style={{ color: 'var(--danger-hi)' }}>
          <Led tone="danger" /> FRAMING — READ FIRST
        </div>
        <p className="t-body-sm" style={{ color: 'var(--text-1)' }}>
          {PROGRAMS_BANNER}
        </p>
      </div>

      {/* Official negative results highlight row */}
      <Section title="Official negative results — the strongest debunking assets">
        <p className="t-body-sm mb-4 max-w-3xl" style={{ color: 'var(--text-2)' }}>
          {OFFICIAL_NEGATIVES_NOTE}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {negatives.map((p) => (
            <div key={p.n} className="panel panel-interactive">
              <div className="t-label mb-2" style={{ color: 'var(--teal-hi)' }}>
                {p.country} · {p.years.split(';')[0]}
              </div>
              <div className="t-body-sm font-medium" style={{ color: 'var(--text-1)' }}>
                {p.name}
              </div>
              <p className="t-caption mt-2" style={{ color: 'var(--text-2)' }}>
                {p.verdict}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Torsion-field fraud case card */}
      <Section title="Fraud case file">
        <div className="panel" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="t-h3" style={{ color: 'var(--danger-hi)' }}>
              {TORSION_CASE.title}
            </h3>
            <AxisChip label="DISPROVED — OFFICIAL FRAUD FINDING" tone="no" />
          </div>
          <p className="t-body-sm mt-3" style={{ color: 'var(--text-2)' }}>
            {TORSION_CASE.body}
          </p>
          <p className="t-body-sm mt-3 font-medium" style={{ color: 'var(--amber)' }}>
            {TORSION_CASE.lesson}
          </p>
          <a
            href={TORSION_CASE.url}
            target="_blank"
            rel="noreferrer"
            className="t-caption font-mono2 mt-3 inline-block hover:underline"
            style={{ color: 'var(--teal-hi)' }}
          >
            dossier source ↗
          </a>
        </div>
      </Section>

      <Section
        title={`Full archive · ${filtered.length} of ${ALL_PROGRAMS.length}`}
        aside={
          <div className="flex flex-wrap gap-2">
            {ERAS.map((e) => (
              <FilterChip key={e} active={era === e} onClick={() => setEra(e)}>
                {e === 'all' ? 'All eras' : e}
              </FilterChip>
            ))}
          </div>
        }
      >
        {isMobile ? (
          <div data-testid="programs-card-list" className="flex flex-col gap-3">
            {filtered.map((p) => (
              <ProgramCard key={p.n} p={p} />
            ))}
          </div>
        ) : (
        <div className="panel overflow-x-auto p-0" data-testid="programs-table">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>#</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Program / item</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Country</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Years</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Documented?</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Validated?</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Verdict</th>
                <th className="t-label px-3 py-3" style={{ color: 'var(--text-3)' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProgramRow key={p.n} p={p} />
              ))}
            </tbody>
          </table>
        </div>
        )}
        <p className="t-caption mt-3" style={{ color: 'var(--text-3)' }}>
          Synthesis: documented ≠ validated, everywhere. The two validated signal paths are mundane —
          microwave-auditory-effect physics (a sensation, not control) and WHO–ITU hearing-protection dose
          science. The 21st-century gravity is biomedical, not military. Search-effort statement and per-item
          sources: research/crit_r4_global_programs.md.
        </p>
      </Section>

      <div className="mt-10">
        <ClaimDisciplineNote />
      </div>
    </ResearchPage>
  );
}
