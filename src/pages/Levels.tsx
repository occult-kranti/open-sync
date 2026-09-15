/**
 * Module 4 — Deep Focus Levels (design: levels.md). Discrete Gateway-inspired
 * levels on a depth-gauge ladder + the historically accurate 1983 CIA
 * Gateway report exhibit. Presents history as history, claims as claims.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { FOCUS_LEVELS, gatewayHistory } from '@/data/levels';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { WarningChip } from '@/ui/components/primitives';
import { useSession } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { depthColor } from '@/ui/theme';

/** Ladder rungs: singles + grouped bands (levels.md). */
const RUNGS: { label: string; levels: number[] }[] = [
  { label: 'F10', levels: [10] },
  { label: 'F12', levels: [12] },
  { label: 'F15', levels: [15] },
  { label: 'F21', levels: [21] },
  { label: 'F23–27', levels: [23, 24, 25, 26, 27] },
  { label: 'F34–35', levels: [34, 35] },
  { label: 'F42', levels: [42] },
  { label: 'F49', levels: [49] },
];

/** Neutral protocol beat (Hz) per level — audio structure, not a brain-state claim. */
const BEAT_FOR: Record<number, number> = { 10: 10, 12: 12, 15: 6, 21: 4, 23: 3.5, 24: 3.2, 25: 3, 26: 2.8, 27: 2.5, 34: 2.2, 35: 2, 42: 1.8, 49: 1.5 };

const CIA_FACTS: [string, string][] = [
  ['DOC ID', 'CIA-RDP96-00788R001700210016-5'],
  ['DATE', '9 June 1983'],
  ['AUTHOR', 'Lt. Col. Wayne M. McDonnell, US Army INSCOM'],
  ['TYPE', 'Theoretical literature assessment — no experiments'],
  ['GPO', 'SuDoc D 101.2:G 22'],
  ['RELEASED', 'FOIA, September 2003 (page 25 absent)'],
];

export default function Levels() {
  const [sel, setSel] = useState(10);
  const [page25Open, setPage25Open] = useState(false);
  // Tracks WHICH level was loaded — selecting another level must not keep
  // showing "LOADED ✓" for a protocol that was never sent to the engine.
  const [loadedLevel, setLoadedLevel] = useState<number | null>(null);
  const { loadFrequency } = useSession();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const level = useMemo(() => FOCUS_LEVELS.find((l) => l.level === sel) ?? FOCUS_LEVELS[0], [sel]);
  const grade = sel <= 15 ? 'C' : 'D';
  const depthT = (RUNGS.findIndex((r) => r.levels.includes(sel)) + 1) / RUNGS.length;

  const loadProtocol = () => {
    loadFrequency(BEAT_FOR[sel] ?? 6, `LEVEL F${sel} · ${level.name.toUpperCase()}`);
    setLoadedLevel(sel);
    window.setTimeout(() => navigate('/studio'), 600);
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Deep Focus Levels</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          Structured protocols inspired by the Monroe Institute's Gateway program — neutral naming, corrected level
          numbering, honest grading.
        </p>
        <div
          className="t-body-sm"
          style={{
            background: 'var(--ink-2)',
            borderLeft: '2px solid var(--amber)',
            padding: '12px 16px',
            margin: '20px 0 28px',
            color: 'var(--text-2)',
          }}
        >
          The original platform's "Focus 1–49" continuum is corrected here to the discrete levels the Gateway program
          actually used. These labels describe <em>audio protocol structures</em>. Claims of altered consciousness,
          out-of-body experience, or remote perception are <strong>unvalidated (Grade D)</strong> and are presented as
          history, not promise.
        </div>
      </motion.div>

      <div className="grid gap-6" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
        {/* Ladder — vertical depth gauge on desktop, horizontal rung strip on mobile */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 3', minWidth: 0 }}>
          {isMobile ? (
            <div>
              <div
                className="flex gap-3"
                style={{ overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}
                aria-label="Focus level selector"
              >
                {RUNGS.map((r) => {
                  const active = r.levels.includes(sel);
                  return (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setSel(r.levels[0])}
                      className="flex flex-col items-center gap-1"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                    >
                      <span
                        className="t-readout-md flex items-center justify-center"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          border: `2px solid ${depthColor(RUNGS.indexOf(r) / (RUNGS.length - 1))}`,
                          color: active ? 'var(--amber)' : 'var(--text-2)',
                          background: active ? 'rgba(217,164,65,0.12)' : 'transparent',
                          transition: 'all 200ms',
                        }}
                      >
                        {r.label.replace('F', '')}
                      </span>
                      <span className="t-readout-sm text-3">{BEAT_FOR[r.levels[0]]} Hz</span>
                    </button>
                  );
                })}
              </div>
              {RUNGS.find((r) => r.levels.includes(sel) && r.levels.length > 1) && (
                <div className="flex flex-wrap gap-1" style={{ paddingBottom: 8 }}>
                  {RUNGS.find((r) => r.levels.includes(sel))!.levels.map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      className={`chip ${sel === lv ? 'chip-active' : ''}`}
                      onClick={() => setSel(lv)}
                    >
                      F{lv}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                <GradeBadge grade="D" compact />
                <span className="t-caption text-3">Consciousness claims beyond relaxation: Grade D throughout.</span>
              </div>
            </div>
          ) : (
          <div style={{ position: 'sticky', top: 64 }} className="flex gap-4">
            <div style={{ width: 2, alignSelf: 'stretch', background: 'var(--ink-4)', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 2,
                  height: `${depthT * 100}%`,
                  background: 'var(--amber)',
                  transition: 'height 300ms',
                }}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="t-readout-sm text-3" title="Subjective depth, not a measured quantity">
                AWAKE
              </span>
              {RUNGS.map((r) => {
                const active = r.levels.includes(sel);
                return (
                  <div key={r.label}>
                    <button
                      type="button"
                      onClick={() => setSel(r.levels[0])}
                      className="flex items-center gap-3 w-full"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
                    >
                      <span
                        className="t-readout-md flex items-center justify-center"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          border: `2px solid ${depthColor(RUNGS.indexOf(r) / (RUNGS.length - 1))}`,
                          color: active ? 'var(--amber)' : 'var(--text-2)',
                          background: active ? 'rgba(217,164,65,0.12)' : 'transparent',
                          transition: 'all 200ms',
                        }}
                      >
                        {r.label.replace('F', '')}
                      </span>
                      <span className="t-readout-sm text-3">{BEAT_FOR[r.levels[0]]} Hz</span>
                      {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />}
                    </button>
                    {r.levels.length > 1 && active && (
                      <div className="flex flex-wrap gap-1" style={{ paddingLeft: 48, paddingBottom: 8 }}>
                        {r.levels.map((lv) => (
                          <button
                            key={lv}
                            type="button"
                            className={`chip ${sel === lv ? 'chip-active' : ''}`}
                            style={{ height: 22, fontSize: 10 }}
                            onClick={() => setSel(lv)}
                          >
                            F{lv}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <span className="t-readout-sm text-3" title="Subjective depth, not a measured quantity">
                DEEP
              </span>
              <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
                <GradeBadge grade="D" compact />
                <span className="t-caption text-3">Consciousness claims beyond relaxation: Grade D throughout.</span>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 5', minWidth: 0 }}>
          <motion.div key={sel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="panel">
            <div className="flex items-baseline gap-4" style={{ marginBottom: 8 }}>
              <span className="t-display-xl font-mono2" style={{ color: 'var(--amber)', fontSize: 48 }}>
                F{sel}
              </span>
              <div>
                <h2 className="t-h1" title="Neutral renaming of Monroe's Focus levels — Hemi-Sync® is a live trademark; we don't use it.">
                  {level.name}
                </h2>
                <GradeBadge
                  grade={grade as 'C' | 'D'}
                  citation={{
                    verdict:
                      grade === 'C'
                        ? 'Relaxation structure plausible; specific protocol untested.'
                        : 'Consciousness claims at this level: unvalidated.',
                    summary:
                      'No peer-reviewed studies on this specific protocol. Gateway-program internal research (~20,000 participants claimed) produced no controlled efficacy trials.',
                    source: 'CIA-RDP96-00788R001700210016-5 (1983); see Knowledge Base',
                  }}
                />
              </div>
            </div>
            <p className="t-body text-2" style={{ margin: '12px 0' }}>
              {level.description} Protocol: {BEAT_FOR[sel]} Hz binaural beat on a 100–200 Hz carrier, 20–40 minutes.
            </p>
            <div className="t-readout-sm text-3" style={{ marginBottom: 16 }}>
              MODE BINAURAL · CARRIER 100–200 Hz · BEAT {BEAT_FOR[sel]} Hz · DURATION 20–40:00 · GUIDANCE OFF
            </div>
            <div style={{ background: 'var(--ink-0)', border: '1px solid var(--line-1)', padding: 16, marginBottom: 16 }}>
              <span className="t-label">WHAT THE EVIDENCE SAYS</span>
              <ul className="t-body-sm text-2" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                <li>No peer-reviewed studies on this specific protocol.</li>
                <li>Gateway internal research (~20,000 participants claimed) produced no controlled efficacy trials.</li>
                <li>
                  Relaxation and expectancy effects are plausible (Grade C); anything beyond is Grade D.
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button type="button" className="chip chip-active" onClick={loadProtocol}>
                {loadedLevel === sel ? 'LOADED ✓' : 'LOAD PROTOCOL'}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Historical panel */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="panel">
            <span className="t-label">ARCHIVE EXHIBIT</span>
            <h2 className="t-h2" style={{ margin: '8px 0 16px' }}>
              Analysis and Assessment of Gateway Process
            </h2>
            <div className="flex flex-col gap-2" style={{ marginBottom: 16 }}>
              {CIA_FACTS.map(([k, v]) => (
                <div key={k} className="flex gap-3 hairline-b" style={{ paddingBottom: 6 }}>
                  <span className="t-label" style={{ width: 76, flexShrink: 0 }}>
                    {k}
                  </span>
                  <span className="t-readout-sm" style={{ color: 'var(--text-1)' }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="t-body-sm text-2" style={{ marginBottom: 12 }}>
              An Army intelligence officer's 29-page theoretical assessment of the Monroe Institute's Gateway training,
              blending biomedical models, Bentov's vibrational model, and Bohm/Pribram's holographic-brain ideas. It
              concluded the technique was "plausible … in terms of its essential objectives." It contains{' '}
              <strong>no experimental data</strong>. It was hosted by the CIA because it was swept into the STAR GATE
              FOIA release — the CIA did not conduct this research.
            </p>
            <blockquote
              className="t-body-sm"
              style={{
                borderLeft: '2px solid var(--teal)',
                paddingLeft: 12,
                fontStyle: 'italic',
                color: 'var(--text-1)',
                marginBottom: 4,
              }}
            >
              "There is a sound and rational basis in terms of physical science parameters for considering Gateway to be
              plausible in terms of its essential objectives."
            </blockquote>
            <p className="t-caption text-3" style={{ marginBottom: 12 }}>
              — McDonnell, CIA-RDP96-00788R001700210016-5 (1983)
            </p>
            <button type="button" className="chip" onClick={() => setPage25Open((v) => !v)} style={{ marginBottom: 8 }}>
              THE MISSING PAGE 25 {page25Open ? '▾' : '▸'}
            </button>
            {page25Open && (
              <p className="t-body-sm text-2" style={{ marginBottom: 12 }}>
                The 2003 release omitted page 25. In April 2021, Vice published a copy sourced from the Monroe
                Institute's own archives — cosmology and belief-system discussion, widely considered anticlimactic. CIA
                has never confirmed the resurfaced page's authenticity. (Confidence: HIGH that it was missing; MEDIUM on
                authenticity.)
              </p>
            )}
            <WarningChip tone="danger">
              Government interest ≠ validation. NIH/DARPA funding (NIA R01AG069232, NCCIH R01AT011460, DARPA TNT)
              evaluates basic science — it does not endorse consumer claims.
            </WarningChip>
            <p className="t-caption text-3" style={{ marginTop: 12 }}>
              {gatewayHistory.slice(0, 140)}…{' '}
              <a href="/knowledge" style={{ color: 'var(--teal-hi)' }} onClick={(e) => { e.preventDefault(); navigate('/knowledge'); }}>
                Full record in Knowledge Base →
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
