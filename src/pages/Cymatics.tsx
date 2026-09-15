/**
 * Cymatic Studio (W6) — Chladni-style nodal-pattern visualizer.
 *
 * Physics model (src/cymatics/chladni.ts): idealized square plate (Bourke
 * cos-form + generalized sin-mix with fractional morphing) and circular
 * plate (Bessel modes). A declared VIRTUAL PLATE preset defines an
 * eigenfrequency ladder; a driving frequency (manual, typed, or live audio
 * peak) excites nearby modes with Lorentzian weights ("physics mode").
 *
 * HONESTY (surfaced in the info popover + a permanent warning chip): real
 * cymatic patterns depend on plate geometry, material, thickness, and
 * boundary conditions — NOT on frequency alone. Everything here is the
 * simulated response of a chosen virtual plate.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Info, Play, Shuffle, Square, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '@/ui/session/SessionContext';
import { Chip, Led, Panel, Readout, WarningChip } from '@/ui/components/primitives';
import { Knob } from '@/ui/components/Knob';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { useIsMobile } from '@/hooks/use-mobile';
import { FREQUENCIES } from '@/data/frequencies';
import {
  VIRTUAL_PLATES,
  circularModeHz,
  createSand,
  drivenCircularField,
  drivenCircularModes,
  drivenSquareField,
  drivenSquareModes,
  frequencyToModes,
  plateField,
  squareModeHz,
  stepParticles,
  virtualPlateById,
  type PlateSign,
  type SandState,
} from '@/cymatics/chladni';
import { COLORMAPS, renderFrame, type ColormapName } from '@/cymatics/render';
import { sampleAudioFeatures, smoothDriveHz } from '@/cymatics/audioLink';

type DriveMode = 'manual' | 'frequency' | 'audio';
type Interpretation = 'physics' | 'art';

const COACH_KEY = 'opensync.cymatics.coach.v1';

const COACH_STEPS = [
  {
    title: 'PICK A VIRTUAL PLATE',
    body: 'Patterns belong to a physical object, not a frequency. Choose a plate (shape, material, size) — it defines the eigenfrequency ladder everything else plays against.',
  },
  {
    title: 'DRIVE IT',
    body: 'MANUAL: scrub mode indices directly. FREQUENCY: type a Hz value (or pull one from the Library / live session). AUDIO: the running Studio engine\'s spectrum drives the plate live.',
  },
  {
    title: 'SAND & CAPTURE',
    body: 'Switch to SAND to watch grains migrate onto nodal lines. EXPORT PNG saves the current figure. The ⓘ panel explains what is physics and what is art.',
  },
];

/** Primary / secondary buttons (design.md §5.6) — local, inline-styled. */
function Btn({
  primary,
  onClick,
  children,
  title,
}: {
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="t-label flex items-center"
      style={{
        height: 36,
        padding: '0 16px',
        borderRadius: 2,
        cursor: 'pointer',
        background: primary ? 'var(--amber)' : 'transparent',
        color: primary ? 'var(--text-inv)' : 'var(--text-1)',
        border: primary ? 'none' : '1px solid var(--line-2)',
      }}
    >
      {children}
    </button>
  );
}

function readCoachDone(): boolean {
  try {
    return window.localStorage.getItem(COACH_KEY) === 'done';
  } catch {
    return true;
  }
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div style={{ opacity: disabled ? 0.4 : 1 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span className="t-label">{label}</span>
        <Readout value={format ? format(value) : String(value)} size="sm" />
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--amber)' }}
      />
    </div>
  );
}

export default function Cymatics() {
  const isMobile = useIsMobile();
  const { carrierHz: sessionCarrierHz, beatHz: sessionBeatHz, engineRef, previewId, previewTone } = useSession();

  // ---- plate + mode state --------------------------------------------------
  const [plateId, setPlateId] = useState('steel-square-30');
  const plate = virtualPlateById(plateId);
  const shape = plate.shape;
  const [interp, setInterp] = useState<Interpretation>('physics');
  const [driveMode, setDriveMode] = useState<DriveMode>('manual');

  const [n, setN] = useState(1);
  const [m, setM] = useState(2);
  const [sign, setSign] = useState<PlateSign>(1);
  const [mixA, setMixA] = useState(1);
  const [mixB, setMixB] = useState(-1);
  const [circM, setCircM] = useState(1);
  const [circS, setCircS] = useState(1);

  const [freqHz, setFreqHz] = useState(432);
  const [audioHz, setAudioHz] = useState(0);
  const [audioActive, setAudioActive] = useState(false);

  // ---- render state --------------------------------------------------------
  const [renderMode, setRenderMode] = useState<'lines' | 'sand'>('lines');
  const [colormap, setColormap] = useState<ColormapName>('amber-grain');
  const [threshold, setThreshold] = useState(0.08);
  const [particleCount, setParticleCount] = useState(6000);
  const [speed, setSpeed] = useState(1);
  const [resolution, setResolution] = useState(288);
  const [seed, setSeed] = useState(7);

  // ---- popovers / coach marks ----------------------------------------------
  const [infoOpen, setInfoOpen] = useState(false);
  const [coachStep, setCoachStep] = useState(() => (readCoachDone() ? -1 : 0));

  // ---- canvas + sim refs -----------------------------------------------------
  const displayRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const sandRef = useRef<SandState | null>(null);
  const energyRef = useRef(0);
  const smoothHzRef = useRef(0);

  const driveHz = driveMode === 'audio' ? audioHz : freqHz;
  const driven = driveMode !== 'manual';

  // The field is the single source of truth for both render modes.
  const field = useMemo((): ((x: number, y: number) => number) => {
    if (driven && driveHz > 0) {
      if (interp === 'physics') {
        if (shape === 'square') return drivenSquareField(drivenSquareModes(driveHz, plate));
        return drivenCircularField(drivenCircularModes(driveHz, plate), plate.boundary);
      }
      // Art mode: snap to the nearest rung of the honest ladder, render pure.
      const best = frequencyToModes(driveHz, shape, {
        fundamentalHz: plate.fundamentalHz,
        scaling: plate.scaling,
        boundary: plate.boundary,
        tolerance: 10,
        limit: 1,
      })[0];
      if (best) {
        if (best.kind === 'square') {
          const bn = best.n;
          const bm = best.m;
          const bs = best.sign;
          return (x, y) =>
            plateField({
              shape: 'square', n: bn, m: bm, sign: bs, mixA: 1, mixB: -1,
              useMix: false, circM: 0, circS: 1, boundary: 'clamped',
            })(x, y);
        }
        const bm2 = best.m;
        const bs2 = best.s;
        const bb = best.boundary;
        return (x, y) =>
          plateField({
            shape: 'circular', n: 0, m: 1, sign: 1, mixA: 1, mixB: -1,
            useMix: false, circM: bm2, circS: bs2, boundary: bb,
          })(x, y);
      }
    }
    if (shape === 'square') {
      if (interp === 'art') {
        const fn = n;
        const fm = m;
        return (x, y) =>
          plateField({
            shape: 'square', n: fn, m: fm, sign, mixA, mixB, useMix: true,
            circM: 0, circS: 1, boundary: 'clamped',
          })(x, y);
      }
      const ni = Math.round(n);
      const mi = Math.round(m);
      return plateField({
        shape: 'square', n: ni, m: Math.max(ni === 0 && mi === 0 ? 1 : 0, mi), sign,
        mixA: 1, mixB: -1, useMix: false, circM: 0, circS: 1, boundary: 'clamped',
      });
    }
    return plateField({
      shape: 'circular', n: 0, m: 1, sign: 1, mixA: 1, mixB: -1, useMix: false,
      circM, circS, boundary: plate.boundary,
    });
  }, [driven, driveHz, interp, shape, plate, n, m, sign, mixA, mixB, circM, circS]);

  // Modal-frequency readout for the current selection.
  const modalHz = useMemo(() => {
    if (shape === 'square') {
      const ni = Math.round(n);
      const mi = Math.max(ni === 0 && Math.round(m) === 0 ? 1 : 0, Math.round(m));
      return squareModeHz(ni, mi, plate.fundamentalHz, plate.scaling);
    }
    return circularModeHz(circM, circS, plate.fundamentalHz, plate.boundary);
  }, [shape, n, m, circM, circS, plate]);

  // Sand lifecycle: reseed when count / shape / seed changes.
  useEffect(() => {
    sandRef.current = createSand(particleCount, seed, shape === 'circular');
  }, [particleCount, shape, seed]);

  // ---- animation loop --------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Audio link (degrades gracefully to a static frame when offline).
      if (driveMode === 'audio') {
        const analyser = engineRef.current?.analysers()?.spectrum ?? null;
        const feats = sampleAudioFeatures(analyser, engineRef.current?.sampleRate ?? 48000);
        energyRef.current = feats.energy;
        setAudioActive(feats.active);
        if (feats.active) {
          const smoothed = smoothDriveHz(smoothHzRef.current, feats.peakHz);
          smoothHzRef.current = smoothed;
          setAudioHz((cur) => (Math.abs(cur - smoothed) > 0.5 ? Math.round(smoothed * 10) / 10 : cur));
        }
      } else {
        energyRef.current = 0;
        smoothHzRef.current = 0;
        setAudioActive(false);
      }

      const canvas = displayRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (!bufferRef.current) bufferRef.current = document.createElement('canvas');
      const buf = bufferRef.current;
      if (buf.width !== resolution || buf.height !== resolution) {
        buf.width = resolution;
        buf.height = resolution;
      }

      const sand = sandRef.current;
      if (renderMode === 'sand' && sand) {
        stepParticles(sand, field, dt * speed, {
          jitter: 0.012 + energyRef.current * 0.05,
        });
      }

      renderFrame(buf.getContext('2d'), resolution, resolution, {
        field,
        circular: shape === 'circular',
        mode: renderMode,
        colormap,
        threshold,
        particles: renderMode === 'sand' ? sand : null,
        energy: energyRef.current,
      });
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [field, renderMode, colormap, threshold, resolution, speed, shape, driveMode, engineRef]);

  // ---- actions ----------------------------------------------------------------
  const exportPng = useCallback(() => {
    const res = 768;
    const off = document.createElement('canvas');
    off.width = res;
    off.height = res;
    renderFrame(off.getContext('2d'), res, res, {
      field,
      circular: shape === 'circular',
      mode: renderMode,
      colormap,
      threshold,
      particles: renderMode === 'sand' ? sandRef.current : null,
      energy: 0,
    });
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cymatics-${shape}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [field, shape, renderMode, colormap, threshold]);

  const finishCoach = useCallback(() => {
    try {
      window.localStorage.setItem(COACH_KEY, 'done');
    } catch {
      /* private mode */
    }
    setCoachStep(-1);
  }, []);

  // P0-4: coach-mark tips dismiss on Esc (non-modal, so no focus trap).
  useEffect(() => {
    if (coachStep < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishCoach();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coachStep, finishCoach]);

  const selectShape = (next: 'square' | 'circular') => {
    if (next === shape) return;
    const first = VIRTUAL_PLATES.find((p) => p.shape === next);
    if (first) setPlateId(first.id);
  };

  const libFrequencies = FREQUENCIES.filter((f) => typeof f.hz === 'number');

  // "Hear this pattern": the drive frequency (audio-linked live peak, typed Hz)
  // or, in manual mode, the selected mode's eigenfrequency — as a capped tone.
  const hearHz = driven && driveHz > 0 ? driveHz : modalHz;
  const hearing = previewId === 'cymatics:plate';

  const modeLabel =
    shape === 'square'
      ? driven
        ? 'DRIVEN'
        : `(n=${interp === 'art' ? n.toFixed(2) : Math.round(n)}, m=${interp === 'art' ? m.toFixed(2) : Math.round(m)})`
      : driven
        ? 'DRIVEN'
        : `(m=${circM}, s=${circS})`;

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 1440 }}>
      {/* header */}
      <div className="flex items-center gap-3" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 className="t-h2" style={{ marginRight: 4 }}>
          Cymatic Studio
        </h2>
        <GradeBadge
          grade="A"
          citation={{
            verdict: 'Ideal-plate physics is solid; the frequency→pattern shortcut is not.',
            summary:
              'Chladni figures are the nodal lines of real plate eigenmodes (Chladni 1787; Kirchhoff–Love plate theory). But which pattern appears depends on plate geometry, material, thickness, and boundary conditions — never on frequency alone. This module shows the simulated response of a declared virtual plate.',
            source:
              'COMSOL Multiphysics blog (Chladni plates); MDPI Entropy 26(3):264 (2024); Tuan et al., PMC6052176 (2018).',
          }}
        />
        <span style={{ flex: 1 }} />
        <WarningChip tone="amber">
          PATTERNS DEPEND ON THE PLATE, NOT ON FREQUENCY ALONE
        </WarningChip>
        <button
          type="button"
          aria-label="About the physics"
          onClick={() => setInfoOpen((v) => !v)}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            color: 'var(--text-2)',
            background: infoOpen ? 'var(--ink-3)' : 'transparent',
            border: '1px solid var(--line-1)',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          <Info size={16} />
        </button>
      </div>

      {/* info popover */}
      <AnimatePresence>
        {infoOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 45 }}
              onClick={() => setInfoOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="panel"
              style={{
                position: 'fixed',
                top: 96,
                right: isMobile ? 16 : 40,
                width: 'min(420px, calc(100vw - 32px))',
                zIndex: 46,
                background: 'var(--ink-3)',
                border: '1px solid var(--line-2)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                padding: 20,
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <span className="t-label">WHAT THIS SIMULATES</span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setInfoOpen(false)}
                  style={{ color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="t-body-sm" style={{ color: 'var(--text-2)', display: 'grid', gap: 10 }}>
                <p>
                  Sand on a vibrating plate collects along <em>nodal lines</em> — curves where the
                  surface does not move. Square plate: cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy) = 0
                  (Chladni 1787, Bourke 2003 form). Circular plate: Bessel modes J_m(k·r)·cos(mθ)
                  with k set by the rim condition.
                </p>
                <p>
                  <strong style={{ color: 'var(--amber)' }}>Physics mode</strong> treats your Hz as
                  the drive of the selected virtual plate and superposes nearby eigenmodes with
                  Lorentzian weights — the physically motivated model of a real driven plate.{' '}
                  <strong style={{ color: 'var(--teal-hi)' }}>Art mode</strong> maps frequency (or
                  fractional sliders) straight onto pattern indices — an artistic interpretation,
                  labeled as such.
                </p>
                <p>
                  Honesty note: real patterns depend on geometry, thickness, material, and boundary
                  conditions. The same 500&nbsp;Hz tone draws different figures on different plates.
                  Nothing here shows "the cymatic pattern of a frequency" — only the simulated
                  response of the plate you picked.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="flex gap-6"
        style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}
      >
        {/* ------------------------------------------------ scope panel */}
        <Panel
          title="PLATE SCOPE"
          pad={false}
          style={{ flex: isMobile ? 'none' : '1 1 auto', width: isMobile ? '100%' : undefined, minWidth: 0 }}
          right={
            <div className="flex items-center gap-3" style={{ paddingRight: 4 }}>
              <span className="t-readout-sm text-3">{modeLabel}</span>
              <InfoPopover featureId="cymatic-patterns" label="About the plate pattern view" />
              <Led state={driveMode === 'audio' && audioActive ? 'teal' : 'off'} title="Audio link" />
            </div>
          }
        >
          <div
            style={{
              background: 'var(--ink-0)',
              borderTop: '1px solid var(--line-1)',
              borderBottom: '1px solid var(--line-1)',
              position: 'relative',
            }}
          >
            <canvas
              ref={displayRef}
              width={640}
              height={640}
              style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1' }}
            />
            {driveMode === 'audio' && !audioActive && (
              <div
                className="t-readout-sm"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-3)',
                  letterSpacing: '0.12em',
                  pointerEvents: 'none',
                }}
              >
                NO SIGNAL — START THE ENGINE IN STUDIO
              </div>
            )}
          </div>
          <div
            className="flex items-center gap-6"
            style={{ padding: '12px 16px', flexWrap: 'wrap' }}
          >
            <div>
              <div className="t-label text-3" style={{ marginBottom: 2 }}>MODAL f</div>
              <Readout value={modalHz.toFixed(1)} unit="Hz" size="md" color="var(--teal-hi)" />
            </div>
            <div>
              <div className="t-label text-3" style={{ marginBottom: 2 }}>DRIVE</div>
              <Readout
                value={driven && driveHz > 0 ? driveHz.toFixed(1) : '—'}
                unit={driven ? 'Hz' : undefined}
                size="md"
                color={driven ? 'var(--amber)' : 'var(--text-3)'}
              />
            </div>
            <div>
              <div className="t-label text-3" style={{ marginBottom: 2 }}>PLATE f₀</div>
              <Readout value={plate.fundamentalHz.toFixed(0)} unit="Hz" size="md" />
            </div>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="t-label flex items-center"
              style={{
                minHeight: 40,
                padding: '0 16px',
                borderRadius: 2,
                cursor: 'pointer',
                background: hearing ? 'rgba(217,164,65,0.08)' : 'transparent',
                color: hearing ? 'var(--amber)' : 'var(--text-1)',
                border: `1px solid ${hearing ? 'var(--amber)' : 'var(--line-2)'}`,
              }}
              aria-label={hearing ? 'Stop the pattern tone' : `Hear this pattern: ${hearHz.toFixed(1)} Hz tone`}
              title={`Plays the ${hearHz.toFixed(1)} Hz drive/modal frequency as a tone while the pattern animates (level capped by the safety governor)`}
              onClick={() => previewTone('cymatics:plate', hearHz)}
            >
              {hearing ? (
                <Square size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              ) : (
                <Play size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              )}
              {hearing ? 'STOP TONE' : 'HEAR THIS PATTERN'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSeed((s) => s + 1)}>
              <Shuffle size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              SCATTER SAND
            </button>
            <button type="button" className="btn-primary" onClick={exportPng}>
              <Download size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              EXPORT PNG
            </button>
          </div>
        </Panel>

        {/* ------------------------------------------------ controls */}
        <div
          className="flex flex-col gap-6"
          style={{ width: isMobile ? '100%' : 380, flexShrink: 0 }}
        >
          <Panel title="VIRTUAL PLATE">
            <div className="flex gap-2" style={{ marginBottom: 16 }}>
              <Chip active={shape === 'square'} onClick={() => selectShape('square')}>SQUARE</Chip>
              <Chip active={shape === 'circular'} onClick={() => selectShape('circular')}>CIRCULAR</Chip>
            </div>
            <select
              aria-label="Virtual plate preset"
              value={plateId}
              onChange={(e) => setPlateId(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--ink-4)',
                color: 'var(--text-1)',
                border: '1px solid var(--line-1)',
                borderRadius: 2,
                padding: '8px 10px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {VIRTUAL_PLATES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · f₀ {p.fundamentalHz} Hz
                </option>
              ))}
            </select>
            <p className="t-caption text-3" style={{ margin: 0 }}>{plate.note}</p>
            <div className="flex gap-2" style={{ marginTop: 16 }}>
              <Chip
                active={interp === 'physics'}
                onClick={() => setInterp('physics')}
                title="Eigenfrequency-ladder drive — physically motivated"
              >
                PHYSICS
              </Chip>
              <Chip
                active={interp === 'art'}
                onClick={() => setInterp('art')}
                title="Direct frequency→mode morph — artistic interpretation"
              >
                ART
              </Chip>
              <span className="t-caption text-3" style={{ alignSelf: 'center' }}>
                {interp === 'physics' ? 'driven-plate superposition' : 'artistic interpretation'}
              </span>
            </div>
          </Panel>

          <Panel title="DRIVE">
            <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              <Chip active={driveMode === 'manual'} onClick={() => setDriveMode('manual')}>MANUAL</Chip>
              <Chip active={driveMode === 'frequency'} onClick={() => setDriveMode('frequency')}>FREQUENCY</Chip>
              <Chip active={driveMode === 'audio'} onClick={() => setDriveMode('audio')}>AUDIO</Chip>
            </div>

            {driveMode === 'manual' && shape === 'square' && (
              <>
                <div className="flex gap-6" style={{ justifyContent: 'center', marginBottom: 12 }}>
                  <Knob
                    label="N"
                    value={n}
                    min={interp === 'art' ? 0.25 : 0}
                    max={8}
                    onChange={(v) => setN(interp === 'art' ? v : Math.round(v))}
                  />
                  <Knob
                    label="M"
                    value={m}
                    min={interp === 'art' ? 0.25 : 0}
                    max={8}
                    onChange={(v) => setM(interp === 'art' ? v : Math.round(v))}
                    color="var(--teal)"
                  />
                </div>
                {interp === 'physics' ? (
                  <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                    <Chip active={sign === 1} onClick={() => setSign(1)} title="cos − cos">DIFF (−)</Chip>
                    <Chip active={sign === -1} onClick={() => setSign(-1)} title="cos + cos">SUM (+)</Chip>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Slider label="MIX A" value={mixA} min={-1} max={1} step={0.01} onChange={setMixA} format={(v) => v.toFixed(2)} />
                    <Slider label="MIX B" value={mixB} min={-1} max={1} step={0.01} onChange={setMixB} format={(v) => v.toFixed(2)} />
                    <p className="t-caption text-3" style={{ margin: 0 }}>
                      a·sin(nπx)sin(mπy) + b·sin(mπx)sin(nπy) — fractional n/m morphs between modes.
                    </p>
                  </div>
                )}
              </>
            )}

            {driveMode === 'manual' && shape === 'circular' && (
              <div className="flex gap-6" style={{ justifyContent: 'center' }}>
                <Knob label="M (θ)" value={circM} min={0} max={5} onChange={(v) => setCircM(Math.round(v))} />
                <Knob label="S (r)" value={circS} min={1} max={5} onChange={(v) => setCircS(Math.round(v))} color="var(--teal)" />
              </div>
            )}

            {driveMode === 'frequency' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-end gap-3">
                  <div style={{ flex: 1 }}>
                    <span className="t-label" style={{ display: 'block', marginBottom: 4 }}>DRIVE FREQUENCY</span>
                    <input
                      type="number"
                      aria-label="Drive frequency in Hz"
                      min={20}
                      max={8000}
                      step={1}
                      value={freqHz}
                      onChange={(e) => setFreqHz(Math.min(8000, Math.max(20, Number(e.target.value) || 20)))}
                      className="t-readout-md"
                      style={{
                        width: '100%',
                        background: 'var(--ink-4)',
                        color: 'var(--amber)',
                        border: '1px solid var(--line-1)',
                        borderRadius: 2,
                        padding: '6px 10px',
                      }}
                    />
                  </div>
                  <Readout value={freqHz.toFixed(1)} unit="Hz" size="lg" color="var(--amber)" />
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <Chip onClick={() => setFreqHz(Math.max(20, sessionCarrierHz))} title="Current Studio carrier">
                    CARRIER {sessionCarrierHz.toFixed(0)}
                  </Chip>
                  <Chip onClick={() => setFreqHz(Math.max(20, sessionBeatHz * 40))} title="Session beat × 40 (audible octave shift)">
                    BEAT ×40
                  </Chip>
                </div>
                <select
                  aria-label="Library frequency"
                  value=""
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setFreqHz(Math.min(8000, Math.max(20, v)));
                  }}
                  style={{
                    background: 'var(--ink-4)',
                    color: 'var(--text-2)',
                    border: '1px solid var(--line-1)',
                    borderRadius: 2,
                    padding: '6px 10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                  }}
                >
                  <option value="">FROM THE FREQUENCY LIBRARY…</option>
                  {libFrequencies.map((f) => (
                    <option key={f.id} value={f.hz}>
                      {f.name} [{f.grade}]
                    </option>
                  ))}
                </select>
                <p className="t-caption text-3" style={{ margin: 0 }}>
                  The Hz value drives the selected plate's eigenfrequency ladder
                  {interp === 'physics' ? ' (Lorentzian mode mix)' : ' (nearest rung, art mode)'}.
                </p>
              </div>
            )}

            {driveMode === 'audio' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Led state={audioActive ? 'teal' : 'off'} />
                  <span className="t-body-sm" style={{ color: 'var(--text-2)' }}>
                    {audioActive
                      ? 'Live spectrum driving the plate.'
                      : 'No signal — start the engine in Studio.'}
                  </span>
                </div>
                <div>
                  <div className="t-label text-3" style={{ marginBottom: 2 }}>SPECTRAL PEAK</div>
                  <Readout
                    value={audioActive ? audioHz.toFixed(1) : '—'}
                    unit={audioActive ? 'Hz' : undefined}
                    size="lg"
                    color={audioActive ? 'var(--amber)' : 'var(--text-3)'}
                  />
                </div>
                <p className="t-caption text-3" style={{ margin: 0 }}>
                  Peak frequency drives mode selection; spectral energy drives sand jitter and glow.
                </p>
              </div>
            )}
          </Panel>

          <Panel title="RENDER">
            <div className="flex gap-2" style={{ marginBottom: 16 }}>
              <Chip active={renderMode === 'lines'} onClick={() => setRenderMode('lines')}>NODAL LINES</Chip>
              <Chip active={renderMode === 'sand'} onClick={() => setRenderMode('sand')}>SAND</Chip>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <span className="t-label" style={{ display: 'block', marginBottom: 6 }}>COLORMAP</span>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {COLORMAPS.map((c) => (
                    <Chip key={c.id} active={colormap === c.id} onClick={() => setColormap(c.id)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </div>
              {renderMode === 'lines' && (
                <Slider label="LINE WIDTH" value={threshold} min={0.01} max={0.3} step={0.005} onChange={setThreshold} format={(v) => v.toFixed(3)} />
              )}
              {renderMode === 'sand' && (
                <>
                  <Slider
                    label="PARTICLES"
                    value={particleCount}
                    min={500}
                    max={20000}
                    step={500}
                    onChange={setParticleCount}
                    format={(v) => String(Math.round(v))}
                  />
                  <Slider label="ANIMATION SPEED" value={speed} min={0} max={3} step={0.05} onChange={setSpeed} format={(v) => `${v.toFixed(2)}×`} />
                </>
              )}
              <Slider
                label="RESOLUTION"
                value={resolution}
                min={128}
                max={512}
                step={32}
                onChange={(v) => setResolution(Math.round(v))}
                format={(v) => `${Math.round(v)} px`}
              />
            </div>
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------------ coach marks */}
      <AnimatePresence>
        {coachStep >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="panel"
            style={{
              position: 'fixed',
              bottom: isMobile ? 88 : 24,
              right: isMobile ? 16 : 24,
              width: 'min(360px, calc(100vw - 32px))',
              zIndex: 50,
              background: 'var(--ink-3)',
              border: '1px solid var(--line-2)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              padding: 20,
            }}
            role="dialog"
            aria-label={`Tip ${coachStep + 1} of ${COACH_STEPS.length}`}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="t-label" style={{ color: 'var(--amber)' }}>
                {COACH_STEPS[coachStep].title}
              </span>
              <span className="t-readout-sm text-3">
                {coachStep + 1}/{COACH_STEPS.length}
              </span>
            </div>
            <p className="t-body-sm" style={{ color: 'var(--text-2)', margin: '0 0 16px' }}>
              {COACH_STEPS[coachStep].body}
            </p>
            <div className="flex gap-2">
              <Btn onClick={finishCoach}>SKIP</Btn>
              <span style={{ flex: 1 }} />
              <Btn
                primary
                onClick={() => {
                  if (coachStep + 1 >= COACH_STEPS.length) finishCoach();
                  else setCoachStep(coachStep + 1);
                }}
              >
                {coachStep + 1 >= COACH_STEPS.length ? 'GOT IT' : 'NEXT'}
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
