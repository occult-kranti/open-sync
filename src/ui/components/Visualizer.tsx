/**
 * Visualizer — tabbed canvas scopes (SCOPE / SPECTRUM / CORRELATION) driven
 * at 60 fps from the live engine's AnalyserNodes (design.md §5.10, studio.md
 * Row B). Renders the "NO SIGNAL" watermark when the engine is stopped.
 */

import { useEffect, useRef, useState } from 'react';
import { AMBER, INK, LINE, MONO, TEAL, TEAL_DIM, TEXT } from '../theme';
import { useSession } from '../session/SessionContext';
import { InfoPopover } from './InfoPopover';

type Tab = 'scope' | 'spectrum' | 'correlation';

export function Visualizer({ height = 320 }: { height?: number }) {
  const { engineRef, running, carrierHz, beatHz } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>('spectrum');
  const [zoom, setZoom] = useState(false);
  const [fps, setFps] = useState(0);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  // Pause off-screen via IntersectionObserver (performance guardrail).
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    let raf = 0;
    let frames = 0;
    let lastFpsT = performance.now();
    const smooth = new Float32Array(1024);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      frames++;
      const now = performance.now();
      if (now - lastFpsT > 500) {
        setFps(Math.round((frames * 1000) / (now - lastFpsT)));
        frames = 0;
        lastFpsT = now;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const g = ctx2d;
      g.fillStyle = INK[0];
      g.fillRect(0, 0, w, h);
      drawGrid(g, w, h, dpr);

      const ana = engineRef.current.analysers();
      if (!running || !ana) {
        g.font = MONO(14 * dpr, 600);
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText('NO SIGNAL — START SESSION', w / 2, h / 2);
        g.textAlign = 'left';
        return;
      }

      if (tab === 'scope') {
        const l = new Uint8Array(ana.left.fftSize);
        const r = new Uint8Array(ana.right.fftSize);
        ana.left.getByteTimeDomainData(l);
        ana.right.getByteTimeDomainData(r);
        trace(g, l, w, h, TEAL, dpr);
        trace(g, r, w, h, AMBER, dpr);
      } else if (tab === 'spectrum') {
        const bins = ana.spectrum.frequencyBinCount;
        const data = new Uint8Array(bins);
        ana.spectrum.getByteFrequencyData(data);
        const sr = engineRef.current.sampleRate;
        const fMin = zoom ? 1 : 20;
        const fMax = zoom ? 100 : 20000;
        const n = 220;
        g.beginPath();
        let first = true;
        let px0 = 0;
        let py0 = 0;
        for (let i = 0; i <= n; i++) {
          const f = fMin * Math.pow(fMax / fMin, i / n);
          const bin = Math.min(bins - 1, Math.round((f / (sr / 2)) * bins));
          const v = data[bin] / 255;
          smooth[i] = smooth[i] * 0.6 + v * 0.4; // attack smoothing
          const x = (i / n) * w;
          const y = h - smooth[i] * h * 0.92 - h * 0.02;
          if (first) {
            g.moveTo(x, y);
            first = false;
          } else g.lineTo(x, y);
          px0 = x;
          py0 = y;
        }
        g.lineTo(px0, h);
        g.lineTo(0, h);
        g.closePath();
        g.fillStyle = `${TEAL_DIM}88`;
        g.fill();
        // peak line
        g.beginPath();
        first = true;
        for (let i = 0; i <= n; i++) {
          const x = (i / n) * w;
          const y = h - smooth[i] * h * 0.92 - h * 0.02;
          if (first) {
            g.moveTo(x, y);
            first = false;
          } else g.lineTo(x, y);
        }
        g.strokeStyle = TEAL;
        g.lineWidth = 1.5 * dpr;
        g.shadowColor = TEAL;
        g.shadowBlur = 4 * dpr;
        g.stroke();
        g.shadowBlur = 0;
        void py0;
        // carrier + beat markers (amber ticks)
        g.font = MONO(10 * dpr);
        for (const [f, lbl] of [
          [carrierHz, `${carrierHz.toFixed(0)} Hz`],
          [carrierHz + beatHz, `+${beatHz.toFixed(2)}`],
        ] as const) {
          if (f < fMin || f > fMax) continue;
          const x = (Math.log(f / fMin) / Math.log(fMax / fMin)) * w;
          g.strokeStyle = AMBER;
          g.beginPath();
          g.moveTo(x, h);
          g.lineTo(x, h - 14 * dpr);
          g.stroke();
          g.fillStyle = AMBER;
          g.fillText(lbl, Math.min(x + 4 * dpr, w - 60 * dpr), h - 16 * dpr);
        }
        // axis labels
        g.fillStyle = TEXT[3];
        for (const f of zoom ? [1, 2, 5, 10, 20, 40, 60, 100] : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
          if (f < fMin || f > fMax) continue;
          const x = (Math.log(f / fMin) / Math.log(fMax / fMin)) * w;
          g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x + 2 * dpr, h - 4 * dpr);
        }
      } else {
        // correlation: Lissajous dots + corr readout
        const n = ana.left.fftSize;
        const l = new Float32Array(n);
        const r = new Float32Array(n);
        ana.left.getFloatTimeDomainData(l);
        ana.right.getFloatTimeDomainData(r);
        g.fillStyle = `${TEAL}aa`;
        const cx = w / 2;
        const cy = h / 2;
        const scale = Math.min(w, h) * 0.45;
        let sLR = 0;
        let sLL = 0;
        let sRR = 0;
        for (let i = 0; i < n; i += 4) {
          g.fillRect(cx + l[i] * scale, cy - r[i] * scale, dpr, dpr);
          sLR += l[i] * r[i];
          sLL += l[i] * l[i];
          sRR += r[i] * r[i];
        }
        const corr = sLL > 1e-9 && sRR > 1e-9 ? sLR / Math.sqrt(sLL * sRR) : 0;
        g.font = MONO(12 * dpr);
        g.fillStyle = corr < 0.5 ? AMBER : TEXT[2];
        g.fillText(`CORR ${corr >= 0 ? '+' : ''}${corr.toFixed(2)}`, 8 * dpr, 16 * dpr);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible, running, tab, zoom, engineRef, carrierHz, beatHz]);

  return (
    <div ref={hostRef} className="scope-well flex flex-col" style={{ height }}>
      <div className="flex items-center gap-2 hairline-b" style={{ padding: '8px 12px' }}>
        {(['scope', 'spectrum', 'correlation'] as Tab[]).map((t) => (
          <button key={t} type="button" className={`chip ${tab === t ? 'chip-active' : ''}`} style={{ height: 22, fontSize: 10 }} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
        {tab === 'spectrum' && (
          <button type="button" className={`chip ${zoom ? 'chip-active' : ''}`} style={{ height: 22, fontSize: 10 }} onClick={() => setZoom((z) => !z)}>
            BEAT-BAND 1–100
          </button>
        )}
        {/* Explainer follows the active tab (scope/spectrum/correlation). */}
        <InfoPopover featureId="visualizer" label={`About the ${tab} view`} />
        <span className="t-readout-sm text-3" style={{ marginLeft: 'auto' }}>
          {fps} FPS
        </span>
      </div>
      <canvas ref={canvasRef} style={{ flex: 1, width: '100%', display: 'block' }} />
    </div>
  );
}

/**
 * Graticule (P0-5): dim, dotted, well below trace brightness (~80% max) so
 * the eye goes to the signal first. Subdivision dots; only the center axis
 * gets a slightly brighter dash. Exported for reuse by StudioScope (the
 * always-visible Studio waveform strip) — one graticule implementation.
 */
export function drawGrid(g: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  g.strokeStyle = `${LINE[1]}44`;
  g.lineWidth = 1;
  g.setLineDash([1 * dpr, 5 * dpr]);
  for (let i = 1; i < 10; i++) {
    const x = (i / 10) * w;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let i = 1; i < 5; i++) {
    const y = (i / 5) * h;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  // center axis: still dim, slightly longer dash
  g.setLineDash([3 * dpr, 4 * dpr]);
  g.strokeStyle = `${LINE[2]}88`;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  g.setLineDash([]);
}

/** Byte time-domain trace with phosphor glow (§5.10). Shared with StudioScope. */
export function trace(g: CanvasRenderingContext2D, data: Uint8Array, w: number, h: number, color: string, dpr: number) {
  g.beginPath();
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const y = h / 2 + ((data[i] - 128) / 128) * (h * 0.45);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokeStyle = color;
  g.lineWidth = 1.5 * dpr;
  g.shadowColor = color;
  g.shadowBlur = 4 * dpr;
  g.stroke();
  g.shadowBlur = 0;
}
