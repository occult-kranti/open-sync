/**
 * Replication Bay (Swarm W7): documented government/historical program
 * stimuli, honestly framed. Every runnable card shows source + original
 * claim + our grade + the "stimulus replication ≠ claim validation" banner.
 * Documentation-only museum cards (MEDUSA/LRAD, synthetic telepathy) are
 * never runnable — engine: null, with a "not replicable — why" explainer.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Cpu, Landmark, ShieldAlert } from 'lucide-react';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { WarningChip } from '@/ui/components/primitives';
import { MiniPhaseBar } from '@/ui/components/PhaseTimeline';
import { fmtClock, useSession } from '@/ui/session/SessionContext';
import type { GradeLetter } from '@/ui/theme';
import {
  REPLICATION_BANNER,
  REPLICATION_CARDS,
  engineDurationSec,
  isRunnable,
  toPreset,
  type ClaimGrade,
  type ReplicationCard,
} from '@/replication/protocols';

const CLAIM_TONE: Record<ClaimGrade, 'teal' | 'amber' | 'danger'> = {
  VALIDATED: 'teal',
  PARTIAL: 'amber',
  CONTESTED: 'danger',
  UNVALIDATED: 'danger',
  DISPROVED: 'danger',
};

function Banner() {
  return (
    <div
      className="t-body-sm"
      style={{
        border: '1px solid rgba(217,164,65,0.5)',
        background: 'rgba(217,164,65,0.08)',
        color: 'var(--amber)',
        borderRadius: 4,
        padding: '10px 14px',
        margin: '16px 0 24px',
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        letterSpacing: '0.04em',
      }}
    >
      ⚠ {REPLICATION_BANNER.toUpperCase()} — Every card below reproduces a documented stimulus, not its promised outcome.
    </div>
  );
}

function AxisChips({ card }: { card: ReplicationCard }) {
  return (
    <span className="flex flex-wrap gap-2">
      <WarningChip tone={card.documented ? 'teal' : 'danger'} icon={false}>
        DOCUMENTED: {card.documented ? 'YES' : 'NO'}
      </WarningChip>
      <WarningChip tone={CLAIM_TONE[card.claimGrade]} icon={false}>
        ORIGINAL CLAIM: {card.claimGrade}
      </WarningChip>
      <WarningChip tone={card.safetyClass === 'experimental' ? 'danger' : 'teal'} icon={false}>
        SAFETY: {card.safetyClass.toUpperCase()}
      </WarningChip>
    </span>
  );
}

function RunnableCard({ card }: { card: ReplicationCard }) {
  const { loadPreset, setMode, previewPhases, previewId } = useSession();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const previewing = previewId === `rep:${card.id}`;
  const phases = card.engine ?? [];
  const offline = card.offlineEngine ?? null;
  const durSec = engineDurationSec(phases);

  const load = (useOffline: boolean) => {
    const preset = toPreset(card, { offline: useOffline });
    if (!preset) return;
    loadPreset(preset);
    const src = useOffline ? card.offlineEngine : card.engine;
    const mode = src?.[0]?.mode;
    if (mode) setMode(mode);
    setLoaded(true);
    window.setTimeout(() => navigate('/studio'), 600);
  };

  return (
    <motion.div layout className="panel" style={{ padding: 20 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="t-label text-3">{card.era}{card.registryId ? ` · REGISTRY ${card.registryId}` : ''}</span>
        <GradeBadge
          grade={card.ourGrade}
          citation={{ verdict: `Original claim: ${card.claimGrade}`, summary: card.summary, source: card.citations[0] }}
        />
      </div>
      <h3 className="t-h3">{card.name}</h3>
      <p className="t-caption font-mono2 text-3" style={{ margin: '2px 0 8px' }}>{card.program}</p>
      <AxisChips card={card} />
      {/* S3 gate: banner is literal UI text on every runnable card. */}
      <p
        className="t-caption font-mono2"
        style={{
          marginTop: 10,
          color: 'var(--amber)',
          border: '1px solid rgba(217,164,65,0.4)',
          borderRadius: 2,
          padding: '4px 8px',
          letterSpacing: '0.04em',
        }}
      >
        ⚠ {REPLICATION_BANNER}
      </p>
      <p className="t-body-sm text-2" style={{ marginTop: 10 }}>
        {card.summary}
      </p>
      <p className="t-body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
        <span className="t-label" style={{ color: 'var(--amber)' }}>ORIGINAL CLAIMED · </span>
        {card.originalClaim}
      </p>
      {card.fidelityNote && (
        <p className="t-caption text-3" style={{ marginTop: 8 }}>
          FIDELITY · {card.fidelityNote}
        </p>
      )}
      {card.divergenceNote && (
        <div style={{ marginTop: 8 }}>
          <WarningChip tone="amber">DIVERGENCE · {card.divergenceNote}</WarningChip>
        </div>
      )}
      {phases.length > 0 && (
        <>
          <div style={{ marginTop: 12 }}>
            <MiniPhaseBar beats={phases.map((p) => ({ sec: p.durationSec, beat: p.beatHz }))} durationSec={durSec} />
          </div>
          <div className="t-readout-sm text-3" style={{ margin: '8px 0' }}>
            {phases.map((p) => `${p.beatHz} Hz`).join(' → ')} · {phases[0]?.mode.toUpperCase()} · {phases[0]?.carrierHz} Hz · {fmtClock(durSec)}
          </div>
        </>
      )}
      {card.safety && (
        <div className="t-caption font-mono2 text-3" style={{ borderTop: '1px solid var(--line-1)', paddingTop: 8, marginTop: 4 }}>
          ≤{card.safety.maxLevelDbA} dBA · {card.safety.sessionMin} MIN · H.870 {(card.safety.h870WeeklyDoseFraction * 100).toFixed(3)}%/WK
          {card.safety.headphonesRequired ? ' · HEADPHONES REQUIRED' : ''}
          {card.safety.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2" style={{ marginTop: 4 }}>
              <ShieldAlert size={11} style={{ color: 'var(--amber)', marginTop: 1, flexShrink: 0 }} />
              {w}
            </div>
          ))}
        </div>
      )}
      {card.engineNote && (
        <p className="t-caption text-3" style={{ marginTop: 8 }}>ENGINE MAPPING · {card.engineNote}</p>
      )}
      {card.citations.map((c) => (
        <p key={c} className="t-caption font-mono2 text-3" style={{ marginTop: 6 }}>▸ {c}</p>
      ))}
      <div className="flex items-center flex-wrap gap-2" style={{ marginTop: 14 }}>
        {card.requiresEeg && (
          <WarningChip tone="danger"><Cpu size={11} /> LIVE MODE: EEG REQUIRED — NOT AVAILABLE</WarningChip>
        )}
        {card.engine && (
          <button
            type="button"
            data-testid={`rep-preview-${card.id}`}
            className={`chip ${previewing ? 'chip-active' : ''}`}
            style={{ minHeight: 40 }}
            aria-label={previewing ? `Stop preview of ${card.name}` : `Preview first 10 seconds of ${card.name}`}
            title="Preview the first 10 s of this stimulus — a preview is not a session and is not dose-debited"
            onClick={() => previewPhases(`rep:${card.id}`, card.engine!)}
          >
            {previewing ? '■ STOP' : '▶ PREVIEW (10s)'}
          </button>
        )}
        {card.engine && (
          <button
            type="button"
            className="chip"
            style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
            onClick={() => load(false)}
          >
            {loaded ? 'LOADED ✓' : 'LOAD INTO STUDIO ↗'}
          </button>
        )}
        {offline && (
          <button
            type="button"
            className="chip"
            style={{ borderColor: 'rgba(79,140,130,0.5)', color: 'var(--teal-hi)' }}
            onClick={() => load(true)}
            title="Pre-rendered bursts, open-loop — honestly not the closed-loop protocol"
          >
            LOAD OFFLINE BURST VARIANT ↗
          </button>
        )}
      </div>
    </motion.div>
  );
}

function MuseumCard({ card }: { card: ReplicationCard }) {
  return (
    <motion.div
      layout
      className="panel"
      style={{ padding: 20, borderLeft: '3px solid var(--danger)', background: 'var(--ink-2)' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="t-label text-3 flex items-center gap-2">
          <Landmark size={12} /> MUSEUM EXHIBIT · {card.era}
        </span>
        <GradeBadge
          grade={card.ourGrade}
          citation={{ verdict: `Original claim: ${card.claimGrade}`, summary: card.summary, source: card.citations[0] }}
        />
      </div>
      <h3 className="t-h3">{card.name}</h3>
      <p className="t-caption font-mono2 text-3" style={{ margin: '2px 0 8px' }}>{card.program}</p>
      <AxisChips card={card} />
      {card.museumText && <p className="t-body-sm text-2" style={{ marginTop: 10 }}>{card.museumText}</p>}
      {!card.museumText && <p className="t-body-sm text-2" style={{ marginTop: 10 }}>{card.summary}</p>}
      <div
        className="t-body-sm"
        style={{
          borderLeft: '2px solid var(--danger)',
          background: 'var(--ink-0)',
          padding: 12,
          marginTop: 12,
          color: 'var(--text-2)',
        }}
      >
        <span className="t-label" style={{ color: 'var(--danger)' }}>NOT REPLICABLE — WHY · </span>
        {card.nonReplicableReason}
      </div>
      <div style={{ marginTop: 10 }}>
        <WarningChip tone="danger" icon={false}>ENGINE: NULL — THIS CARD CAN NEVER PRODUCE AUDIO</WarningChip>
      </div>
      {card.citations.map((c) => (
        <p key={c} className="t-caption font-mono2 text-3" style={{ marginTop: 6 }}>▸ {c}</p>
      ))}
    </motion.div>
  );
}

export default function Replication() {
  const runnable = REPLICATION_CARDS.filter(isRunnable);
  const museum = REPLICATION_CARDS.filter((c) => !isRunnable(c));
  return (
    <div className="px-4 pb-10 pt-5 md:px-10 md:pb-12 md:pt-8" style={{ maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Replication Bay</h1>
        <p className="t-body text-2" style={{ marginTop: 8, maxWidth: 880 }}>
          Audio stimuli reconstructed from documented government and historical programs — patents,
          declassified assessments, grant records, peer-reviewed methods. Two axes on every card:
          is the program <span className="font-mono2" style={{ color: 'var(--teal-hi)' }}>documented</span>,
          and is its original claim <span className="font-mono2" style={{ color: 'var(--amber)' }}>validated</span>?
          Usually the first is yes and the second is no.
        </p>
      </motion.div>
      <Banner />
      <h2 className="t-h2" style={{ marginBottom: 16 }}>RUNNABLE STIMULI</h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', marginBottom: 32 }}>
        {runnable.map((c) => <RunnableCard key={c.id} card={c} />)}
      </div>
      <h2 className="t-h2" style={{ marginBottom: 16 }}>MUSEUM — DOCUMENTED, NEVER RUNNABLE</h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))' }}>
        {museum.map((c) => <MuseumCard key={c.id} card={c} />)}
      </div>
    </div>
  );
}

// Re-export for tests/lint convenience (grade colors per card).
export const CARD_GRADES: Record<string, GradeLetter> = Object.fromEntries(
  REPLICATION_CARDS.map((c) => [c.id, c.ourGrade]),
);
