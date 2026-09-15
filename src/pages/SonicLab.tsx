/**
 * Sonic Lab (V5) — mathematical sound-synthesis playground.
 *
 * Generators (src/soniclab/generators.ts) are pure renderers implementing
 * research/math_sound_synthesis.md (E2): Shepard/Risset illusions, Euclidean
 * and number-theory rhythms, 1/f^α fractal noise, logistic-map chaos, custom
 * waveform synthesis (additive/FM/Chebyshev/phase-distortion), tuning systems
 * (JI / n-EDO / Bohlen–Pierce), and astro-derived tunings (TRAPPIST-1 ladder,
 * cosmic octave).
 *
 * HONESTY: every card carries an evidence grade (A = verifiable math/science,
 * D = quarantined pseudoscience claims). The astro panel always displays the
 * mandatory D-grade meaning label; the sidereal/tropical period convention is
 * an explicit user-facing toggle (R2 finding).
 */

import { useCallback, useMemo, useState } from 'react';
import { Download, Play, Square } from 'lucide-react';
import { useSession } from '@/ui/session/SessionContext';
import { Panel, WarningChip, Chip } from '@/ui/components/primitives';
import { Knob } from '@/ui/components/Knob';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { encodeWav } from '@/engine';
import {
  astroTuner,
  barberPoleAM,
  bohlenPierce,
  euclideanPattern,
  fibonacciWord,
  fractalNoise,
  goldenBeattyPattern,
  jiFrequencies,
  jiTable,
  LOGISTIC_CHAOS_ONSET,
  nEDO,
  primePulsePattern,
  renderCustomWave,
  renderFibonacciRhythm,
  renderLogisticMod,
  renderPattern,
  renderScale,
  renderTone,
  rissetRhythm,
  shepardTone,
  ASTRO_LABEL,
  type CustomWaveSpec,
  type Rendered,
} from '@/soniclab/generators';
import { applyRenderRails } from '@/soniclab/safety';
import {
  ASTRO_MEANING_LABEL,
  SONIC_CARDS,
  SONIC_GROUPS,
  type SonicCard,
  type SonicGroup,
} from '@/soniclab/catalog';

/* ---------------------------------------------------------------- helpers */

function PlayButton({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? `Stop ${label}` : `Play ${label}`}
      title={playing ? 'Stop' : 'Play preview'}
      className="t-label flex items-center"
      style={{
        height: 32,
        padding: '0 12px',
        gap: 6,
        borderRadius: 2,
        cursor: 'pointer',
        background: playing ? 'var(--danger)' : 'var(--amber)',
        color: 'var(--text-inv)',
        border: 'none',
      }}
    >
      {playing ? <Square size={12} /> : <Play size={12} />}
      {playing ? 'STOP' : 'PLAY'}
    </button>
  );
}

function KnobField({
  label,
  value,
  min,
  max,
  onChange,
  log,
  format,
  defaultValue,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  log?: boolean;
  format?: (v: number) => string;
  defaultValue?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Knob
        value={value}
        min={min}
        max={max}
        onChange={onChange}
        log={log}
        label={label}
        defaultValue={defaultValue}
        disabled={disabled}
        size={48}
      />
      <span className="t-caption font-mono2" style={{ color: 'var(--text-2)' }}>
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

function GenCard({
  card,
  playing,
  onPlay,
  warnings,
  children,
}: {
  card: SonicCard;
  playing: boolean;
  onPlay: () => void;
  warnings?: string[];
  children?: React.ReactNode;
}) {
  return (
    <Panel
      title={card.title.toUpperCase()}
      right={
        <span className="flex items-center gap-2">
          <GradeBadge grade={card.grade} compact />
          <InfoPopover featureId={card.featureId} />
          <PlayButton playing={playing} onClick={onPlay} label={card.title} />
        </span>
      }
    >
      <p className="t-body-sm" style={{ color: 'var(--text-2)', marginBottom: 12 }}>
        {card.blurb}
      </p>
      {card.caveat && (
        <div style={{ marginBottom: 12 }}>
          <WarningChip tone={card.grade === 'D' ? 'danger' : 'amber'}>{card.caveat}</WarningChip>
        </div>
      )}
      {children}
      {warnings && warnings.length > 0 && (
        <div className="flex flex-col gap-1" style={{ marginTop: 12 }}>
          {warnings.map((w, i) => (
            <span key={i} className="t-caption font-mono2" style={{ color: 'var(--amber)' }}>
              ⚠ {w}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PatternStrip({ steps }: { steps: boolean[] }) {
  return (
    <div className="flex" style={{ gap: 3, marginBottom: 12, flexWrap: 'wrap' }} aria-label="Gate pattern">
      {steps.map((s, i) => (
        <span
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: 2,
            background: s ? 'var(--amber)' : 'var(--ink-4)',
            border: '1px solid var(--line-2)',
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function SonicLab() {
  const { togglePreview, previewId, engineRef, governor } = useSession();
  const [cardWarnings, setCardWarnings] = useState<Record<string, string[]>>({});

  /** Rails-checked one-shot preview through the engine's tracked preview path. */
  const play = useCallback(
    (id: string, r: Rendered) => {
      const rails = applyRenderRails(r.samples, r.sampleRate);
      const all = [...r.warnings, ...rails.report.warnings];
      setCardWarnings((m) => ({ ...m, [id]: all }));
      togglePreview(id, () => {
        const db = Math.min(-14, governor.maxGainDbFs);
        engineRef.current.playBuffer(rails.samples, rails.samples.slice(), r.sampleRate, db);
      });
    },
    [togglePreview, governor.maxGainDbFs, engineRef],
  );

  const downloadWav = useCallback((name: string, r: Rendered) => {
    const rails = applyRenderRails(r.samples, r.sampleRate);
    const wav = encodeWav(rails.samples, rails.samples.slice(), r.sampleRate, 'pcm16');
    const blob = new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex flex-col gap-6" style={{ padding: '24px 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
      <header>
        <h1 className="t-h2" style={{ color: 'var(--text-1)' }}>
          Sonic Lab
        </h1>
        <p className="t-body-sm" style={{ color: 'var(--text-2)', maxWidth: 720 }}>
          Mathematical sound generators with honest evidence grades. A = verifiable math or replicated
          psychoacoustics; D = quarantined claims shown only to be labeled, never endorsed. All renders
          pass the safety rails (peak ceiling, infrasonic/ultrasonic detection, duration cap) before
          playback.
        </p>
      </header>

      {/* ---- Auditory illusions ---------------------------------------- */}
      <GroupSection group="illusions">
        <ShepardCard play={play} previewId={previewId} warnings={cardWarnings.shepard} />
        <RissetCard play={play} previewId={previewId} warnings={cardWarnings['risset-rhythm']} />
        <BarberPoleCard play={play} previewId={previewId} warnings={cardWarnings['barber-pole']} />
      </GroupSection>

      {/* ---- Mathematical rhythms -------------------------------------- */}
      <GroupSection group="math-rhythms">
        <EuclideanCard play={play} previewId={previewId} warnings={cardWarnings.euclidean} />
        <PhiCard play={play} previewId={previewId} warnings={cardWarnings['phi-beatty']} />
        <PrimeCard play={play} previewId={previewId} warnings={cardWarnings['prime-pulse']} />
        <FibonacciCard play={play} previewId={previewId} warnings={cardWarnings['fibonacci-word']} />
      </GroupSection>

      {/* ---- Fractal & chaos ------------------------------------------- */}
      <GroupSection group="fractal-chaos">
        <FractalCard play={play} previewId={previewId} warnings={cardWarnings['fractal-noise']} />
        <LogisticCard play={play} previewId={previewId} warnings={cardWarnings.logistic} />
      </GroupSection>

      {/* ---- Custom waveforms ------------------------------------------ */}
      <GroupSection group="custom-waves">
        <CustomWaveCard
          play={play}
          previewId={previewId}
          warnings={cardWarnings['custom-wave']}
          downloadWav={downloadWav}
        />
      </GroupSection>

      {/* ---- Tuning systems -------------------------------------------- */}
      <GroupSection group="tuning">
        <TuningCard play={play} previewId={previewId} warnings={cardWarnings['tuning-systems']} />
      </GroupSection>

      {/* ---- Astro-tuned ----------------------------------------------- */}
      <GroupSection group="astro">
        <AstroCard play={play} previewId={previewId} warnings={cardWarnings.astro} />
      </GroupSection>
    </div>
  );
}

function GroupSection({ group, children }: { group: SonicGroup; children: React.ReactNode }) {
  const title = SONIC_GROUPS.find((g) => g.id === group)?.title ?? group;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-label" style={{ color: 'var(--teal-hi)', borderBottom: '1px solid var(--line-1)', paddingBottom: 6 }}>
        {title.toUpperCase()}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function cardMeta(id: string): SonicCard {
  const c = SONIC_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown sonic card ${id}`);
  return c;
}

type PlayFn = (id: string, r: Rendered) => void;

/* ------------------------------------------------------------- illusions */

function ShepardCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('shepard');
  const [centerHz, setCenterHz] = useState(400);
  const [sigma, setSigma] = useState(1);
  const [rate, setRate] = useState(1);
  const [durationSec, setDurationSec] = useState(8);
  const [loop, setLoop] = useState(true);
  return (
    <GenCard
      card={card}
      playing={previewId === 'shepard'}
      warnings={warnings}
      onPlay={() =>
        play('shepard', shepardTone({ durationSec, centerHz, sigmaOctaves: sigma, semitonesPerSec: rate, loop }))
      }
    >
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="CENTER" value={centerHz} min={260} max={500} onChange={setCenterHz} defaultValue={400} format={(v) => `${v.toFixed(0)} Hz`} />
        <KnobField label="SIGMA" value={sigma} min={0.5} max={1.5} onChange={setSigma} defaultValue={1} format={(v) => `${v.toFixed(2)} oct`} />
        <KnobField label="RATE" value={rate} min={0.5} max={3} onChange={setRate} defaultValue={1} disabled={loop} format={(v) => `${v.toFixed(2)} st/s`} />
        <KnobField label="LENGTH" value={durationSec} min={2} max={12} onChange={setDurationSec} defaultValue={8} format={(v) => `${v.toFixed(0)} s`} />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <Chip active={loop} onClick={() => setLoop((v) => !v)} title="Glide covers exactly one octave per loop → seamless repeat">
          SEAMLESS LOOP
        </Chip>
      </div>
    </GenCard>
  );
}

function RissetCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('risset-rhythm');
  const [bpm, setBpm] = useState(120);
  const [metabarSec, setMetabarSec] = useState(8);
  const [ratio, setRatio] = useState(2);
  return (
    <GenCard
      card={card}
      playing={previewId === 'risset-rhythm'}
      warnings={warnings}
      onPlay={() => play('risset-rhythm', rissetRhythm({ baseBpm: bpm, metabarSec, ratio }))}
    >
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="TEMPO" value={bpm} min={60} max={240} onChange={setBpm} defaultValue={120} format={(v) => `${v.toFixed(0)} BPM`} />
        <KnobField label="METABAR" value={metabarSec} min={4} max={16} onChange={setMetabarSec} defaultValue={8} format={(v) => `${v.toFixed(0)} s`} />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        {[2, 1.5, 1.25].map((r) => (
          <Chip key={r} active={ratio === r} onClick={() => setRatio(r)}>
            RATIO {r}:1
          </Chip>
        ))}
      </div>
    </GenCard>
  );
}

function BarberPoleCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('barber-pole');
  const [carrierHz, setCarrierHz] = useState(400);
  const [sweepFrom, setSweepFrom] = useState(40);
  const [durationSec, setDurationSec] = useState(8);
  return (
    <GenCard
      card={card}
      playing={previewId === 'barber-pole'}
      warnings={warnings}
      onPlay={() => play('barber-pole', barberPoleAM({ carrierHz, sweepFromHz: sweepFrom, durationSec }))}
    >
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="CARRIER" value={carrierHz} min={100} max={1000} onChange={setCarrierHz} defaultValue={400} format={(v) => `${v.toFixed(0)} Hz`} />
        <KnobField label="BEAT" value={sweepFrom} min={20} max={80} onChange={setSweepFrom} defaultValue={40} format={(v) => `${v.toFixed(0)} Hz`} />
        <KnobField label="LENGTH" value={durationSec} min={2} max={12} onChange={setDurationSec} defaultValue={8} format={(v) => `${v.toFixed(0)} s`} />
      </div>
    </GenCard>
  );
}

/* --------------------------------------------------------- math rhythms */

function EuclideanCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('euclidean');
  const [k, setK] = useState(3);
  const [n, setN] = useState(8);
  const [rotation, setRotation] = useState(0);
  const [stepRate, setStepRate] = useState(8);
  const [mode, setMode] = useState<'gate' | 'click'>('gate');
  const kk = Math.min(Math.round(k), Math.round(n));
  const nn = Math.max(2, Math.round(n));
  const rot = Math.round(rotation) % nn;
  const steps = useMemo(() => euclideanPattern(kk, nn, rot), [kk, nn, rot]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'euclidean'}
      warnings={warnings}
      onPlay={() => play('euclidean', renderPattern({ steps, stepRate, mode, loops: 4 }))}
    >
      <PatternStrip steps={steps} />
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="PULSES" value={kk} min={1} max={nn} onChange={(v) => setK(Math.round(v))} defaultValue={3} format={(v) => `k=${Math.round(v)}`} />
        <KnobField label="STEPS" value={nn} min={2} max={32} onChange={(v) => setN(Math.round(v))} defaultValue={8} format={(v) => `n=${Math.round(v)}`} />
        <KnobField label="ROTATE" value={rot} min={0} max={nn - 1} onChange={(v) => setRotation(Math.round(v))} defaultValue={0} format={(v) => `+${Math.round(v)}`} />
        <KnobField label="RATE" value={stepRate} min={4} max={16} onChange={setStepRate} defaultValue={8} format={(v) => `${v.toFixed(0)}/s`} />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <Chip active={mode === 'gate'} onClick={() => setMode('gate')} title="Pattern gates a sustained tone (AM control signal)">
          AM GATE
        </Chip>
        <Chip active={mode === 'click'} onClick={() => setMode('click')}>
          CLICKS
        </Chip>
      </div>
      <p className="t-caption font-mono2" style={{ color: 'var(--text-3)', marginTop: 8 }}>
        E({kk},{nn}) rot {rot} — {steps.filter(Boolean).length} hits / {steps.length} steps
      </p>
    </GenCard>
  );
}

function PhiCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('phi-beatty');
  const [length, setLength] = useState(21);
  const [stepRate, setStepRate] = useState(8);
  const steps = useMemo(() => goldenBeattyPattern(Math.round(length)), [length]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'phi-beatty'}
      warnings={warnings}
      onPlay={() => play('phi-beatty', renderPattern({ steps, stepRate, loops: 3 }))}
    >
      <PatternStrip steps={steps} />
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="LENGTH" value={length} min={8} max={64} onChange={(v) => setLength(Math.round(v))} defaultValue={21} format={(v) => `${Math.round(v)} steps`} />
        <KnobField label="RATE" value={stepRate} min={4} max={16} onChange={setStepRate} defaultValue={8} format={(v) => `${v.toFixed(0)}/s`} />
      </div>
    </GenCard>
  );
}

function PrimeCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('prime-pulse');
  const [window, setWindowN] = useState(64);
  const [stepRate, setStepRate] = useState(8);
  const steps = useMemo(() => primePulsePattern(Math.round(window)), [window]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'prime-pulse'}
      warnings={warnings}
      onPlay={() => play('prime-pulse', renderPattern({ steps, stepRate, mode: 'click', loops: 2 }))}
    >
      <PatternStrip steps={steps.slice(0, 64)} />
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="WINDOW" value={window} min={16} max={256} log onChange={(v) => setWindowN(Math.round(v))} defaultValue={64} format={(v) => `2..${Math.round(v)}`} />
        <KnobField label="RATE" value={stepRate} min={4} max={16} onChange={setStepRate} defaultValue={8} format={(v) => `${v.toFixed(0)}/s`} />
      </div>
    </GenCard>
  );
}

function FibonacciCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('fibonacci-word');
  const [iterations, setIterations] = useState(6);
  const [unitMs, setUnitMs] = useState(120);
  const word = useMemo(() => fibonacciWord(iterations), [iterations]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'fibonacci-word'}
      warnings={warnings}
      onPlay={() => play('fibonacci-word', renderFibonacciRhythm({ iterations, unitSec: unitMs / 1000 }))}
    >
      <p className="t-caption font-mono2" style={{ color: 'var(--text-3)', marginBottom: 12, wordBreak: 'break-all' }}>
        {word.length > 80 ? `${word.slice(0, 80)}… (${word.length} symbols)` : word}
      </p>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="ITER" value={iterations} min={3} max={8} onChange={(v) => setIterations(Math.round(v))} defaultValue={6} format={(v) => `${Math.round(v)}`} />
        <KnobField label="UNIT" value={unitMs} min={60} max={300} onChange={setUnitMs} defaultValue={120} format={(v) => `${v.toFixed(0)} ms`} />
      </div>
    </GenCard>
  );
}

/* --------------------------------------------------------- fractal/chaos */

function FractalCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('fractal-noise');
  const [alpha, setAlpha] = useState(1);
  const [method, setMethod] = useState<'fft' | 'voss'>('fft');
  const [durationSec, setDurationSec] = useState(4);
  return (
    <GenCard
      card={card}
      playing={previewId === 'fractal-noise'}
      warnings={warnings}
      onPlay={() => play('fractal-noise', fractalNoise({ alpha, method: alpha === 1 ? method : 'fft', durationSec }))}
    >
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
        {[0, 0.5, 1, 1.5, 2].map((a) => (
          <Chip key={a} active={alpha === a} onClick={() => setAlpha(a)}>
            α={a}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="LENGTH" value={durationSec} min={2} max={8} onChange={setDurationSec} defaultValue={4} format={(v) => `${v.toFixed(0)} s`} />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <Chip active={method === 'fft'} onClick={() => setMethod('fft')} title="Spectral shaping — any α">
          FFT-SHAPED
        </Chip>
        <Chip
          active={method === 'voss' && alpha === 1}
          onClick={() => {
            setAlpha(1);
            setMethod('voss');
          }}
          title="Voss–McCartney dice algorithm — α=1 only"
        >
          VOSS (α=1)
        </Chip>
      </div>
    </GenCard>
  );
}

function LogisticCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('logistic');
  const [r, setR] = useState(3.9);
  const [noteRate, setNoteRate] = useState(12);
  const [mapTo, setMapTo] = useState<'pitch' | 'am'>('pitch');
  const regime =
    r < 3 ? 'fixed point (period 1)' : r < LOGISTIC_CHAOS_ONSET ? 'period-doubling cascade' : r >= 4 ? 'fully chaotic (r=4)' : 'chaotic';
  return (
    <GenCard
      card={card}
      playing={previewId === 'logistic'}
      warnings={warnings}
      onPlay={() => play('logistic', renderLogisticMod({ r, noteRate, mapTo, durationSec: 6 }))}
    >
      <p className="t-caption font-mono2" style={{ color: 'var(--text-2)', marginBottom: 10 }}>
        r = {r.toFixed(3)} → {regime} · bifurcation edge r ≈ {LOGISTIC_CHAOS_ONSET}
      </p>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <KnobField label="R" value={r} min={3.4} max={4} onChange={setR} defaultValue={3.9} format={(v) => v.toFixed(3)} />
        <KnobField label="RATE" value={noteRate} min={8} max={24} onChange={setNoteRate} defaultValue={12} format={(v) => `${v.toFixed(0)}/s`} />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <Chip active={mapTo === 'pitch'} onClick={() => setMapTo('pitch')}>
          → PITCH
        </Chip>
        <Chip active={mapTo === 'am'} onClick={() => setMapTo('am')}>
          → AM DEPTH
        </Chip>
      </div>
    </GenCard>
  );
}

/* --------------------------------------------------------- custom waves */

type WaveMode = CustomWaveSpec['type'];

function CustomWaveCard({
  play,
  previewId,
  warnings,
  downloadWav,
}: {
  play: PlayFn;
  previewId: string | null;
  warnings?: string[];
  downloadWav: (name: string, r: Rendered) => void;
}) {
  const card = cardMeta('custom-wave');
  const [mode, setMode] = useState<WaveMode>('additive');
  const [f0, setF0] = useState(220);
  const [harmonics, setHarmonics] = useState<number[]>([1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12]);
  const [modRatio, setModRatio] = useState(2);
  const [index, setIndex] = useState(3);
  const [knee, setKnee] = useState(0.5);

  const buildSpec = (): CustomWaveSpec => {
    if (mode === 'additive') return { type: 'additive', f0Hz: f0, harmonics, durationSec: 2 };
    if (mode === 'fm') return { type: 'fm', carrierHz: f0, modRatio, index, durationSec: 2 };
    if (mode === 'chebyshev') return { type: 'chebyshev', f0Hz: f0, weights: harmonics, index: 1, durationSec: 2 };
    return { type: 'phase-distortion', f0Hz: f0, knee, durationSec: 2 };
  };

  const setHarmonic = (i: number, v: number) =>
    setHarmonics((h) => h.map((x, j) => (j === i ? v : x)));

  return (
    <GenCard
      card={card}
      playing={previewId === 'custom-wave'}
      warnings={warnings}
      onPlay={() => play('custom-wave', renderCustomWave(buildSpec()))}
    >
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
        {(
          [
            ['additive', 'ADDITIVE'],
            ['fm', 'FM'],
            ['chebyshev', 'CHEBYSHEV'],
            ['phase-distortion', 'PHASE DIST'],
          ] as [WaveMode, string][]
        ).map(([m, label]) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
        <KnobField label="F0" value={f0} min={55} max={880} log onChange={setF0} defaultValue={220} format={(v) => `${v.toFixed(0)} Hz`} />
        {mode === 'fm' && (
          <>
            <KnobField label="C:M" value={modRatio} min={0.5} max={8} onChange={setModRatio} defaultValue={2} format={(v) => `1:${v.toFixed(2)}`} />
            <KnobField label="INDEX" value={index} min={0} max={15} onChange={setIndex} defaultValue={3} format={(v) => `I=${v.toFixed(1)}`} />
          </>
        )}
        {mode === 'phase-distortion' && (
          <KnobField label="KNEE" value={knee} min={0.05} max={0.95} onChange={setKnee} defaultValue={0.5} format={(v) => v.toFixed(2)} />
        )}
      </div>

      {(mode === 'additive' || mode === 'chebyshev') && (
        <div>
          <div className="t-label" style={{ color: 'var(--text-3)', marginBottom: 6 }}>
            {mode === 'additive' ? 'HARMONIC AMPLITUDES' : 'CHEBYSHEV WEIGHTS T₁…T₈ (exact harmonics)'}
          </div>
          <div className="flex" style={{ gap: 10, alignItems: 'flex-end' }}>
            {harmonics.map((a, i) => (
              <div key={i} className="flex flex-col items-center" style={{ gap: 4 }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={a}
                  aria-label={`Harmonic ${i + 1}`}
                  onChange={(e) => setHarmonic(i, Number(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 72, accentColor: 'var(--amber)' }}
                />
                <span className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {mode === 'fm' && (
        <p className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
          bandwidth ≈ 2·f_m·(I+1) = {(2 * f0 * modRatio * (index + 1)).toFixed(0)} Hz
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => downloadWav('soniclab-custom-wave', renderCustomWave(buildSpec()))}
          className="t-label flex items-center"
          style={{
            height: 32,
            padding: '0 12px',
            gap: 6,
            borderRadius: 2,
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-1)',
            border: '1px solid var(--line-2)',
          }}
        >
          <Download size={12} /> EXPORT WAV
        </button>
      </div>
    </GenCard>
  );
}

/* --------------------------------------------------------------- tuning */

type TuningChoice = 'ji' | 'edo19' | 'edo31' | 'bp';

function TuningCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('tuning-systems');
  const [choice, setChoice] = useState<TuningChoice>('ji');
  const [rootHz, setRootHz] = useState(220);
  const rows = useMemo(() => jiTable(), []);
  const freqs = useMemo(() => {
    if (choice === 'ji') return jiFrequencies(rootHz);
    if (choice === 'edo19') return nEDO(19, rootHz).frequencies;
    if (choice === 'edo31') return nEDO(31, rootHz).frequencies;
    return bohlenPierce(rootHz).frequencies;
  }, [choice, rootHz]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'tuning-systems'}
      warnings={warnings}
      onPlay={() => play('tuning-systems', renderScale(freqs, { noteSec: 0.45 }))}
    >
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
        {(
          [
            ['ji', 'JUST 5-LIMIT'],
            ['edo19', '19-EDO'],
            ['edo31', '31-EDO'],
            ['bp', 'BOHLEN–PIERCE'],
          ] as [TuningChoice, string][]
        ).map(([c, label]) => (
          <Chip key={c} active={choice === c} onClick={() => setChoice(c)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
        <KnobField label="ROOT" value={rootHz} min={110} max={440} onChange={setRootHz} defaultValue={220} format={(v) => `${v.toFixed(0)} Hz`} />
      </div>
      <table className="t-caption font-mono2" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-2)' }}>
        <thead>
          <tr style={{ color: 'var(--text-3)', textAlign: 'left' }}>
            <th style={{ padding: '2px 4px', fontWeight: 500 }}>INTERVAL</th>
            <th style={{ padding: '2px 4px', fontWeight: 500 }}>JI RATIO</th>
            <th style={{ padding: '2px 4px', fontWeight: 500 }}>JI ¢</th>
            <th style={{ padding: '2px 4px', fontWeight: 500 }}>12-TET ¢</th>
            <th style={{ padding: '2px 4px', fontWeight: 500 }}>Δ ¢</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{ borderTop: '1px solid var(--line-1)' }}>
              <td style={{ padding: '2px 4px' }}>{r.name}</td>
              <td style={{ padding: '2px 4px' }}>{r.ratio[0]}:{r.ratio[1]}</td>
              <td style={{ padding: '2px 4px' }}>{r.cents.toFixed(2)}</td>
              <td style={{ padding: '2px 4px' }}>{r.tetCents.toFixed(0)}</td>
              <td style={{ padding: '2px 4px', color: Math.abs(r.deviationCents) > 10 ? 'var(--amber)' : 'var(--text-2)' }}>
                {r.deviationCents >= 0 ? '+' : ''}{r.deviationCents.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="t-caption font-mono2" style={{ color: 'var(--text-3)', marginTop: 8 }}>
        syntonic comma 81/80 = 21.51¢ · Bohlen–Pierce step 3^(1/13) = 146.30¢ (tritave 3:1, 13 divisions — pair with odd-harmonic timbres)
      </p>
    </GenCard>
  );
}

/* ---------------------------------------------------------------- astro */

function AstroCard({ play, previewId, warnings }: { play: PlayFn; previewId: string | null; warnings?: string[] }) {
  const card = cardMeta('astro');
  const [convention, setConvention] = useState<'sidereal' | 'tropical'>('tropical');
  const trappist = useMemo(() => astroTuner('trappist-1'), []);
  const cosmic = useMemo(() => astroTuner('cosmic-octave', convention), [convention]);
  return (
    <GenCard
      card={card}
      playing={previewId === 'astro'}
      warnings={warnings}
      onPlay={() => play('astro', renderScale(trappist.map((e) => e.hz), { noteSec: 0.6 }))}
    >
      {/* Mandatory D-grade meaning label (E2 §5.2) — always visible. */}
      <div className="flex flex-col gap-2" style={{ marginBottom: 12 }}>
        <WarningChip tone="danger">{ASTRO_MEANING_LABEL}</WarningChip>
        <span className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
          every entry: arithmetic grade A · meaning grade D · “{ASTRO_LABEL}”
        </span>
      </div>

      <div className="t-label" style={{ color: 'var(--text-3)', marginBottom: 6 }}>
        TRAPPIST-1 ORBITAL LADDER (planet h = C3 = 130.81 Hz)
      </div>
      <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
        {trappist.map((e) => (
          <div key={e.name} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--line-1)', padding: '3px 0' }}>
            <span className="t-caption font-mono2" style={{ color: 'var(--text-2)' }}>
              {e.name} · {e.periodDays} d · {e.periodConvention}
            </span>
            <span className="flex items-center" style={{ gap: 8 }}>
              <span className="t-caption font-mono2" style={{ color: 'var(--text-1)' }}>
                {e.hz.toFixed(2)} Hz
              </span>
              <button
                type="button"
                aria-label={`Play ${e.name} tone`}
                title={`Play ${e.hz.toFixed(1)} Hz`}
                onClick={() => play(`astro-${e.name}`, renderTone(e.hz, 1.5))}
                style={{
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  border: '1px solid var(--line-2)',
                  background: 'transparent',
                  color: 'var(--amber)',
                  cursor: 'pointer',
                }}
              >
                <Play size={11} />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="t-label" style={{ color: 'var(--text-3)' }}>
          COSMIC OCTAVE (ORBITAL OCTAVE-DOUBLING)
        </span>
        <span className="flex" style={{ gap: 6 }}>
          {/* Sidereal vs tropical convention toggle — explicit per the R2 finding. */}
          <Chip active={convention === 'tropical'} onClick={() => setConvention('tropical')} title="Tropical year 365.24219 d (seasons) — Cousto’s year tone">
            TROPICAL
          </Chip>
          <Chip active={convention === 'sidereal'} onClick={() => setConvention('sidereal')} title="Sidereal year 365.25636 d (stars)">
            SIDEREAL
          </Chip>
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {cosmic.map((e) => (
          <div key={e.name} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--line-1)', padding: '3px 0' }}>
            <span className="t-caption font-mono2" style={{ color: 'var(--text-2)' }}>
              {e.name} · {e.periodDays} d · {e.periodConvention}
            </span>
            <span className="flex items-center" style={{ gap: 8 }}>
              <span className="t-caption font-mono2" style={{ color: 'var(--text-1)' }}>
                {e.hz.toFixed(2)} Hz
              </span>
              <button
                type="button"
                aria-label={`Play ${e.name} tone`}
                title={`Play ${e.hz.toFixed(1)} Hz`}
                onClick={() => play(`astro-${e.name}`, renderTone(e.hz, 1.5))}
                style={{
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  border: '1px solid var(--line-2)',
                  background: 'transparent',
                  color: 'var(--amber)',
                  cursor: 'pointer',
                }}
              >
                <Play size={11} />
              </button>
            </span>
          </div>
        ))}
      </div>
      <p className="t-caption font-mono2" style={{ color: 'var(--text-3)', marginTop: 8 }}>
        sidereal vs tropical year tones differ by 0.067¢ — as a simultaneous pair they beat once per ~189 s.
        Sources: Gillon et al. 2017 (Nature); SYSTEM Sounds 2017; IAU/JPL period constants.
      </p>
    </GenCard>
  );
}
