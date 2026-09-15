/**
 * TLR cue synthesis — the validated cue canon rendered as a pure function
 * (node-testable, identical output per call; no Web Audio here).
 *
 * Canon (skills/lucid-dreaming-evidence-grading + Carr 2023/Konkoly 2021):
 * ascending pure tones 400 → 600 → 800 Hz, ~650 ms total, 40–45 dB SPL
 * equivalent at the ear (just above hearing threshold, below arousal
 * threshold). Playback level discipline is the caller's job; this render is
 * normalized well below full scale so the app can keep it quiet.
 */

import type { StereoBuffer } from '@/engine/types';
import { TLR_CUE } from './protocols';

/** Raised-cosine edge (5 ms) to avoid clicks. */
function edge(n: number, i: number, total: number): number {
  const e = Math.min(i, total - 1 - i, n);
  if (e >= n) return 1;
  return 0.5 - 0.5 * Math.cos((Math.PI * e) / n);
}

/**
 * Render the ascending TLR cue as a stereo buffer (dual mono).
 * Deterministic; peak ≤ 0.5 linear so a −12 dB playback lands quiet.
 */
export function renderTlrCue(sampleRate = 48000): StereoBuffer {
  const total = Math.round((TLR_CUE.durationMs / 1000) * sampleRate);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const segLen = Math.floor(total / TLR_CUE.freqsHz.length);
  const edgeN = Math.max(1, Math.round(0.005 * sampleRate));
  let phase = 0;
  for (let s = 0; s < TLR_CUE.freqsHz.length; s++) {
    const f = TLR_CUE.freqsHz[s];
    const start = s * segLen;
    const end = s === TLR_CUE.freqsHz.length - 1 ? total : start + segLen;
    const inc = (2 * Math.PI * f) / sampleRate;
    for (let i = start; i < end; i++) {
      phase += inc;
      const v = Math.sin(phase) * 0.5 * edge(edgeN, i - start, end - start);
      left[i] = v;
      right[i] = v;
    }
  }
  return { left, right };
}

/** RMS level of the cue render (for level-discipline assertions in tests). */
export function cueRms(buf: StereoBuffer): number {
  let acc = 0;
  for (let i = 0; i < buf.left.length; i++) acc += buf.left[i] * buf.left[i];
  return Math.sqrt(acc / Math.max(1, buf.left.length));
}
