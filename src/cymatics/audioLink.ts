/**
 * Audio link — narrow interface between the Studio engine's AnalyserNode and
 * the Cymatic Studio. Deliberately decoupled: accepts a minimal
 * `AnalyserLike` (structurally compatible with AnalyserNode) or `null`, and
 * degrades to a static, deterministic frame when no audio is available.
 *
 * Physics mode: the dominant spectral frequency is treated as the *driving
 * frequency* of the selected virtual plate (Lorentzian mode superposition in
 * chladni.ts) — labeled "physically motivated". Art mode: the peak frequency
 * is mapped straight to (n, m) indices — labeled "artistic interpretation".
 */

import {
  drivenCircularModes,
  drivenSquareModes,
  frequencyToModes,
  type DrivenCircularMode,
  type DrivenSquareMode,
  type VirtualPlate,
} from './chladni';

/** Structural subset of the Web Audio AnalyserNode we depend on. */
export interface AnalyserLike {
  readonly frequencyBinCount: number;
  getByteFrequencyData(data: Uint8Array): void;
}

export interface AudioFeatures {
  /** False when no analyser is attached or the spectrum is silent. */
  active: boolean;
  /** RMS-ish spectral energy 0..1 (drives grain brightness / jitter). */
  energy: number;
  /** Dominant spectral peak, Hz (0 when inactive). */
  peakHz: number;
  /** Spectral centroid, Hz (0 when inactive). */
  centroidHz: number;
}

export const SILENT_FEATURES: AudioFeatures = {
  active: false,
  energy: 0,
  peakHz: 0,
  centroidHz: 0,
};

/** Byte-value floor below which a bin counts as silence (≈ −84 dBFS). */
const SILENCE_BYTE = 12;

/**
 * Sample spectrum features from an analyser. `null` (engine never started,
 * no AudioContext, browser unsupported) yields SILENT_FEATURES — the caller
 * renders the static manual-mode frame. Never throws.
 */
export function sampleAudioFeatures(
  analyser: AnalyserLike | null,
  sampleRate = 48000,
): AudioFeatures {
  if (!analyser || analyser.frequencyBinCount <= 0) return SILENT_FEATURES;
  const bins = new Uint8Array(analyser.frequencyBinCount);
  try {
    analyser.getByteFrequencyData(bins);
  } catch {
    return SILENT_FEATURES;
  }
  let peak = 0;
  let peakIdx = 0;
  let sum = 0;
  let weighted = 0;
  const nyquist = sampleRate / 2;
  for (let i = 0; i < bins.length; i++) {
    const v = bins[i];
    sum += v;
    weighted += v * i;
    if (v > peak) {
      peak = v;
      peakIdx = i;
    }
  }
  if (peak < SILENCE_BYTE || sum === 0) return SILENT_FEATURES;
  const binHz = nyquist / bins.length;
  return {
    active: true,
    energy: Math.min(1, sum / (bins.length * 255) * 2.5),
    peakHz: peakIdx * binHz,
    centroidHz: (weighted / sum) * binHz,
  };
}

export interface AudioDriveResult {
  features: AudioFeatures;
  /** Physics mode: Lorentzian-weighted modes of the virtual plate. */
  squareModes: DrivenSquareMode[];
  circularModes: DrivenCircularMode[];
  /** Art mode: single nearest mode from the honest ladder mapping. */
  artMode: { n: number; m: number } | null;
}

/**
 * Derive plate drive from features. With inactive features everything is
 * static: empty superposition lists and no art-mode override, so the UI
 * keeps the user's manual mode selection.
 */
export function driveFromFeatures(
  features: AudioFeatures,
  plate: VirtualPlate,
): AudioDriveResult {
  if (!features.active || features.peakHz <= 0) {
    return { features, squareModes: [], circularModes: [], artMode: null };
  }
  const squareModes = drivenSquareModes(features.peakHz, plate);
  const circularModes = drivenCircularModes(features.peakHz, plate);
  const candidates = frequencyToModes(features.peakHz, 'square', {
    fundamentalHz: plate.fundamentalHz,
    scaling: plate.scaling,
    tolerance: 1, // art mode always takes the nearest rung on the ladder
    limit: 1,
  });
  const best = candidates[0];
  return {
    features,
    squareModes,
    circularModes,
    artMode: best && best.kind === 'square' ? { n: best.n, m: best.m } : null,
  };
}

/**
 * Smoothly track a changing drive frequency (one-pole smoother) so sweeping
 * the tone glides across the eigenfrequency ladder instead of jumping.
 * `alpha` ∈ (0, 1]; smaller = smoother. Pass prev = 0 to initialize.
 */
export function smoothDriveHz(prev: number, next: number, alpha = 0.18): number {
  if (!(prev > 0)) return next;
  if (!(next > 0)) return prev;
  return prev + (next - prev) * Math.min(1, Math.max(0, alpha));
}
