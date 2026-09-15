/**
 * Experiment Lab (S11.1) — registry browser for X01–X14.
 * Every protocol card shows grade + null-handling statement; the honesty bar
 * keeps all results in n + CI placeholder form: no data collected yet.
 */

import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EXPERIMENTS, EXPERIMENT_STATUS_LABEL, REGISTRY_RULES, KILL_PROMOTE_MATRIX } from '@/research/experiments';
import { PACK_FILES, PACK_RENDER_CONTRACT, PACK_NOTE } from '@/research/stimulusPack';
import type { Experiment, ExperimentStatus, PackFile } from '@/research/types';
import type { Phase as EnginePhase } from '@/engine';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { FilterChip, Led, VerdictChip } from '@/research/components/chips';
import { ClaimDisciplineNote, Field, HonestyBar, ResearchPage, Section } from '@/research/components/common';
import { useSessionOptional } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';

type StatusFilter = ExperimentStatus | 'all' | 'decisive';

// ---------------------------------------------------------------------------
// Stimulus preview (S10.3): play the shipped reference WAV when one exists in
// /public/stimulus_pack, otherwise render the experiment's reference stimulus
// through the engine preview path. A preview is never an experiment run.
// ---------------------------------------------------------------------------

export type StimulusPlan =
  | { kind: 'wav'; url: string; file: string }
  | { kind: 'render'; phase: EnginePhase };

/** Derive the reference stimulus from the pack filename grammar (ospx_xNN_<kind>_c<carrier>_d<beat>_…). */
function referencePhaseFor(f: PackFile): EnginePhase {
  const m = f.file.match(/_(bb|mb|iso)_c([\d.]+)_d([\d.]+)_/);
  if (m) {
    const mode = m[1] === 'bb' ? 'binaural' : m[1] === 'mb' ? 'monaural' : 'isochronic';
    return { durationSec: 10, carrierHz: Number(m[2]), beatHz: Number(m[3]), mode, gainDb: -20 };
  }
  const tone = f.file.match(/_tone_([\d.]+)hz/i);
  if (tone) {
    return { durationSec: 10, carrierHz: Number(tone[1]), beatHz: 0, mode: 'monaural', gainDb: -20 };
  }
  // Canonical screening stimulus — matches the pack's 400 Hz / Δf 10 reference.
  return { durationSec: 10, carrierHz: 400, beatHz: 10, mode: 'binaural', gainDb: -20 };
}

/** Preview plan for an experiment: shipped WAV when listed, else engine render. */
export function stimulusPlan(expId: string): StimulusPlan | null {
  const files = PACK_FILES.filter((f) => f.serves.includes(expId));
  if (files.length === 0) return null;
  const rendered = files.find((f) => f.url);
  if (rendered?.url) return { kind: 'wav', url: rendered.url, file: rendered.file };
  return { kind: 'render', phase: referencePhaseFor(files[0]) };
}

function PlayStimulusButton({ exp }: { exp: Experiment }) {
  // Optional context: the page SSR-smoke-renders without a SessionProvider.
  const session = useSessionOptional();
  const plan = stimulusPlan(exp.id);
  if (!plan || !session) return null;
  const { previewId, togglePreview, stopPreview, previewPhases } = session;
  const id = `exp:${exp.id}`;
  const active = previewId === id;
  const onClick = () => {
    if (plan.kind === 'wav') {
      togglePreview(id, () => {
        const audio = new Audio(plan.url);
        audio.addEventListener('ended', () => stopPreview());
        void audio.play().catch(() => stopPreview());
        return () => {
          audio.pause();
          audio.src = '';
        };
      });
    } else {
      previewPhases(id, [plan.phase]);
    }
  };
  return (
    <span className="flex flex-col items-start gap-1" style={{ marginTop: 12 }}>
      <button
        type="button"
        data-testid={`stimulus-play-${exp.id}`}
        className={`chip ${active ? 'chip-active' : ''}`}
        style={{ minHeight: 40 }}
        aria-label={
          active
            ? `Stop stimulus preview for ${exp.id}`
            : `Play stimulus preview for ${exp.id} (${plan.kind === 'wav' ? 'shipped reference file' : 'engine-rendered reference'})`
        }
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {active ? '■ STOP' : plan.kind === 'wav' ? '▶ PLAY STIMULUS FILE' : '▶ PLAY STIMULUS (ENGINE RENDER)'}
      </button>
      <span className="t-caption" style={{ color: 'var(--text-3)' }}>
        Previewing a stimulus is not running the experiment.
      </span>
    </span>
  );
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return 'parametric';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function PackFileRow({ f }: { f: PackFile }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--line-1)' }}>
      <Led tone={f.url ? 'teal' : 'amber'} on />
      <div className="min-w-0 flex-1">
        <div className="font-mono2 text-[12px] leading-4" style={{ color: 'var(--text-1)' }}>
          {f.url ? (
            <a href={f.url} download style={{ color: 'var(--teal-hi)' }} className="hover:underline">
              {f.file} ↓
            </a>
          ) : (
            f.file
          )}
        </div>
        <div className="t-caption mt-0.5" style={{ color: 'var(--text-3)' }}>
          {f.description}
        </div>
      </div>
      <div className="font-mono2 shrink-0 text-right text-[11px]" style={{ color: 'var(--text-2)' }}>
        <div>{f.durationS != null ? `${f.durationS.toFixed(0)} s` : 'runtime'}</div>
        <div style={{ color: 'var(--text-3)' }}>{formatBytes(f.sizeBytes)}</div>
        {f.url ? (
          <div style={{ color: 'var(--teal)' }}>rendered</div>
        ) : (
          <div style={{ color: 'var(--amber-dim)' }}>on-demand</div>
        )}
      </div>
    </div>
  );
}

function ExperimentCard({ exp, onOpen }: { exp: Experiment; onOpen: (e: Experiment) => void }) {
  return (
    // role="button" div (not <button>) so the nested PLAY STIMULUS control
    // stays valid HTML — same pattern as the Presets cards.
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open protocol ${exp.id}`}
      onClick={() => onOpen(exp)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(exp);
        }
      }}
      className="panel panel-interactive w-full text-left"
      style={{ cursor: 'pointer' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="t-readout-md" style={{ color: 'var(--amber)' }}>
            {exp.id}
          </span>
          <div>
            <div className="t-body font-medium" style={{ color: 'var(--text-1)' }}>
              {exp.title}
            </div>
            <div className="t-label mt-1" style={{ color: 'var(--text-3)' }}>
              {exp.classLabel}
              {exp.rank != null && ` · rank ${exp.rank}`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {exp.claimGrade && <GradeBadge grade={exp.claimGrade} minus={exp.gradeMinus} compact />}
          <span className="t-label" style={{ color: 'var(--text-3)' }}>
            {EXPERIMENT_STATUS_LABEL[exp.status]}
          </span>
        </div>
      </div>
      <p className="t-body-sm mt-3 line-clamp-2" style={{ color: 'var(--text-2)' }}>
        {exp.hypothesis}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {exp.advisorDecisive && <VerdictChip verdict="OPEN" label="advisor-flagged decisive" />}
        <span className="font-mono2 text-[11px]" style={{ color: 'var(--text-3)' }}>
          n = {exp.nTarget ?? '—'} target
        </span>
        <span className="t-caption line-clamp-1" style={{ color: 'var(--text-3)' }}>
          Null rule: {exp.nullRule.slice(0, 110)}…
        </span>
      </div>
      <PlayStimulusButton exp={exp} />
    </div>
  );
}

function ExperimentDrawer({ exp, onClose }: { exp: Experiment | null; onClose: () => void }) {
  const files = useMemo(
    () => (exp ? PACK_FILES.filter((f) => f.serves.includes(exp.id) || f.serves.includes('all')) : []),
    [exp],
  );
  return (
    <Sheet open={exp != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
        style={{ background: 'var(--ink-1)', borderLeft: '1px solid var(--line-2)' }}
      >
        {exp && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3 pr-8">
                <span className="t-readout-lg" style={{ color: 'var(--amber)' }}>
                  {exp.id}
                </span>
                {exp.claimGrade && (
                  <GradeBadge
                    grade={exp.claimGrade}
                    minus={exp.gradeMinus}
                    citation={{
                      verdict: 'Grade of the claim under test',
                      summary:
                        'The badge grades the claim this experiment tests, not the experiment. All protocols are pre-registered; grades change only on data.',
                    }}
                  />
                )}
              </div>
              <SheetTitle className="t-h2 text-left" style={{ color: 'var(--text-1)' }}>
                {exp.title}
              </SheetTitle>
              <SheetDescription className="t-body-sm text-left" style={{ color: 'var(--text-3)' }}>
                {exp.classLabel} · status: {EXPERIMENT_STATUS_LABEL[exp.status]} · sources:{' '}
                {exp.sources.join('; ')}
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 pb-10">
              <HonestyBar context={`${exp.id} results`} />

              <Field label="Hypothesis (falsifiable)">{exp.hypothesis}</Field>
              <Field label="Primary prediction (pre-registered direction & magnitude)">{exp.prediction}</Field>
              <Field label="Null-handling rule">
                <span style={{ color: 'var(--teal-hi)' }}>{exp.nullRule}</span>
              </Field>
              <Field label="Design">{exp.design}</Field>
              <Field label="Mundane-explanation controls (mandatory)">
                <ul className="list-disc space-y-1 pl-4">
                  {exp.controls.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Field>
              <Field label="Sham / active-comparator design">{exp.sham}</Field>
              <Field label="Power">
                <span className="font-mono2" style={{ color: 'var(--amber)' }}>
                  n = {exp.nTarget ?? '—'}
                </span>{' '}
                <span style={{ color: 'var(--text-2)' }}>· {exp.powerNote}</span>
              </Field>
              <Field label="Decision rule (pre-committed)">{exp.decisionRule}</Field>

              <Field label="Kill / promote mapping">
                <div className="space-y-2">
                  {exp.killPromote.promotes.map((p) => (
                    <div key={p} className="flex gap-2">
                      <VerdictChip verdict="OPEN" label="promotes" />
                      <span>{p}</span>
                    </div>
                  ))}
                  {exp.killPromote.demotes.map((d) => (
                    <div key={d} className="flex gap-2">
                      <VerdictChip verdict="DISCARD" label="demotes/kills" />
                      <span>{d}</span>
                    </div>
                  ))}
                  {exp.killPromote.promotes.length === 0 && exp.killPromote.demotes.length === 0 && (
                    <span style={{ color: 'var(--text-3)' }}>Bundle note — see individual item rules.</span>
                  )}
                </div>
              </Field>

              {files.length > 0 && (
                <Field label={`Stimulus-pack files serving ${exp.id}`}>
                  <div className="mt-1">
                    {files.map((f) => (
                      <PackFileRow key={f.file} f={f} />
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function ExperimentLab() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [open, setOpen] = useState<Experiment | null>(null);
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    const list = EXPERIMENTS.filter((e) => {
      if (filter === 'all') return true;
      if (filter === 'decisive') return e.advisorDecisive;
      return e.status === filter;
    });
    return [...list].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }, [filter]);

  const renderedCount = PACK_FILES.filter((f) => f.url).length;

  return (
    <ResearchPage
      crumb="RESEARCH / EXPERIMENT LAB"
      title="Experiment Lab"
      lede="The pre-registered protocol registry (G10): 14 experiments that will decide what beat audio actually does. Every card carries a falsifiable prediction, a null-handling rule and its power budget. Nothing here has collected data yet."
    >
      <HonestyBar context="All 14 protocols" />

      <Section
        title="Registry browser"
        aside={
          <div className="flex flex-wrap gap-2">
            {(['all', 'registered', 'pilot', 'parked', 'decisive'] as StatusFilter[]).map((s) => (
              <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                {s === 'all' ? `All · ${EXPERIMENTS.length}` : s === 'decisive' ? 'Decisive & cheap' : EXPERIMENT_STATUS_LABEL[s as ExperimentStatus]}
              </FilterChip>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((e) => (
            <ExperimentCard key={e.id} exp={e} onOpen={setOpen} />
          ))}
        </div>
      </Section>

      <Section title="Global registry rules" aside={<span className="t-label" style={{ color: 'var(--text-3)' }}>apply to every entry</span>}>
        <div className="panel">
          <ol className="list-decimal space-y-2 pl-5">
            {REGISTRY_RULES.map((r, i) => (
              <li key={i} className="t-body-sm" style={{ color: 'var(--text-2)' }}>
                {r}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section
        title="Stimulus pack (S10.3)"
        aside={
          <span className="font-mono2 text-[11px]" style={{ color: 'var(--text-3)' }}>
            {renderedCount} rendered · {PACK_FILES.length - renderedCount} on-demand regeneration
          </span>
        }
      >
        <div className="panel mb-4">
          <p className="t-body-sm" style={{ color: 'var(--text-2)' }}>
            {PACK_NOTE}
          </p>
          <ul className="mt-3 space-y-1">
            {PACK_RENDER_CONTRACT.map((r) => (
              <li key={r} className="t-caption flex gap-2" style={{ color: 'var(--text-3)' }}>
                <span style={{ color: 'var(--teal)' }}>▸</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          {PACK_FILES.map((f) => (
            <PackFileRow key={f.file} f={f} />
          ))}
        </div>
      </Section>

      <Section title="Program-claim kill/promote matrix">
        {isMobile ? (
          <div data-testid="killmatrix-card-list" className="flex flex-col gap-3">
            {KILL_PROMOTE_MATRIX.map((row) => (
              <div key={row.claim} className="panel">
                <div className="t-body-sm font-medium" style={{ color: 'var(--text-1)' }}>{row.claim}</div>
                <div className="font-mono2 mt-1 text-[11px]" style={{ color: 'var(--amber)' }}>
                  DECIDED BY · {row.decidedBy.join(' · ')}
                </div>
                <div className="mt-2">
                  <div className="t-label" style={{ color: 'var(--grade-A)' }}>If confirmed</div>
                  <p className="t-caption mt-0.5" style={{ color: 'var(--text-2)' }}>{row.ifConfirmed}</p>
                </div>
                <div className="mt-2">
                  <div className="t-label" style={{ color: 'var(--danger)' }}>If null / mundane wins</div>
                  <p className="t-caption mt-0.5" style={{ color: 'var(--text-2)' }}>{row.ifNull}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="hairline-b">
                <th className="t-label px-4 py-3" style={{ color: 'var(--text-3)' }}>Program claim</th>
                <th className="t-label px-4 py-3" style={{ color: 'var(--text-3)' }}>Decided by</th>
                <th className="t-label px-4 py-3" style={{ color: 'var(--grade-A)' }}>If confirmed</th>
                <th className="t-label px-4 py-3" style={{ color: 'var(--danger)' }}>If null / mundane wins</th>
              </tr>
            </thead>
            <tbody>
              {KILL_PROMOTE_MATRIX.map((row) => (
                <tr key={row.claim} style={{ borderBottom: '1px solid var(--line-1)' }}>
                  <td className="t-body-sm px-4 py-3" style={{ color: 'var(--text-1)' }}>{row.claim}</td>
                  <td className="font-mono2 px-4 py-3 text-[12px]" style={{ color: 'var(--amber)' }}>
                    {row.decidedBy.join(' · ')}
                  </td>
                  <td className="t-caption px-4 py-3" style={{ color: 'var(--text-2)' }}>{row.ifConfirmed}</td>
                  <td className="t-caption px-4 py-3" style={{ color: 'var(--text-2)' }}>{row.ifNull}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Section>

      <div className="mt-10">
        <ClaimDisciplineNote />
      </div>

      <ExperimentDrawer exp={open} onClose={() => setOpen(null)} />
    </ResearchPage>
  );
}
