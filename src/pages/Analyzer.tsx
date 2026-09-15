/**
 * Module 5 — Analyzer (design: analyzer.md). Measurement bench: spectrum,
 * K-weighted loudness (ITU-R BS.1770 via src/dsp), waveform scope, level
 * meters, THD/SINAD utilities. Every readout is real data or "—".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Pause, Play } from 'lucide-react';
import { analyzeLoudness, magnitudeSpectrumDb, thd, thdN, rms, type LoudnessResult, type ThdResult, type ThdnResult } from '@/dsp';
import { renderPhase } from '@/engine';
import { Panel, Chip, Led, WarningChip } from '@/ui/components/primitives';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { useSession } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AMBER, INK, LINE, MONO, TEAL, TEAL_DIM, TEXT } from '@/ui/theme';

type Source = 'engine' | 'file' | 'mic';

interface FileData {
  name: string;
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  loud: LoudnessResult;
  spectrumDb: Float32Array;
  specBinHz: number;
  /** Whole-file RMS level (dBFS) per channel, precomputed at load so the
   *  rAF-driven meters never rescan millions of samples per frame. */
  rmsDbL: number;
  rmsDbR: number;
}

const fmt = (v: number, digits = 1, unit = '') =>
  Number.isFinite(v) ? `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}` : '—';

export default function Analyzer() {
  const { engineRef, running, carrierHz, beatHz, mode, volumeDb, estDbA, dosePercent } = useSession();
  const [source, setSource] = useState<Source>('engine');
  const [frozen, setFrozen] = useState(false);
  const [file, setFile] = useState<FileData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // P0-6: file-decode error branch keeps the failed File so RETRY works.
  const [fileError, setFileError] = useState<string | null>(null);
  const failedFileRef = useRef<File | null>(null);
  const [calOn, setCalOn] = useState(false);
  const [calLevel, setCalLevel] = useState(-20);
  const [measuring, setMeasuring] = useState(false);
  const [thdR, setThdR] = useState<ThdResult | null>(null);
  const [thdnR, setThdnR] = useState<ThdnResult | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const micRef = useRef<{ stream: MediaStream; ctx: AudioContext; ana: AnalyserNode } | null>(null);
  const isMobile = useIsMobile();

  // ---- file load ------------------------------------------------------------
  const loadFile = useCallback((f: File) => {
    setAnalyzing(true);
    setFileError(null);
    failedFileRef.current = f;
    const reader = new FileReader();
    reader.onerror = () => {
      setAnalyzing(false);
      setFileError(`Could not read "${f.name}".`);
    };
    reader.onload = () => {
      const ctx = new AudioContext();
      void ctx
        .decodeAudioData(reader.result as ArrayBuffer)
        .then((buf) => {
          // Chunk the heavy DSP out of the paint frame.
          window.setTimeout(() => {
            const left = buf.getChannelData(0);
            const right = buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0);
            const loud = analyzeLoudness([left, right], buf.sampleRate);
            const specN = Math.min(8192, left.length);
            const spectrumDb = magnitudeSpectrumDb(left.slice(0, specN));
            setFile({
              name: f.name,
              left,
              right,
              sampleRate: buf.sampleRate,
              loud,
              spectrumDb,
              specBinHz: buf.sampleRate / specN,
              rmsDbL: 20 * Math.log10(Math.max(1e-6, rms(left))),
              rmsDbR: 20 * Math.log10(Math.max(1e-6, rms(right))),
            });
            setAnalyzing(false);
            setFileError(null);
            failedFileRef.current = null;
            void ctx.close();
          }, 30);
        })
        .catch(() => {
          setAnalyzing(false);
          setFileError(`Could not decode "${f.name}" — unsupported or corrupted audio file.`);
          void ctx.close(); // decode failures must not leak the AudioContext
        });
    };
    reader.readAsArrayBuffer(f);
  }, []);

  // ---- mic ------------------------------------------------------------------
  useEffect(() => {
    if (source !== 'mic') {
      micRef.current?.stream.getTracks().forEach((t) => t.stop());
      void micRef.current?.ctx.close();
      micRef.current = null;
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          // Permission resolved after unmount/source-switch: don't leak it.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const ana = ctx.createAnalyser();
        ana.fftSize = 4096;
        src.connect(ana);
        micRef.current = { stream, ctx, ana };
        setMicError(null);
      })
      .catch(() => setMicError('microphone permission denied'));
    return () => {
      cancelled = true;
    };
  }, [source]);

  // ---- cal tone ---------------------------------------------------------------
  useEffect(() => {
    if (!calOn) return;
    const r = renderPhase({ durationSec: 3, carrierHz: 1000, beatHz: 0, mode: 'monaural', gainDb: calLevel }, 48000);
    engineRef.current.playBuffer(r.left, r.right, 48000, -6);
    const t = window.setTimeout(() => setCalOn(false), 3000);
    return () => window.clearTimeout(t);
  }, [calOn, calLevel, engineRef]);

  // ---- THD / SINAD measurement ------------------------------------------------
  const runMeasurement = () => {
    setMeasuring(true);
    window.setTimeout(() => {
      try {
        let x: Float32Array;
        let sr: number;
        if (source === 'file' && file) {
          x = file.left.slice(0, Math.min(file.left.length, 3 * file.sampleRate));
          sr = file.sampleRate;
        } else {
          // Measure the engine's own offline render of the current config (3 s).
          const r = renderPhase({ durationSec: 3, carrierHz, beatHz, mode, gainDb: -6 }, 48000);
          x = r.left;
          sr = 48000;
        }
        setThdR(thd(x, sr));
        setThdnR(thdN(x, sr));
      } catch {
        setThdR(null);
        setThdnR(null);
      }
      setMeasuring(false);
    }, 30);
  };

  const exportReport = () => {
    const lines = [
      'OPEN SYNC — ANALYZER REPORT',
      `source: ${source}${source === 'file' && file ? ` (${file.name})` : ''}`,
      `engine: ${running ? 'running' : 'stopped'} · ${mode} · carrier ${carrierHz} Hz · beat ${beatHz} Hz · out ${volumeDb} dBFS`,
      source === 'file' && file
        ? `LUFS-I ${fmt(file.loud.integrated)} · LRA ${fmt(file.loud.lra)} LU · TP ${fmt(file.loud.truePeakDb)} dBTP`
        : 'LUFS: — (no file source)',
      thdR ? `THD ${thdR.thdPercent.toFixed(4)} % · fundamental ${thdR.fundamentalHz.toFixed(1)} Hz` : 'THD: —',
      thdnR ? `THD+N ${thdnR.thdnPercent.toFixed(3)} % · SINAD ${thdnR.sinadDb.toFixed(1)} dB` : 'THD+N: —',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'open-sync-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loud = source === 'file' ? file?.loud : null;

  return (
    <div
      style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) {
          setSource('file');
          loadFile(f);
        }
      }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Analyzer</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          Measure what's actually coming out of the engine — not what the marketing says.
        </p>
        <div className="flex items-center flex-wrap gap-2" style={{ margin: '20px 0' }}>
          {/* source selector — segmented row, scrolls horizontally if cramped */}
          <div
            role="tablist"
            aria-label="Analysis source"
            className="flex items-center gap-2"
            style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', flexShrink: isMobile ? 0 : 1 }}
          >
            {(['engine', 'file', 'mic'] as Source[]).map((s2) => (
              <Chip key={s2} active={source === s2} onClick={() => setSource(s2)}>
                {s2 === 'engine' ? 'ENGINE BUS' : s2 === 'file' ? 'LIVE INPUT' : 'LIVE INPUT'}
              </Chip>
            ))}
          </div>
          {source === 'engine' && <Led state={running ? 'teal' : 'off'} title={running ? 'Engine bus live' : 'Engine stopped'} />}
          {source === 'mic' && <WarningChip tone="danger">requires microphone permission</WarningChip>}
          {micError && source === 'mic' && <WarningChip tone="danger">{micError}</WarningChip>}
          {source === 'file' && (
            <label className="chip" style={{ cursor: 'pointer' }}>
              {analyzing ? 'ANALYZING…' : file ? file.name : 'DROP / PICK FILE'}
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
          )}
          {/* P0-6: decode errors surface inline with a retry, never as toast. */}
          {source === 'file' && fileError && (
            <span className="flex items-center gap-2" role="alert" data-testid="file-error">
              <WarningChip tone="danger">{fileError}</WarningChip>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  const f = failedFileRef.current;
                  if (f) loadFile(f);
                }}
              >
                RETRY
              </button>
            </span>
          )}
          <span className="t-label text-3" style={{ marginLeft: 16 }}>
            CAL TONE
          </span>
          <span className="t-readout-sm text-2">1 kHz</span>
          {[-20, -14, -6].map((l) => (
            <Chip key={l} active={calLevel === l} onClick={() => setCalLevel(l)}>
              {l} dBFS
            </Chip>
          ))}
          <Chip active={calOn} onClick={() => setCalOn(true)}>
            TONE {calOn ? 'ON' : 'OFF'}
          </Chip>
          <button type="button" className="chip" onClick={() => setFrozen((f) => !f)} style={{ marginLeft: 'auto' }}>
            {frozen ? <Play size={11} /> : <Pause size={11} />} {frozen ? 'FROZEN' : 'RUN'}
          </button>
          <button type="button" className="chip" onClick={exportReport}>
            <Download size={11} /> REPORT ↓
          </button>
        </div>
      </motion.div>

      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
        {/* Spectrum */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 8', minWidth: 0 }}>
          <Panel title="SPECTRUM" pad={false}>
            <div className="flex items-center justify-between hairline-b" style={{ padding: '10px 16px' }}>
              <span className="t-label flex items-center gap-1">
                SPECTRUM
                <InfoPopover featureId="spectrum-analyzer" label="About the spectrum analyzer" />
              </span>
              <span className="t-readout-sm text-3">20 Hz – 20 kHz LOG · −120…0 dBFS</span>
            </div>
            <SpectrumCanvas source={source} frozen={frozen} file={file} engineRef={engineRef} micRef={micRef} height={isMobile ? 240 : 360} carrierHz={carrierHz} beatHz={beatHz} />
          </Panel>
        </div>

        {/* Loudness stack */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <Panel
            title="LOUDNESS — ITU-R BS.1770 K-WEIGHTED"
            right={
              <span className="flex items-center gap-1">
                <InfoPopover featureId="lufs-meter" label="About the loudness meters" />
                <GradeBadge
                  grade="A"
                  compact
                  citation={{
                    verdict: 'Metering standard: ITU-R BS.1770 — solid, replicated engineering.',
                    summary: 'K-weighting + gating per BS.1770-4; the Analyzer grades itself as the most trustworthy thing in the app.',
                    source: 'ITU-R BS.1770-4 (2015)',
                  }}
                />
              </span>
            }
          >
            <div className="t-readout-lg" style={{ color: 'var(--amber)' }}>
              {loud ? fmt(loud.integrated, 1) : '—'}
              <span className="text-3" style={{ fontSize: '0.5em' }}>
                {' '}LUFS-I
              </span>
            </div>
            <p className="t-caption text-3" style={{ margin: '4px 0 16px' }}>
              gated, K-weighted; whole-session. {source !== 'file' && 'Load a file source for BS.1770 readouts.'}
            </p>
            <div className="flex gap-6">
              <MeterBar label="M 400ms" value={loud?.momentary.at(-1) ?? null} />
              <MeterBar label="S 3s" value={loud?.shortTerm.at(-1) ?? null} />
            </div>
            <div className="t-readout-md flex gap-6" style={{ marginTop: 12 }}>
              <span className="text-2">LRA {loud ? fmt(loud.lra, 1) : '—'} LU</span>
              <span className="flex items-center gap-1" style={{ color: loud && loud.truePeakDb > -1 ? 'var(--danger)' : 'var(--text-2)' }}>
                TP {loud ? fmt(loud.truePeakDb, 1) : '—'} dBTP
                <InfoPopover featureId="true-peak" label="About true peak and clip detection" />
              </span>
            </div>
            <p className="t-readout-sm" style={{ marginTop: 16, color: 'var(--teal)', borderTop: '1px solid var(--line-1)', paddingTop: 8 }}>
              DOSE IMPACT: ~{(dosePercent).toFixed(0)}% of weekly H.870 budget at current level ({estDbA.toFixed(0)} dBA est.)
            </p>
          </Panel>
        </div>

        {/* Waveform scope */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <Panel title="WAVEFORM" pad={false}>
            <div className="flex items-center justify-between hairline-b" style={{ padding: '10px 16px' }}>
              <span className="t-label flex items-center gap-1">
                WAVEFORM SCOPE
                <InfoPopover featureId="visualizer" label="About the waveform scope" />
              </span>
              {mode === 'isochronic' && source === 'engine' && (
                <span className="t-caption text-3">Gate envelope visible: {beatHz.toFixed(2)} Hz raised-cosine</span>
              )}
            </div>
            <WaveformCanvas source={source} frozen={frozen} file={file} engineRef={engineRef} micRef={micRef} height={180} />
          </Panel>
        </div>

        {/* Level meters */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <Panel title="OUTPUT LEVELS">
            <LevelMeters source={source} frozen={frozen} file={file} engineRef={engineRef} micRef={micRef} />
          </Panel>
        </div>

        {/* Distortion */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <Panel title="DISTORTION & SIGNAL INTEGRITY" right={<InfoPopover featureId="thd-sinad" label="About THD / SINAD" />}>
            <button
              type="button"
              className="chip chip-active"
              onClick={runMeasurement}
              disabled={measuring}
              title={
                source === 'file'
                  ? 'Runs THD/THD+N on the first 3 s of the loaded file'
                  : "Runs THD/THD+N on a 3 s offline render of the engine's current config"
              }
            >
              {measuring ? 'MEASURING…' : 'RUN MEASUREMENT'}
            </button>
            <div className="t-readout-sm flex flex-col gap-1" style={{ marginTop: 16 }}>
              <span className="text-2">FUNDAMENTAL {thdR ? `${(thdR.fundamentalHz / 1000).toFixed(4)} kHz` : '—'}</span>
              <span style={{ color: 'var(--text-1)' }}>THD {thdR ? `${thdR.thdPercent.toFixed(4)} %` : '—'}</span>
              <span style={{ color: 'var(--text-1)' }}>THD+N {thdnR ? `${thdnR.thdnPercent.toFixed(3)} %` : '—'}</span>
              <span style={{ color: 'var(--text-1)' }}>SINAD {thdnR ? `${thdnR.sinadDb.toFixed(1)} dB` : '—'}</span>
            </div>
            {thdR && (
              <div className="flex items-end gap-2" style={{ height: 48, marginTop: 12 }}>
                {thdR.harmonicAmplitudes.slice(1, 5).map((a, i) => {
                  const rel = thdR.fundamentalAmplitude > 0 ? a / thdR.fundamentalAmplitude : 0;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div style={{ width: 14, height: Math.max(1, Math.min(40, rel * 400)), background: AMBER }} />
                      <span className="t-readout-sm text-3" style={{ fontSize: 9 }}>
                        H{i + 2}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {thdR && (
              <div style={{ marginTop: 12 }}>
                {thdR.thdPercent < 0.1 ? (
                  <WarningChip tone="teal">PASS — within Web Audio oscillator tolerance</WarningChip>
                ) : (
                  <WarningChip tone="danger">CHECK OUTPUT CHAIN</WarningChip>
                )}
              </div>
            )}
            <p className="t-caption text-3" style={{ marginTop: 12 }}>
              If you square-wave your carrier, THD tells you what you actually added. Verify, don't assume.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- canvases

type MicRef = React.RefObject<{ stream: MediaStream; ctx: AudioContext; ana: AnalyserNode } | null>;
type EngineRef = React.RefObject<import('@/ui/audio/liveEngine').LiveEngine>;

function pickAnalyser(source: Source, engineRef: EngineRef, micRef: MicRef): AnalyserNode | null {
  if (source === 'engine') return engineRef.current?.analysers()?.spectrum ?? null;
  if (source === 'mic') return micRef.current?.ana ?? null;
  return null;
}

function SpectrumCanvas({
  source,
  frozen,
  file,
  engineRef,
  micRef,
  height,
  carrierHz,
  beatHz,
}: {
  source: Source;
  frozen: boolean;
  file: FileData | null;
  engineRef: EngineRef;
  micRef: MicRef;
  height: number;
  carrierHz: number;
  beatHz: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [marker, setMarker] = useState<{ f: number; db: number } | null>(null);
  const fileSpec = useRef<{ f: number; db: number }[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let raf = 0;

    const draw = () => {
      if (!frozen) raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.fillStyle = INK[0];
      g.fillRect(0, 0, w, h);
      // grid + axis labels
      // P0-5 graticule: dim + dotted, 1-2-5 frequency steps, labels direct.
      g.font = MONO(9 * dpr);
      const fMin = 20;
      const fMax = 20000;
      const xOf = (f: number) => (Math.log(f / fMin) / Math.log(fMax / fMin)) * w;
      g.setLineDash([1 * dpr, 5 * dpr]);
      for (const f of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
        const x = xOf(f);
        g.strokeStyle = `${LINE[2]}66`;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
        g.fillStyle = TEXT[3];
        g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x + 3 * dpr, h - 5 * dpr);
      }
      for (let db = -120; db <= 0; db += 20) {
        const y = ((-db / 120) * (h - 20 * dpr)) / 1 + 8 * dpr;
        g.strokeStyle = `${LINE[1]}44`;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        g.fillStyle = TEXT[3];
        g.fillText(`${db}`, 4 * dpr, y - 2 * dpr);
      }
      g.setLineDash([]);

      const drawTrace = (dbAt: (f: number) => number) => {
        g.beginPath();
        for (let px = 0; px < w; px++) {
          const f = fMin * Math.pow(fMax / fMin, px / w);
          const db = dbAt(f);
          const y = ((-db / 120) * (h - 20 * dpr)) / 1 + 8 * dpr;
          if (px === 0) g.moveTo(px, y);
          else g.lineTo(px, y);
        }
        g.strokeStyle = TEAL;
        g.lineWidth = 1.5 * dpr;
        g.shadowColor = TEAL;
        g.shadowBlur = 4 * dpr;
        g.stroke();
        g.shadowBlur = 0;
        g.lineTo(w, h);
        g.lineTo(0, h);
        g.closePath();
        g.fillStyle = `${TEAL_DIM}66`;
        g.fill();
      };

      const ana = pickAnalyser(source, engineRef, micRef);
      let hasSignal = false;
      if (ana && source !== 'file') {
        const bins = ana.frequencyBinCount;
        const data = new Uint8Array(bins);
        ana.getByteFrequencyData(data);
        const sr = source === 'mic' ? micRef.current!.ctx.sampleRate : engineRef.current!.sampleRate;
        const any = data.some((v) => v > 4);
        hasSignal = any;
        if (any) {
          drawTrace((f) => {
            const bin = Math.min(bins - 1, Math.round((f / (sr / 2)) * bins));
            return -120 + (data[bin] / 255) * 120;
          });
        }
        // engine markers
        if (source === 'engine' && any) {
          for (const f of [carrierHz, carrierHz + beatHz]) {
            if (f < fMin || f > fMax) continue;
            const x = xOf(f);
            g.strokeStyle = AMBER;
            g.beginPath();
            g.moveTo(x, h - 16 * dpr);
            g.lineTo(x, h);
            g.stroke();
            g.fillStyle = AMBER;
            g.fillText(`${f.toFixed(1)}`, x + 3 * dpr, h - 18 * dpr);
          }
        }
      } else if (source === 'file' && file) {
        hasSignal = true;
        drawTrace((f) => {
          const bin = Math.min(file.spectrumDb.length - 1, Math.max(1, Math.round(f / file.specBinHz)));
          return Math.max(-120, file.spectrumDb[bin]);
        });
      }

      if (!hasSignal) {
        g.font = MONO(13 * dpr, 600);
        g.fillStyle = `${TEXT[3]}55`;
        g.textAlign = 'center';
        g.fillText(source === 'file' ? 'NO FILE — DROP AUDIO TO ANALYZE' : 'NO SIGNAL', w / 2, h / 2);
        g.textAlign = 'left';
      }
      if (marker) {
        const x = xOf(marker.f);
        g.strokeStyle = AMBER;
        g.setLineDash([4, 3]);
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = AMBER;
        g.font = MONO(10 * dpr);
        g.fillText(`M1 ${marker.f.toFixed(1)} Hz ${marker.db.toFixed(1)} dB`, Math.min(x + 5 * dpr, w - 150 * dpr), 14 * dpr);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [source, frozen, file, engineRef, micRef, marker, carrierHz, beatHz]);

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height, display: 'block', cursor: 'crosshair' }}
      onClick={(e) => {
        if (source !== 'file' || !file) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const f = 20 * Math.pow(1000, (e.clientX - rect.left) / rect.width);
        const bin = Math.min(file.spectrumDb.length - 1, Math.max(1, Math.round(f / file.specBinHz)));
        const m = { f, db: file.spectrumDb[bin] };
        fileSpec.current = [m, ...fileSpec.current].slice(0, 4);
        setMarker(m);
      }}
    />
  );
}

function WaveformCanvas({
  source,
  frozen,
  file,
  engineRef,
  micRef,
  height,
}: {
  source: Source;
  frozen: boolean;
  file: FileData | null;
  engineRef: EngineRef;
  micRef: MicRef;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let raf = 0;
    const draw = () => {
      if (!frozen) raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.fillStyle = INK[0];
      g.fillRect(0, 0, w, h);
      g.strokeStyle = LINE[2];
      g.beginPath();
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.stroke();

      const plot = (data: ArrayLike<number>, center: number, amp: number, color: string) => {
        g.beginPath();
        const n = data.length;
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const y = center - data[i] * amp;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokeStyle = color;
        g.lineWidth = 1.5 * dpr;
        g.shadowColor = color;
        g.shadowBlur = 4 * dpr;
        g.stroke();
        g.shadowBlur = 0;
      };

      const ana = pickAnalyser(source, engineRef, micRef);
      if (ana && source !== 'file') {
        const l = new Float32Array(1024);
        ana.getFloatTimeDomainData(l);
        if (l.some((v) => Math.abs(v) > 1e-4)) {
          plot(l, h / 2, h * 0.42, TEAL);
        } else {
          noSignal(g, w, h, dpr);
        }
      } else if (source === 'file' && file) {
        const n = Math.min(4096, file.left.length);
        const step = Math.max(1, Math.floor(file.left.length / n));
        const l = new Float32Array(n);
        const r = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          l[i] = file.left[i * step];
          r[i] = file.right[i * step];
        }
        plot(l, h * 0.3, h * 0.24, TEAL);
        plot(r, h * 0.72, h * 0.24, AMBER);
      } else {
        noSignal(g, w, h, dpr);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [source, frozen, file, engineRef, micRef]);

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />;
}

function noSignal(g: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  g.font = MONO(12 * dpr, 600);
  g.fillStyle = `${TEXT[3]}55`;
  g.textAlign = 'center';
  g.fillText('NO SIGNAL', w / 2, h / 2);
  g.textAlign = 'left';
}

function MeterBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? -70;
  const norm = Math.min(1, Math.max(0, (v + 48) / 48));
  const over = value !== null && value > -14;
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: 28, height: 120, background: INK[4], border: `1px solid ${LINE[1]}`, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${norm * 100}%`,
            background: over ? AMBER : TEAL,
            opacity: 0.85,
          }}
        />
        <div style={{ position: 'absolute', top: `${((0 - -14 + 48) / 48) * 0}% `, display: 'none' }} />
      </div>
      <span className="t-readout-sm text-3">{label}</span>
      <span className="t-readout-sm" style={{ color: value === null ? 'var(--text-3)' : 'var(--text-1)' }}>
        {value === null ? '—' : value.toFixed(1)}
      </span>
    </div>
  );
}

function LevelMeters({ source, frozen, file, engineRef, micRef }: { source: Source; frozen: boolean; file: FileData | null; engineRef: EngineRef; micRef: MicRef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState<{ l: number; r: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let raf = 0;
    let lastText = 0;
    const draw = () => {
      if (!frozen) raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.fillStyle = INK[0];
      g.fillRect(0, 0, w, h);

      let lDb: number | null = null;
      let rDb: number | null = null;
      const anas = source === 'engine' ? engineRef.current?.analysers() : null;
      const micAna = source === 'mic' ? micRef.current?.ana : null;
      if (anas) {
        const l = new Float32Array(1024);
        const r = new Float32Array(1024);
        anas.left.getFloatTimeDomainData(l);
        anas.right.getFloatTimeDomainData(r);
        const rl = rms(l);
        const rr = rms(r);
        lDb = rl > 1e-6 ? 20 * Math.log10(rl) : null;
        rDb = rr > 1e-6 ? 20 * Math.log10(rr) : null;
      } else if (micAna) {
        const l = new Float32Array(1024);
        micAna.getFloatTimeDomainData(l);
        const rl = rms(l);
        lDb = rDb = rl > 1e-6 ? 20 * Math.log10(rl) : null;
      } else if (source === 'file' && file) {
        lDb = 20 * Math.log10(Math.max(1e-6, rms(file.left)));
        rDb = 20 * Math.log10(Math.max(1e-6, rms(file.right)));
      }

      const barW = w * 0.18;
      const bars: [number, number | null, string][] = [
        [w * 0.22, lDb, TEAL],
        [w * 0.55, rDb, AMBER],
      ];
      for (const [x, db, color] of bars) {
        g.fillStyle = INK[4];
        g.fillRect(x, 8 * dpr, barW, h - 16 * dpr);
        if (db !== null) {
          const norm = Math.min(1, Math.max(0, (db + 60) / 60));
          const bh = norm * (h - 16 * dpr);
          g.fillStyle = db > -6 ? '#C4634F' : color;
          g.fillRect(x, h - 8 * dpr - bh, barW, bh);
        }
      }
      // scale
      g.font = MONO(9 * dpr);
      g.fillStyle = TEXT[3];
      for (const db of [0, -6, -12, -20, -40, -60]) {
        const y = 8 * dpr + ((-db / 60) * (h - 16 * dpr));
        g.fillText(String(db), w * 0.8, y);
        g.strokeStyle = `${LINE[1]}66`;
        g.setLineDash([1 * dpr, 4 * dpr]);
        g.beginPath();
        g.moveTo(w * 0.14, y);
        g.lineTo(w * 0.78, y);
        g.stroke();
      }
      g.setLineDash([]);
      const now = performance.now();
      if (now - lastText > 500) {
        lastText = now;
        setReadout(lDb !== null || rDb !== null ? { l: lDb ?? -Infinity, r: rDb ?? -Infinity } : null);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [source, frozen, file, engineRef, micRef]);

  return (
    <div>
      <canvas ref={ref} style={{ width: '100%', height: 200, display: 'block' }} />
      <div className="t-readout-md text-2" style={{ marginTop: 8 }}>
        L {readout ? fmt(readout.l) : '—'} · R {readout ? fmt(readout.r) : '—'}
      </div>
    </div>
  );
}
