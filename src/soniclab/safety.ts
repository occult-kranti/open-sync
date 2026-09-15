/**
 * Sonic Lab — render-time safety rails.
 *
 * Applied to every offline render before playback/export:
 *  - infrasonic (<20 Hz) / ultrasonic (>16 kHz) content detection (spectral
 *    edges of the rendered buffer, Hann-windowed FFT, −40 dB skirt);
 *  - peak ceiling check against a −1 dBTP-style ceiling (with a 4× linear
 *    oversampled inter-sample peak estimate);
 *  - duration cap (renders are previews, not sessions);
 *  - NaN/Inf guard;
 *  - level normalization helper.
 */

import { amplitudeSpectrum, dbToLin, hasNonFinite, linToDb, peakAbs } from './dsp';

export interface RenderRailsOpts {
  /** Peak ceiling in dB (default −1 dBTP-style). */
  ceilingDb?: number;
  /** Max render duration in seconds (default 30 s preview cap). */
  maxDurationSec?: number;
  /** Lowest allowed significant content (default 20 Hz). */
  infrasonicHz?: number;
  /** Highest allowed significant content (default 16 kHz). */
  ultrasonicHz?: number;
}

export interface RenderSafetyReport {
  warnings: string[];
  /** Sample peak in dBFS. */
  peakDb: number;
  /** 4×-oversampled inter-sample peak estimate in dB. */
  truePeakDb: number;
  /** Lowest frequency with energy above the −40 dB skirt (null if silent). */
  lowestHz: number | null;
  /** Highest frequency with energy above the −40 dB skirt. */
  highestHz: number | null;
  durationSec: number;
}

/** 4× linear-interpolation inter-sample peak estimate. */
export function truePeakEstimate(samples: Float32Array): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (!Number.isFinite(a)) continue;
    if (a > p) p = a;
    if (i + 1 < samples.length) {
      const b = Math.abs(samples[i + 1]);
      if (!Number.isFinite(b)) continue;
      // 3 inter-sample points (linear — cheap bound, not a reconstruction filter).
      for (const f of [0.25, 0.5, 0.75]) {
        const v = a + (b - a) * f;
        if (v > p) p = v;
      }
    }
  }
  return p;
}

/** Find the spectral edges: lowest/highest bin above (peak − floorDb). */
export function spectralEdges(
  samples: Float32Array,
  sampleRate: number,
  floorDb = 40,
): { lowestHz: number | null; highestHz: number | null } {
  const { freqs, mags } = amplitudeSpectrum(samples, sampleRate);
  let maxMag = 0;
  for (let k = 1; k < mags.length; k++) if (mags[k] > maxMag) maxMag = mags[k];
  if (maxMag <= 0) return { lowestHz: null, highestHz: null };
  const floor = maxMag * dbToLin(-floorDb);
  let lo: number | null = null;
  let hi: number | null = null;
  for (let k = 1; k < mags.length; k++) {
    if (mags[k] >= floor) {
      if (lo === null) lo = freqs[k];
      hi = freqs[k];
    }
  }
  return { lowestHz: lo, highestHz: hi };
}

/**
 * Analyze a rendered buffer against the rails. Pure check — returns warnings,
 * never mutates. Pair with `normalizeToCeiling` to fix level violations.
 */
export function analyzeRender(
  samples: Float32Array,
  sampleRate: number,
  opts: RenderRailsOpts = {},
): RenderSafetyReport {
  const ceilingDb = opts.ceilingDb ?? -1;
  const maxDurationSec = opts.maxDurationSec ?? 30;
  const infraHz = opts.infrasonicHz ?? 20;
  const ultraHz = opts.ultrasonicHz ?? 16000;
  const warnings: string[] = [];

  const durationSec = samples.length / sampleRate;
  if (durationSec > maxDurationSec) {
    warnings.push(`duration ${durationSec.toFixed(1)} s exceeds the ${maxDurationSec} s preview cap`);
  }
  if (hasNonFinite(samples)) {
    warnings.push('NaN/Inf samples detected — sanitize before playback or export');
  }

  const peak = peakAbs(samples);
  const peakDb = peak > 0 ? linToDb(peak) : -Infinity;
  const tp = truePeakEstimate(samples);
  const truePeakDb = tp > 0 ? linToDb(tp) : -Infinity;
  if (truePeakDb > ceilingDb) {
    warnings.push(
      `peak ${truePeakDb.toFixed(2)} dB exceeds the ${ceilingDb} dBTP ceiling — normalize before playback`,
    );
  }

  const { lowestHz, highestHz } = spectralEdges(samples, sampleRate);
  if (lowestHz !== null && lowestHz < infraHz) {
    warnings.push(`infrasonic content at ≈${lowestHz.toFixed(1)} Hz (<${infraHz} Hz)`);
  }
  if (highestHz !== null && highestHz > ultraHz) {
    warnings.push(`ultrasonic content at ≈${(highestHz / 1000).toFixed(1)} kHz (>${ultraHz / 1000} kHz)`);
  }

  return { warnings, peakDb, truePeakDb, lowestHz, highestHz, durationSec };
}

/**
 * Normalize to a target peak level (default −3 dBFS). Non-finite samples are
 * zeroed. Returns a new buffer; silent buffers pass through unchanged.
 */
export function normalizeToCeiling(
  samples: Float32Array,
  targetPeakDb = -3,
): { samples: Float32Array; gainDb: number } {
  const out = samples.slice();
  for (let i = 0; i < out.length; i++) if (!Number.isFinite(out[i])) out[i] = 0;
  const peak = peakAbs(out);
  if (peak <= 1e-9) return { samples: out, gainDb: 0 };
  const gainDb = targetPeakDb - linToDb(peak);
  const g = dbToLin(gainDb);
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return { samples: out, gainDb };
}

/**
 * One-call rail: analyze + sanitize + cap the peak at the ceiling.
 * Never boosts quiet renders (gain ≤ 0 dB), always pulls hot ones down.
 */
export function applyRenderRails(
  samples: Float32Array,
  sampleRate: number,
  opts: RenderRailsOpts = {},
): { samples: Float32Array; report: RenderSafetyReport } {
  const ceilingDb = opts.ceilingDb ?? -1;
  const report = analyzeRender(samples, sampleRate, opts);
  let out = samples;
  if (hasNonFinite(out)) {
    out = out.slice();
    for (let i = 0; i < out.length; i++) if (!Number.isFinite(out[i])) out[i] = 0;
  }
  if (report.truePeakDb > ceilingDb) {
    const g = dbToLin(ceilingDb - report.truePeakDb);
    const scaled = out.slice();
    for (let i = 0; i < scaled.length; i++) scaled[i] *= g;
    out = scaled;
  }
  return { samples: out, report };
}
