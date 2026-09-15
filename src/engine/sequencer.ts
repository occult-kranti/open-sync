/**
 * Open Sync engine — pure multi-phase session sequencer.
 *
 * Chains phases with equal-power crossfades, keeps tone carriers
 * phase-continuous across boundaries (via PhaseOffsets), overlays an optional
 * breath-cue track, applies master gain, and peak-normalizes so the output
 * never exceeds 0 dBFS. Returns a reproducibility manifest whose hash is
 * derived from a canonical JSON encoding of the spec.
 */

import { DEFAULT_SEED, dbToLin, renderPhase } from './synth';
import type {
  BreathSpec,
  PhaseOffsets,
  SessionManifest,
  SessionRenderResult,
  SessionSpec,
} from './types';

/** Peak target after normalization (−0.446 dBFS headroom, always ≤ 0 dBFS). */
export const NORMALIZE_PEAK = 0.95;

const TWO_PI = Math.PI * 2;

/** Canonical JSON: object keys sorted recursively for stable hashing. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit hash, hex-encoded. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Build the reproducibility manifest for a spec without rendering audio.
 * Deterministic: identical specs always yield identical hashes.
 */
export function buildManifest(
  spec: SessionSpec,
  sampleRate: number,
  stats: { totalSamples: number; peak: number; warnings: string[] } = {
    totalSamples: 0,
    peak: 0,
    warnings: [],
  },
): SessionManifest {
  const specJson = stableStringify(spec);
  const phases = Array.isArray(spec.phases) ? spec.phases : [];
  const specDuration = phases.reduce(
    (acc, p) => acc + (Number.isFinite(p.durationSec) && p.durationSec > 0 ? p.durationSec : 0),
    0,
  );
  return {
    version: 1,
    name: spec.name ?? 'untitled',
    sampleRate,
    specJson,
    hash: fnv1a(`${sampleRate}:${specJson}`),
    phaseCount: phases.length,
    totalDurationSec: stats.totalSamples > 0 ? stats.totalSamples / sampleRate : specDuration,
    totalSamples: stats.totalSamples,
    peak: stats.peak,
    warnings: stats.warnings,
  };
}

/** Breath-cue overlay: sine sweep markers, one cycle inhale → hold → exhale. */
export function renderBreathTrack(
  breath: BreathSpec,
  totalSamples: number,
  sampleRate: number,
): Float32Array {
  const out = new Float32Array(totalSamples);
  const inhale = Math.max(0, breath.inhaleSec);
  const hold = Math.max(0, breath.holdSec);
  const exhale = Math.max(0, breath.exhaleSec);
  const hold2 = Math.max(0, breath.holdAfterExhaleSec ?? 0);
  const cycleSec = inhale + hold + exhale + hold2;
  if (cycleSec <= 0 || totalSamples === 0) return out;

  const level = breath.level ?? 0.15;
  const baseHz = breath.baseHz ?? 320;
  const topHz = breath.topHz ?? 480;
  const cycleSamples = Math.max(1, Math.round(cycleSec * sampleRate));
  let oscPhase = 0;
  // Sweep through a segment with smooth frequency ramp and soft edges.
  const sweep = (t: number, dur: number, f0: number, f1: number): void => {
    // Instantaneous frequency ramps linearly f0→f1 over the segment.
    const freq = f0 + (f1 - f0) * (t / dur);
    oscPhase += (TWO_PI * freq) / sampleRate;
    // Raised-cosine edge over 10% of the segment to avoid clicks.
    const edge = Math.min(t / (0.1 * dur), (dur - t) / (0.1 * dur), 1);
    out[curSample] += level * edge * Math.sin(oscPhase);
  };
  let curSample = 0;
  for (let i = 0; i < totalSamples; i++) {
    curSample = i;
    const pos = (i % cycleSamples) / sampleRate;
    if (pos < inhale) sweep(pos, inhale, baseHz, topHz);
    else if (pos < inhale + hold) sweep(pos - inhale, hold, topHz, topHz);
    else if (pos < inhale + hold + exhale) {
      sweep(pos - inhale - hold, exhale, topHz, baseHz);
    }
    // holdAfterExhale: silence (marker boundary is the next inhale start).
  }
  return out;
}

/**
 * Render a full session. Adjacent phases are overlap-added with equal-power
 * (cos/sin) crossfades, so total duration = Σ durations − Σ crossfades.
 * Output peak is normalized to NORMALIZE_PEAK whenever it exceeds it, and is
 * therefore always ≤ 0 dBFS.
 */
export function renderSession(spec: SessionSpec): SessionRenderResult {
  const sampleRate = spec.sampleRate ?? 48000;
  const seed = spec.seed ?? DEFAULT_SEED;
  const warnings: string[] = [];
  const phases = Array.isArray(spec.phases) ? spec.phases : [];
  if (phases.length === 0) {
    warnings.push('session has no phases');
    const manifest = buildManifest(spec, sampleRate, { totalSamples: 0, peak: 0, warnings });
    return { left: new Float32Array(0), right: new Float32Array(0), warnings, manifest };
  }

  // Pass 1: render each phase, keeping carrier phase continuous.
  const rendered: { left: Float32Array; right: Float32Array }[] = [];
  let offsets: PhaseOffsets = { left: 0, right: 0, beat: 0 };
  for (const phase of phases) {
    const r = renderPhase(phase, sampleRate, offsets, seed);
    offsets = r.offsets;
    warnings.push(...r.warnings);
    rendered.push({ left: r.left, right: r.right });
  }

  // Pass 2: compute layout with per-boundary crossfade clamping.
  const xfadeSec = Math.max(0, spec.crossfadeSec ?? 2);
  const lengths = rendered.map((r) => r.left.length);
  const xfades: number[] = [];
  for (let i = 0; i < phases.length - 1; i++) {
    const max = Math.min(lengths[i], lengths[i + 1]) >> 1;
    xfades.push(Math.min(Math.round(xfadeSec * sampleRate), max));
  }
  const totalSamples = lengths.reduce((a, b) => a + b, 0) - xfades.reduce((a, b) => a + b, 0);
  const left = new Float32Array(Math.max(0, totalSamples));
  const right = new Float32Array(Math.max(0, totalSamples));

  // Pass 3: overlap-add with equal-power crossfade gains.
  let writeHead = 0;
  for (let i = 0; i < rendered.length; i++) {
    const src = rendered[i];
    const len = lengths[i];
    const fadeOut = i < xfades.length ? xfades[i] : 0;
    const fadeIn = i > 0 ? xfades[i - 1] : 0;
    const bodyEnd = len - fadeOut;
    for (let s = 0; s < bodyEnd; s++) {
      let g = 1;
      if (s < fadeIn) {
        const t = fadeIn > 0 ? s / fadeIn : 1;
        g = Math.sin((Math.PI / 2) * t);
      }
      left[writeHead + s] += src.left[s] * g;
      right[writeHead + s] += src.right[s] * g;
    }
    for (let s = bodyEnd; s < len; s++) {
      const t = (s - bodyEnd) / Math.max(1, fadeOut);
      const g = Math.cos((Math.PI / 2) * t);
      left[writeHead + s] += src.left[s] * g;
      right[writeHead + s] += src.right[s] * g;
    }
    writeHead += bodyEnd;
  }

  // Breath-cue overlay (post-crossfade so cues are never faded).
  if (spec.breath) {
    const cues = renderBreathTrack(spec.breath, left.length, sampleRate);
    for (let i = 0; i < left.length; i++) {
      left[i] += cues[i];
      right[i] += cues[i];
    }
  }

  // Master gain, then peak normalization (attenuate only — never boost).
  const masterGain = dbToLin(spec.masterGainDb ?? 0);
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    left[i] *= masterGain;
    right[i] *= masterGain;
    const a = Math.abs(left[i]);
    const b = Math.abs(right[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }
  if (peak > NORMALIZE_PEAK) {
    const g = NORMALIZE_PEAK / peak;
    for (let i = 0; i < left.length; i++) {
      left[i] *= g;
      right[i] *= g;
    }
    peak = NORMALIZE_PEAK;
  }
  if (!Number.isFinite(peak)) {
    // NaN guard at the session level: never hand non-finite audio downstream.
    left.fill(0);
    right.fill(0);
    peak = 0;
    warnings.push('non-finite sample detected after mix; output silenced');
  }

  const manifest = buildManifest(spec, sampleRate, {
    totalSamples: left.length,
    peak,
    warnings,
  });
  return { left, right, warnings, manifest };
}
