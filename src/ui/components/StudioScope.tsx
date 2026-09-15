/**
 * StudioScope — the Studio's always-visible live waveform strip (design.md
 * §5.10, scope panel): L (teal) and R (amber) time-domain traces overlaid on
 * the shared dotted graticule, straight from the engine's AnalyserNodes.
 *
 * Shares its canvas internals with the tabbed Visualizer (imported
 * `drawGrid` / `trace` — one graticule/trace implementation, no copies).
 *
 * Transport honesty (fix): the strip follows the FULL transport state —
 *  - idle (engine stopped): one static frame, grid + NO SIGNAL watermark;
 *  - live (running, not paused): 60 fps rAF loop from the analysers;
 *  - paused (running but held): the rAF loop HALTS (the suspended context's
 *    analyser data is frozen, so spinning would just redraw a stale trace
 *    labeled "LIVE") and a single held frame is painted — frozen traces plus
 *    a PAUSED watermark. Previously the strip ignored `paused`, so a paused
 *    session showed a frozen trace that claimed to be live.
 *
 * Performance guards:
 *  - rAF loop runs ONLY while live AND on screen (IntersectionObserver);
 *  - devicePixelRatio capped at 2; backing store sized to INTEGER device
 *    pixels (fractional canvas.width assignments are truncated by the canvas
 *    IDL, which used to leave drawing coordinates misaligned with the real
 *    pixel grid — sub-pixel blur on non-integer DPR layouts).
 */

import { useEffect, useRef, useState } from 'react';
import { AMBER, INK, MONO, TEAL, TEXT } from '../theme';
import { useSession } from '../session/SessionContext';
import { InfoPopover } from './InfoPopover';
import { drawGrid, trace } from './Visualizer';
import type { LiveEngine } from '../audio/liveEngine';

type Analysers = ReturnType<LiveEngine['analysers']>;

/**
 * Size the canvas backing store to integer device pixels and return the
 * drawing-space dims. (Canvas width/height are integer-typed: assigning a
 * fractional clientWidth*dpr truncates, leaving the coordinate space the
 * drawing code uses out of sync with the real buffer.)
 */
function sizeCanvas(canvas: HTMLCanvasElement): { dpr: number; w: number; h: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { dpr, w, h };
}

function paintBase(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; dpr: number; w: number; h: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { dpr, w, h } = sizeCanvas(canvas);
  ctx.fillStyle = INK[0];
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, dpr);
  return { ctx, dpr, w, h };
}

/** Draw both channel traces (shared trace implementation with the Visualizer). */
function paintTraces(ctx: CanvasRenderingContext2D, ana: Analysers, w: number, h: number, dpr: number) {
  if (!ana) return;
  const l = new Uint8Array(ana.left.fftSize);
  const r = new Uint8Array(ana.right.fftSize);
  ana.left.getByteTimeDomainData(l);
  ana.right.getByteTimeDomainData(r);
  trace(ctx, l, w, h, TEAL, dpr);
  trace(ctx, r, w, h, AMBER, dpr);
}

function watermark(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, dpr: number, yFrac = 0.5) {
  ctx.font = MONO(14 * dpr, 600);
  ctx.fillStyle = `${TEXT[3]}55`;
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h * yFrac);
  ctx.textAlign = 'left';
}

/** Paints the static idle frame (graticule + watermark). No rAF. */
function paintIdleFrame(canvas: HTMLCanvasElement) {
  const base = paintBase(canvas);
  if (!base) return;
  watermark(base.ctx, 'NO SIGNAL — START SESSION', base.w, base.h, base.dpr);
}

/**
 * Paints the paused frame once: the frozen analyser block (the suspended
 * context holds its last computed samples) plus a PAUSED watermark, so the
 * strip never shows a stale trace masquerading as a live one. No rAF.
 */
function paintHeldFrame(canvas: HTMLCanvasElement, ana: Analysers) {
  const base = paintBase(canvas);
  if (!base) return;
  if (ana) paintTraces(base.ctx, ana, base.w, base.h, base.dpr);
  watermark(base.ctx, 'PAUSED — TRACE HELD', base.w, base.h, base.dpr, 0.12);
}

export function StudioScope({ height = 220 }: { height?: number }) {
  const { engineRef, running, paused } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const live = running && !paused;

  // Pause off-screen (design.md §6 performance guardrail).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Live loop — only while playing (not paused) and on screen. No busy loop
  // when idle or held.
  useEffect(() => {
    if (!live || !visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { dpr, w, h } = sizeCanvas(canvas);
      ctx.fillStyle = INK[0];
      ctx.fillRect(0, 0, w, h);
      drawGrid(ctx, w, h, dpr);

      const ana = engineRef.current?.analysers() ?? null;
      if (!ana) {
        watermark(ctx, 'NO SIGNAL — START SESSION', w, h, dpr);
        return;
      }
      paintTraces(ctx, ana, w, h, dpr);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [live, visible, engineRef]);

  // Paused: paint ONE held frame (frozen traces + PAUSED watermark). The
  // analyser keeps its last block while the context is suspended, so this is
  // the honest picture of the held signal — without a spinning rAF.
  useEffect(() => {
    if (!running || !paused || !visible) return;
    const canvas = canvasRef.current;
    if (canvas) paintHeldFrame(canvas, engineRef.current?.analysers() ?? null);
  }, [running, paused, visible, engineRef]);

  // Idle / off-screen: paint one static watermark frame, schedule nothing.
  useEffect(() => {
    if (running || !visible) return;
    const canvas = canvasRef.current;
    if (canvas) paintIdleFrame(canvas);
  }, [running, visible]);

  const state = !running ? 'idle' : paused ? 'paused' : 'live';

  return (
    <div
      ref={hostRef}
      data-testid="studio-scope"
      data-state={state}
      className="scope-well flex flex-col"
      style={{ height }}
    >
      <div className="flex items-center gap-2 hairline-b" style={{ padding: '8px 12px' }}>
        <span className="t-label">SESSION SCOPE</span>
        <span className="t-readout-sm flex items-center gap-1" style={{ color: TEAL }}>
          <span aria-hidden style={{ width: 8, height: 2, background: TEAL, display: 'inline-block' }} />L
        </span>
        <span className="t-readout-sm flex items-center gap-1" style={{ color: AMBER }}>
          <span aria-hidden style={{ width: 8, height: 2, background: AMBER, display: 'inline-block' }} />R
        </span>
        <InfoPopover featureId="visualizer" label="About the live scope" />
        <span className="t-readout-sm text-3" style={{ marginLeft: 'auto' }}>
          {!running ? 'NO SIGNAL' : paused ? 'PAUSED — HELD' : 'LIVE'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', display: 'block' }}
        aria-label={
          !running
            ? 'NO SIGNAL — engine stopped, start a session to see the live waveform'
            : paused
              ? 'Session paused — the waveform trace is held frozen until resume'
              : 'Live session waveform — left channel teal, right channel amber'
        }
      />
    </div>
  );
}
