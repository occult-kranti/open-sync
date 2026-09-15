/**
 * Module 3 — Presets (design: presets.md). Filterable protocol cards with
 * evidence grades; one-click load into Studio; evidence drawer per preset.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
 import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, X } from 'lucide-react';
import { PRESETS, presetDurationMin, type Preset, type PresetCategory } from '@/data/presets';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { Chip, WarningChip } from '@/ui/components/primitives';
import { useModalA11y } from '@/ui/hooks';
import { MiniPhaseBar } from '@/ui/components/PhaseTimeline';
import { useSession, fmtClock } from '@/ui/session/SessionContext';
import { previewUrlFor, usePreviewManifest } from '@/ui/session/previewManifest';
import { userPresetAsPreset } from '@/ui/session/userPresets';
import { useIsMobile } from '@/hooks/use-mobile';
import { GRADE_COLOR, type GradeLetter } from '@/ui/theme';

const CATS: (PresetCategory | 'All')[] = ['All', 'Sleep', 'Focus', 'Relax', 'Meditate', 'Wellness', 'Experimental', 'Infant'];
const GRADE_RANK: Record<GradeLetter, number> = { A: 3, B: 2, C: 1, D: 0 };
const MIN_GRADES: (GradeLetter | null)[] = [null, 'C', 'B', 'A'];

export default function Presets() {
  const [cat, setCat] = useState<PresetCategory | 'All'>('All');
  const [minGrade, setMinGrade] = useState<GradeLetter | null>(null);
  const [showDimmed, setShowDimmed] = useState(false);
  const [drawer, setDrawer] = useState<Preset | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const { loadPreset, previewPreset, previewUrl, previewId, userPresets, deleteUserPreset } = useSession();
  // Pre-rendered preview files (public/previews); null while the manifest
  // loads or when absent → preview buttons use the live engine fallback.
  const previewManifest = usePreviewManifest();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  // P0-4: Esc closes the evidence sheet, focus moves to its close button on
  // open and returns to the triggering card on close.
  useModalA11y(drawer !== null, () => setDrawer(null), drawerCloseRef);

  const featured = PRESETS.find((p) => p.id === 'sleep-delta-descent') ?? PRESETS[0];

  const filtered = useMemo(
    () =>
      PRESETS.filter((p) => cat === 'All' || p.category === cat).map((p) => ({
        preset: p,
        hidden: minGrade !== null && GRADE_RANK[p.grade] < GRADE_RANK[minGrade],
      })),
    [cat, minGrade],
  );
  const hiddenCount = filtered.filter((f) => f.hidden).length;

  const load = (p: Preset) => {
    setLoadedId(p.id);
    loadPreset(p);
    window.setTimeout(() => navigate('/studio'), 600);
  };

  /**
   * Preview source selection: pre-rendered file (public/previews/<id>.wav)
   * when the manifest covers the preset, else the live engine render. Both
   * paths route through the same SessionContext preview machinery (one at a
   * time, ≤30 s, never dose-debited, panic cuts).
   */
  const playPreview = (p: Preset) => {
    const url = previewUrlFor(p.id, previewManifest);
    if (url) previewUrl(`preset:${p.id}`, url);
    else previewPreset(p);
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Presets</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          Complete session protocols. Filter by what the evidence supports — not by what sounds mystical.
        </p>
        <div className="flex items-center flex-wrap gap-2" style={{ margin: '20px 0' }}>
          {CATS.map((c) => (
            <Chip key={c} active={cat === c} danger={c === 'Experimental'} onClick={() => setCat(c)}>
              {c.toUpperCase()}
            </Chip>
          ))}
          <span className="t-label text-3" style={{ marginLeft: 16 }}>
            MIN GRADE:
          </span>
          {MIN_GRADES.map((g) => (
            <Chip key={g ?? 'any'} active={minGrade === g} color={g ? GRADE_COLOR[g] : undefined} onClick={() => setMinGrade(g)}>
              {g ?? 'ANY'}
            </Chip>
          ))}
          {hiddenCount > 0 && (
            <span className="t-readout-sm text-2 flex items-center gap-2">
              {hiddenCount} of {filtered.length} protocols below evidence filter
              <button
                type="button"
                onClick={() => setShowDimmed((v) => !v)}
                className="chip"
                style={{ height: 22, padding: '0 8px' }}
                title="We dim, not delete: filtered-out protocols stay visible"
              >
                {showDimmed ? <Eye size={11} /> : <EyeOff size={11} />}
                {showDimmed ? 'SHOWN DIMMED' : 'HIDDEN'}
              </button>
            </span>
          )}
        </div>
      </motion.div>

      {/* Featured hero */}
      {cat === 'All' && !minGrade && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="panel panel-interactive grid gap-6"
          style={{ gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr', marginBottom: 24 }}
        >
          <div>
            <Chip>{featured.category.toUpperCase()}</Chip>
            <h2 className="t-h1" style={{ margin: '12px 0' }}>
              {featured.title}
            </h2>
            <GradeBadge
              grade={featured.grade}
              citation={{ verdict: 'Behavioral relaxation evidence; entrainment unproven.', summary: featured.rationale, source: featured.citations[0] }}
            />
            <p className="t-body text-2" style={{ marginTop: 12 }}>
              {featured.rationale}
            </p>
            <div className="flex gap-2" style={{ marginTop: 16 }}>
              <button type="button" className="chip chip-active" onClick={() => load(featured)}>
                LOAD INTO STUDIO
              </button>
              <button
                type="button"
                className={`chip ${previewId === `preset:${featured.id}` ? 'chip-active' : ''}`}
                style={{ minHeight: 40 }}
                aria-label={previewId === `preset:${featured.id}` ? `Stop preview of ${featured.title}` : `Preview first 10 seconds of ${featured.title}`}
                onClick={() => playPreview(featured)}
              >
                {previewId === `preset:${featured.id}` ? '■ STOP' : '▶ PREVIEW'}
              </button>
              <button type="button" className="chip" onClick={() => setDrawer(featured)}>
                INSPECT EVIDENCE
              </button>
            </div>
          </div>
          <div>
            <MiniPhaseBar beats={featured.spec.phases.map((p) => ({ sec: p.durationSec, beat: p.beatHz }))} durationSec={featured.spec.phases.reduce((a, p) => a + p.durationSec, 0)} height={56} />
            <div className="t-readout-sm text-2" style={{ marginTop: 12 }}>
              {featured.spec.phases.map((p) => `${p.beatHz} Hz`).join(' → ')}
            </div>
            <div className="t-readout-sm text-3" style={{ marginTop: 8 }}>
              MODE BINAURAL · CARRIER {featured.spec.phases[0]?.carrierHz} Hz · DURATION {fmtClock(presetDurationMin(featured) * 60)}
            </div>
          </div>
        </motion.div>
      )}

      {/* MY PRESETS — user saves from the Studio "SAVE AS PRESET" flow */}
      {userPresets.length > 0 && (
        <section data-testid="my-presets" style={{ marginBottom: 24 }}>
          <h2 className="t-label text-3" style={{ marginBottom: 8 }}>
            MY PRESETS
          </h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
            {userPresets.map((u) => {
              const asPreset = userPresetAsPreset(u);
              const pid = `preset:${asPreset.id}`;
              const durSec = u.spec.phases.reduce((a, p) => a + p.durationSec, 0);
              return (
                <div key={u.id} className="panel" style={{ padding: 16 }} data-testid={`my-preset-${u.id}`}>
                  <h3 className="t-h3">{u.name}</h3>
                  <div className="t-readout-sm text-3" style={{ margin: '4px 0 10px' }}>
                    {u.spec.phases.map((ph) => `${ph.beatHz} Hz`).join('→')} · ⏱ {fmtClock(durSec)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`my-preset-preview-${u.id}`}
                      className={`chip ${previewId === pid ? 'chip-active' : ''}`}
                      style={{ minHeight: 40 }}
                      aria-label={previewId === pid ? `Stop preview of ${u.name}` : `Preview first 10 seconds of ${u.name}`}
                      onClick={() => previewPreset(asPreset)}
                    >
                      {previewId === pid ? '■ STOP' : '▶ PREVIEW'}
                    </button>
                    <button
                      type="button"
                      className="chip"
                      style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
                      onClick={() => load(asPreset)}
                    >
                      {loadedId === asPreset.id ? 'LOADED ✓' : 'LOAD ↗'}
                    </button>
                    <button
                      type="button"
                      data-testid={`my-preset-delete-${u.id}`}
                      className="chip"
                      style={{ marginLeft: 'auto' }}
                      aria-label={`Delete ${u.name}`}
                      onClick={() => deleteUserPreset(u.id)}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Card grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
        {filtered.map(({ preset: p, hidden }, i) => {
          if (hidden && !showDimmed) return null;
          const experimental = p.category === 'Experimental';
          const dur = presetDurationMin(p);
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: hidden ? 0.3 : 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.4) }}
              className="panel panel-interactive"
              role="button"
              tabIndex={0}
              aria-label={`Inspect evidence for ${p.title}`}
              style={{
                padding: 20,
                borderLeft: experimental ? '3px solid var(--danger)' : undefined,
                cursor: 'pointer',
              }}
              onClick={() => setDrawer(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDrawer(p);
                }
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <Chip danger={experimental}>{p.category.toUpperCase()}</Chip>
                <GradeBadge grade={p.grade} citation={{ verdict: gradeVerdict(p), summary: p.rationale, source: p.citations[0] }} />
              </div>
              <h3 className="t-h2">{p.title}</h3>
              <p className="t-body-sm text-2" style={{ margin: '4px 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.rationale}
              </p>
              <MiniPhaseBar beats={p.spec.phases.map((ph) => ({ sec: ph.durationSec, beat: ph.beatHz }))} durationSec={p.spec.phases.reduce((a, ph) => a + ph.durationSec, 0)} />
              <div className="t-readout-sm text-3" style={{ margin: '8px 0' }}>
                {p.spec.phases.map((ph) => `${ph.beatHz} Hz`).join('→')} · BIN · {p.spec.phases[0]?.carrierHz} Hz
              </div>
              {experimental && (
                <div style={{ marginBottom: 8 }}>
                  <WarningChip tone="danger">Experimental vendor construct — no peer-reviewed basis</WarningChip>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="t-readout-sm text-2">⏱ {fmtClock(dur * 60)}</span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`preset-preview-${p.id}`}
                    className={`chip ${previewId === `preset:${p.id}` ? 'chip-active' : ''}`}
                    style={{ minHeight: 40 }}
                    aria-label={previewId === `preset:${p.id}` ? `Stop preview of ${p.title}` : `Preview first 10 seconds of ${p.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(p);
                    }}
                  >
                    {previewId === `preset:${p.id}` ? '■ STOP' : '▶ PREVIEW'}
                  </button>
                  <button
                    type="button"
                    className="chip"
                    style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      load(p);
                    }}
                  >
                    {loadedId === p.id ? 'LOADED ✓' : 'LOAD ↗'}
                  </button>
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Evidence drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 70 }}
              onClick={() => setDrawer(null)}
            />
            <motion.aside
              initial={isMobile ? { y: '100%' } : { x: 480 }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: 480 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: isMobile ? 0 : undefined,
                width: isMobile ? '100%' : 480,
                maxWidth: isMobile ? '100vw' : '92vw',
                background: 'var(--ink-3)',
                borderLeft: isMobile ? 'none' : '1px solid var(--line-2)',
                zIndex: 71,
                padding: isMobile ? '20px 16px' : 24,
                overflowY: 'auto',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <span className="t-label">PRESET SPEC SHEET</span>
                <button
                  type="button"
                  ref={drawerCloseRef}
                  aria-label="Close spec sheet"
                  onClick={() => setDrawer(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
              <h2 className="t-h2" style={{ marginBottom: 8 }}>
                {drawer.title}
              </h2>
              <GradeBadge grade={drawer.grade} citation={{ verdict: gradeVerdict(drawer), summary: drawer.rationale, source: drawer.citations[0] }} />
              <div className="t-readout-sm text-2 flex flex-col gap-1" style={{ margin: '16px 0', borderTop: '1px solid var(--line-1)', paddingTop: 12 }}>
                {drawer.spec.phases.map((ph, i) => (
                  <span key={i}>
                    PHASE {i + 1} · {ph.name.toUpperCase()} · {fmtClock(ph.durationSec)} · CARRIER {ph.carrierHz} Hz · BEAT {ph.beatHz} Hz · {ph.gainDbFs} dBFS
                    {ph.rampSec ? ` · RAMP ${ph.rampSec}s` : ''}
                  </span>
                ))}
                <span>AUTO-SHUTOFF {drawer.spec.autoShutoff ? 'ON' : 'OFF'} · DURATION {fmtClock(presetDurationMin(drawer) * 60)}</span>
              </div>
              <h3 className="t-h3" style={{ marginBottom: 8 }}>
                Evidence
              </h3>
              <p className="t-body-sm text-2" style={{ marginBottom: 12 }}>
                {drawer.rationale}
              </p>
              {drawer.id === 'focus-beta-block' && (
                <div
                  className="t-body-sm"
                  style={{ borderLeft: '2px solid var(--danger)', background: 'var(--ink-0)', padding: 12, marginBottom: 12, color: 'var(--text-2)' }}
                >
                  Largest RCT to date (n=1000) found 15 Hz binaural beats worsened fluid-intelligence performance during
                  listening. We ship this preset because users ask for it — with the finding attached.
                </div>
              )}
              {drawer.citations.map((c) => (
                <p key={c} className="t-caption font-mono2 text-3" style={{ marginBottom: 6 }}>
                  ▸ {c}
                </p>
              ))}
              <div className="flex gap-2" style={{ marginTop: 20 }}>
                <button type="button" className="chip chip-active" onClick={() => load(drawer)}>
                  LOAD INTO STUDIO
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function gradeVerdict(p: Preset): string {
  if (p.grade === 'B') return 'Some human evidence (small pilots / meta-analytic support).';
  if (p.grade === 'C') return 'Plausible mechanism; indirect, inconsistent, or contradicted evidence.';
  if (p.grade === 'D') return 'No physiological evidence — shipped as texture/history, not therapy.';
  return 'Solid, replicated evidence.';
}
