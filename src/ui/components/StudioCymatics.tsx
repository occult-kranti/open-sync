/**
 * StudioCymatics — a compact, audio-reactive Chladni panel embedded in the
 * Studio. The live engine's spectrum analyser drives a declared VIRTUAL
 * PLATE (fixed: the 30×30 cm steel square plate) through the shared
 * audioLink pipeline (src/cymatics/audioLink.ts):
 *
 *  - PHYSICS mode (default): the smoothed spectral peak is the drive
 *    frequency; nearby eigenmodes are superposed with Lorentzian weights
 *    (`drivenSquareModes`) — the physically motivated model of a driven
 *    plate. Label: "drives a virtual plate — simulated response".
 *  - ART mode (user toggle): the peak frequency is mapped straight onto
 *    pattern indices (`driveFromFeatures().artMode`). Label: "artistic
 *    rendering of a virtual plate".
 *
 * Render modes (header toggle):
 *  - LINES (default): the classic nodal-line figure (`renderFrame` 'lines').
 *  - SAND: the sand-particle view — a deterministically seeded grain field
 *    (`createSand`, fixed seed, SQUARE plate domain) stepped down-gradient of
 *    |field| each frame (`stepParticles`), so grains collect on the nodal
 *    lines of the same virtual plate. Same physics, particle view.
 *
 * HONESTY: real cymatic figures depend on plate geometry, material, and
 * boundary conditions — never on frequency alone. Both labels are permanent
 * and frame everything as a virtual plate; nothing here is a measurement.
 *
 * Degradation / cost: with no running session (or a null analyser) it paints
 * ONE static deterministic frame plus a hint and schedules no rAF work.
 * Live rendering goes to a 192 px internal buffer (≤ 256 px cap) upscaled
 * with smoothing; off-screen pause via IntersectionObserver; DPR cap 2.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { TEXT } from '../theme';
import { useSession } from '../session/SessionContext';
import { InfoPopover } from './InfoPopover';
import {
  VIRTUAL_PLATES,
  createSand,
  drivenSquareField,
  drivenSquareModes,
  squarePlateValue,
  stepParticles,
  type SandState,
} from '@/cymatics/chladni';
import { renderFrame } from '@/cymatics/render';
import {
  driveFromFeatures,
  sampleAudioFeatures,
  smoothDriveHz,
  type AnalyserLike,
} from '@/cymatics/audioLink';

type Interpretation = 'physics' | 'art';
type RenderMode = 'lines' | 'sand';

/** Fixed compact-panel plate (the full Cymatic Studio offers the selector). */
const PLATE = VIRTUAL_PLATES[0]; // steel square 30×30 cm, fundamental 180 Hz

/** Internal render-buffer resolution (≤ 256 px, upscaled to the display). */
const RES = 192;

/**
 * Sand field: fixed grain count and FIXED seed so the resting layout — and
 * the whole driven trajectory for a given drive history — is deterministic
 * (reproducible frames, testable convergence). Square plate domain only.
 */
const SAND_COUNT = 4000;
const SAND_SEED = 0xc1ad;

/** Honesty labels — permanent, virtual-plate framing in both modes. */
const HONESTY: Record<Interpretation, string> = {
  physics: 'Live audio drives a virtual plate — simulated response, not a measurement of a physical plate.',
  art: 'Artistic rendering of a virtual plate — the peak frequency is mapped straight onto pattern indices.',
};

/** Sand-mode addendum (same honesty frame, particle mechanics spelled out). */
const SAND_NOTE =
  'Sand grains drift down-gradient and settle on the nodal lines — a particle view of the same virtual plate, not a measurement.';

/** Deterministic resting frame: driven superposition at 3× the fundamental. */
const STATIC_FIELD = drivenSquareField(drivenSquareModes(PLATE.fundamentalHz * 3, PLATE));

export function StudioCymatics({
  analyser,
  height = 220,
}: {
  /** Force an analyser (or null) — defaults to the live engine's spectrum tap. */
  analyser?: AnalyserLike | null;
  height?: number;
}) {
  const { engineRef, running } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const smoothHzRef = useRef(0);
  const sandRef = useRef<SandState | null>(null);
  const [mode, setMode] = useState<Interpretation>('physics');
  const [renderMode, setRenderMode] = useState<RenderMode>('lines');
  const [live, setLive] = useState(false);
  const [readout, setReadout] = useState<{ hz: number; mode: string } | null>(null);
  const [visible, setVisible] = useState(true);

  // An explicit prop drives the panel on its own; otherwise follow transport.
  const driving = running || analyser != null;

  // Pause off-screen (design.md §6 performance guardrail).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Live loop — only while driven and on screen. No busy loop when idle.
  useEffect(() => {
    if (!driving || !visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!bufferRef.current) bufferRef.current = document.createElement('canvas');
    const buf = bufferRef.current;
    buf.width = RES;
    buf.height = RES;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const ana =
        analyser !== undefined ? analyser : engineRef.current?.analysers()?.spectrum ?? null;
      const feats = sampleAudioFeatures(ana, engineRef.current?.sampleRate ?? 48000);

      let field = STATIC_FIELD;
      let energy = 0;
      if (feats.active && feats.peakHz > 0) {
        const driveHz = smoothDriveHz(smoothHzRef.current, feats.peakHz);
        smoothHzRef.current = driveHz;
        const drive = driveFromFeatures({ ...feats, peakHz: driveHz }, PLATE);
        let modeLabel: string | null = null;
        if (mode === 'physics' && drive.squareModes.length > 0) {
          field = drivenSquareField(drive.squareModes);
          const top = drive.squareModes[0];
          modeLabel = `(${top.n},${top.m})`;
        } else if (mode === 'art' && drive.artMode) {
          const { n, m } = drive.artMode;
          field = (x, y) => squarePlateValue(x, y, n, Math.max(n === 0 && m === 0 ? 1 : 0, m), 1);
          modeLabel = `(${n},${m})`;
        }
        energy = feats.energy;
        setLive((prev) => (prev ? prev : true));
        if (modeLabel) {
          const rounded = Math.round(driveHz * 10) / 10;
          setReadout((prev) =>
            prev && Math.abs(prev.hz - rounded) < 0.5 && prev.mode === modeLabel
              ? prev
              : { hz: rounded, mode: modeLabel },
          );
        }
      } else {
        smoothHzRef.current = 0;
        setLive((prev) => (prev ? false : prev));
      }

      // Sand mode: lazily seed once (deterministic), then step grains
      // down-gradient of |field| with energy-driven jitter. The converged
      // layout survives LINES↔SAND toggles — same physical continuity as
      // real sand on a plate whose drive keeps changing.
      let particles: SandState | null = null;
      if (renderMode === 'sand') {
        if (!sandRef.current) sandRef.current = createSand(SAND_COUNT, SAND_SEED, false);
        stepParticles(sandRef.current, field, dt, {
          jitter: 0.012 + energy * 0.05,
        });
        particles = sandRef.current;
      }

      renderFrame(buf.getContext('2d'), RES, RES, {
        field,
        circular: false,
        mode: renderMode,
        colormap: 'amber-grain',
        energy,
        particles,
      });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(buf, 0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [driving, visible, mode, renderMode, analyser, engineRef]);

  // Idle: paint the static deterministic frame once, schedule nothing. Sand
  // mode shows the freshly seeded resting layout (fixed seed → identical
  // every time).
  useEffect(() => {
    if (driving || !visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!bufferRef.current) bufferRef.current = document.createElement('canvas');
    const buf = bufferRef.current;
    buf.width = RES;
    buf.height = RES;
    renderFrame(buf.getContext('2d'), RES, RES, {
      field: STATIC_FIELD,
      circular: false,
      mode: renderMode,
      colormap: 'amber-grain',
      energy: 0,
      particles: renderMode === 'sand' ? createSand(SAND_COUNT, SAND_SEED, false) : null,
    });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(buf, 0, 0, w, h);
  }, [driving, visible, renderMode]);

  return (
    <div
      ref={hostRef}
      data-testid="studio-cymatics"
      data-state={live ? 'live' : 'static'}
      data-render-mode={renderMode}
      className="scope-well flex flex-col"
      style={{ height }}
    >
      <div className="flex items-center gap-2 hairline-b" style={{ padding: '8px 12px' }}>
        <span className="t-label">CYMATICS</span>
        {(['physics', 'art'] as Interpretation[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${mode === m ? 'chip-active' : ''}`}
            style={{ height: 22, fontSize: 10 }}
            onClick={() => setMode(m)}
            title={
              m === 'physics'
                ? 'Eigenfrequency-ladder drive — drives a virtual plate — simulated response'
                : 'Direct frequency→mode morph — artistic rendering of a virtual plate'
            }
          >
            {m.toUpperCase()}
          </button>
        ))}
        {(['lines', 'sand'] as RenderMode[]).map((rm) => (
          <button
            key={rm}
            type="button"
            data-testid={`cymatics-render-${rm}`}
            aria-pressed={renderMode === rm}
            className={`chip ${renderMode === rm ? 'chip-active' : ''}`}
            style={{ height: 22, fontSize: 10 }}
            onClick={() => setRenderMode(rm)}
            title={
              rm === 'lines'
                ? 'Nodal-line figure of the driven virtual plate'
                : 'Sand-particle view — grains settle on the nodal lines of the same virtual plate'
            }
          >
            {rm.toUpperCase()}
          </button>
        ))}
        <InfoPopover featureId="cymatic-patterns" label="About cymatic patterns" />
        <Link
          to="/cymatics"
          className="chip"
          style={{ marginLeft: 'auto', height: 22, fontSize: 10, textDecoration: 'none' }}
          title="Open the full Cymatic Studio"
        >
          FULL STUDIO ↗
        </Link>
      </div>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', display: 'block', minHeight: 0 }}
        aria-label={
          live
            ? renderMode === 'sand'
              ? 'Live sand-particle Chladni pattern driven by the session audio on a virtual plate'
              : 'Live Chladni pattern driven by the session audio on a virtual plate'
            : 'Static Chladni figure — start a session to drive the virtual plate live'
        }
      />
      <div className="hairline-t" style={{ padding: '8px 12px' }}>
        <p className="t-caption" style={{ color: TEXT[3], marginBottom: 4 }}>
          {HONESTY[mode]}
          {renderMode === 'sand' ? ` ${SAND_NOTE}` : ''}
        </p>
        <div className="t-readout-sm" style={{ color: TEXT[3] }}>
          PLATE {PLATE.label}
          {renderMode === 'sand' ? ` · SAND ${SAND_COUNT} GRAINS` : ''}
          {' · '}
          {live && readout
            ? `DRIVE ${readout.hz.toFixed(1)} Hz · MODE ${readout.mode}`
            : 'STATIC — START A SESSION TO DRIVE THE PLATE LIVE'}
        </div>
      </div>
    </div>
  );
}
