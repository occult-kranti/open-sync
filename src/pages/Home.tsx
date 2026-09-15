/**
 * Home — landing (replaces the old redirect-to-Studio placeholder).
 * Hero (procedural audio-visual), honest "what is this", module grid cards,
 * 60-second quick start, manifesto link. All module card copy renders from
 * src/docs/features.ts — the single source of truth shared with the Guide.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Activity,
  Archive,
  ArrowRight,
  AudioWaveform,
  BookMarked,
  BookOpen,
  Compass,
  FlaskConical,
  Gauge,
  Grid3x3,
  Info,
  Layers,
  ListChecks,
  MessageSquareWarning,
  Moon,
  Repeat,
  ShieldAlert,
} from 'lucide-react';
import { FEATURES, featuresByModule, type FeatureEntry } from '@/docs/features';
import { useIsMobile } from '@/hooks/use-mobile';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { GRADE_COLOR, LINE, TEXT, AMBER, TEAL, MONO, type GradeLetter } from '@/ui/theme';

const MODULE_ICON: Record<string, typeof Info> = {
  Guide: Compass,
  Studio: AudioWaveform,
  Library: BookOpen,
  Presets: Layers,
  Levels: Gauge,
  Analyzer: Activity,
  Safety: ShieldAlert,
  Knowledge: BookMarked,
  About: Info,
  'Experiment Lab': FlaskConical,
  'Critique Library': MessageSquareWarning,
  'Hypothesis Tracker': ListChecks,
  'Programs Archive': Archive,
  'Cymatic Studio': Grid3x3,
  'Sleep & Dream': Moon,
  'Replication Bay': Repeat,
};

const GRADE_ORDER: GradeLetter[] = ['A', 'B', 'C', 'D'];

/** Weakest (most conservative) grade among a module's graded features. */
function weakestGrade(entries: FeatureEntry[]): GradeLetter | null {
  let worst: GradeLetter | null = null;
  for (const e of entries) {
    if (!e.grade) continue;
    if (!worst || GRADE_ORDER.indexOf(e.grade) > GRADE_ORDER.indexOf(worst)) worst = e.grade;
  }
  return worst;
}

function firstSentence(text: string): string {
  const i = text.indexOf('. ');
  return i === -1 ? text : text.slice(0, i + 1);
}

/**
 * Procedural hero: a teal/amber carrier pair drifting in phase, with the
 * difference-frequency envelope drawn below — the binaural idea, visualized.
 */
function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = LINE[1];
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const mid = h * 0.42;
      const amp = h * 0.16;
      const k = (Math.PI * 2 * 6) / Math.max(1, w); // ~6 cycles across
      const detune = 0.55; // slow relative drift between the pair

      const trace = (color: string, phaseMul: number, glow: boolean) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = mid + amp * Math.sin(k * x - t * 1.2 * phaseMul);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = glow ? 6 : 0;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      trace(TEAL, 1, true);
      trace(AMBER, detune, true);

      // beat envelope of the sum, drawn underneath
      const envMid = h * 0.8;
      const envAmp = h * 0.1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const s =
          Math.sin(k * x - t * 1.2) + Math.sin(k * x - t * 1.2 * detune);
        const y = envMid + envAmp * 0.5 * s;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `${AMBER}66`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = MONO(10);
      ctx.fillStyle = TEXT[3];
      ctx.fillText('L 440.00 Hz', 12, mid - amp - 10);
      ctx.fillText('R 444.00 Hz', 12, mid + amp + 20);
      ctx.fillText('BEAT 4.00 Hz', 12, envMid + envAmp + 16);

      if (!reduced) raf = requestAnimationFrame((now) => draw(now / 1000));
    };
    draw(performance.now() / 1000);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

const QUICK_START = [
  'Put on headphones — binaural needs one tone per ear.',
  'Open the Studio and press START SESSION.',
  'Keep the volume low; comfort beats intensity.',
  'Watch the Visualizer confirm what is actually playing.',
];

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const groups = useMemo(() => {
    const g = featuresByModule();
    g.delete('Home');
    return [...g.entries()];
  }, []);

  return (
    <div style={{ paddingBottom: 64 }}>
      {/* HERO */}
      <div
        className="relative flex items-end"
        style={{
          height: '64vh',
          minHeight: 400,
          background: 'linear-gradient(180deg, var(--ink-1), var(--ink-0))',
          borderBottom: '1px solid var(--line-1)',
          overflow: 'hidden',
        }}
      >
        <HeroCanvas />
        <div style={{ position: 'relative', padding: isMobile ? '0 20px 40px' : '0 64px 56px', maxWidth: 980 }}>
          <motion.span
            className="t-label"
            style={{ color: 'var(--teal-hi)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            OPEN SYNC — EVIDENCE-HONEST AUDIO LABORATORY
          </motion.span>
          <motion.h1
            className="t-display-xl"
            style={{ margin: '12px 0 16px', color: 'var(--text-1)', fontSize: 'clamp(30px, 9vw, 56px)', lineHeight: 1.05 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            GENERATE. MEASURE. VERIFY.
          </motion.h1>
          <motion.p
            className="t-body"
            style={{ color: 'var(--text-2)', maxWidth: 640, marginBottom: 24 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            A brainwave-audio instrument that grades its own claims. Every frequency
            travels with an evidence badge; every meter shows real data.
          </motion.p>
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            <button
              type="button"
              onClick={() => navigate('/studio')}
              style={{
                height: 36,
                padding: '0 16px',
                background: 'var(--amber)',
                color: 'var(--text-inv)',
                border: 'none',
                borderRadius: 2,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              OPEN STUDIO
            </button>
            <button
              type="button"
              onClick={() => navigate('/guide')}
              className="t-label"
              style={{
                height: 36,
                padding: '0 16px',
                background: 'transparent',
                color: 'var(--text-1)',
                border: '1px solid var(--line-2)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              READ THE GUIDE
            </button>
          </motion.div>
        </div>
      </div>

      <div style={{ padding: isMobile ? '32px 16px 0' : '48px 40px 0', maxWidth: 1440, margin: '0 auto' }}>
        {/* WHAT IS THIS */}
        <motion.section
          className="panel"
          style={{ marginBottom: 48, borderLeft: `2px solid ${AMBER}` }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="t-h2" style={{ marginBottom: 12 }}>
            What is this?
          </h2>
          <p className="t-body" style={{ color: 'var(--text-2)', maxWidth: 880 }}>
            Open Sync is an open replication — and correction — of a classic
            brainwave-synchronization-style audio platform. It generates binaural,
            monaural, and isochronic sessions with the full instrument stack
            (noise, nature layers, phase sequencing, WAV export), then measures its
            own output and grades every claim it makes from A to D. Some of what is
            here is replicated physics; some is folklore kept visible on purpose,
            labeled as folklore, so you can see exactly where the evidence ends.
            Nothing is hidden, nothing is oversold, and every badge opens its
            citation.
          </p>
          <Link
            to="/about"
            className="t-label"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--teal-hi)',
              marginTop: 16,
              textDecoration: 'none',
            }}
          >
            READ THE HONESTY MANIFESTO <ArrowRight size={12} />
          </Link>
        </motion.section>

        {/* QUICK START */}
        <motion.section
          style={{ marginBottom: 48 }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2 className="t-h2">First session in 60 seconds</h2>
            <span className="t-label text-3">QUICK START</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {QUICK_START.map((step, i) => (
              <div key={step} className="panel" style={{ padding: 16 }}>
                <span className="t-readout-lg" style={{ color: 'var(--amber)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="t-body-sm text-2" style={{ marginTop: 8 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* MODULE GRID */}
        <section>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h2 className="t-h2">Modules</h2>
            <span className="t-label text-3">
              {FEATURES.length} DOCUMENTED FEATURES · ONE DATA SOURCE
            </span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
            {groups.map(([module, entries], gi) => {
              const rep = entries[0];
              const Icon = MODULE_ICON[module] ?? Info;
              const grade = weakestGrade(entries);
              const pending = entries.every((e) => e.status === 'in-verification');
              return (
                <motion.div
                  key={module}
                  className="panel panel-interactive flex flex-col"
                  style={{ padding: 20, opacity: pending ? 0.75 : 1 }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: pending ? 0.75 : 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: Math.min(gi * 0.04, 0.3) }}
                >
                  <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                    <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />
                    <span className="t-label" style={{ color: 'var(--text-1)', flex: 1 }}>
                      {module.toUpperCase()}
                    </span>
                    {pending ? (
                      <span
                        className="t-caption font-mono2"
                        style={{
                          color: 'var(--text-3)',
                          border: '1px dashed var(--line-2)',
                          borderRadius: 2,
                          padding: '2px 6px',
                          fontSize: 10,
                        }}
                      >
                        IN VERIFICATION
                      </span>
                    ) : (
                      grade && (
                        <span
                          className="t-caption font-mono2"
                          title="Weakest evidence grade claimed anywhere in this module"
                          style={{ color: GRADE_COLOR[grade], fontSize: 10 }}
                        >
                          WEAKEST CLAIM
                        </span>
                      )
                    )}
                    {!pending && grade && <GradeBadge grade={grade} compact />}
                  </div>
                  <p className="t-body-sm text-2" style={{ marginBottom: 12, minHeight: 40 }}>
                    {firstSentence(rep.simple)}
                  </p>
                  <ol className="t-caption" style={{ color: 'var(--text-3)', margin: '0 0 14px', paddingLeft: 16 }}>
                    {rep.howTo.slice(0, 3).map((s) => (
                      <li key={s} style={{ marginBottom: 4 }}>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <div style={{ marginTop: 'auto' }}>
                    {pending ? (
                      <span className="t-label text-3">OPENS AFTER VERIFICATION</span>
                    ) : (
                      <Link
                        to={rep.route}
                        className="t-label"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--amber)',
                          textDecoration: 'none',
                        }}
                      >
                        OPEN <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
