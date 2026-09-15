/**
 * Module 8 — About / Method (design: about.md). The closing argument:
 * replication story, honest-claims policy, A–D rubric, patent ledger, stack.
 * The only module that speaks in first person; ends on GENERATE. MEASURE.
 * VERIFY.
 */

import { motion } from 'framer-motion';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { type GradeLetter } from '@/ui/theme';

const CHAPTERS: { word: string; title: string; body: string }[] = [
  {
    word: 'EXISTS',
    title: 'The original platform had good engineering and bad epistemology.',
    body: 'It measured nothing, graded nothing, and sold folklore frequencies alongside real geophysics at the same visual weight. The UI was beautiful; the claims were not audited.',
  },
  {
    word: 'CORRECTS',
    title: 'The correction, not the takedown.',
    body: 'Open Sync keeps the instrument and corrects the claims: Schumann values corrected to measured modes, Solfeggio labeled 1970s numerology instead of medieval heritage, Gateway levels presented as history. Nothing deleted — everything graded.',
  },
  {
    word: 'PROVES',
    title: 'An instrument you can interrogate.',
    body: 'The Analyzer treats our own output as a device under test. The Knowledge Base shows every source. If we grade something wrong, the citation popover is one click away from proving it.',
  },
];

const POLICY = [
  ['We never show a naked number.', 'every frequency travels with its grade'],
  ["We dim, we don't delete.", 'filtered-out content stays visible'],
  ['We grade our own safety claims.', 'the Safety Center carries badges too'],
  ['Government interest ≠ validation.', 'programs are documented, not endorsed'],
  ["If we're wrong, the receipt is one click away.", 'every badge opens its citation'],
] as const;

const RUBRIC: { grade: GradeLetter; criteria: string; example: string }[] = [
  { grade: 'A', criteria: 'Established physics or engineering; multiple independent replications; quantitative consensus.', example: 'Schumann 7.83 Hz measured modes' },
  { grade: 'B', criteria: 'Direct human evidence, small samples or single labs; effects real but not yet robust.', example: '432 Hz pilots (n=33, n=42; 2025 RCT) → graded B−' },
  { grade: 'C', criteria: 'Plausible mechanism; indirect, inconsistent, or contradicted evidence.', example: 'Beat-driven EEG entrainment (8/14 studies contradict)' },
  { grade: 'D', criteria: 'Numerology, folklore, or constructs with no physiological evidence.', example: 'Solfeggio, planetary therapy claims, Lambda/Epsilon' },
];

const LEDGER: [string, string, string, boolean][] = [
  ['US 3,884,218 (Monroe, 1975)', 'Frequency-following response audio method', 'EXPIRED 1993', false],
  ['US 5,213,562 + continuations', 'Hemi-Sync refinements', 'EXPIRED', false],
  ['"Hemi-Sync" word mark', 'Trademark, not patent', 'LIVE', true],
];

const STACK: [string, string, string][] = [
  ['React 19', 'UI runtime', '19.x'],
  ['TypeScript', 'strict types', '5.9'],
  ['Vite', 'build tool', '7.x'],
  ['Tailwind CSS', 'utility styles', '3.4'],
  ['shadcn/ui', 'primitives', 'radix'],
  ['Framer Motion', 'module transitions', '12.x'],
  ['GSAP', 'scroll storytelling', '3.x'],
  ['Lenis', 'smooth scroll', '1.x'],
];

export default function About() {
  const isMobile = useIsMobile();
  return (
    <div style={{ paddingBottom: 64 }}>
      {/* Hero (procedural — no photo asset; canvas-grade visual) */}
      <div
        className="relative flex items-end"
        style={{
          height: '60vh',
          minHeight: 360,
          background: 'linear-gradient(180deg, var(--ink-1), var(--ink-0))',
          overflow: 'hidden',
        }}
      >
        <HeroTrace />
        <div style={{ position: 'relative', padding: isMobile ? '0 20px 40px' : '0 64px 64px', maxWidth: 900 }}>
          <motion.h1
            className="t-display-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            About the Method
          </motion.h1>
          <motion.div
            className="t-readout-md"
            style={{ color: 'var(--amber)', marginTop: 12 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            GENERATE. MEASURE. VERIFY.
          </motion.div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: isMobile ? '40px 16px 0' : '64px 40px 0' }} className="flex flex-col gap-16">
        {/* The story */}
        <section>
          <h1 className="t-h1" style={{ marginBottom: 24 }}>
            Why this exists
          </h1>
          <div className="flex flex-col gap-8">
            {CHAPTERS.map((c, i) => (
              <motion.div
                key={c.word}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <span className="t-label text-3">{c.word}</span>
                <h2 className="t-h2" style={{ margin: '4px 0 8px' }}>
                  {c.title}
                </h2>
                <p className="t-body text-2">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Replication spec sheet */}
        <section>
          <h1 className="t-h1" style={{ marginBottom: 24 }}>
            How the original was rebuilt
          </h1>
          <div className="panel" style={{ padding: 0 }}>
            {(
              [
                ['SCOPE', 'Full feature parity: binaural / monaural / isochronic engine, noise mixer, presets, focus levels, session phases'],
                ['CHANGED', 'Frequency values corrected where measured data disagrees; claims graded; no "1–49 continuum"; no trademarked names'],
                ['REMOVED', 'Nothing. Removed claims are documented in the Knowledge Base with their verdicts instead'],
                ['ADDED', 'Grade badges, citation popovers, Analyzer self-measurement, H.870 dose model, panic control'],
              ] as [string, string][]
            ).map(([k, v], i) => (
              <div key={k} className="flex gap-4" style={{ padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--line-1)' : 'none' }}>
                <span className="t-label" style={{ width: 90, flexShrink: 0 }}>
                  {k}
                </span>
                <span className="t-body-sm" style={{ color: 'var(--text-1)' }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
          <p className="t-caption text-3" style={{ marginTop: 12 }}>
            Replication here means <em>the instrument</em>, not the mythology. The mythology is archived — with its grade.
          </p>
        </section>

        {/* Manifesto card */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="panel"
          style={{ padding: isMobile ? 24 : 48, borderLeft: '2px solid var(--amber)' }}
        >
          <div className="flex flex-col gap-5">
            {POLICY.map(([line, sub], i) => (
              <motion.div key={line} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <h2 className="t-h2">{line}</h2>
                <span className="t-body-sm text-3">— {sub}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: 32, borderTop: '1px solid var(--line-1)', paddingTop: 16 }}>
            <span className="t-label text-3">THIS PAGE CONTAINS ZERO UNGRADED CLAIMS.</span>
            <GradeBadge
              grade="A"
              compact
              citation={{
                verdict: 'This claim is about our own policy and is verifiable by inspection.',
                summary: 'Grade A by construction: check any badge on this page — each opens its citation.',
                source: 'Open Sync honest-claims policy (this page)',
              }}
            />
          </div>
        </motion.section>

        {/* Rubric */}
        <section>
          <h1 className="t-h1" style={{ marginBottom: 24 }}>
            How we grade
          </h1>
          <div className="panel" style={{ padding: 0 }}>
            {RUBRIC.map((r, i) => (
              <div key={r.grade} className="grid gap-4 items-center" style={{ gridTemplateColumns: isMobile ? '1fr' : '70px 1fr 220px', padding: '16px 20px', borderTop: i > 0 ? '1px solid var(--line-1)' : 'none' }}>
                <GradeBadge
                  grade={r.grade}
                  citation={{
                    verdict: `Grade ${r.grade}: ${r.criteria}`,
                    summary:
                      'The grading rubric itself is adapted from evidence-based-medicine hierarchies, simplified for a consumer instrument. The rubric is a judgment call and says so.',
                    source: 'Open Sync method — border cases resolve toward the lower grade',
                  }}
                />
                <span className="t-body-sm" style={{ color: 'var(--text-1)' }}>
                  {r.criteria}
                </span>
                <span className="t-caption text-3">{r.example}</span>
              </div>
            ))}
          </div>
          <div className="t-body-sm text-2" style={{ background: 'var(--ink-0)', border: '1px solid var(--line-1)', padding: 16, marginTop: 12 }}>
            B− exists because evidence has texture. It renders with a dashed border everywhere it appears.
          </div>
          <p className="t-caption text-3" style={{ marginTop: 12 }}>
            Border cases are resolved toward the <em>lower</em> grade. Disagree? Every grade links to its sources — bring
            a better one.
          </p>
        </section>

        {/* Patent ledger */}
        <section>
          <h1 className="t-h1" style={{ marginBottom: 24 }}>
            Patent status, on the record
          </h1>
          <div className="panel" style={{ padding: 0 }}>
            {LEDGER.map(([pat, subj, status, live], i) => (
              <div key={pat} className="grid gap-4 items-center" style={{ gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 130px', gap: isMobile ? 8 : 16, padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--line-1)' : 'none' }}>
                <span className="t-readout-sm" style={{ color: 'var(--text-1)' }}>
                  {pat}
                </span>
                <span className="t-body-sm text-2">{subj}</span>
                <span
                  className="t-label"
                  style={
                    live
                      ? { color: 'var(--danger)', border: '1px solid rgba(196,99,79,0.6)', borderRadius: 2, padding: '2px 8px', textAlign: 'center' }
                      : { color: 'var(--text-3)' }
                  }
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
          <p className="t-body-sm text-2" style={{ marginTop: 12 }}>
            Patent expiry means the <em>technique</em> is in the public domain; trademarks and branding are not. Open
            Sync implements expired-patent methods under neutral names and cites the filings in the Knowledge Base.
          </p>
          <p className="t-label text-3" style={{ marginTop: 12 }}>
            THIS IS A DESIGN STATEMENT OF INTENT, NOT LEGAL ADVICE.
          </p>
        </section>

        {/* Stack */}
        <section>
          <h1 className="t-h1" style={{ marginBottom: 24 }}>
            Built in the open
          </h1>
          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
            {STACK.map(([name, role, ver]) => (
              <div key={name} className="panel panel-interactive" style={{ padding: 16 }}>
                <div className="t-readout-md" style={{ color: 'var(--text-1)' }}>
                  {name}
                </div>
                <div className="t-body-sm text-2">{role}</div>
                <div className="t-caption text-3" style={{ marginTop: 4 }}>
                  {ver}
                </div>
              </div>
            ))}
            <div className="panel panel-interactive" style={{ padding: 16, gridColumn: isMobile ? 'span 2' : 'span 4' }}>
              <div className="t-readout-md" style={{ color: 'var(--text-1)' }}>
                Web Audio API
              </div>
              <div className="t-body-sm text-2">the engine — no framework, just the platform</div>
            </div>
          </div>
          <p className="t-caption text-3" style={{ marginTop: 12 }}>
            No telemetry, no accounts, no server. The whole lab runs in your browser tab.
          </p>
        </section>

        {/* Bookend */}
        <div className="t-readout-md text-3" style={{ textAlign: 'center', padding: '32px 0' }}>
          GENERATE. MEASURE. VERIFY.
        </div>
      </div>

      {/* Colophon */}
      <footer
        className="flex items-center justify-between flex-wrap gap-4"
        style={{ borderTop: '1px solid var(--line-1)', padding: '24px 40px', maxWidth: 1440, margin: '0 auto' }}
      >
        <span className="t-label">OPEN SYNC</span>
        <span className="t-readout-sm text-3">VERSION 1.0 · DESIGN SYSTEM 'INK & AMBER' · 2026</span>
        <span className="t-caption text-3">Design + copy: CC BY-SA 4.0. Code: MIT. Grades: argue with us via citation.</span>
      </footer>
    </div>
  );
}

/** Procedural hero visual: warm amber scope trace on a charcoal bench. */
function HeroTrace() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * 120} y1={0} x2={(i + 1) * 120} y2={400} stroke="#262B2F" strokeWidth={1} opacity={0.5} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * 80} x2={1200} y2={(i + 1) * 80} stroke="#262B2F" strokeWidth={1} opacity={0.5} />
      ))}
      <path
        d={Array.from({ length: 240 }, (_, i) => {
          const x = (i / 239) * 1200;
          const y = 200 + Math.sin((i / 239) * Math.PI * 8) * 60 * Math.sin((i / 239) * Math.PI);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ')}
        fill="none"
        stroke="#D9A441"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px rgba(217,164,65,0.5))' }}
      />
      <path
        d={Array.from({ length: 240 }, (_, i) => {
          const x = (i / 239) * 1200;
          const y = 200 + Math.sin((i / 239) * Math.PI * 8 + 0.6) * 60 * Math.sin((i / 239) * Math.PI);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ')}
        fill="none"
        stroke="#4F8C82"
        strokeWidth={1.5}
        opacity={0.7}
      />
    </svg>
  );
}
