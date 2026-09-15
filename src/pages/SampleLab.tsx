/**
 * Sample Lab — load ANY audio file (song, sample, commercial entrainment
 * product) and get an organized multi-plot analysis of what it actually
 * contains. LOCAL-ONLY: decode + DSP run entirely in the browser; the file
 * never leaves the device.
 *
 * Advisor constraint (AC): every plot carries an InfoPopover, and the UI
 * states plainly that detecting a modulation pattern says nothing about
 * effects on a listener — analysis is not a claim.
 *
 * DSP lives in src/samplelab/analysis.ts (pure, node-testable); this page is
 * decode (AudioContext.decodeAudioData), orchestration with progress/cancel,
 * and static canvas plots drawn from the AnalysisReport.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileAudio, Upload, X } from 'lucide-react';
import { Panel, Chip, WarningChip } from '@/ui/components/primitives';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { useIsMobile } from '@/hooks/use-mobile';
import { AMBER, AMBER_DIM, INK, LINE, MONO, TEAL, TEAL_DIM, TEXT } from '@/ui/theme';
import {
  AnalysisCancelled,
  analyzeAudio,
  type AnalysisReport,
} from '@/samplelab/analysis';

const fmt = (v: number, digits = 1, unit = '') =>
  Number.isFinite(v) ? `${v.toFixed(digits)}${unit ? `\u2009${unit}` : ''}` : '—';

const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

/** Warm spectrogram colormap (design §2: warm neutrals, amber accent). */
const WARM_STOPS: [number, [number, number, number]][] = [
  [0, [11, 12, 13]], // ink-0
  [0.25, [58, 42, 20]],
  [0.5, [122, 94, 38]], // amber-dim
  [0.75, [217, 164, 65]], // amber
  [0.9, [232, 185, 92]], // amber-hi
  [1, [245, 231, 200]],
];

function warmColor(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < WARM_STOPS.length; i++) {
    if (x <= WARM_STOPS[i][0]) {
      const [t0, c0] = WARM_STOPS[i - 1];
      const [t1, c1] = WARM_STOPS[i];
      const u = (x - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * u),
        Math.round(c0[1] + (c1[1] - c0[1]) * u),
        Math.round(c0[2] + (c1[2] - c0[2]) * u),
      ];
    }
  }
  return WARM_STOPS[WARM_STOPS.length - 1][1];
}

/** Static canvas helper: draw once per report + on resize. */
function useStaticCanvas(draw: (g: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (w < 4 || h < 4) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.fillStyle = INK[0];
      g.fillRect(0, 0, w, h);
      draw(g, w, h, dpr);
    };
    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function gridLines(g: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  g.strokeStyle = `${LINE[1]}55`;
  g.setLineDash([1 * dpr, 5 * dpr]);
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(0, (h / 4) * i);
    g.lineTo(w, (h / 4) * i);
    g.stroke();
  }
  g.setLineDash([]);
}

// ------------------------------------------------------------------ page

type LoadState =
  | { kind: 'idle' }
  | { kind: 'busy'; fileName: string; fraction: number; stage: string }
  | { kind: 'error'; fileName: string; message: string }
  | { kind: 'done'; report: AnalysisReport };

export default function SampleLab() {
  const isMobile = useIsMobile();
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const failedFileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadFile = useCallback((f: File) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    failedFileRef.current = f;
    setState({ kind: 'busy', fileName: f.name, fraction: 0, stage: 'reading file' });
    const reader = new FileReader();
    reader.onerror = () => setState({ kind: 'error', fileName: f.name, message: `Could not read "${f.name}".` });
    reader.onload = () => {
      const ctx = new AudioContext();
      void ctx
        .decodeAudioData(reader.result as ArrayBuffer)
        .then(async (buf) => {
          try {
            const channels: Float32Array[] = [];
            for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) channels.push(buf.getChannelData(c));
            const report = await analyzeAudio(
              { channels, sampleRate: buf.sampleRate },
              {
                signal: ac.signal,
                onProgress: (fraction, stage) => {
                  if (!ac.signal.aborted) setState({ kind: 'busy', fileName: f.name, fraction, stage });
                },
              },
            );
            report.fileName = f.name;
            setState({ kind: 'done', report });
            failedFileRef.current = null;
          } catch (err) {
            if (err instanceof AnalysisCancelled) {
              setState({ kind: 'idle' });
            } else {
              setState({
                kind: 'error',
                fileName: f.name,
                message: `Analysis of "${f.name}" failed — the file may be corrupted.`,
              });
            }
          } finally {
            void ctx.close();
          }
        })
        .catch(() => {
          setState({
            kind: 'error',
            fileName: f.name,
            message: `Could not decode "${f.name}" — unsupported or corrupted audio file.`,
          });
          void ctx.close();
        });
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const report = state.kind === 'done' ? state.report : null;

  return (
    <div
      data-testid="sample-lab"
      style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) loadFile(f);
      }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Sample Lab</h1>
        <p className="t-body text-2" style={{ marginTop: 8, maxWidth: 760 }}>
          Load any audio file — a song, a sample, or a commercial entrainment product — and see what it
          actually contains, plot by plot. <strong style={{ color: 'var(--text-1)' }}>Local-only:</strong> the
          file is decoded and analyzed in your browser; nothing is uploaded anywhere.
        </p>
        <p className="t-caption text-3" style={{ marginTop: 8, maxWidth: 760 }}>
          A detected modulation pattern (a carrier offset, a tempo, a loop) is a property of the file. By
          itself it says nothing about whether the audio has any effect on a listener — analysis is not a claim.
        </p>

        <div className="flex items-center flex-wrap gap-2" style={{ margin: '20px 0' }}>
          <Chip active={false} onClick={() => inputRef.current?.click()}>
            <Upload size={11} /> PICK AUDIO FILE
          </Chip>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            data-testid="sample-lab-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = '';
            }}
          />
          {state.kind === 'busy' && (
            <>
              <span className="t-readout-sm text-2" data-testid="sample-lab-progress">
                {state.stage.toUpperCase()} · {(state.fraction * 100).toFixed(0)}%
              </span>
              <span
                role="progressbar"
                aria-valuenow={Math.round(state.fraction * 100)}
                style={{ width: 160, height: 6, background: INK[4], border: `1px solid ${LINE[1]}` }}
              >
                <span style={{ display: 'block', height: '100%', width: `${state.fraction * 100}%`, background: AMBER }} />
              </span>
              <Chip active={false} onClick={cancel}>
                <X size={11} /> CANCEL
              </Chip>
            </>
          )}
          {state.kind === 'error' && (
            <span className="flex items-center gap-2" role="alert" data-testid="sample-lab-error">
              <WarningChip tone="danger">{state.message}</WarningChip>
              <Chip
                active={false}
                onClick={() => {
                  const f = failedFileRef.current;
                  if (f) loadFile(f);
                }}
              >
                RETRY
              </Chip>
            </span>
          )}
          {report && (
            <span className="t-readout-sm text-3">
              {report.fileName} · analyzed in {(report.elapsedMs / 1000).toFixed(1)} s
              {report.sanitizedSamples > 0 && ` · ${report.sanitizedSamples} corrupted samples repaired`}
            </span>
          )}
        </div>
      </motion.div>

      {!report && state.kind !== 'busy' && (
        <button
          type="button"
          data-testid="sample-lab-dropzone"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3"
          style={{
            width: '100%',
            minHeight: 220,
            background: dragOver ? 'var(--ink-3)' : 'var(--ink-2)',
            border: `1px dashed ${dragOver ? AMBER : 'var(--line-2)'}`,
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--text-2)',
          }}
        >
          <FileAudio size={28} style={{ color: 'var(--text-3)' }} />
          <span className="t-label" style={{ color: 'var(--text-1)' }}>
            DROP AN AUDIO FILE HERE — OR CLICK TO PICK
          </span>
          <span className="t-caption text-3 flex items-center gap-1">
            WAV / MP3 / OGG / M4A · decoded locally, never uploaded
            <InfoPopover featureId="samplelab-upload" label="About Sample Lab uploads" />
          </span>
        </button>
      )}

      {report && <ReportView report={report} isMobile={isMobile} />}
    </div>
  );
}

// ------------------------------------------------------------- report view

function ReportView({ report, isMobile }: { report: AnalysisReport; isMobile: boolean }) {
  const span = (n: number) => ({ gridColumn: isMobile ? 'span 1' : `span ${n}`, minWidth: 0 });
  const bin = report.stereo.binaural;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
      {/* OVERVIEW -------------------------------------------------------- */}
      <div style={span(12)}>
        <Panel
          title="OVERVIEW"
          right={<InfoPopover featureId="samplelab-overview" label="About the overview readouts" />}
        >
          <div
            className="grid gap-x-8 gap-y-3"
            style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(7, minmax(0, 1fr))' }}
          >
            <OverviewItem label="DURATION" value={fmtDuration(report.durationSec)} />
            <OverviewItem label="SAMPLE RATE" value={`${(report.sampleRate / 1000).toFixed(1)} kHz`} />
            <OverviewItem label="CHANNELS" value={report.channels === 1 ? 'MONO' : 'STEREO'} />
            <OverviewItem label="LOUDNESS" value={fmt(report.loudness.integrated, 1)} unit="LUFS-I" />
            <OverviewItem label="TRUE PEAK" value={fmt(report.loudness.truePeakDb, 1)} unit="dBTP" warn={report.loudness.truePeakDb > -1} />
            <OverviewItem
              label="TEMPO"
              value={report.tempo.bpm !== null ? report.tempo.bpm.toFixed(1) : '—'}
              unit={report.tempo.bpm !== null ? 'BPM' : ''}
            />
            <OverviewItem
              label="BEAT Δf"
              value={bin.detected && bin.deltaFHz !== null ? bin.deltaFHz.toFixed(2) : '—'}
              unit={bin.detected ? 'Hz' : ''}
            />
          </div>
        </Panel>
      </div>

      {/* SPECTROGRAM ------------------------------------------------------ */}
      <div style={span(12)}>
        <Panel title="SPECTROGRAM" pad={false} right={<InfoPopover featureId="samplelab-spectrogram" label="About the spectrogram" />}>
          <div className="flex items-center justify-between hairline-b" style={{ padding: '0 16px 10px' }}>
            <span className="t-readout-sm text-3">
              LOG f · 30 Hz – {Math.min(16000, report.sampleRate / 2) >= 1000
                ? `${(Math.min(16000, report.sampleRate / 2) / 1000).toFixed(0)}k`
                : Math.round(Math.min(16000, report.sampleRate / 2))}{' '}
              Hz · −90…0 dB · {report.spectrogram.windowSize} window
            </span>
          </div>
          <SpectrogramCanvas report={report} height={isMobile ? 220 : 320} />
        </Panel>
      </div>

      {/* SPECTRAL STATS --------------------------------------------------- */}
      <div style={span(12)}>
        <Panel
          title="SPECTRAL STATS OVER TIME"
          right={<InfoPopover featureId="samplelab-spectral-stats" label="About the spectral statistics" />}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)' }}>
            <StatCanvas title="CENTROID" unit="Hz" data={report.spectral.centroidHz} times={report.spectral.timesSec} log />
            <StatCanvas title="SPREAD" unit="Hz" data={report.spectral.spreadHz} times={report.spectral.timesSec} log />
            <StatCanvas title="ROLLOFF 85%" unit="Hz" data={report.spectral.rolloff85Hz} times={report.spectral.timesSec} log />
            <StatCanvas title="FLATNESS" unit="" data={report.spectral.flatness} times={report.spectral.timesSec} />
          </div>
        </Panel>
      </div>

      {/* BAND ENERGY ------------------------------------------------------ */}
      <div style={span(4)}>
        <Panel
          title="OCTAVE BAND ENERGY"
          right={<InfoPopover featureId="samplelab-band-energy" label="About octave band energy" />}
        >
          <BandBars report={report} />
        </Panel>
      </div>

      {/* STEREO ----------------------------------------------------------- */}
      <div style={span(4)}>
        <Panel
          title="STEREO FIELD"
          right={<InfoPopover featureId="samplelab-stereo-ms" label="About mid/side and the binaural check" />}
        >
          <StereoPanel report={report} />
        </Panel>
      </div>

      {/* LOUDNESS --------------------------------------------------------- */}
      <div style={span(4)}>
        <Panel
          title="LOUDNESS OVER TIME"
          right={<InfoPopover featureId="samplelab-loudness-history" label="About the loudness history" />}
        >
          <LoudnessCanvas report={report} height={150} />
          <div className="t-readout-sm flex gap-5" style={{ marginTop: 10 }}>
            <span className="text-2">
              LRA <span style={{ color: 'var(--text-1)' }}>{fmt(report.loudness.lra, 1)} LU</span>
            </span>
            <span className="text-2">
              TP <span style={{ color: report.loudness.truePeakDb > -1 ? 'var(--danger)' : 'var(--text-1)' }}>{fmt(report.loudness.truePeakDb, 1)} dBTP</span>
            </span>
          </div>
        </Panel>
      </div>

      {/* PITCH ------------------------------------------------------------ */}
      <div style={span(8)}>
        <Panel
          title="PITCH TRACK & TUNING"
          right={<InfoPopover featureId="samplelab-pitch-track" label="About the pitch track and tuning" />}
        >
          <PitchCanvas report={report} height={isMobile ? 160 : 200} />
          <TuningTable report={report} />
        </Panel>
      </div>

      {/* LOOP ------------------------------------------------------------- */}
      <div style={span(4)}>
        <Panel
          title="LOOP DETECTION"
          right={<InfoPopover featureId="samplelab-loop-detect" label="About loop detection" />}
        >
          <LoopPanel report={report} />
        </Panel>
      </div>
    </div>
  );
}

function OverviewItem({ label, value, unit, warn }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div>
      <div className="t-label text-3" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="t-readout-md" style={{ color: warn ? 'var(--danger)' : 'var(--text-1)', whiteSpace: 'nowrap' }}>
        {value}
        {unit && (
          <span className="text-3" style={{ fontSize: '0.75em' }}>
            {'\u2009'}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- canvases

function SpectrogramCanvas({ report, height }: { report: AnalysisReport; height: number }) {
  const spec = report.spectrogram;
  const ref = useStaticCanvas(
    (g, w, h, dpr) => {
      const labelH = 16 * dpr;
      const labelW = 44 * dpr;
      const plotW = w - labelW;
      const plotH = h - labelH;
      g.font = MONO(9 * dpr);
      if (spec.frames === 0) {
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText('FILE TOO SHORT FOR A SPECTROGRAM', w / 2, h / 2);
        g.textAlign = 'left';
        return;
      }
      const fMin = Math.min(30, (spec.bins - 1) * spec.binHz * 0.5);
      const fMax = Math.min(16000, report.sampleRate / 2);
      const logMin = Math.log(fMin);
      const logSpan = Math.log(fMax) - logMin;
      // heatmap via ImageData at plot resolution
      const img = g.createImageData(Math.max(1, plotW), Math.max(1, plotH));
      const DB_LO = -90;
      const DB_HI = 0;
      for (let py = 0; py < plotH; py++) {
        const f = Math.exp(logMin + (1 - py / plotH) * logSpan);
        const kbin = Math.min(spec.bins - 1, Math.max(0, Math.round(f / spec.binHz)));
        for (let px = 0; px < plotW; px++) {
          const fr = Math.min(spec.frames - 1, Math.floor((px / plotW) * spec.frames));
          const db = spec.powerDb[fr * spec.bins + kbin];
          const t = Math.min(1, Math.max(0, (db - DB_LO) / (DB_HI - DB_LO)));
          const [r, gg, b] = warmColor(t);
          const o = (py * plotW + px) * 4;
          img.data[o] = r;
          img.data[o + 1] = gg;
          img.data[o + 2] = b;
          img.data[o + 3] = 255;
        }
      }
      g.putImageData(img, labelW, 0);
      // frequency axis
      g.fillStyle = TEXT[3];
      for (const f of [30, 60, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]) {
        if (f < fMin || f > fMax) continue;
        const y = (1 - (Math.log(f) - logMin) / logSpan) * plotH;
        g.strokeStyle = `${LINE[1]}44`;
        g.beginPath();
        g.moveTo(labelW, y);
        g.lineTo(w, y);
        g.stroke();
        g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), 4 * dpr, y + 3 * dpr);
      }
      // time axis
      const dur = report.durationSec;
      const step = dur > 600 ? 300 : dur > 120 ? 60 : dur > 30 ? 10 : dur > 8 ? 2 : 1;
      for (let t = 0; t <= dur; t += step) {
        const x = labelW + (t / dur) * plotW;
        g.fillText(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, x + 2 * dpr, h - 4 * dpr);
      }
    },
    [report],
  );
  return <canvas ref={ref} data-testid="sample-lab-spectrogram" style={{ width: '100%', height, display: 'block' }} />;
}

function StatCanvas({
  title,
  unit,
  data,
  times,
  log = false,
}: {
  title: string;
  unit: string;
  data: Float32Array;
  times: Float32Array;
  log?: boolean;
}) {
  const ref = useStaticCanvas(
    (g, w, h, dpr) => {
      gridLines(g, w, h, dpr);
      g.font = MONO(9 * dpr);
      if (data.length < 2) {
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText('NO DATA', w / 2, h / 2);
        g.textAlign = 'left';
        return;
      }
      let vMax = 1e-9;
      for (let i = 0; i < data.length; i++) if (data[i] > vMax) vMax = data[i];
      const yOf = (v: number) => {
        const t = log ? Math.log(Math.max(1, v)) / Math.log(Math.max(2, vMax)) : v / vMax;
        return h - 6 * dpr - Math.min(1, Math.max(0, t)) * (h - 18 * dpr);
      };
      const tMax = times[times.length - 1] || 1;
      g.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (times[i] / tMax) * w;
        const y = yOf(data[i]);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = TEAL;
      g.lineWidth = 1.5 * dpr;
      g.stroke();
      g.fillStyle = TEXT[3];
      g.fillText(`${vMax >= 1000 ? `${(vMax / 1000).toFixed(1)}k` : vMax.toFixed(vMax < 10 ? 2 : 0)}${unit}`, 4 * dpr, 10 * dpr);
      g.fillText('0', 4 * dpr, h - 4 * dpr);
    },
    [data, times, log],
  );
  return (
    <div>
      <div className="t-label text-3" style={{ marginBottom: 6 }}>
        {title}
        {unit ? ` · ${unit.toUpperCase()}` : ''}
        {log ? ' · LOG' : ''}
      </div>
      <canvas ref={ref} data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`} style={{ width: '100%', height: 90, display: 'block', background: 'var(--ink-0)', border: '1px solid var(--line-1)' }} />
    </div>
  );
}

function BandBars({ report }: { report: AnalysisReport }) {
  const { labels, db, share } = report.bands;
  const valid = db.filter((v) => v > -120);
  const maxDb = valid.length ? Math.max(...valid) : 0;
  const minDb = Math.max(-80, maxDb - 60);
  return (
    <div className="flex flex-col gap-1" data-testid="sample-lab-bands">
      {labels.map((lab, i) => {
        const t = Math.min(1, Math.max(0, (db[i] - minDb) / Math.max(1, maxDb - minDb)));
        return (
          <div key={lab} className="flex items-center gap-2">
            <span className="t-readout-sm text-3" style={{ width: 34, textAlign: 'right' }}>
              {lab}
            </span>
            <span style={{ flex: 1, height: 10, background: 'var(--ink-4)', position: 'relative' }}>
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${t * 100}%`,
                  background: t > 0.85 ? AMBER : TEAL,
                  opacity: 0.9,
                }}
              />
            </span>
            <span className="t-readout-sm text-2" style={{ width: 74, textAlign: 'right' }}>
              {share[i] > 0.005 ? `${(share[i] * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        );
      })}
      <p className="t-caption text-3" style={{ marginTop: 8 }}>
        Share of total spectral energy per ANSI octave band. Energy above ~8 kHz in a file sold as a
        &quot;sleep&quot; product is a red flag worth a closer listen.
      </p>
    </div>
  );
}

function StereoPanel({ report }: { report: AnalysisReport }) {
  const s = report.stereo;
  const bin = s.binaural;
  const corrRef = useStaticCanvas(
    (g, w, h, dpr) => {
      gridLines(g, w, h, dpr);
      const n = s.correlationSeries.length;
      if (n < 2) return;
      // zero line
      g.strokeStyle = LINE[2];
      g.beginPath();
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.stroke();
      g.beginPath();
      let started = false;
      const tMax = s.correlationTimesSec[n - 1] || 1;
      for (let i = 0; i < n; i++) {
        const v = s.correlationSeries[i];
        if (!Number.isFinite(v)) continue;
        const x = (s.correlationTimesSec[i] / tMax) * w;
        const y = h / 2 - v * (h / 2 - 6 * dpr);
        if (!started) {
          g.moveTo(x, y);
          started = true;
        } else g.lineTo(x, y);
      }
      g.strokeStyle = AMBER;
      g.lineWidth = 1.5 * dpr;
      g.stroke();
      g.font = MONO(9 * dpr);
      g.fillStyle = TEXT[3];
      g.fillText('+1', 4 * dpr, 10 * dpr);
      g.fillText('−1', 4 * dpr, h - 4 * dpr);
    },
    [s],
  );

  const msBar = (label: string, dbVal: number, color: string) => {
    const t = Number.isFinite(dbVal) ? Math.min(1, Math.max(0, (dbVal + 60) / 60)) : 0;
    return (
      <div className="flex items-center gap-2">
        <span className="t-readout-sm text-3" style={{ width: 16 }}>
          {label}
        </span>
        <span style={{ flex: 1, height: 10, background: 'var(--ink-4)' }}>
          <span style={{ display: 'block', height: '100%', width: `${t * 100}%`, background: color }} />
        </span>
        <span className="t-readout-sm text-2" style={{ width: 64, textAlign: 'right' }}>
          {fmt(dbVal, 1)} dB
        </span>
      </div>
    );
  };

  const corr = s.meanCorrelation;
  return (
    <div data-testid="sample-lab-stereo">
      <div className="flex flex-col gap-1">
        {msBar('M', s.midDb, TEAL)}
        {msBar('S', s.sideDb, AMBER)}
      </div>
      {/* correlation meter */}
      <div style={{ margin: '12px 0 6px' }}>
        <div className="t-label text-3" style={{ marginBottom: 4 }}>
          CORRELATION ρ {Number.isFinite(corr) ? `· ${corr.toFixed(2)}` : ''}
        </div>
        <div style={{ position: 'relative', height: 8, background: 'var(--ink-4)', border: `1px solid ${LINE[1]}` }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: LINE[2] }} />
          {Number.isFinite(corr) && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                bottom: -2,
                width: 3,
                left: `calc(${((corr + 1) / 2) * 100}% - 1px)`,
                background: corr < 0 ? 'var(--danger)' : corr < 0.3 ? AMBER : TEAL,
              }}
            />
          )}
        </div>
        <div className="flex justify-between t-readout-sm text-3" style={{ marginTop: 2 }}>
          <span>−1 OUT-OF-PHASE</span>
          <span>0 WIDE</span>
          <span>+1 MONO</span>
        </div>
      </div>
      <canvas ref={corrRef} style={{ width: '100%', height: 90, display: 'block', background: 'var(--ink-0)', border: '1px solid var(--line-1)' }} />
      {/* binaural verdict */}
      <div style={{ marginTop: 12 }} data-testid="sample-lab-binaural-verdict">
        {!bin.possible ? (
          <WarningChip tone="amber" icon={false}>MONO FILE — no channel pair to compare</WarningChip>
        ) : bin.detected ? (
          <WarningChip tone="teal">
            DICHOTIC PAIR DETECTED — Δf ≈ {bin.deltaFHz !== null ? bin.deltaFHz.toFixed(2) : '?'} Hz (L{' '}
            {bin.carrierLeftHz?.toFixed(1)} Hz / R {bin.carrierRightHz?.toFixed(1)} Hz)
          </WarningChip>
        ) : (
          <WarningChip tone="amber" icon={false}>NO DICHOTIC CARRIER PAIR — {bin.reason}</WarningChip>
        )}
        <p className="t-caption text-3" style={{ marginTop: 8 }}>
          This verdict describes how the file was built, not what it does. A measured carrier offset proves
          construction; it is not evidence of any effect on the listener.
        </p>
      </div>
    </div>
  );
}

function LoudnessCanvas({ report, height }: { report: AnalysisReport; height: number }) {
  const loud = report.loudness;
  const ref = useStaticCanvas(
    (g, w, h, dpr) => {
      gridLines(g, w, h, dpr);
      g.font = MONO(9 * dpr);
      const LO = -60;
      const HI = 0;
      const yOf = (v: number) => h - 4 * dpr - Math.min(1, Math.max(0, (v - LO) / (HI - LO))) * (h - 16 * dpr);
      const trace = (vals: number[], color: string, dim: string) => {
        if (vals.length < 2) return;
        g.beginPath();
        for (let i = 0; i < vals.length; i++) {
          const v = vals[i];
          if (!Number.isFinite(v)) continue;
          const x = (i / (vals.length - 1)) * w;
          const y = yOf(Math.max(LO, v));
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokeStyle = color;
        g.lineWidth = 1.5 * dpr;
        g.stroke();
        g.lineTo(w, h);
        g.lineTo(0, h);
        g.closePath();
        g.fillStyle = dim;
        g.fill();
      };
      trace(loud.momentary, TEAL, `${TEAL_DIM}44`);
      trace(loud.shortTerm, AMBER, `${AMBER_DIM}33`);
      for (const v of [0, -23, -40, -60]) {
        g.fillStyle = TEXT[3];
        g.fillText(String(v), 4 * dpr, yOf(v) - 2 * dpr);
      }
      if (loud.momentary.length < 2) {
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText('TOO SHORT FOR A LOUDNESS HISTORY', w / 2, h / 2);
        g.textAlign = 'left';
      }
    },
    [loud],
  );
  return (
    <div>
      <canvas ref={ref} data-testid="sample-lab-loudness" style={{ width: '100%', height, display: 'block', background: 'var(--ink-0)', border: '1px solid var(--line-1)' }} />
      <div className="t-caption text-3" style={{ marginTop: 6 }}>
        <span style={{ color: TEAL }}>— M 400 ms</span> · <span style={{ color: AMBER }}>— S 3 s</span> · −23 LUFS
        broadcast line shown
      </div>
    </div>
  );
}

function PitchCanvas({ report, height }: { report: AnalysisReport; height: number }) {
  const pitch = report.pitch;
  const ref = useStaticCanvas(
    (g, w, h, dpr) => {
      g.font = MONO(9 * dpr);
      const fLo = 40;
      const fHi = Math.min(1200, report.sampleRate / 2);
      const logLo = Math.log(fLo);
      const logSpan = Math.log(fHi) - logLo;
      const yOf = (f: number) => h - 6 * dpr - ((Math.log(f) - logLo) / logSpan) * (h - 20 * dpr);
      for (const f of [50, 100, 220, 440, 880]) {
        if (f < fLo || f > fHi) continue;
        const y = yOf(f);
        g.strokeStyle = `${LINE[1]}55`;
        g.setLineDash([1 * dpr, 5 * dpr]);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = TEXT[3];
        g.fillText(String(f), 4 * dpr, y - 2 * dpr);
      }
      const frames = pitch.frames;
      const tMax = frames.length ? frames[frames.length - 1].t || 1 : 1;
      let drawn = 0;
      for (const fr of frames) {
        if (!Number.isFinite(fr.f0) || fr.f0 < fLo || fr.f0 > fHi) continue;
        const x = (fr.t / tMax) * w;
        const y = yOf(fr.f0);
        g.fillStyle = `rgba(217,164,65,${0.25 + 0.75 * fr.clarity})`;
        g.fillRect(x, y - dpr, 2 * dpr, 2 * dpr);
        drawn++;
      }
      if (!drawn) {
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText('NO PITCHED CONTENT (unvoiced / too short)', w / 2, h / 2);
        g.textAlign = 'left';
      }
    },
    [pitch, report.sampleRate],
  );
  return <canvas ref={ref} data-testid="sample-lab-pitch" style={{ width: '100%', height, display: 'block', background: 'var(--ink-0)', border: '1px solid var(--line-1)' }} />;
}

function TuningTable({ report }: { report: AnalysisReport }) {
  const p = report.pitch;
  const rows: [string, string][] = [
    ['Median f₀ (concert pitch)', p.medianHz !== null ? `${p.medianHz.toFixed(2)} Hz` : '—'],
    ['Nearest note', p.noteName ?? '—'],
    ['Deviation', p.cents !== null ? `${p.cents >= 0 ? '+' : ''}${p.cents.toFixed(1)} ¢` : '—'],
    ['Voiced frames', `${(p.voicedFraction * 100).toFixed(0)} %`],
  ];
  return (
    <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }} data-testid="sample-lab-tuning">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} style={{ borderTop: '1px solid var(--line-1)' }}>
            <td className="t-caption text-3" style={{ padding: '6px 0' }}>
              {k}
            </td>
            <td className="t-readout-sm" style={{ padding: '6px 0', textAlign: 'right', color: 'var(--text-1)' }}>
              {v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoopPanel({ report }: { report: AnalysisReport }) {
  const loop = report.loop;
  const ref = useStaticCanvas(
    (g, w, h, dpr) => {
      gridLines(g, w, h, dpr);
      const n = loop.scores.length;
      if (n < 2) return;
      g.font = MONO(9 * dpr);
      const xMax = loop.lagsSec[n - 1] || 1;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (loop.lagsSec[i] / xMax) * w;
        const y = h - 6 * dpr - Math.min(1, Math.max(0, loop.scores[i])) * (h - 18 * dpr);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = TEAL;
      g.lineWidth = 1.5 * dpr;
      g.stroke();
      // threshold line at 0.92
      const ty = h - 6 * dpr - 0.92 * (h - 18 * dpr);
      g.strokeStyle = `${AMBER}88`;
      g.setLineDash([4 * dpr, 3 * dpr]);
      g.beginPath();
      g.moveTo(0, ty);
      g.lineTo(w, ty);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = TEXT[3];
      g.fillText('0.92', 4 * dpr, ty - 2 * dpr);
      // mark detected period
      if (loop.detected && loop.periodSec !== null) {
        const x = (loop.periodSec / xMax) * w;
        g.strokeStyle = AMBER;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
    },
    [loop],
  );
  return (
    <div data-testid="sample-lab-loop">
      {!loop.evaluated ? (
        <WarningChip tone="amber" icon={false}>NOT EVALUATED — {loop.reason}</WarningChip>
      ) : loop.detected ? (
        <WarningChip tone="teal">LOOP DETECTED — period ≈ {loop.periodSec?.toFixed(1)} s (score {loop.score.toFixed(2)})</WarningChip>
      ) : (
        <WarningChip tone="amber" icon={false}>NO EXACT LOOP — {loop.reason}</WarningChip>
      )}
      <canvas ref={ref} style={{ width: '100%', height: 110, display: 'block', marginTop: 12, background: 'var(--ink-0)', border: '1px solid var(--line-1)' }} />
      <p className="t-caption text-3" style={{ marginTop: 8 }}>
        Self-similarity of 1-s spectral fingerprints at every lag. A ridge at one exact lag means the material
        repeats — the answer to &quot;is this hour-long file really an hour of content?&quot;
      </p>
    </div>
  );
}
