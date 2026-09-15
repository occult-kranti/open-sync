/**
 * Guide — dual-register documentation for every feature in the app.
 * SIMPLE ↔ DEEP TECHNICAL segmented control, live search, grouped by module.
 * Every plot widget gets an axes / good / bad explainer. All copy renders from
 * src/docs/features.ts — the same source as Home and the test suite.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { FEATURES, featuresByModule, type FeatureEntry } from '@/docs/features';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { useIsMobile } from '@/hooks/use-mobile';

type Register = 'simple' | 'deep';

function FeatureCard({ entry, register }: { entry: FeatureEntry; register: Register }) {
  return (
    <motion.article
      className="panel"
      style={{ padding: 20 }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.24 }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 className="t-h3" style={{ flex: 1, minWidth: 160 }}>
          {entry.name}
        </h3>
        {entry.status === 'in-verification' && (
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
        )}
        {entry.grade && <GradeBadge grade={entry.grade} compact />}
      </div>

      <p className={register === 'simple' ? 't-body text-2' : 't-body-sm text-2'}>
        {register === 'simple' ? entry.simple : entry.deep}
      </p>

      {register === 'deep' && entry.gradeScope && (
        <p className="t-caption text-3" style={{ marginTop: 8 }}>
          GRADE SCOPE — {entry.gradeScope}
        </p>
      )}

      <div style={{ marginTop: 14, borderTop: '1px solid var(--line-1)', paddingTop: 12 }}>
        <span className="t-label text-3" style={{ display: 'block', marginBottom: 8 }}>
          HOW TO USE
        </span>
        <ol className="t-body-sm" style={{ color: 'var(--text-2)', margin: 0, paddingLeft: 18 }}>
          {entry.howTo.map((step) => (
            <li key={step} style={{ marginBottom: 4 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {entry.plot && (
        <div
          className="scope-well"
          style={{ marginTop: 14, padding: 14, border: '1px solid var(--line-1)' }}
        >
          <span className="t-label" style={{ display: 'block', marginBottom: 8, color: 'var(--teal-hi)' }}>
            READING THE PLOT
          </span>
          <p className="t-body-sm text-2" style={{ marginBottom: 8 }}>
            <span className="t-label text-3">AXES — </span>
            {entry.plot.axes}
          </p>
          <p className="t-body-sm" style={{ marginBottom: 8, color: 'var(--grade-A)' }}>
            <span className="t-label text-3">GOOD — </span>
            {entry.plot.good}
          </p>
          <p className="t-body-sm" style={{ color: 'var(--danger-hi)' }}>
            <span className="t-label text-3">BAD — </span>
            {entry.plot.bad}
          </p>
        </div>
      )}
    </motion.article>
  );
}

export default function Guide() {
  const [register, setRegister] = useState<Register>('simple');
  const [query, setQuery] = useState('');
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEATURES;
    return FEATURES.filter((f) =>
      [f.name, f.module, f.simple, f.deep, ...f.howTo].join('\n').toLowerCase().includes(q),
    );
  }, [query]);

  const groups = useMemo(() => [...featuresByModule(filtered).entries()], [filtered]);

  return (
    <div style={{ padding: isMobile ? '20px 16px 56px' : '32px 40px 64px', maxWidth: 1100, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <span className="t-label" style={{ color: 'var(--teal-hi)' }}>
          DOCUMENTATION — ONE DATA SOURCE, TWO REGISTERS
        </span>
        <h1 className="t-display-lg" style={{ margin: '8px 0 12px' }}>
          Guide
        </h1>
        <p className="t-body text-2" style={{ maxWidth: 720, marginBottom: 24 }}>
          Every feature, meter, and plot in Open Sync, explained twice: once in plain
          language, once with the math. Claims are graded, and effects are described as
          biasing toward states — nothing here promises an outcome.
        </p>
      </motion.div>

      {/* controls — sticky so the register switch stays reachable on long pages */}
      <div
        className="panel flex items-center gap-4"
        style={{ padding: '12px 16px', marginBottom: 32, flexWrap: 'wrap', position: 'sticky', top: 8, zIndex: 30 }}
      >
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features — try “LUFS”, “panic”, “Chladni”…"
            aria-label="Search guide"
            className="font-mono2"
            style={{
              flex: 1,
              background: 'var(--ink-4)',
              border: '1px solid var(--line-1)',
              borderRadius: 2,
              color: 'var(--text-1)',
              padding: '6px 10px',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
        <div className="flex" role="tablist" aria-label="Register">
          {(['simple', 'deep'] as Register[]).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={register === r}
              onClick={() => setRegister(r)}
              className="t-label"
              style={{
                height: 32,
                padding: '0 14px',
                border: '1px solid var(--line-2)',
                borderRadius: 0,
                marginLeft: r === 'deep' ? -1 : 0,
                background: register === r ? 'var(--amber)' : 'transparent',
                color: register === r ? 'var(--text-inv)' : 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              {r === 'simple' ? 'SIMPLE' : 'DEEP TECHNICAL'}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <p className="t-body text-3">No features match “{query}”.</p>
      )}

      {groups.map(([module, entries]) => (
        <section key={module} style={{ marginBottom: 40 }}>
          <div className="flex items-center gap-3 hairline-b" style={{ paddingBottom: 8, marginBottom: 16 }}>
            <h2 className="t-h2">{module}</h2>
            <span className="t-label text-3">
              {entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
            {entries[0].route && (
              <span className="t-readout-sm text-3" style={{ marginLeft: 'auto' }}>
                {entries[0].route}
              </span>
            )}
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
            {entries.map((e) => (
              <FeatureCard key={e.id} entry={e} register={register} />
            ))}
          </div>
        </section>
      ))}

      <GestureMapSection />
    </div>
  );
}

/**
 * P1-4 gesture map (ux_improvement_spec §3.4): one global meaning per
 * gesture, each with a visible non-gesture equivalent — gestures are
 * accelerators, never the only path.
 */
const GESTURE_MAP: { gesture: string; meaning: string; equivalent: string }[] = [
  { gesture: 'Tap', meaning: 'Trigger / select / toggle', equivalent: 'the button itself' },
  { gesture: 'Double-tap / double-click', meaning: 'Reset a knob or control to its default', equivalent: 'Ctrl/Cmd+click; re-type the value in its readout' },
  { gesture: 'Long-press', meaning: 'Contextual edit menu (session phases, preset rows)', equivalent: 'the edit affordance on the item' },
  { gesture: 'Vertical drag', meaning: 'Adjust a knob or fader (full range ≈ 160 px)', equivalent: 'arrow keys when focused; click-to-type readout' },
  { gesture: 'Shift+drag / two-finger drag', meaning: 'Fine adjust (×0.1 resolution)', equivalent: 'Shift+arrow keys' },
  { gesture: 'Scroll wheel over a knob', meaning: 'Step the value', equivalent: 'arrow keys' },
  { gesture: 'Swipe down / backdrop tap', meaning: 'Dismiss a sheet or dialog', equivalent: 'Esc key or the × close button' },
  { gesture: '⌘K / Ctrl+K', meaning: 'Command palette — jump to any module, run actions', equivalent: 'the ⌘K chip in the status bar' },
  { gesture: 'P', meaning: 'Panic — stop all audio immediately', equivalent: 'the PANIC button pinned on every screen' },
];

function GestureMapSection() {
  return (
    <section data-testid="gesture-map" style={{ marginBottom: 40 }}>
      <div className="flex items-center gap-3 hairline-b" style={{ paddingBottom: 8, marginBottom: 16 }}>
        <h2 className="t-h2">Gestures &amp; shortcuts</h2>
        <span className="t-label text-3">ONE MEANING PER GESTURE, EVERYWHERE</span>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        {GESTURE_MAP.map((g, i) => (
          <div
            key={g.gesture}
            className="grid gap-2"
            style={{
              gridTemplateColumns: 'minmax(140px, 200px) 1fr 1fr',
              padding: '10px 16px',
              borderTop: i > 0 ? '1px solid var(--line-1)' : 'none',
              alignItems: 'baseline',
            }}
          >
            <span className="t-label" style={{ color: 'var(--amber)' }}>
              {g.gesture}
            </span>
            <span className="t-body-sm text-2">{g.meaning}</span>
            <span className="t-caption text-3">No-gesture path: {g.equivalent}</span>
          </div>
        ))}
      </div>
      <p className="t-caption text-3" style={{ marginTop: 8 }}>
        Every gesture above has a button, key, or menu path — gestures speed you up, they never gate a feature.
        Shake is deliberately unused (accessibility).
      </p>
    </section>
  );
}
