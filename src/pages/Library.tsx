/**
 * Module 2 — Frequency Library (design: library.md). Audited catalog with
 * grade badges, citation popovers, preview tones, corrected-Schumann callout.
 * Honesty principle: filtered-out rows dim, never vanish.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { FREQUENCIES, type FrequencyEntry } from '@/data/frequencies';
import { GradeBadge, GradeLegend } from '@/ui/components/GradeBadge';
import { Chip } from '@/ui/components/primitives';
import { useSession } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { GRADE_COLOR, type GradeLetter } from '@/ui/theme';

interface Category {
  id: string;
  label: string;
  match: (e: FrequencyEntry) => boolean;
  bestGrade: GradeLetter;
  verdict: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'bands',
    label: 'BRAINWAVE BANDS',
    match: (e) => e.id.startsWith('band-') || e.id === 'gamma-40',
    bestGrade: 'C',
    verdict:
      'Band definitions are standard EEG conventions (Grade B). The claim that audio beats at these rates induce the band is unproven (Grade C; 8/14 EEG studies contradict). Lambda (100–200 Hz) and Epsilon (<0.5 Hz) have no peer-reviewed basis — experimental vendor constructs, Grade D.',
  },
  {
    id: 'schumann',
    label: 'SCHUMANN RESONANCES',
    match: (e) => e.id.startsWith('schumann-'),
    bestGrade: 'A',
    verdict:
      'Real geophysics (Grade A). Note: playback through speakers is a simulation of an electromagnetic phenomenon, not the phenomenon itself. Values below are corrected to measured modes (Balser & Wagner 1960; Hylaty station).',
  },
  {
    id: 'solfeggio',
    label: 'SOLFEGGIO + TUNING',
    match: (e) => e.id.startsWith('solfeggio-') || e.id === 'tuning-432',
    bestGrade: 'D',
    verdict:
      '1970s–1999 numerology construct (Puleo/Horowitz), falsely backdated to an 11th-century monk. No physiological evidence. Grade D. 432 Hz has small-pilot human data and is graded separately (B−).',
  },
  {
    id: 'chakra',
    label: 'CHAKRA',
    match: (e) => e.id.startsWith('chakra-'),
    bestGrade: 'D',
    verdict: 'Arithmetically consistent, physiologically unevidenced. Grade D.',
  },
  {
    id: 'planetary',
    label: 'PLANETARY (COUSTO)',
    match: (e) => e.id.startsWith('planetary-'),
    bestGrade: 'D',
    verdict:
      "Cousto's octave-of-orbital-period arithmetic is astronomically accurate; the therapeutic inference has zero evidence. Arithmetically consistent, physiologically unevidenced.",
  },
  {
    id: 'fibonacci',
    label: 'FIBONACCI',
    match: (e) => e.id.startsWith('fibonacci-'),
    bestGrade: 'D',
    verdict: 'Arithmetically consistent, physiologically unevidenced. Grade D.',
  },
  {
    id: 'angel',
    label: 'ANGEL NUMBERS',
    match: (e) => e.id.startsWith('angel-'),
    bestGrade: 'D',
    verdict: 'Arithmetically consistent, physiologically unevidenced. Grade D.',
  },
];

/** Corrected original-platform values (struck through, never deleted). */
const CORRECTED_FROM: Record<string, number> = {
  'schumann-mode-2': 14.3,
  'schumann-mode-3': 20.8,
  'schumann-mode-4': 27.3,
  'schumann-mode-5': 33.8,
};

export default function Library() {
  const [catId, setCatId] = useState('schumann');
  const [gradeFilter, setGradeFilter] = useState<GradeLetter | null>(null);
  const [query, setQuery] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const { loadFrequency, previewHz } = useSession();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const cat = CATEGORIES.find((c) => c.id === catId)!;
  const rows = useMemo(() => FREQUENCIES.filter(cat.match), [cat]);
  const searchRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return FREQUENCIES.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.hz !== undefined && String(e.hz).includes(q)),
    );
  }, [query]);

  const load = (e: FrequencyEntry) => {
    const hz = e.hz ?? e.band?.minHz ?? 10;
    setLoadedId(e.id);
    loadFrequency(hz, e.name);
    window.setTimeout(() => navigate('/studio'), 600);
  };

  const display = searchRows ?? rows;

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Frequency Library</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          Every set we ship, graded. Corrected where the originals were wrong.
        </p>
        <div className="flex items-center flex-wrap" style={{ margin: '20px 0', gap: 0 }}>
          {[
            { n: '7', label: 'SETS AUDITED' },
            { n: String(FREQUENCIES.length), label: 'FREQUENCIES' },
            { n: '1', label: 'GRADE-A SET', color: 'var(--teal)' },
            { n: '1839→2026', label: 'EVIDENCE SPAN' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '0 24px',
                borderLeft: i > 0 ? '1px solid var(--line-1)' : 'none',
              }}
            >
              <div className="t-readout-lg" style={{ color: s.color ?? 'var(--text-1)' }}>
                {s.n}
              </div>
              <div className="t-label">{s.label}</div>
            </div>
          ))}
          <div className="flex items-center gap-2 flex-wrap" style={{ marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : undefined, marginTop: isMobile ? 12 : 0 }}>
            <Chip active={gradeFilter === null} onClick={() => setGradeFilter(null)}>
              ALL
            </Chip>
            {(['A', 'B', 'C', 'D'] as GradeLetter[]).map((g) => (
              <Chip key={g} active={gradeFilter === g} color={GRADE_COLOR[g]} onClick={() => setGradeFilter(gradeFilter === g ? null : g)}>
                {g}
              </Chip>
            ))}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search Hz or name…"
              className="font-mono2"
              style={{
                width: isMobile ? '100%' : 240,
                flex: isMobile ? '1 1 100%' : undefined,
                background: 'var(--ink-3)',
                border: '1px solid var(--line-1)',
                borderRadius: 2,
                color: 'var(--text-1)',
                caretColor: 'var(--amber)',
                padding: '6px 10px',
                fontSize: 12,
              }}
            />
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
        {/* Category nav — horizontal scroll-chip row on mobile */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 3' }}>
          <div
            style={
              isMobile
                ? { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }
                : { position: 'sticky', top: 64 }
            }
          >
            {CATEGORIES.map((c) => {
              const count = FREQUENCIES.filter(c.match).length;
              const active = c.id === catId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatId(c.id)}
                  className="flex items-center gap-2 w-full"
                  style={{
                    padding: '12px 12px',
                    background: active ? 'var(--ink-2)' : 'transparent',
                    borderLeft: active && !isMobile ? '2px solid var(--amber)' : '2px solid transparent',
                    borderBottom: active && isMobile ? '2px solid var(--amber)' : isMobile ? '2px solid transparent' : undefined,
                    borderTop: 'none',
                    borderRight: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...(isMobile ? { width: 'auto', flexShrink: 0, whiteSpace: 'nowrap' as const } : null),
                  }}
                >
                  <span className="t-label" style={{ color: active ? 'var(--amber)' : 'var(--text-2)', flex: 1 }}>
                    {c.label}
                  </span>
                  <GradeBadge grade={c.bestGrade} compact />
                  <span className="t-readout-sm text-3">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 9', minWidth: 0 }}>
          <h2 className="t-h2">{cat.label}</h2>
          <div
            className="t-body-sm"
            style={{
              background: 'var(--ink-2)',
              borderLeft: `2px solid ${GRADE_COLOR[cat.bestGrade]}`,
              padding: '12px 16px',
              margin: '12px 0 20px',
              color: 'var(--text-2)',
            }}
          >
            {cat.verdict}
          </div>
          {searchRows && (
            <div className="t-label text-3" style={{ margin: '0 0 12px' }}>
              FROM OTHER SETS — {searchRows.length} MATCH{searchRows.length === 1 ? '' : 'ES'}
            </div>
          )}

          {/* table header — desktop only (mobile renders stacked cards) */}
          {!isMobile && (
            <div
              className="grid t-label hairline-b"
              style={{ gridTemplateColumns: '110px 1fr 130px 110px 1fr 170px', gap: 12, padding: '8px 4px', color: 'var(--text-3)' }}
            >
              <span style={{ textAlign: 'right' }}>FREQUENCY</span>
              <span>NAME / CLAIM</span>
              <span>BAND / ORIGIN</span>
              <span>GRADE</span>
              <span>EVIDENCE</span>
              <span style={{ textAlign: 'right' }}>ACTION</span>
            </div>
          )}
          <div data-testid={isMobile ? 'library-card-list' : 'library-table'} className={isMobile ? 'flex flex-col gap-3' : undefined}>
          {display.map((e, i) => {
            const dimmed = gradeFilter !== null && e.grade !== gradeFilter && e.secondaryGrade !== gradeFilter;
            const experimental = e.id === 'band-lambda' || e.id === 'band-epsilon';
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: dimmed ? 0.3 : 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.4) }}
                className={isMobile ? 'panel flex flex-col gap-2' : 'grid items-center'}
                title={dimmed ? "We dim, not delete: filtered-out rows stay visible." : undefined}
                style={
                  isMobile
                    ? {
                        padding: '14px 14px',
                        borderLeft: experimental ? '3px solid var(--danger)' : undefined,
                        background: experimental ? 'repeating-linear-gradient(-45deg, rgba(196,99,79,0.06) 0 4px, transparent 4px 10px)' : undefined,
                      }
                    : {
                        gridTemplateColumns: '110px 1fr 130px 110px 1fr 170px',
                        gap: 12,
                        padding: '12px 4px',
                        minHeight: 48,
                        borderBottom: '1px solid var(--line-1)',
                        borderLeft: experimental ? '3px solid transparent' : 'none',
                        background: experimental ? 'repeating-linear-gradient(-45deg, rgba(196,99,79,0.06) 0 4px, transparent 4px 10px)' : undefined,
                      }
                }
              >
                <span className="t-readout-md" style={{ textAlign: isMobile ? 'left' : 'right', color: 'var(--text-1)' }}>
                  {e.hz !== undefined ? (
                    <>
                      {e.hz}
                      <span className="text-3" style={{ fontSize: '0.85em' }}>
                        {'\u2009'}Hz
                      </span>
                    </>
                  ) : (
                    <>
                      {e.band!.minHz}–{e.band!.maxHz}
                      <span className="text-3" style={{ fontSize: '0.85em' }}>
                        {'\u2009'}Hz
                      </span>
                    </>
                  )}
                </span>
                <span>
                  <span className="t-body-sm" style={{ color: 'var(--text-1)' }}>
                    {e.name}
                  </span>
                  {CORRECTED_FROM[e.id] && (
                    <span className="t-caption text-3" style={{ display: 'block' }}>
                      was <s>{CORRECTED_FROM[e.id].toFixed(2)} Hz</s> → corrected to measured mode
                    </span>
                  )}
                  {e.id.startsWith('schumann-') && (
                    <span className="t-caption" style={{ display: 'block', color: 'var(--teal)' }}>
                      ±0.5 Hz drift with ionosphere conditions — live: Tomsk SOS, Hylaty
                    </span>
                  )}
                </span>
                <span className="t-label text-3" style={{ fontSize: 10 }}>
                  {e.band ? 'EEG BAND' : e.id.split('-')[0].toUpperCase()}
                </span>
                <span className="flex gap-1">
                  <GradeBadge
                    grade={e.grade}
                    minus={e.id === 'tuning-432'}
                    compact
                    citation={{ verdict: shortVerdict(e), summary: e.note, source: e.citation }}
                  />
                  {e.secondaryGrade && (
                    <GradeBadge
                      grade={e.secondaryGrade}
                      compact
                      citation={{ verdict: `Secondary grade (${e.secondaryScope ?? 'claims'})`, summary: e.note, source: e.citation }}
                    />
                  )}
                </span>
                <span
                  className="t-caption text-3"
                  style={isMobile ? undefined : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={e.note}
                >
                  {e.note}
                </span>
                <span className={isMobile ? 'flex gap-2' : 'flex gap-2 justify-end'} style={isMobile ? { alignSelf: 'stretch' } : undefined}>
                  <button type="button" className="chip" onClick={() => previewHz(e.hz ?? e.band?.minHz ?? 10)} title="Preview tone (2.5 s; sub-40 Hz values preview as a binaural beat)" aria-label={`Preview ${e.name}`}>
                    <Play size={11} />
                  </button>
                  <button
                    type="button"
                    className="chip"
                    style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
                    onClick={() => load(e)}
                  >
                    {loadedId === e.id ? 'LOADED ✓' : 'LOAD ↗'}
                  </button>
                </span>
              </motion.div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Footer: grade legend */}
      <div style={{ borderTop: '1px solid var(--line-1)', marginTop: 40, paddingTop: 20 }} className="flex items-center justify-between flex-wrap gap-4">
        <GradeLegend />
        <a href="/about" className="t-caption" style={{ color: 'var(--teal-hi)' }} onClick={(ev) => { ev.preventDefault(); navigate('/about'); }}>
          How we grade → About/Method
        </a>
      </div>
    </div>
  );
}

function shortVerdict(e: FrequencyEntry): string {
  if (e.id.startsWith('schumann')) return 'Real geophysics; audio playback is a simulation.';
  if (e.id === 'tuning-432') return 'Real but tiny effects vs 440 Hz (small pilots).';
  if (e.id.startsWith('planetary')) return 'Arithmetic exact; therapy claim unevidenced.';
  if (e.id.startsWith('band-lambda') || e.id.startsWith('band-epsilon')) return 'Experimental vendor construct — no peer-reviewed basis.';
  if (e.id.startsWith('band-')) return 'Standard EEG taxonomy; entrainment claim separate.';
  return 'Graded claim — see evidence.';
}
