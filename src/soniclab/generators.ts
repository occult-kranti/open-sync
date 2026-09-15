/**
 * Sonic Lab — mathematical sound-synthesis generators (Swarm E2).
 *
 * Pure TypeScript renderers: every function takes explicit parameters plus a
 * `sampleRate`, returns mono Float32Array samples and a `warnings[]` list.
 * No Web Audio, no DOM — safe to run in vitest/node. Evidence grades follow
 * the program scheme (research/math_sound_synthesis.md):
 *   A = solid science/verifiable math · B = real phenomenon, moderate
 *   evidence · C = contested · D = marketing/pseudoscience (quarantined).
 */

import { clamp, fft, hasNonFinite, makeGaussian, mulberry32, nextPow2, peakAbs } from './dsp';

/** Common render result. */
export interface Rendered {
  samples: Float32Array;
  sampleRate: number;
  warnings: string[];
}

const DEFAULT_SR = 48000;

function finalize(samples: Float32Array, sampleRate: number, warnings: string[]): Rendered {
  if (hasNonFinite(samples)) {
    warnings.push('NaN/Inf samples detected during render — non-finite samples zeroed');
    for (let i = 0; i < samples.length; i++) if (!Number.isFinite(samples[i])) samples[i] = 0;
  }
  return { samples, sampleRate, warnings };
}

/** Normalize a buffer so its peak equals `level` (linear). No-op if silent. */
function normalizePeak(samples: Float32Array, level: number): void {
  const p = peakAbs(samples);
  if (p > 1e-9) {
    const g = level / p;
    for (let i = 0; i < samples.length; i++) samples[i] *= g;
  }
}

/* ============================================================================
 * 1. Shepard tone / Shepard–Risset glissando — Grade A
 *    Gaussian-in-log-f envelope over octave-spaced sines, phase-continuous.
 *    Shepard 1964 (JASA 56:2346); Risset 1969.
 * ==========================================================================*/

export interface ShepardSpec {
  /** Total duration in seconds. */
  durationSec: number;
  /** Envelope center μ (Hz). Recommended 260–500 (DSP-First lab). */
  centerHz?: number;
  /** Envelope width σ in octaves. Recommended 0.7–1.2. */
  sigmaOctaves?: number;
  /** Glide rate in semitones/s (0.5–3). Ignored when `loop` is set. */
  semitonesPerSec?: number;
  /** Lowest partial base frequency f0 (20–50 Hz). */
  baseHz?: number;
  /** Number of octave partials (8–10). */
  partials?: number;
  /**
   * Seamless-loop mode: the glide is snapped so it covers exactly 12
   * semitones over `durationSec`. After one octave shift the spectrum is
   * identical (pitch-class circularity) → the loop point is continuous up to
   * the (Gaussian-faded) edge partials.
   */
  loop?: boolean;
  sampleRate?: number;
  /** Peak level (linear), default 0.6. */
  level?: number;
}

/**
 * Gaussian-in-log-frequency partial envelope: A(f) = exp(−(log2 f − μ)²/2σ²).
 * Peaks at exactly 1.0 at f = centerHz and is symmetric in octaves.
 */
export function shepardEnvelope(fHz: number, centerHz: number, sigmaOctaves: number): number {
  return Math.exp(-Math.pow(Math.log2(fHz) - Math.log2(centerHz), 2) / (2 * sigmaOctaves * sigmaOctaves));
}

export function shepardTone(spec: ShepardSpec): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const centerHz = spec.centerHz ?? 400;
  const sigma = spec.sigmaOctaves ?? 1;
  let baseHz = spec.baseHz ?? 27.5;
  const partials = Math.round(spec.partials ?? 10);
  const level = spec.level ?? 0.6;
  const durationSec = Math.max(0.05, spec.durationSec);
  const warnings: string[] = [];

  const rate = spec.loop ? 12 / durationSec : (spec.semitonesPerSec ?? 1);
  if (spec.loop) {
    // True seamless loop: after one octave glide each partial takes over its
    // neighbor's role, so every partial must complete a whole number of
    // cycles → f0·T/ln2 ∈ ℤ. Snap f0 (≤ ~1% nudge) to the nearest integer.
    const exact = (baseHz * durationSec) / Math.LN2;
    const snapped = Math.max(1, Math.round(exact));
    if (Math.abs(snapped - exact) > 1e-9) baseHz = (snapped * Math.LN2) / durationSec;
  }
  if (!spec.loop && (rate < 0.5 || rate > 3)) {
    warnings.push(`glide rate ${rate.toFixed(2)} st/s outside recommended 0.5–3 st/s`);
  }
  if (centerHz < 260 || centerHz > 500) {
    warnings.push(`envelope center ${centerHz} Hz outside recommended 260–500 Hz`);
  }
  if (sigma < 0.5 || sigma > 1.5) warnings.push(`σ ${sigma} oct outside recommended 0.7–1.2`);
  const topHz = baseHz * Math.pow(2, partials - 1 + rate * durationSec / 12);
  if (baseHz < 20) warnings.push(`lowest partial ${baseHz.toFixed(1)} Hz is infrasonic (<20 Hz)`);
  if (topHz > 16000) warnings.push(`highest partial ${topHz.toFixed(0)} Hz is ultrasonic (>16 kHz)`);

  const n = Math.max(1, Math.round(durationSec * sr));
  const out = new Float32Array(n);

  // Phase-continuous: analytic phase integral of f_k(t) = f0·2^k·2^(r·t/12).
  // φ_k(t) = 2π·f_k·(12/(r·ln2))·(2^(r·t/12) − 1)   (r ≠ 0)
  const ln2 = Math.LN2;
  for (let k = 0; k < partials; k++) {
    const fk = baseHz * Math.pow(2, k);
    const phaseScale = rate !== 0 ? (2 * Math.PI * fk * 12) / (rate * ln2) : 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const shift = rate !== 0 ? Math.pow(2, (rate * t) / 12) : 1;
      const fInst = fk * shift;
      const amp = shepardEnvelope(fInst, centerHz, sigma);
      const phase = rate !== 0 ? phaseScale * (shift - 1) : 2 * Math.PI * fk * t;
      out[i] += amp * Math.sin(phase);
    }
  }
  normalizePeak(out, level);
  if (spec.loop) {
    // Seam metric: |y[N−1] − y[0]| — residual comes only from edge partials
    // faded by the Gaussian envelope.
    const seam = Math.abs(out[n - 1] - out[0]);
    if (seam > 0.05 * level) {
      warnings.push(`loop seam discontinuity ${seam.toFixed(3)} — widen σ or add partials`);
    }
  }
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 2. Risset rhythm (temporal Shepard) — Grade A−
 *    N click layers at tempos T·r^i, exponential tempo ramp ×r per metabar,
 *    equal crossfade → endless accelerando/ritardando illusion.
 *    Risset 1986; Stowell 2011; Volkov 2023 (arbitrary ratios).
 * ==========================================================================*/

export interface RissetRhythmSpec {
  /** Metabar duration L (seconds); render covers `loops` metabars. */
  metabarSec?: number;
  loops?: number;
  /** Base tempo of the slowest layer at t=0 (60–240 BPM). */
  baseBpm?: number;
  /** Tempo ratio between layers (2 classic; 3/2, 5/4 extended). */
  ratio?: number;
  /** Click tone frequency (Hz). */
  clickHz?: number;
  durationSec?: never; // (metabarSec × loops is the duration)
  sampleRate?: number;
  level?: number;
}

export function rissetRhythm(spec: RissetRhythmSpec = {}): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const L = spec.metabarSec ?? 8;
  const loops = Math.max(1, Math.round(spec.loops ?? 1));
  const bpm = spec.baseBpm ?? 120;
  const ratio = spec.ratio ?? 2;
  const clickHz = spec.clickHz ?? 2200;
  const level = spec.level ?? 0.6;
  const warnings: string[] = [];
  if (bpm < 60 || bpm > 240) warnings.push(`base tempo ${bpm} BPM outside recommended 60–240`);
  if (ratio < 1.2 || ratio > 3) warnings.push(`tempo ratio ${ratio} outside sane 1.25–3 range`);

  const total = L * loops;
  const n = Math.max(1, Math.round(total * sr));
  const out = new Float32Array(n);
  const lnR = Math.log(ratio);
  const beatsPerSec0 = bpm / 60;
  const clickDecay = 0.008; // 8 ms exponential tail
  const clickLen = Math.round(0.03 * sr);

  // Two layers: A ramps T0·r^(u) gain (1−u); B ramps T0·r^(1+u) gain u,
  // u = (t mod L)/L. Click times found analytically by inverting the
  // accumulated phase  φ(u) = (bpm/60)·L·r^i·(r^u − 1)/ln r  (per metabar).
  for (let layer = 0; layer < 2; layer++) {
    const C = (beatsPerSec0 * L * Math.pow(ratio, layer)) / lnR;
    const clicksPerBar = C * (ratio - 1);
    for (let loop = 0; loop < loops; loop++) {
      for (let c = 1; c <= Math.ceil(clicksPerBar) + 1; c++) {
        const u = Math.log(1 + c / C) / lnR; // solve φ(u) = c
        if (!(u >= 0 && u < 1)) continue;
        const tAbs = loop * L + u * L;
        const gain = layer === 0 ? 1 - u : u;
        addClick(out, sr, tAbs, clickHz, clickDecay, clickLen, gain);
      }
    }
  }
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/** Add a short decaying sine click at absolute time t0 (seconds). */
function addClick(
  out: Float32Array,
  sr: number,
  t0: number,
  hz: number,
  decaySec: number,
  lenSamples: number,
  gain: number,
): void {
  const start = Math.round(t0 * sr);
  for (let i = 0; i < lenSamples && start + i < out.length; i++) {
    if (start + i < 0) continue;
    const u = i / sr;
    // 1.5 ms raised-cosine attack to avoid a broadband tick.
    const attack = Math.min(1, u / 0.0015);
    out[start + i] += gain * attack * Math.sin(2 * Math.PI * hz * u) * Math.exp(-u / decaySec);
  }
}

/* ============================================================================
 * 3. Barber-pole AM — Grade B (craft; math exact)
 *    Two AM layers whose modulation rates are in ratio 2:1; layer A slows
 *    Ω→Ω/2 while fading out, layer B fades in at 2Ω→Ω. Perceived beat rate
 *    constant, texture endlessly descends. Loop-snapped to integer cycles.
 * ==========================================================================*/

export interface BarberPoleSpec {
  durationSec?: number;
  carrierHz?: number; // 100–1000
  sweepFromHz?: number; // Ω at loop start (perceived beat rate)
  depth?: number; // AM depth m, 0..1
  sampleRate?: number;
  level?: number;
}

export function barberPoleAM(spec: BarberPoleSpec = {}): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const L = Math.max(1, spec.durationSec ?? 8);
  const carrierHz = spec.carrierHz ?? 400;
  const sweepFrom = spec.sweepFromHz ?? 40;
  const depth = clamp(spec.depth ?? 0.8, 0, 1);
  const level = spec.level ?? 0.6;
  const warnings: string[] = [];
  if (carrierHz < 100 || carrierHz > 1000) {
    warnings.push(`carrier ${carrierHz} Hz outside recommended 100–1000 Hz`);
  }
  // Snap the sweep so layer B completes an integer number of beat cycles over
  // the loop → seam-free. Effective Ω0 = N·ln2/L.
  const N = Math.max(1, Math.round((sweepFrom * L) / Math.LN2));
  // Effective Ω0 = N·ln2/L (within a snap of the requested sweep).

  const n = Math.max(1, Math.round(L * sr));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const u = t / L;
    // Phase integrals: φ_A = 2πN(1−2^(−u)), φ_B = 2φ_A (2:1 rate octave).
    const phiA = 2 * Math.PI * N * (1 - Math.pow(2, -u));
    // Equal-power crossfade.
    const gA = Math.cos((Math.PI / 2) * u);
    const gB = Math.sin((Math.PI / 2) * u);
    const mod = gA * Math.sin(phiA) + gB * Math.sin(2 * phiA);
    out[i] = (1 - depth + depth * (0.5 + 0.5 * mod)) * Math.sin(2 * Math.PI * carrierHz * t);
  }
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 4. Euclidean / number-theory rhythm patterns — Grades A/B
 * ==========================================================================*/

/**
 * Bjorklund's algorithm (the Euclid-GCD-mirroring recursive construction).
 * E(k, n) distributes k pulses over n steps as evenly as possible.
 * Canonical: E(3,8) = x..x..x. (tresillo), E(5,8) = x.xx.xx. (cinquillo).
 */
export function bjorklund(pulses: number, steps: number): boolean[] {
  if (!Number.isInteger(pulses) || !Number.isInteger(steps) || pulses < 0 || steps < 1 || pulses > steps) {
    throw new RangeError(`bjorklund: need 0 ≤ pulses ≤ steps, got E(${pulses},${steps})`);
  }
  if (pulses === 0) return Array.from({ length: steps }, () => false);
  if (pulses === steps) return Array.from({ length: steps }, () => true);

  const counts: number[] = [];
  const remainders: number[] = [pulses];
  let divisor = steps - pulses;
  let level = 0;
  for (;;) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level++;
    if (remainders[level] <= 1) break;
  }
  counts.push(divisor);

  const flat: number[] = [];
  const build = (lvl: number): void => {
    if (lvl === -1) flat.push(0);
    else if (lvl === -2) flat.push(1);
    else {
      for (let i = 0; i < counts[lvl]; i++) build(lvl - 1);
      if (remainders[lvl] !== 0) build(lvl - 2);
    }
  };
  build(level);
  const first = flat.indexOf(1);
  const rotated = flat.slice(first).concat(flat.slice(0, first));
  return rotated.map((v) => v === 1);
}

/** Euclidean rhythm E(k, n) with rotation (steps shifted left by `rotation`). */
export function euclideanPattern(k: number, n: number, rotation = 0): boolean[] {
  const pat = bjorklund(k, n);
  const r = ((rotation % n) + n) % n;
  return pat.slice(r).concat(pat.slice(0, r));
}

/**
 * Golden-ratio Beatty/Sturmian sequence — the "golden Euclidean" limit.
 * hit(i) = ⌊(i+1)/φ⌋ − ⌊i/φ⌋. φ is the most irrational number (slowest
 * continued-fraction convergence) → pulse spacing maximally avoids periodic
 * coincidence. Grade B math; Lendvai's Bartók/Debussy claims contested (C).
 */
export const PHI = (1 + Math.sqrt(5)) / 2;

export function goldenBeattyPattern(length: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < length; i++) {
    out.push(Math.floor((i + 1) / PHI) - Math.floor(i / PHI) === 1);
  }
  return out;
}

/** Prime pulse train over 2..window (sieve of Eratosthenes). Grade B. */
export function primePulsePattern(window: number): boolean[] {
  const n = Math.max(2, Math.floor(window));
  const sieve = new Array<boolean>(n + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (sieve[p]) for (let m = p * p; m <= n; m += p) sieve[m] = false;
  }
  // Steps are integers 0..window−1; hits where the integer is prime.
  return sieve.slice(0, n);
}

/**
 * Fibonacci word (A→AB, B→A) — a self-similar rhythm with long:short → φ.
 * Grade B. HONESTY (crit_r2): Fibonacci fold-mapped *melodies* (F_n mod m →
 * Hz) carry zero Fibonacci information — only Pisano periodicity is real.
 * This generator deliberately uses the word rhythm, NOT a fold-mapped pitch
 * sequence.
 */
export const FIBONACCI_HONESTY_NOTE =
  'Fibonacci fold-mapped melodies are zero-information (only Pisano periodicity is real); this is the Fibonacci word rhythm instead.';

export function fibonacciWord(iterations: number): string {
  let word = 'A';
  const it = clamp(Math.round(iterations), 1, 12);
  for (let i = 0; i < it; i++) {
    let next = '';
    for (const ch of word) next += ch === 'A' ? 'AB' : 'A';
    if (next.length > 2000) break; // L-system symbol cap (E2 §2.5)
    word = next;
  }
  return word;
}

/* ============================================================================
 * 5. Pattern → audio renderer (AM gate on a tone, or click trigger)
 * ==========================================================================*/

export interface PatternRenderSpec {
  /** Gate pattern (true = hit). */
  steps: boolean[];
  /** Step rate in steps/s (4–16 recommended). */
  stepRate?: number;
  /** Loops of the pattern. */
  loops?: number;
  /** 'gate' = AM control signal on a sustained tone; 'click' = percussive. */
  mode?: 'gate' | 'click';
  toneHz?: number;
  sampleRate?: number;
  level?: number;
}

export function renderPattern(spec: PatternRenderSpec): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const steps = spec.steps;
  const stepRate = spec.stepRate ?? 8;
  const loops = Math.max(1, Math.round(spec.loops ?? 2));
  const mode = spec.mode ?? 'gate';
  const toneHz = spec.toneHz ?? 440;
  const level = spec.level ?? 0.6;
  const warnings: string[] = [];
  if (steps.length === 0) {
    warnings.push('empty pattern');
    return finalize(new Float32Array(1), sr, warnings);
  }
  if (stepRate < 4 || stepRate > 16) warnings.push(`step rate ${stepRate}/s outside recommended 4–16`);
  if (toneHz < 20) warnings.push(`tone ${toneHz} Hz is infrasonic (<20 Hz)`);
  if (toneHz > 16000) warnings.push(`tone ${toneHz} Hz is ultrasonic (>16 kHz)`);

  const stepSec = 1 / stepRate;
  const total = steps.length * stepSec * loops;
  const n = Math.max(1, Math.round(total * sr));
  const out = new Float32Array(n);
  const ramp = 0.004; // 4 ms raised-cosine gate ramps

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const step = Math.floor(t / stepSec) % steps.length;
    const u = t - Math.floor(t / stepSec) * stepSec; // time within step
    if (!steps[step]) continue;
    if (mode === 'click') {
      if (u < 0.03) {
        const attack = Math.min(1, u / 0.0015);
        out[i] += attack * Math.sin(2 * Math.PI * 2400 * u) * Math.exp(-u / 0.008);
      }
    } else {
      // AM gate: raised-cosine edges, full-open middle.
      const edge = Math.min(u / ramp, (stepSec - u) / ramp, 1);
      const g = 0.5 - 0.5 * Math.cos(Math.PI * clamp(edge, 0, 1));
      out[i] += g * Math.sin(2 * Math.PI * toneHz * t);
    }
  }
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/** Render the Fibonacci word rhythm: A = long tone (2 units), B = short (1). */
export function renderFibonacciRhythm(spec: {
  iterations?: number;
  unitSec?: number;
  toneHz?: number;
  sampleRate?: number;
  level?: number;
}): Rendered & { word: string } {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const word = fibonacciWord(spec.iterations ?? 6);
  const unit = spec.unitSec ?? 0.12;
  const toneHz = spec.toneHz ?? 440;
  const level = spec.level ?? 0.6;
  const warnings: string[] = [FIBONACCI_HONESTY_NOTE];
  if (toneHz < 20) warnings.push(`tone ${toneHz} Hz is infrasonic (<20 Hz)`);

  let total = 0;
  for (const ch of word) total += ch === 'A' ? 2 * unit : unit;
  const n = Math.max(1, Math.round(total * sr));
  const out = new Float32Array(n);
  const ramp = 0.005;
  let t0 = 0;
  for (const ch of word) {
    const dur = ch === 'A' ? 2 * unit : unit;
    const accent = ch === 'A' ? 1 : 0.7; // long symbols accented
    const s0 = Math.round(t0 * sr);
    const sN = Math.min(n, Math.round((t0 + dur) * sr));
    for (let i = s0; i < sN; i++) {
      const t = i / sr;
      const u = t - t0;
      const edge = Math.min(u / ramp, (dur - u) / ramp, 1);
      const g = 0.5 - 0.5 * Math.cos(Math.PI * clamp(edge, 0, 1));
      out[i] += accent * g * Math.sin(2 * Math.PI * toneHz * t);
    }
    t0 += dur;
  }
  normalizePeak(out, level);
  return { ...finalize(out, sr, warnings), word };
}

/* ============================================================================
 * 6. 1/f^α fractal noise — Grade A (observation; Voss & Clarke 1975/1978)
 *    FFT spectral shaping for arbitrary α; Voss–McCartney for α=1.
 * ==========================================================================*/

export interface FractalNoiseSpec {
  /** Spectral exponent α (power ∝ f^−α). 0 white, 1 pink, 2 brown. */
  alpha?: number;
  durationSec?: number;
  /** 'fft' = spectral shaping (any α); 'voss' = Voss–McCartney (α=1 only). */
  method?: 'fft' | 'voss';
  /** Voss–McCartney source count K (12–16). */
  sourcesK?: number;
  seed?: number;
  sampleRate?: number;
  level?: number;
}

export function fractalNoise(spec: FractalNoiseSpec = {}): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const alpha = spec.alpha ?? 1;
  const durationSec = Math.max(0.1, spec.durationSec ?? 4);
  const method = spec.method ?? 'fft';
  const level = spec.level ?? 0.6;
  const seed = spec.seed ?? 1234;
  const warnings: string[] = [];
  if (alpha < 0 || alpha > 3) warnings.push(`α ${alpha} outside the usual 0–2 (max 3) range`);

  const n = Math.max(2, Math.round(durationSec * sr));
  const out = new Float32Array(n);

  if (method === 'voss') {
    if (alpha !== 1) warnings.push('Voss–McCartney generates 1/f (α=1); use fft method for other α');
    // Voss–McCartney: K random sources; source j updates every 2^j steps
    // (trailing-zero count of the counter). Sum/K ≈ pink noise.
    const K = clamp(Math.round(spec.sourcesK ?? 16), 2, 24);
    const rand = mulberry32(seed);
    const values = new Float64Array(K);
    for (let j = 0; j < K; j++) values[j] = rand() * 2 - 1;
    let counter = 0;
    for (let i = 0; i < n; i++) {
      counter++;
      let j = 0;
      let c = counter;
      while ((c & 1) === 0 && j < K - 1) {
        j++;
        c >>= 1;
      }
      values[j] = rand() * 2 - 1;
      let sum = 0;
      for (let v = 0; v < K; v++) sum += values[v];
      out[i] = sum / K;
    }
  } else {
    // Spectral shaping: white noise → FFT → |X(f)| ×= f^(−α/2) → IFFT.
    const N = nextPow2(n);
    const gauss = makeGaussian(mulberry32(seed));
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < n; i++) re[i] = gauss();
    fft(re, im);
    for (let k = 0; k <= N / 2; k++) {
      const f = (k * sr) / N;
      const g = k === 0 ? 0 : Math.pow(f, -alpha / 2);
      re[k] *= g;
      im[k] *= g;
      if (k > 0 && k < N / 2) {
        re[N - k] *= g;
        im[N - k] *= g;
      }
    }
    fft(re, im, true);
    for (let i = 0; i < n; i++) out[i] = re[i];
  }
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 7. Logistic-map chaos — Grade A (dynamics)
 *    x_{n+1} = r·x_n(1−x_n). Fixed point r<3; period-doubling 3 → 3.449 →
 *    3.544…; chaos onset r ≈ 3.5699 (accumulation); r=4 fully chaotic.
 *    Control-rate iteration mapped to pitch or AM depth.
 * ==========================================================================*/

/** Chaos onset (Feigenbaum accumulation point). */
export const LOGISTIC_CHAOS_ONSET = 3.5699;

export function logisticSequence(r: number, x0: number, count: number): Float32Array {
  const out = new Float32Array(Math.max(0, count));
  let x = clamp(x0, 1e-6, 1 - 1e-6);
  for (let i = 0; i < out.length; i++) {
    x = r * x * (1 - x);
    // Guard against blow-up for r outside (0,4].
    if (!Number.isFinite(x) || x <= 0 || x >= 1) x = 0.5;
    out[i] = x;
  }
  return out;
}

export interface LogisticModSpec {
  /** r ∈ [3.4, 4]. Below 3: fixed point; 3–3.5699: period-doubling cascade. */
  r?: number;
  x0?: number; // 0.2–0.7 (not 0/1)
  durationSec?: number;
  /** Control rate in notes/s (8–24). */
  noteRate?: number;
  carrierHz?: number;
  /** pitch: x_n → ±1 octave around carrier; am: x_n → AM depth. */
  mapTo?: 'pitch' | 'am';
  sampleRate?: number;
  level?: number;
}

export function renderLogisticMod(spec: LogisticModSpec = {}): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const r = spec.r ?? 3.9;
  const x0 = spec.x0 ?? 0.4;
  const durationSec = Math.max(0.2, spec.durationSec ?? 6);
  const noteRate = spec.noteRate ?? 12;
  const carrierHz = spec.carrierHz ?? 440;
  const mapTo = spec.mapTo ?? 'pitch';
  const level = spec.level ?? 0.6;
  const warnings: string[] = [];
  if (r < 3) warnings.push(`r=${r} < 3: the map converges to a fixed point — no chaos`);
  else if (r < LOGISTIC_CHAOS_ONSET) {
    warnings.push(`r=${r} in the period-doubling cascade (chaos onset ≈ ${LOGISTIC_CHAOS_ONSET})`);
  } else if (r >= 4) warnings.push('r=4: fully chaotic (invariant density 1/(π√(x(1−x))))');
  if (r < 3.4 || r > 4) warnings.push('r outside the documented [3.4, 4.0] exploration range');
  if (x0 <= 0 || x0 >= 1) warnings.push('x0 must be in (0,1) — 0/1 are degenerate fixed points');
  if (carrierHz < 20) warnings.push(`carrier ${carrierHz} Hz is infrasonic (<20 Hz)`);

  const noteCount = Math.max(1, Math.round(durationSec * noteRate));
  const xs = logisticSequence(r, x0, noteCount + 1);
  const n = Math.max(1, Math.round(durationSec * sr));
  const out = new Float32Array(n);
  const smooth = 0.002; // 2 ms sample-and-hold smoothing (click guard)
  let phase = 0;
  let prevValue = mapTo === 'pitch' ? carrierHz * Math.pow(2, 2 * xs[0] - 1) : xs[0];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const idx = Math.min(noteCount, Math.floor(t * noteRate));
    const x = xs[idx];
    const target = mapTo === 'pitch' ? carrierHz * Math.pow(2, 2 * x - 1) : x;
    const blend = Math.min(1, (t - idx / noteRate) / smooth);
    const value = prevValue + (target - prevValue) * blend;
    if (blend >= 1) prevValue = target;
    if (mapTo === 'pitch') {
      phase += (2 * Math.PI * value) / sr;
      out[i] = Math.sin(phase);
    } else {
      out[i] = (1 - 0.9 * value) * Math.sin((2 * Math.PI * carrierHz * i) / sr);
    }
  }
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 8. Custom waveform builder — additive / FM / Chebyshev / phase distortion
 * ==========================================================================*/

export type CustomWaveSpec =
  | { type: 'additive'; f0Hz: number; harmonics: number[]; durationSec?: number; sampleRate?: number }
  | { type: 'fm'; carrierHz: number; modRatio: number; index: number; durationSec?: number; sampleRate?: number }
  | { type: 'chebyshev'; f0Hz: number; weights: number[]; index?: number; durationSec?: number; sampleRate?: number }
  | { type: 'phase-distortion'; f0Hz: number; knee: number; durationSec?: number; sampleRate?: number };

/**
 * Render one custom-waveform voice (peak-normalized to 0.6).
 *  - additive: y = Σ a_k·sin(2π·k·f0·t)   (Grade A)
 *  - fm: y = sin(2πf_c·t + I·sin(2πf_m·t)), f_m = ratio·f_c; spectrum =
 *    sidebands f_c ± k·f_m with Bessel weights J_k(I); BW ≈ 2f_m(I+1)
 *    (Chowning 1973, Grade A)
 *  - chebyshev: T_n(cos θ) = cos(nθ) → shaping Σ h_k·T_k(x) driven by
 *    index·cos yields exactly harmonic k with weight h_k (Roads/Le Brun,
 *    Grade A)
 *  - phase-distortion: Casio-CZ-style phase knee warp (Grade A− engineering)
 */
export function renderCustomWave(spec: CustomWaveSpec): Rendered {
  const sr = spec.sampleRate ?? DEFAULT_SR;
  const durationSec = Math.max(0.05, spec.durationSec ?? 2);
  const n = Math.max(1, Math.round(durationSec * sr));
  const out = new Float32Array(n);
  const warnings: string[] = [];
  // 5 ms raised-cosine edges on every custom render (click guard).
  const edgeSec = 0.005;

  if (spec.type === 'additive') {
    const f0 = spec.f0Hz;
    if (f0 < 20) warnings.push(`fundamental ${f0} Hz is infrasonic (<20 Hz)`);
    const hs = spec.harmonics;
    if (hs.length === 0 || hs.every((a) => a === 0)) warnings.push('all harmonic amplitudes are zero');
    const norm = hs.reduce((a, b) => a + Math.abs(b), 0) || 1;
    const topHz = f0 * hs.length;
    if (topHz > sr / 2) warnings.push(`harmonic ${hs.length} at ${topHz.toFixed(0)} Hz exceeds Nyquist — will alias`);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let y = 0;
      for (let k = 0; k < hs.length; k++) {
        if (hs[k] !== 0) y += hs[k] * Math.sin(2 * Math.PI * (k + 1) * f0 * t);
      }
      out[i] = y / norm;
    }
  } else if (spec.type === 'fm') {
    const fc = spec.carrierHz;
    const fm = fc * spec.modRatio;
    const I = clamp(spec.index, 0, 15);
    if (fc < 20) warnings.push(`carrier ${fc} Hz is infrasonic (<20 Hz)`);
    const bw = 2 * fm * (I + 1); // Carson-style FM bandwidth rule
    if (fc + bw / 2 > 16000) warnings.push(`FM bandwidth ≈ ${bw.toFixed(0)} Hz pushes sidebands past 16 kHz`);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] = Math.sin(2 * Math.PI * fc * t + I * Math.sin(2 * Math.PI * fm * t));
    }
  } else if (spec.type === 'chebyshev') {
    const f0 = spec.f0Hz;
    const idx = clamp(spec.index ?? 1, 0, 1);
    const w = spec.weights;
    if (f0 < 20) warnings.push(`fundamental ${f0} Hz is infrasonic (<20 Hz)`);
    const norm = w.reduce((a, b) => a + Math.abs(b), 0) || 1;
    for (let i = 0; i < n; i++) {
      const x = idx * Math.cos((2 * Math.PI * f0 * i) / sr);
      // Chebyshev recurrence T_{k+1} = 2x·T_k − T_{k−1}.
      let tPrev = 1;
      let tCur = x;
      let y = (w[0] ?? 0) * tPrev + (w[1] ?? 0) * tCur;
      for (let k = 2; k < w.length; k++) {
        const tNext = 2 * x * tCur - tPrev;
        y += w[k] * tNext;
        tPrev = tCur;
        tCur = tNext;
      }
      out[i] = y / norm;
    }
  } else {
    // phase-distortion: piecewise-linear knee D(φ); y = sin(2π·D(φ)).
    const f0 = spec.f0Hz;
    const knee = clamp(spec.knee, 0.01, 0.99);
    if (f0 < 20) warnings.push(`fundamental ${f0} Hz is infrasonic (<20 Hz)`);
    for (let i = 0; i < n; i++) {
      const phase = ((f0 * i) / sr) % 1;
      const d = phase <= knee ? (0.5 * phase) / knee : 0.5 + (0.5 * (phase - knee)) / (1 - knee);
      out[i] = Math.sin(2 * Math.PI * d);
    }
  }

  // Edge fades.
  const edgeN = Math.min(n >> 1, Math.round(edgeSec * sr));
  for (let i = 0; i < edgeN; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / edgeN);
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  normalizePeak(out, 0.6);
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 9. Simple tone + scale renderers (tuning demos, astro ladder playback)
 * ==========================================================================*/

/** Plain sine tone (for astro ladder notes and tuning demos). */
export function renderTone(hz: number, durSec = 1.5, sampleRate = DEFAULT_SR, level = 0.5): Rendered {
  const warnings: string[] = [];
  if (hz < 20) warnings.push(`tone ${hz.toFixed(2)} Hz is infrasonic (<20 Hz)`);
  if (hz > 16000) warnings.push(`tone ${hz.toFixed(0)} Hz is ultrasonic (>16 kHz)`);
  const n = Math.max(1, Math.round(durSec * sampleRate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate);
  const edgeN = Math.min(n >> 1, Math.round(0.01 * sampleRate));
  for (let i = 0; i < edgeN; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / edgeN);
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  normalizePeak(out, level);
  return finalize(out, sampleRate, warnings);
}

/** Play a list of frequencies as sequential soft-edged sine notes. */
export function renderScale(
  freqs: readonly number[],
  opts: { noteSec?: number; gapSec?: number; sampleRate?: number; level?: number } = {},
): Rendered {
  const sr = opts.sampleRate ?? DEFAULT_SR;
  const noteSec = opts.noteSec ?? 0.5;
  const gapSec = opts.gapSec ?? 0.05;
  const level = opts.level ?? 0.5;
  const warnings: string[] = [];
  const total = freqs.length * (noteSec + gapSec);
  const n = Math.max(1, Math.round(total * sr));
  const out = new Float32Array(n);
  freqs.forEach((f, idx) => {
    if (f < 20) warnings.push(`scale note ${f.toFixed(2)} Hz is infrasonic (<20 Hz)`);
    if (f > 16000) warnings.push(`scale note ${f.toFixed(0)} Hz is ultrasonic (>16 kHz)`);
    const s0 = Math.round(idx * (noteSec + gapSec) * sr);
    const sN = Math.min(n, Math.round((idx * (noteSec + gapSec) + noteSec) * sr));
    const edgeN = Math.min((sN - s0) >> 1, Math.round(0.01 * sr));
    for (let i = s0; i < sN; i++) {
      out[i] += Math.sin((2 * Math.PI * f * (i - s0)) / sr);
    }
    for (let i = 0; i < edgeN; i++) {
      const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / edgeN);
      out[s0 + i] *= g;
      out[sN - 1 - i] *= g;
    }
  });
  normalizePeak(out, level);
  return finalize(out, sr, warnings);
}

/* ============================================================================
 * 10. Tuning systems — Grade A
 * ==========================================================================*/

/** cents = 1200·log2(ratio). */
export function ratioToCents(ratio: number): number {
  if (!(ratio > 0)) return NaN;
  return 1200 * Math.log2(ratio);
}

export const centsToRatio = (cents: number): number => Math.pow(2, cents / 1200);

/** Syntonic comma 81/80 ≈ 21.51¢ (Pythagorean 23.46¢, schisma 1.95¢). */
export const SYNTONIC_COMMA_CENTS = 1200 * Math.log2(81 / 80);
export const PYTHAGOREAN_COMMA_CENTS = 1200 * Math.log2(Math.pow(3, 12) / Math.pow(2, 19));
/** Schisma = Pythagorean comma − syntonic comma ≈ 1.95¢. */
export const SCHISMA_CENTS = PYTHAGOREAN_COMMA_CENTS - SYNTONIC_COMMA_CENTS;

export interface JiInterval {
  name: string;
  /** [numerator, denominator]. */
  ratio: readonly [number, number];
  cents: number;
  tetCents: number;
  /** JI − 12-TET (negative = JI flatter than equal temperament). */
  deviationCents: number;
}

const JI_ROWS: ReadonlyArray<[string, number, number, number]> = [
  ['Unison', 1, 1, 0],
  ['Major 2nd', 9, 8, 200],
  ['Major 3rd', 5, 4, 400],
  ['Perfect 4th', 4, 3, 500],
  ['Perfect 5th', 3, 2, 700],
  ['Major 6th', 5, 3, 900],
  ['Major 7th', 15, 8, 1100],
  ['Octave', 2, 1, 1200],
];

/** JI vs 12-TET cent deviations (5-limit diatonic). */
export function jiTable(): JiInterval[] {
  return JI_ROWS.map(([name, p, q, tetCents]) => {
    const cents = ratioToCents(p / q);
    return { name, ratio: [p, q] as const, cents, tetCents, deviationCents: cents - tetCents };
  });
}

/** JI scale frequencies from a root (Hz). */
export function jiFrequencies(rootHz: number): number[] {
  return JI_ROWS.map(([, p, q]) => (rootHz * p) / q);
}

/**
 * Bohlen–Pierce: tritave 3:1 (= 1901.955¢) in 13 equal divisions;
 * step = 3^(1/13) ≈ 1.08818 = 146.304¢. Only odd harmonics are structurally
 * relevant → pair with clarinet-like (odd-harmonic) timbres (Sethares).
 */
export const BP_STEP_CENTS = 1200 * Math.log2(Math.pow(3, 1 / 13));

export function bohlenPierce(baseHz = 220): { stepRatio: number; stepCents: number; frequencies: number[] } {
  const stepRatio = Math.pow(3, 1 / 13);
  const frequencies = Array.from({ length: 14 }, (_, k) => baseHz * Math.pow(stepRatio, k));
  return { stepRatio, stepCents: BP_STEP_CENTS, frequencies };
}

/** n equal divisions of the octave (step = 1200/n cents). */
export function nEDO(n: number, refHz = 261.63): { stepCents: number; frequencies: number[] } {
  const steps = Math.max(1, Math.round(n));
  const stepCents = 1200 / steps;
  const frequencies = Array.from({ length: steps + 1 }, (_, k) => refHz * Math.pow(2, k / steps));
  return { stepCents, frequencies };
}

/* ============================================================================
 * 11. Astro-tuned sonification — Grade A arithmetic / Grade D meaning
 * ==========================================================================*/

export type PeriodConvention = 'sidereal' | 'tropical' | 'anomalistic';

/** Mandatory honesty label on every astro entry (E2 §5 / crit_r2). */
export const ASTRO_LABEL = 'astronomically derived; no evidence of special effect';

export interface AstroEntry {
  name: string;
  hz: number;
  periodDays?: number;
  periodConvention: PeriodConvention;
  gradeArithmetic: 'A';
  gradeMeaning: 'D';
  label: typeof ASTRO_LABEL;
  note?: string;
}

function astroEntry(e: Omit<AstroEntry, 'gradeArithmetic' | 'gradeMeaning' | 'label'>): AstroEntry {
  return { ...e, gradeArithmetic: 'A', gradeMeaning: 'D', label: ASTRO_LABEL };
}

/** TRAPPIST-1 measured orbital periods in days (Gillon et al. 2017, Nature). */
export const TRAPPIST_PERIODS_DAYS = [1.51, 2.42, 4.05, 6.1, 9.21, 12.35, 18.77] as const;
export const TRAPPIST_PLANETS = ['b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
/** SYSTEM Sounds anchor: planet h (18.766 d) → C3 = 130.81 Hz. */
export const TRAPPIST_ANCHOR_HZ = 130.81;

/**
 * TRAPPIST-1 resonance ladder: planet frequencies from measured orbital
 * period ratios anchored to planet h = C3 (130.81 Hz). Small deviations from
 * whole-number ratios are real astronomy — keep them audible.
 */
export function astroTuner(kind: 'trappist-1'): AstroEntry[];
/** Cosmic-Octave-style orbital octave-doubling (Cousto 1978). */
export function astroTuner(kind: 'cosmic-octave', convention?: 'sidereal' | 'tropical'): AstroEntry[];
export function astroTuner(
  kind: 'trappist-1' | 'cosmic-octave',
  convention: 'sidereal' | 'tropical' = 'tropical',
): AstroEntry[] {
  if (kind === 'trappist-1') {
    const pH = TRAPPIST_PERIODS_DAYS[TRAPPIST_PERIODS_DAYS.length - 1];
    return TRAPPIST_PERIODS_DAYS.map((p, i) =>
      astroEntry({
        name: `TRAPPIST-1${TRAPPIST_PLANETS[i]}`,
        hz: TRAPPIST_ANCHOR_HZ * (pH / p),
        periodDays: p,
        periodConvention: 'sidereal',
        note:
          i === TRAPPIST_PERIODS_DAYS.length - 1
            ? 'anchor planet h → C3 (SYSTEM Sounds 2017; ×~212 million transposition)'
            : undefined,
      }),
    );
  }
  // Cosmic octave: f_audio = 2^k / period_seconds, k chosen to land ~130–210 Hz.
  const octaveUp = (periodDays: number): number => {
    const periodSec = periodDays * 86400;
    const k = Math.round(Math.log2(150 * periodSec));
    return Math.pow(2, k) / periodSec;
  };
  const yearDays = convention === 'sidereal' ? 365.25636 : 365.24219;
  const entries: AstroEntry[] = [
    astroEntry({
      name: convention === 'sidereal' ? 'Earth year (sidereal)' : 'Earth year — "OM" (tropical)',
      hz: octaveUp(yearDays),
      periodDays: yearDays,
      periodConvention: convention,
      note: 'Cousto cosmic-octave year tone; the "OM" naming is a cultural label, not physics',
    }),
    astroEntry({
      name: 'Earth day (solar)',
      hz: octaveUp(1),
      periodDays: 1,
      periodConvention: 'tropical',
      note: 'solar day 86400 s octave-doubled ×2^24',
    }),
    astroEntry({
      name: 'Synodic month (moon phases)',
      hz: octaveUp(29.53059),
      periodDays: 29.53059,
      periodConvention: 'tropical',
      note: 'phase cycle; no evidence it modulates human hearing or mood',
    }),
    astroEntry({
      name: 'Sidereal month',
      hz: octaveUp(27.32166),
      periodDays: 27.32166,
      periodConvention: 'sidereal',
    }),
  ];
  return entries;
}

/** Convert any render to a stereo pair (duplicate mono) for the engine. */
export function toStereo(samples: Float32Array): { left: Float32Array; right: Float32Array } {
  return { left: samples, right: samples.slice() };
}
