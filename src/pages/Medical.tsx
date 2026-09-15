/**
 * Module — Medical Frequencies (Stage 13, research/medical_freq_healing.md).
 *
 * The evidence-honest tour of "medical frequency healing": real acoustic
 * medicine (A) at the top, vibroacoustic therapy (B/C) in the middle, 40 Hz
 * GENUS as labeled experimental, and the Rife/CAFL/Cyma folklore layer (D) at
 * the bottom — shipped as history with the enforcement record attached.
 * Every device/paper carries a GradeBadge with an inline citation popover;
 * the linked presets load straight into Studio.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, ExternalLink, Gavel, ScrollText, Stethoscope } from 'lucide-react';
import {
  ISA_FACT,
  MED_COMMUNITY,
  MED_DEVICES,
  MED_ENFORCEMENT,
  MED_PAPERS,
  MED_TIMELINE,
  WELLNESS_FACT,
  type DeviceKind,
} from '@/data/medical';
import { PRESETS, presetDurationMin, type Preset } from '@/data/presets';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { Chip, Panel, WarningChip } from '@/ui/components/primitives';
import { MiniPhaseBar } from '@/ui/components/PhaseTimeline';
import { fmtClock, useSession } from '@/ui/session/SessionContext';
import { previewUrlFor, usePreviewManifest } from '@/ui/session/previewManifest';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Grade } from '@/data/frequencies';

/** Presets authored in the Stage-13 wave, in display order. */
const LINKED_PRESET_IDS = [
  'wellness-vat-40',
  'wellness-vat-scan',
  'wellness-bowl-relax',
  'wellness-otto-128',
  'exp-rife-cafl',
  'exp-cyma-commutation',
] as const;

const KIND_LABEL: Record<DeviceKind, string> = {
  'acoustic-medicine': 'ACOUSTIC MEDICINE',
  vibroacoustic: 'VIBROACOUSTIC',
  experimental: 'EXPERIMENTAL',
  folklore: 'FOLKLORE',
};

const TIER_COPY: { grade: Grade; title: string; body: string }[] = [
  {
    grade: 'A',
    title: 'Real acoustic medicine',
    body: 'Focused or shock-wave ultrasound at clinical energies: lithotripsy, HIFU, histotripsy (FDA-cleared for liver tumors, 2023). Kilowatt-scale, image-guided, >20 kHz. Sound genuinely is medicine here — and it looks nothing like a wellness tone.',
  },
  {
    grade: 'B',
    title: 'Vibroacoustic therapy (VAT)',
    body: 'A single 30–120 Hz sinusoid through transducers in a chair or bed. Modest but real human evidence for pain, fibromyalgia symptoms, sleep, and Parkinson’s motor scores; 40 Hz is the most-studied frequency. FDA treats the devices as therapeutic-vibrator equivalents: relaxation and minor aches.',
  },
  {
    grade: 'C',
    title: '40 Hz GENUS & relaxation practices',
    body: 'GENUS sensory stimulation is robust in mice and unproven in humans — the Cognito OVERTURE pivotal trial missed its primary endpoint (Hajós 2024). Singing-bowl and tuning-fork practice measurably relaxes people (Goldsby 2017, observational); that is the relaxation response, not a disease treatment.',
  },
  {
    grade: 'D',
    title: 'Folklore lists & devices',
    body: 'Rife generators, the CAFL list, Clark zappers, Cyma “commutation” codes. Zero validated clinical evidence for any disease — and an enforcement record (below) for sellers who claimed otherwise. Kept here as history and texture, clearly labeled.',
  },
];

function gradeVerdict(g: Grade): string {
  if (g === 'A') return 'Solid, replicated evidence / cleared medical use.';
  if (g === 'B') return 'Some human evidence (small pilots / scoping-review support).';
  if (g === 'C') return 'Plausible mechanism; indirect, inconsistent, or unproven in humans.';
  return 'No physiological evidence — history and texture, not therapy.';
}

export default function Medical() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { loadPreset, previewPreset, previewUrl, previewId } = useSession();
  const previewManifest = usePreviewManifest();
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const linked = LINKED_PRESET_IDS.map((id) => PRESETS.find((p) => p.id === id)).filter(
    (p): p is Preset => p !== undefined,
  );

  const load = (p: Preset) => {
    setLoadedId(p.id);
    loadPreset(p);
    window.setTimeout(() => navigate('/studio'), 600);
  };

  const playPreview = (p: Preset) => {
    const url = previewUrlFor(p.id, previewManifest);
    if (url) previewUrl(`preset:${p.id}`, url);
    else previewPreset(p);
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Medical Frequencies</h1>
        <p className="t-body text-2" style={{ marginTop: 8, maxWidth: 860 }}>
          “Frequency healing” is four different fields stacked on one word. At the top: ultrasound that
          genuinely destroys tumors and stones. In the middle: vibroacoustic therapy with modest human
          evidence for pain and sleep. At the bottom: Rife lists and commutation codes with none. This
          page keeps the layers separate — graded, cited, and safe to explore.
        </p>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
          <WarningChip tone="danger">
            Nothing on this page diagnoses, treats, cures, or prevents disease. Cancer claims for audio
            devices are unproven and have been prosecuted; never delay medical care for a frequency.
          </WarningChip>
        </div>
      </motion.div>

      {/* Regulatory ground truth */}
      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', margin: '24px 0' }}>
        <Panel title="REGULATORY GROUND TRUTH" pad>
          <p className="t-body-sm text-2">{ISA_FACT}</p>
        </Panel>
        <Panel title="GENERAL-WELLNESS LINE" pad>
          <p className="t-body-sm text-2">{WELLNESS_FACT}</p>
        </Panel>
      </div>

      {/* Evidence tiers */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          THE EVIDENCE PYRAMID
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
          {TIER_COPY.map((t) => (
            <motion.div key={t.grade} className="panel" style={{ padding: 20 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <h3 className="t-h3">{t.title}</h3>
                <GradeBadge grade={t.grade} compact citation={{ verdict: gradeVerdict(t.grade), summary: t.body }} />
              </div>
              <p className="t-body-sm text-2">{t.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Device registry */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          <Stethoscope size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />
          DEVICE REGISTRY
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))' }}>
          {MED_DEVICES.map((d) => (
            <div
              key={d.id}
              className="panel"
              style={{
                padding: 20,
                borderLeft: d.kind === 'folklore' ? '3px solid var(--danger)' : d.kind === 'acoustic-medicine' ? '3px solid var(--teal)' : undefined,
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <Chip>{KIND_LABEL[d.kind]}</Chip>
                <GradeBadge
                  grade={d.grade}
                  citation={{ verdict: d.status, summary: d.summary, source: d.citation }}
                />
              </div>
              <h3 className="t-h2">{d.name}</h3>
              <div className="t-readout-sm text-3" style={{ margin: '4px 0 10px' }}>
                {d.era}
              </div>
              <p className="t-body-sm text-2" style={{ marginBottom: 8 }}>
                {d.summary}
              </p>
              <p className="t-caption font-mono2 text-3">▸ {d.citation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          1632 → 2026 — HOW WE GOT HERE
        </h2>
        <div className="panel" style={{ padding: isMobile ? 16 : 24 }}>
          {MED_TIMELINE.map((e, i) => (
            <div
              key={e.year + e.label}
              className="flex items-start gap-4"
              style={{
                padding: '10px 0',
                borderBottom: i < MED_TIMELINE.length - 1 ? '1px solid var(--line-1)' : 'none',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 4 : 16,
              }}
            >
              <span className="t-readout-sm" style={{ color: 'var(--amber)', minWidth: 88, flexShrink: 0 }}>
                {e.year}
              </span>
              <span style={{ flexShrink: 0 }}>
                <GradeBadge grade={e.grade} compact letterOnly citation={{ verdict: e.label, summary: e.note }} />
              </span>
              <span>
                <span className="t-body-sm" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                  {e.label}
                </span>
                <span className="t-body-sm text-2"> — {e.note}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Papers */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          <ScrollText size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />
          THE PAPERS — FINDINGS AND LIMITS
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
          {MED_PAPERS.map((p) => (
            <div key={p.id} className="panel" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="t-readout-sm text-3">
                  {p.year} · {p.venue}
                </span>
                <GradeBadge
                  grade={p.grade}
                  compact
                  citation={{ verdict: gradeVerdict(p.grade), summary: `${p.finding} Limitation: ${p.limitation}`, source: p.citation }}
                />
              </div>
              <h3 className="t-h3" style={{ marginBottom: 8 }}>
                {p.title}
              </h3>
              <p className="t-body-sm text-2" style={{ marginBottom: 6 }}>
                {p.finding}
              </p>
              <p className="t-caption" style={{ color: 'var(--amber-dim, var(--text-3))' }}>
                Limit: {p.limitation}
              </p>
              <p className="t-caption font-mono2 text-3" style={{ marginTop: 6 }}>
                ▸ {p.citation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Enforcement record */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          <Gavel size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />
          THE ENFORCEMENT RECORD — WHY “SUPPRESSED CURE” STORIES COLLAPSE
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
          {MED_ENFORCEMENT.map((c) => (
            <div key={c.caseName} className="panel" style={{ padding: 20, borderLeft: '3px solid var(--danger)' }}>
              <div className="t-readout-sm" style={{ color: 'var(--danger)', marginBottom: 6 }}>
                {c.year}
              </div>
              <h3 className="t-h3" style={{ marginBottom: 8 }}>
                {c.caseName}
              </h3>
              <p className="t-body-sm text-2" style={{ marginBottom: 6 }}>
                {c.outcome}
              </p>
              <p className="t-caption font-mono2 text-3">▸ {c.citation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community directory */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          THE COMMUNITY MAP — VENDORS, LIST CULTURE, SKEPTICS
        </h2>
        <div className="panel" style={{ padding: isMobile ? 16 : 24 }}>
          {MED_COMMUNITY.map((s, i) => (
            <div
              key={s.name}
              className="flex items-start gap-3"
              style={{
                padding: '10px 0',
                borderBottom: i < MED_COMMUNITY.length - 1 ? '1px solid var(--line-1)' : 'none',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <span style={{ flexShrink: 0, minWidth: 220 }}>
                <span className="t-body-sm" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                  {s.name}
                </span>{' '}
                <Chip>{s.kind.replace('-', ' ').toUpperCase()}</Chip>
              </span>
              <span className="t-body-sm text-2" style={{ flex: 1 }}>
                {s.note}
              </span>
              <span className="t-caption font-mono2 text-3 flex items-center gap-1" style={{ flexShrink: 0 }}>
                <ExternalLink size={10} /> {s.url}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Linked presets */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="t-label text-3" style={{ marginBottom: 12 }}>
          <Activity size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />
          TRY THE PROTOCOLS — GRADED AND LABELED
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
          {linked.map((p) => {
            const experimental = p.category === 'Experimental';
            return (
              <div
                key={p.id}
                className="panel panel-interactive"
                style={{ padding: 20, borderLeft: experimental ? '3px solid var(--danger)' : undefined }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <Chip danger={experimental}>{p.category.toUpperCase()}</Chip>
                  <GradeBadge grade={p.grade} citation={{ verdict: gradeVerdict(p.grade), summary: p.rationale, source: p.citations[0] }} />
                </div>
                <h3 className="t-h2">{p.title}</h3>
                <p
                  className="t-body-sm text-2"
                  style={{ margin: '4px 0 12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {p.rationale}
                </p>
                <MiniPhaseBar
                  beats={p.spec.phases.map((ph) => ({ sec: ph.durationSec, beat: ph.beatHz }))}
                  durationSec={p.spec.phases.reduce((a, ph) => a + ph.durationSec, 0)}
                />
                <div className="t-readout-sm text-3" style={{ margin: '8px 0' }}>
                  {p.spec.phases.map((ph) => `${ph.beatHz} Hz`).join('→')} · CARRIER{' '}
                  {p.spec.phases[0]?.carrierHz} Hz · ⏱ {fmtClock(presetDurationMin(p) * 60)}
                </div>
                {experimental && (
                  <div style={{ marginBottom: 8 }}>
                    <WarningChip tone="danger">Historical artifact — no medical evidence</WarningChip>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`med-preview-${p.id}`}
                    className={`chip ${previewId === `preset:${p.id}` ? 'chip-active' : ''}`}
                    style={{ minHeight: 40 }}
                    aria-label={
                      previewId === `preset:${p.id}` ? `Stop preview of ${p.title}` : `Preview first 10 seconds of ${p.title}`
                    }
                    onClick={() => playPreview(p)}
                  >
                    {previewId === `preset:${p.id}` ? '■ STOP' : '▶ PREVIEW'}
                  </button>
                  <button
                    type="button"
                    className="chip"
                    style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
                    onClick={() => load(p)}
                  >
                    {loadedId === p.id ? 'LOADED ✓' : 'LOAD ↗'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety callout */}
      <Panel title="IF YOU ARE HERE BECAUSE OF A DIAGNOSIS" pad>
        <p className="t-body text-2" style={{ marginBottom: 12 }}>
          Frequency devices have never been shown to treat cancer, infection, or any structural disease —
          and choosing one over oncology care has ended lives early. The relaxation end of this page (VAT,
          bowls, a warm 40 Hz hum) is genuinely pleasant and low-risk; use it alongside care, never instead
          of it.
        </p>
        <button type="button" className="chip chip-active" onClick={() => navigate('/safety')}>
          OPEN SAFETY MODULE <ArrowRight size={11} style={{ marginLeft: 4, verticalAlign: '-1px' }} />
        </button>
      </Panel>
    </div>
  );
}
