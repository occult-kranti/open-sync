/**
 * Open Sync engine — pure DSP synthesizers.
 *
 * Every function in this module is pure: Float32Array in/out, explicit
 * sample-rate parameter, seeded PRNG for all stochastic content, and no
 * Web Audio / DOM references, so it runs identically in node (tests) and the
 * browser. All psychoacoustic guardrails are reported via `warnings` rather
 * than thrown, so a bad spec degrades to silence instead of crashing.
 */

import type {
  BowlSpec,
  NatureKind,
  NoiseColor,
  Phase,
  PhaseOffsets,
  RenderResult,
} from './types';

export const TWO_PI = Math.PI * 2;

/** Default PRNG seed used when a spec does not supply one. */
export const DEFAULT_SEED = 0x1a2b3c4d;

/** Convert dB to linear amplitude. */
export function dbToLin(db: number): number {
  return Math.pow(10, db / 20);
}

/** Convert linear amplitude to dB (floor at -300 dB). */
export function linToDb(lin: number): number {
  return 20 * Math.log10(Math.max(lin, 1e-15));
}

/** mulberry32: tiny deterministic PRNG, returns values in [0, 1). */
export function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample from a uniform PRNG (Box–Muller, cached pair). */
export function createGaussian(prng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = prng() * 2 - 1;
      v = prng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * m;
    return u * m;
  };
}

function isFiniteNumber(x: number): boolean {
  return typeof x === 'number' && Number.isFinite(x);
}

/**
 * Guardrail checks shared by all tone renderers.
 * - Binaural beats are not psychoacoustically perceivable above ~30 Hz, and
 *   the beat percept weakens sharply for carriers above ~1000 Hz.
 * - Any non-finite input renders silence plus a warning (NaN guard).
 */
export function checkPhaseGuardrails(phase: Phase, sampleRate: number): string[] {
  const warnings: string[] = [];
  const { carrierHz, beatHz, mode, durationSec, gainDb } = phase;
  if (!isFiniteNumber(durationSec) || durationSec < 0) {
    warnings.push(`phase durationSec=${String(durationSec)} is invalid; rendered as silence`);
  }
  if (!isFiniteNumber(carrierHz) || !isFiniteNumber(beatHz) || !isFiniteNumber(gainDb)) {
    warnings.push('phase contains NaN/Infinity parameter; rendered as silence');
    return warnings;
  }
  if (carrierHz < 0 || beatHz < 0) {
    warnings.push(`negative frequency (carrier=${carrierHz}, beat=${beatHz}); rendered as silence`);
    return warnings;
  }
  if (mode === 'binaural') {
    if (carrierHz > 1000) {
      warnings.push(
        `binaural carrier ${carrierHz} Hz > 1000 Hz: beat perception is weak above ~1 kHz`,
      );
    }
    if (beatHz > 30) {
      warnings.push(
        `binaural beat ${beatHz} Hz > 30 Hz: not psychoacoustically perceivable as a beat`,
      );
    }
  }
  const highest = mode === 'binaural' ? carrierHz + beatHz : carrierHz;
  if (highest > sampleRate / 2) {
    warnings.push(`frequency ${highest} Hz exceeds Nyquist (${sampleRate / 2} Hz)`);
  }
  return warnings;
}

/** True when a phase's numeric parameters are safe to render. */
function phaseIsRenderable(phase: Phase): boolean {
  return (
    isFiniteNumber(phase.durationSec) &&
    phase.durationSec >= 0 &&
    isFiniteNumber(phase.carrierHz) &&
    phase.carrierHz >= 0 &&
    isFiniteNumber(phase.beatHz) &&
    phase.beatHz >= 0 &&
    isFiniteNumber(phase.gainDb)
  );
}

function sampleCount(durationSec: number, sampleRate: number): number {
  if (!isFiniteNumber(durationSec) || durationSec <= 0) return 0;
  return Math.round(durationSec * sampleRate);
}

function emptyResult(warnings: string[]): RenderResult {
  return { left: new Float32Array(0), right: new Float32Array(0), warnings };
}

function silenceResult(n: number, warnings: string[]): RenderResult {
  return { left: new Float32Array(n), right: new Float32Array(n), warnings };
}

/** Normalize a buffer to the target RMS (no-op for silence). */
export function normalizeRms(buf: Float32Array, targetRms: number): Float32Array {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / Math.max(1, buf.length));
  if (rms > 1e-12) {
    const g = targetRms / rms;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }
  return buf;
}

/** Wrap an accumulated phase into [0, 2π) to bound float error. */
function wrapPhase(p: number): number {
  if (p >= TWO_PI || p < 0) return p % TWO_PI + (p < 0 ? TWO_PI : 0);
  return p;
}

/**
 * Binaural beat: left = sin(carrier), right = sin(carrier + beat).
 * The caller passes `offsets` so carriers stay phase-continuous across
 * phases; the returned `offsets` continue where this buffer ended.
 */
export function renderBinaural(
  phase: Phase,
  sampleRate: number,
  offsets: PhaseOffsets = { left: 0, right: 0, beat: 0 },
): RenderResult & { offsets: PhaseOffsets } {
  const warnings = checkPhaseGuardrails(phase, sampleRate);
  const n = sampleCount(phase.durationSec, sampleRate);
  if (n === 0) return { ...emptyResult(warnings), offsets };
  if (!phaseIsRenderable(phase)) return { ...silenceResult(n, warnings), offsets };

  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const incL = (TWO_PI * phase.carrierHz) / sampleRate;
  const incR = (TWO_PI * (phase.carrierHz + phase.beatHz)) / sampleRate;
  let phL = offsets.left;
  let phR = offsets.right;
  for (let i = 0; i < n; i++) {
    left[i] = Math.sin(phL);
    right[i] = Math.sin(phR);
    phL = wrapPhase(phL + incL);
    phR = wrapPhase(phR + incR);
  }
  return { left, right, warnings, offsets: { left: phL, right: phR, beat: offsets.beat } };
}

/**
 * Monaural beat: identical full-depth AM carrier on both channels.
 * Envelope = 0.5 + 0.5·sin(2π·beat·t), i.e. 100% modulation depth.
 */
export function renderMonaural(
  phase: Phase,
  sampleRate: number,
  offsets: PhaseOffsets = { left: 0, right: 0, beat: 0 },
): RenderResult & { offsets: PhaseOffsets } {
  const warnings = checkPhaseGuardrails(phase, sampleRate);
  const n = sampleCount(phase.durationSec, sampleRate);
  if (n === 0) return { ...emptyResult(warnings), offsets };
  if (!phaseIsRenderable(phase)) return { ...silenceResult(n, warnings), offsets };

  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const incC = (TWO_PI * phase.carrierHz) / sampleRate;
  const incB = (TWO_PI * phase.beatHz) / sampleRate;
  let phC = offsets.left;
  let phB = offsets.beat;
  for (let i = 0; i < n; i++) {
    const env = 0.5 + 0.5 * Math.sin(phB);
    const s = Math.sin(phC) * env;
    left[i] = s;
    right[i] = s;
    phC = wrapPhase(phC + incC);
    phB = wrapPhase(phB + incB);
  }
  return { left, right, warnings, offsets: { left: phC, right: phC, beat: phB } };
}

/**
 * Raised-cosine isochronic gate. Half-amplitude crossings land exactly at
 * phase 0 and `duty`, so the measured above-half-max duty cycle equals
 * `duty`. `edge` is the 0→1 transition width as a fraction of the cycle.
 */
export function isochronicGate(cyclePhase: number, duty = 0.5, edge = 0.1): number {
  const d = Math.min(Math.max(duty, 0.01), 0.99);
  const r = Math.min(edge, d, 1 - d);
  const rc = (x: number): number => {
    const c = Math.min(Math.max(x, 0), 1);
    return 0.5 * (1 - Math.cos(Math.PI * c));
  };
  // Shift phase so the rising edge is centered on 0 (wraps near ph = 1).
  const p = cyclePhase >= 1 - r / 2 ? cyclePhase - 1 : cyclePhase;
  const rise = rc((p + r / 2) / r);
  const fall = rc((d - p + r / 2) / r);
  return Math.min(rise, fall);
}

/** Isochronic tone: carrier gated by a raised-cosine pulse train at beat Hz. */
export function renderIsochronic(
  phase: Phase,
  sampleRate: number,
  offsets: PhaseOffsets = { left: 0, right: 0, beat: 0 },
  duty = 0.5,
): RenderResult & { offsets: PhaseOffsets } {
  const warnings = checkPhaseGuardrails(phase, sampleRate);
  const n = sampleCount(phase.durationSec, sampleRate);
  if (n === 0) return { ...emptyResult(warnings), offsets };
  if (!phaseIsRenderable(phase)) return { ...silenceResult(n, warnings), offsets };

  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const incC = (TWO_PI * phase.carrierHz) / sampleRate;
  const incB = (TWO_PI * phase.beatHz) / sampleRate;
  let phC = offsets.left;
  let phB = offsets.beat;
  for (let i = 0; i < n; i++) {
    const gate = isochronicGate(phB / TWO_PI, duty);
    const s = Math.sin(phC) * gate;
    left[i] = s;
    right[i] = s;
    phC = wrapPhase(phC + incC);
    phB = wrapPhase(phB + incB);
  }
  return { left, right, warnings, offsets: { left: phC, right: phC, beat: phB } };
}

/**
 * Colored noise with verified spectral slope (see __tests__):
 * - white:  flat
 * - pink:   ~1/f  (−3 dB/oct), Paul Kellet 3-pole approximation
 * - brown:  ~1/f² (−6 dB/oct), leaky integrator
 * - blue:   +3 dB/oct, first difference of pink
 * - violet: +6 dB/oct, first difference of white
 * - grey:   psychoacoustic approximation — white noise spectrally shaped by
 *           the IEC A-weighting magnitude (a standard approximation of the
 *           inverse equal-loudness contour that defines true grey noise).
 * Output is normalized to unit RMS; multiply by the desired level.
 */
export function renderNoise(
  color: NoiseColor,
  durationSec: number,
  sampleRate: number,
  seed: number = DEFAULT_SEED,
): Float32Array {
  const n = sampleCount(durationSec, sampleRate);
  if (n === 0) return new Float32Array(0);
  const gauss = createGaussian(createPrng(seed ^ 0x9e3779b9));
  const out = new Float32Array(n);

  if (color === 'grey') {
    // Frequency-domain A-weighting shaping of white noise.
    for (let i = 0; i < n; i++) out[i] = gauss();
    applySpectralShaping(out, sampleRate, aWeightMagnitude);
    return normalizeRms(out, 1);
  }

  // One pass of Paul Kellet pink runs alongside white so blue can derive from
  // pink without a second PRNG stream (keeps every color deterministic).
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let brown = 0;
  let prevPink = 0;
  let prevWhite = 0;
  for (let i = 0; i < n; i++) {
    const w = gauss();
    // Paul Kellet pink-noise filter (accurate ±0.3 dB from ~9 Hz to Nyquist).
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    const pink = b0 + b1 + b2 + w * 0.1848;
    brown = (1 - 1e-4) * brown + 0.02 * w;
    switch (color) {
      case 'white':
        out[i] = w;
        break;
      case 'pink':
        out[i] = pink;
        break;
      case 'brown':
        out[i] = brown;
        break;
      case 'blue':
        out[i] = pink - prevPink;
        break;
      case 'violet':
        out[i] = w - prevWhite;
        break;
    }
    prevPink = pink;
    prevWhite = w;
  }
  return normalizeRms(out, 1);
}

/** IEC 61672 A-weighting magnitude, normalized to 0 dB at 1 kHz. */
export function aWeightMagnitude(freqHz: number): number {
  if (freqHz <= 0) return 0;
  const f2 = freqHz * freqHz;
  const ra =
    (12200 * 12200 * f2 * f2) /
    ((f2 + 20.6 * 20.6) *
      (f2 + 12200 * 12200) *
      Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)));
  // Normalize so that aWeightMagnitude(1000) === 1.
  return ra / 0.794346395802295;
}

/** In-place radix-2 FFT (length must be a power of two). */
export function fftInPlace(re: Float32Array, im: Float32Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 1 : -1) * TWO_PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curR = 1;
      let curI = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * curR - im[i + k + len / 2] * curI;
        const vi = re[i + k + len / 2] * curI + im[i + k + len / 2] * curR;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const nextR = curR * wr - curI * wi;
        curI = curR * wi + curI * wr;
        curR = nextR;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/**
 * Zero-phase spectral shaping: rFFT → multiply by `magnitude(freqHz)` →
 * irFFT. Used for grey noise. Buffer is padded to a power of two internally.
 */
function applySpectralShaping(
  buf: Float32Array,
  sampleRate: number,
  magnitude: (freqHz: number) => number,
): void {
  let size = 1;
  while (size < buf.length) size <<= 1;
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  re.set(buf);
  fftInPlace(re, im, false);
  for (let k = 0; k <= size / 2; k++) {
    const g = magnitude((k * sampleRate) / size);
    re[k] *= g;
    im[k] *= g;
    if (k > 0 && k < size / 2) {
      re[size - k] *= g;
      im[size - k] *= g;
    }
  }
  fftInPlace(re, im, true);
  buf.set(re.subarray(0, buf.length));
}

/**
 * Singing bowl: inharmonic partials (default ratios [1, 2.76, 5.4]) with
 * exponential amplitude decay, subtle slow FM shimmer (~1 Hz, ±0.2%), and
 * re-striking every `restrikeSec`. Deterministic given `seed`.
 */
export function renderBowl(
  spec: BowlSpec,
  durationSec: number,
  sampleRate: number,
  seed: number = DEFAULT_SEED,
): Float32Array {
  const n = sampleCount(durationSec, sampleRate);
  if (n === 0 || !isFiniteNumber(spec.baseHz) || spec.baseHz <= 0) {
    return new Float32Array(n);
  }
  const ratios = spec.partials && spec.partials.length > 0 ? spec.partials : [1, 2.76, 5.4];
  const decay = Math.max(0.05, spec.decaySec ?? 6);
  const restrike = Math.max(0.1, spec.restrikeSec ?? durationSec);
  const restrikeSamples = Math.max(1, Math.round(restrike * sampleRate));
  const prng = createPrng(seed ^ 0x85ebca6b);
  // Per-partial stable detune/phase so strikes don't click identically.
  const phase0 = ratios.map(() => prng() * TWO_PI);
  const amps = ratios.map((_, i) => 1 / (1 + 1.2 * i));
  const out = new Float32Array(n);
  const fmDepth = 0.002;
  const fmHz = 1.1;
  for (let i = 0; i < n; i++) {
    const strikePos = i % restrikeSamples;
    const t = strikePos / sampleRate;
    const tGlobal = i / sampleRate;
    const fm = 1 + fmDepth * Math.sin(TWO_PI * fmHz * tGlobal);
    let s = 0;
    for (let p = 0; p < ratios.length; p++) {
      const tau = decay / (1 + 0.6 * p);
      const env = Math.exp(-t / tau);
      s += amps[p] * env * Math.sin(TWO_PI * ratios[p] * spec.baseHz * fm * t + phase0[p]);
    }
    out[i] = s;
  }
  return normalizeRms(out, 1);
}

/** One-pole lowpass helper (returns filter function). */
function onePoleLp(cutoffHz: number, sampleRate: number): (x: number) => number {
  const a = 1 - Math.exp(-TWO_PI * Math.min(cutoffHz, sampleRate / 2) / sampleRate);
  let y = 0;
  return (x: number) => {
    y += a * (x - y);
    return y;
  };
}

/** One-pole highpass helper. */
function onePoleHp(cutoffHz: number, sampleRate: number): (x: number) => number {
  const lp = onePoleLp(cutoffHz, sampleRate);
  return (x: number) => x - lp(x);
}

/**
 * Procedural nature textures. All are filtered/modulated noise driven by the
 * seeded PRNG, so output is deterministic:
 * - rain:    band-shaped white noise (HP 400 Hz → LP 6 kHz) with slow drizzle
 *            amplitude wander.
 * - ocean:   pink-ish noise with a slow (~0.09 Hz) swell LFO on amplitude and
 *            a swept lowpass for breaking-wave feel.
 * - stream:  highpassed noise with fast random babble amplitude ripple.
 * - fire:    brown noise bed plus sparse random crackle impulses.
 * - thunder: deep lowpassed brown noise with slow random rumble swells.
 */
export function renderNature(
  kind: NatureKind,
  durationSec: number,
  sampleRate: number,
  seed: number = DEFAULT_SEED,
): Float32Array {
  const n = sampleCount(durationSec, sampleRate);
  if (n === 0) return new Float32Array(0);
  const gauss = createGaussian(createPrng(seed ^ 0xc2b2ae35));
  const prng = createPrng(seed ^ 0x27d4eb2f);
  const out = new Float32Array(n);

  switch (kind) {
    case 'rain': {
      const hp = onePoleHp(400, sampleRate);
      const lp = onePoleLp(6000, sampleRate);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const wander = 0.75 + 0.25 * Math.sin(TWO_PI * 0.05 * t + 1.3);
        out[i] = lp(hp(gauss())) * wander;
      }
      break;
    }
    case 'ocean': {
      let pinkState = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const swell = 0.5 + 0.5 * Math.sin(TWO_PI * 0.09 * t);
        const cutoff = 400 + 1200 * swell * swell;
        // Cheap swept LP: blend static poles (avoids zipper noise).
        pinkState = 0.995 * pinkState + 0.05 * gauss();
        const lp = Math.exp(-TWO_PI * cutoff / sampleRate);
        const shaped = pinkState * (1 - lp) + gauss() * 0.08;
        out[i] = shaped * (0.25 + 0.75 * swell * swell);
      }
      break;
    }
    case 'stream': {
      const hp = onePoleHp(900, sampleRate);
      const lp = onePoleLp(7000, sampleRate);
      let ripple = 0.8;
      for (let i = 0; i < n; i++) {
        ripple = 0.98 * ripple + 0.02 * (0.5 + prng());
        out[i] = lp(hp(gauss())) * ripple;
      }
      break;
    }
    case 'fire': {
      let bed = 0;
      let crackle = 0;
      for (let i = 0; i < n; i++) {
        bed = 0.999 * bed + 0.03 * gauss();
        crackle *= 0.82;
        if (prng() < 0.004) crackle = (prng() * 2 - 1) * 1.4;
        out[i] = bed * 2.2 + crackle;
      }
      break;
    }
    case 'thunder': {
      const lp = onePoleLp(160, sampleRate);
      let rumbleGain = 0.3;
      let bed = 0;
      for (let i = 0; i < n; i++) {
        bed = 0.9995 * bed + 0.02 * gauss();
        rumbleGain = 0.99997 * rumbleGain + 0.00003 * (prng() < 0.02 ? 1.6 : 0.35);
        out[i] = lp(bed) * rumbleGain * 6;
      }
      break;
    }
  }
  return normalizeRms(out, 1);
}

/**
 * Render a complete phase: tone mode + optional noise / bowl / nature layers,
 * with phase gain applied. Layer buffers are identically mixed into both
 * channels (decorrelated stereo noise is a future enhancement).
 */
export function renderPhase(
  phase: Phase,
  sampleRate: number,
  offsets: PhaseOffsets = { left: 0, right: 0, beat: 0 },
  seed: number = DEFAULT_SEED,
): RenderResult & { offsets: PhaseOffsets } {
  let tone: RenderResult & { offsets: PhaseOffsets };
  switch (phase.mode) {
    case 'binaural':
      tone = renderBinaural(phase, sampleRate, offsets);
      break;
    case 'monaural':
      tone = renderMonaural(phase, sampleRate, offsets);
      break;
    case 'isochronic':
      tone = renderIsochronic(phase, sampleRate, offsets);
      break;
  }
  const n = tone.left.length;
  const warnings = [...tone.warnings];
  const gain = phaseIsRenderable(phase) ? dbToLin(phase.gainDb) : 0;

  for (let i = 0; i < n; i++) {
    tone.left[i] *= gain;
    tone.right[i] *= gain;
  }

  if (phase.noise && phase.noise.level > 0 && isFiniteNumber(phase.noise.level)) {
    const buf = renderNoise(phase.noise.color, phase.durationSec, sampleRate, seed);
    const g = 0.25 * phase.noise.level * gain;
    for (let i = 0; i < n; i++) {
      tone.left[i] += buf[i] * g;
      tone.right[i] += buf[i] * g;
    }
  }
  if (phase.bowl && phase.bowl.level > 0 && isFiniteNumber(phase.bowl.level)) {
    const buf = renderBowl(phase.bowl, phase.durationSec, sampleRate, seed);
    const g = 0.2 * phase.bowl.level * gain;
    for (let i = 0; i < n; i++) {
      tone.left[i] += buf[i] * g;
      tone.right[i] += buf[i] * g;
    }
  }
  if (phase.nature && phase.nature.level > 0 && isFiniteNumber(phase.nature.level)) {
    const buf = renderNature(phase.nature.kind, phase.durationSec, sampleRate, seed);
    const g = 0.25 * phase.nature.level * gain;
    for (let i = 0; i < n; i++) {
      tone.left[i] += buf[i] * g;
      tone.right[i] += buf[i] * g;
    }
  }
  return { left: tone.left, right: tone.right, warnings, offsets: tone.offsets };
}
