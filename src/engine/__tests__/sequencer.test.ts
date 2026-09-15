import { describe, expect, it } from 'vitest';

import {
  buildManifest,
  fnv1a,
  NORMALIZE_PEAK,
  renderBreathTrack,
  renderSession,
  stableStringify,
} from '../sequencer';
import type { Phase, SessionSpec } from '../types';

const SR = 48000;
const TWO_PI_SAFE = Math.PI * 2;

function makePhase(overrides: Partial<Phase> = {}): Phase {
  return {
    durationSec: 2,
    carrierHz: 200,
    beatHz: 10,
    mode: 'binaural',
    gainDb: 0,
    ...overrides,
  };
}

function makeSpec(overrides: Partial<SessionSpec> = {}): SessionSpec {
  return {
    sampleRate: SR,
    phases: [makePhase()],
    ...overrides,
  };
}

function peak(buf: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > p) p = a;
  }
  return p;
}

describe('stableStringify', () => {
  it('sorts object keys recursively', () => {
    const a = stableStringify({ b: 1, a: { d: 2, c: 3 } });
    const b = stableStringify({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('preserves array order (order matters for phases)', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it('handles null and primitives', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify('x')).toBe('"x"');
    expect(stableStringify(4.5)).toBe('4.5');
  });
});

describe('fnv1a', () => {
  it('is deterministic and matches the known FNV-1a vectors', () => {
    // Reference values for 32-bit FNV-1a.
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
    expect(fnv1a('foobar')).toBe('bf9cf968');
  });

  it('differs for different inputs', () => {
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });
});

describe('buildManifest', () => {
  it('produces identical hashes for key-reordered specs', () => {
    const p1 = makePhase();
    const p2 = { ...makePhase() };
    const a = buildManifest({ sampleRate: SR, phases: [p1], name: 'x' }, SR);
    const b = buildManifest({ phases: [p2], name: 'x', sampleRate: SR }, SR);
    expect(a.hash).toBe(b.hash);
  });

  it('hash changes with sampleRate and with spec content', () => {
    const base = buildManifest(makeSpec(), SR);
    expect(buildManifest(makeSpec(), 44100).hash).not.toBe(base.hash);
    expect(buildManifest(makeSpec({ name: 'other' }), SR).hash).not.toBe(base.hash);
  });

  it('uses spec duration when no render stats are supplied', () => {
    const m = buildManifest(makeSpec({ phases: [makePhase({ durationSec: 3 })] }), SR);
    expect(m.totalDurationSec).toBe(3);
    expect(m.totalSamples).toBe(0);
  });

  it('ignores invalid phase durations in the spec-duration fallback', () => {
    const m = buildManifest(
      makeSpec({ phases: [makePhase({ durationSec: -2 }), makePhase({ durationSec: 1 })] }),
      SR,
    );
    expect(m.totalDurationSec).toBe(1);
  });
});

describe('renderSession', () => {
  it('renders an empty session to empty buffers with a warning', () => {
    const r = renderSession(makeSpec({ phases: [] }));
    expect(r.left.length).toBe(0);
    expect(r.warnings).toContain('session has no phases');
    expect(r.manifest.phaseCount).toBe(0);
  });

  it('renders a single phase at full length', () => {
    const r = renderSession(makeSpec({ phases: [makePhase({ durationSec: 1 })] }));
    expect(r.left.length).toBe(SR);
    expect(r.manifest.totalSamples).toBe(SR);
    expect(r.manifest.totalDurationSec).toBeCloseTo(1, 10);
  });

  it('crossfade shortens total duration by the overlap', () => {
    const r = renderSession(
      makeSpec({ phases: [makePhase(), makePhase()], crossfadeSec: 0.5 }),
    );
    expect(r.left.length).toBe(2 * 2 * SR - 0.5 * SR);
  });

  it('clamps crossfade to half the shorter phase', () => {
    const r = renderSession(
      makeSpec({
        phases: [makePhase({ durationSec: 0.2 }), makePhase({ durationSec: 3 })],
        crossfadeSec: 10,
      }),
    );
    // Max crossfade = half the 0.2 s phase = 0.1 s.
    expect(r.left.length).toBe(Math.round((0.2 + 3) * SR) - Math.round(0.1 * SR));
  });

  it('zero crossfade concatenates phases exactly', () => {
    const r = renderSession(
      makeSpec({ phases: [makePhase(), makePhase()], crossfadeSec: 0 }),
    );
    expect(r.left.length).toBe(2 * 2 * SR);
  });

  it('never exceeds the normalization ceiling, even with hot layers', () => {
    const r = renderSession(
      makeSpec({
        masterGainDb: 12,
        phases: [
          makePhase({ noise: { color: 'white', level: 1 }, gainDb: 6 }),
          makePhase({ mode: 'monaural', gainDb: 6 }),
        ],
        crossfadeSec: 1,
      }),
    );
    expect(peak(r.left)).toBeLessThanOrEqual(NORMALIZE_PEAK + 1e-6);
    expect(peak(r.right)).toBeLessThanOrEqual(NORMALIZE_PEAK + 1e-6);
    expect(r.manifest.peak).toBeLessThanOrEqual(NORMALIZE_PEAK + 1e-6);
  });

  it('does not boost quiet material during normalization', () => {
    const quiet = renderSession(makeSpec({ phases: [makePhase({ gainDb: -40 })] }));
    // Peak of a -40 dB sine is 0.01 — must not be normalized up to 0.95.
    expect(peak(quiet.left)).toBeCloseTo(0.01, 3);
  });

  it('is deterministic for identical specs (bit-identical audio and hash)', () => {
    const spec = makeSpec({
      seed: 42,
      phases: [
        makePhase({ noise: { color: 'pink', level: 0.5 } }),
        makePhase({ mode: 'isochronic', bowl: { baseHz: 136, level: 0.6 } }),
      ],
    });
    const a = renderSession(spec);
    const b = renderSession(spec);
    expect(a.left).toEqual(b.left);
    expect(a.right).toEqual(b.right);
    expect(a.manifest.hash).toBe(b.manifest.hash);
  });

  it('different seeds change stochastic layers and the hash (seed is in spec)', () => {
    const spec = makeSpec({
      phases: [makePhase({ noise: { color: 'white', level: 0.5 } })],
    });
    const a = renderSession({ ...spec, seed: 1 });
    const b = renderSession({ ...spec, seed: 2 });
    expect(a.left).not.toEqual(b.left);
    // seed is part of the spec, so hashes differ too.
    expect(a.manifest.hash).not.toBe(b.manifest.hash);
  });

  it('phase-continuous carriers produce no boundary click', () => {
    // Same carrier/beat across the boundary: joined render must look like one
    // continuous sine (max sample-to-sample step bounded by the slew rate).
    const r = renderSession(
      makeSpec({
        crossfadeSec: 0,
        phases: [
          makePhase({ durationSec: 0.5, carrierHz: 200, beatHz: 10 }),
          makePhase({ durationSec: 0.5, carrierHz: 200, beatHz: 10 }),
        ],
      }),
    );
    const maxStep = (TWO_PI_SAFE * 210) / SR * 1.5;
    let worst = 0;
    for (let i = 1; i < r.left.length; i++) {
      worst = Math.max(worst, Math.abs(r.left[i] - r.left[i - 1]));
    }
    expect(worst).toBeLessThan(maxStep);
  });

  it('silences output and warns if non-finite samples slip through', () => {
    const r = renderSession(
      makeSpec({ phases: [makePhase({ gainDb: Number.NaN })] }),
    );
    // gainDb NaN → phase rendered as silence by synth guardrails, no crash.
    expect(peak(r.left)).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(Number.isFinite(r.manifest.peak)).toBe(true);
  });

  it('overlays breath cues at the cycle boundaries', () => {
    const breath = { inhaleSec: 1, holdSec: 1, exhaleSec: 1, level: 0.5 };
    const track = renderBreathTrack(breath, 6 * SR, SR);
    // Inhale sweep occupies the first second; the post-exhale segment of the
    // cycle has no hold configured so the cycle is 3 s: sample at 4.5 s is in
    // the second cycle's exhale. Both regions must contain cue energy.
    const region = (from: number, to: number): number => {
      let sum = 0;
      for (let i = Math.floor(from * SR); i < Math.floor(to * SR); i++) sum += Math.abs(track[i]);
      return sum;
    };
    expect(region(0.3, 0.7)).toBeGreaterThan(0);
    expect(region(4.3, 4.7)).toBeGreaterThan(0);
  });

  it('breath track handles degenerate cycle lengths safely', () => {
    const zero = renderBreathTrack({ inhaleSec: 0, holdSec: 0, exhaleSec: 0 }, 1000, SR);
    expect(peak(zero)).toBe(0);
    const neg = renderBreathTrack({ inhaleSec: -1, holdSec: -1, exhaleSec: -1 }, 1000, SR);
    expect(peak(neg)).toBe(0);
  });

  it('breath cues survive crossfades (added post-mix)', () => {
    const withBreath = renderSession(
      makeSpec({
        phases: [makePhase(), makePhase()],
        crossfadeSec: 2,
        breath: { inhaleSec: 0.5, holdSec: 0, exhaleSec: 0.5, level: 0.4 },
      }),
    );
    const without = renderSession(
      makeSpec({ phases: [makePhase(), makePhase()], crossfadeSec: 2 }),
    );
    expect(withBreath.left.length).toBe(without.left.length);
    expect(withBreath.left).not.toEqual(without.left);
  });

  it('manifest captures phase count, warnings, and peak', () => {
    const r = renderSession(
      makeSpec({
        name: 'demo',
        phases: [makePhase(), makePhase({ beatHz: 45 })],
      }),
    );
    expect(r.manifest.version).toBe(1);
    expect(r.manifest.name).toBe('demo');
    expect(r.manifest.phaseCount).toBe(2);
    expect(r.manifest.warnings.some((w) => w.includes('30 Hz'))).toBe(true);
    expect(r.manifest.peak).toBeGreaterThan(0);
  });
});
