import { describe, expect, it } from 'vitest';
import {
  DREAM_PROTOCOLS,
  REALITY_CHECK,
  TLR_CUE,
  dreamProtocolsByTier,
  type DreamProtocol,
} from '../protocols';
import { cueRms, renderTlrCue } from '../cue';

/** All user-facing strings on a card (claim-lint surface). */
function userFacingStrings(p: DreamProtocol): string[] {
  return [
    p.name,
    p.tagline,
    p.description,
    ...(p.expected ? [p.expected] : []),
    ...p.steps,
    ...(p.whyWeDont ? [p.whyWeDont] : []),
    ...p.safetyNotes,
    ...p.citations.flatMap((c) => [c.verdict, c.summary, c.source]),
  ];
}

// Phrases that must never appear as capability claims. "Mnemonic Induction of
// Lucid Dreams" is a proper noun (the technique's published name) and is
// whitelisted; "subliminal" is allowed only in explicit negations.
const PROPER_NOUN_WHITELIST = /Mnemonic Induction of Lucid Dreams/g;

describe('dream protocol data integrity', () => {
  it('every protocol has grade, citation, safety class and a tier', () => {
    for (const p of DREAM_PROTOCOLS) {
      expect(['A', 'B', 'C', 'D'], p.id).toContain(p.grade);
      expect(p.citations.length, p.id).toBeGreaterThan(0);
      for (const c of p.citations) {
        expect(c.verdict.length, p.id).toBeGreaterThan(0);
        expect(c.source.length, p.id).toBeGreaterThan(0);
      }
      expect(['adult', 'experimental'], p.id).toContain(p.safetyClass);
      expect([1, 2, 3], p.id).toContain(p.tier);
      expect(p.tagline.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it('covers the mandated card set', () => {
    const ids = DREAM_PROTOCOLS.map((p) => p.id);
    for (const id of [
      'dream-mild',
      'dream-wbtb',
      'dream-ssild',
      'dream-reality-testing',
      'dream-tlr',
      'dream-incubation',
      'dream-nightmare-rescripting',
      'dream-sleep-paralysis',
      'dream-tacs-40hz',
      'dream-astral-cultural',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('tier 3 cards all carry a why-we-don’t explanation and grade D', () => {
    for (const p of dreamProtocolsByTier(3)) {
      expect(p.whyWeDont?.length, p.id).toBeGreaterThan(0);
      expect(p.grade, p.id).toBe('D');
    }
  });

  it('40 Hz tACS card cites the null replication and invalid criterion', () => {
    const t = DREAM_PROTOCOLS.find((p) => p.id === 'dream-tacs-40hz')!;
    const all = userFacingStrings(t).join(' ');
    expect(all).toMatch(/Blanchette-Carrière/);
    expect(all).toMatch(/invalid/i);
    expect(all).toMatch(/Voss/);
  });

  it('astral content is cultural/historical only and graded D', () => {
    const a = DREAM_PROTOCOLS.find((p) => p.id === 'dream-astral-cultural')!;
    expect(a.culturalOnly).toBe(true);
    expect(a.grade).toBe('D');
    expect(a.tier).toBe(3);
  });
});

describe('banned-claim lint over dream module strings', () => {
  const all = DREAM_PROTOCOLS.flatMap((p) =>
    userFacingStrings(p).map((s) => ({ id: p.id, s })),
  );

  it('never claims to induce lucid dreams', () => {
    for (const { id, s } of all) {
      const stripped = s.replace(PROPER_NOUN_WHITELIST, '');
      expect(/\binduc\w*\s+(lucid|a lucid)/i.test(stripped), `${id}: ${s}`).toBe(false);
    }
  });

  it('uses "supports the practice of" discipline on tier-1/2 capability taglines', () => {
    for (const p of DREAM_PROTOCOLS.filter((x) => x.tier < 3 && x.steps.length > 0)) {
      const blob = `${p.tagline} ${p.description}`;
      expect(
        /supports the practice of|habit|foundation|amplifier|pre-education|mastery|steers|biases|optional advanced track/i.test(blob),
        p.id,
      ).toBe(true);
    }
  });

  it('no guarantee/promise language', () => {
    for (const { id, s } of all) {
      expect(/guarantee/i.test(s), `${id}: ${s}`).toBe(false);
      expect(/proven to induce/i.test(s), `${id}: ${s}`).toBe(false);
    }
  });

  it('"subliminal" appears only in explicit negations', () => {
    for (const { id, s } of all) {
      if (/subliminal/i.test(s)) {
        expect(/(never|no)\b[^.]*subliminal|subliminal[^.]*\b(never|no)\b/i.test(s), `${id}: ${s}`).toBe(true);
      }
    }
  });

  it('"astral" appears only with cultural/historical/folklore framing', () => {
    for (const { id, s } of all) {
      if (/astral/i.test(s)) {
        expect(/cultural|historical|folklore|never/i.test(s), `${id}: ${s}`).toBe(true);
      }
    }
  });
});

describe('TLR cue canon', () => {
  it('matches the validated parameters', () => {
    expect(TLR_CUE.freqsHz).toEqual([400, 600, 800]);
    expect(TLR_CUE.durationMs).toBe(650);
    expect(TLR_CUE.levelSplDb.max).toBeLessThanOrEqual(45);
    expect(TLR_CUE.replayAfterOnsetMin).toBe(360);
    expect(TLR_CUE.interCueGapSec.min).toBeGreaterThanOrEqual(60);
  });

  it('renders a deterministic 650 ms stereo cue below full scale', () => {
    const a = renderTlrCue(48000);
    const b = renderTlrCue(48000);
    expect(a.left.length).toBe(Math.round(0.65 * 48000));
    expect(a.left.length).toBe(a.right.length);
    expect(Array.from(a.left)).toEqual(Array.from(b.left));
    let peak = 0;
    for (const v of a.left) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(cueRms(a)).toBeGreaterThan(0.05); // actually audible content
  });

  it('is ascending: the three segments differ in dominant period', () => {
    const c = renderTlrCue(48000);
    const n = c.left.length;
    const seg = Math.floor(n / 3);
    // Count zero crossings per segment — higher frequency → more crossings.
    const crossings = (from: number, to: number) => {
      let z = 0;
      for (let i = from + 1; i < to; i++) if (c.left[i - 1] <= 0 && c.left[i] > 0) z++;
      return z;
    };
    const z1 = crossings(0, seg);
    const z2 = crossings(seg, seg * 2);
    const z3 = crossings(seg * 2, n);
    expect(z2).toBeGreaterThan(z1);
    expect(z3).toBeGreaterThan(z2);
    // ~400/600/800 Hz over ~217 ms → ~87/130/173 cycles (±10%)
    expect(z1).toBeGreaterThan(78);
    expect(z1).toBeLessThan(96);
    expect(z3).toBeGreaterThan(155);
    expect(z3).toBeLessThan(191);
  });
});

describe('reality-check canon', () => {
  it('requires ≥5 checks/day and ships the three validated check types', () => {
    expect(REALITY_CHECK.minChecksPerDay).toBeGreaterThanOrEqual(5);
    expect(REALITY_CHECK.checks.map((c) => c.id)).toEqual(['nose-pinch', 'text-reread', 'finger-count']);
  });
});
