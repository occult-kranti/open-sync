/**
 * Quick Lab protocol data — schema, domain-limit, and claim-lint audits.
 */

import { describe, expect, it } from 'vitest';
import type { Phase } from '@/engine';
import { PROTOCOL_CITATIONS, PROTOCOLS } from '../protocols';

/** Banned overclaim phrases (feature-docs-dual-register SKILL / Advisor S12.2). */
const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];

function protocolStrings(): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  for (const p of PROTOCOLS) {
    out.push({ label: `${p.id}.title`, text: p.title });
    out.push({ label: `${p.id}.question`, text: p.question });
    out.push({ label: `${p.id}.mundaneModel`, text: p.mundaneModel });
    out.push({ label: `${p.id}.powerNote`, text: p.powerNote });
    out.push({ label: `${p.id}.priorityNote`, text: p.priorityNote });
    p.screening.forEach((s, i) => out.push({ label: `${p.id}.screening[${i}]`, text: s.prompt }));
    p.outcomeScales.forEach((s) =>
      out.push(
        { label: `${p.id}.scale.${s.id}.label`, text: s.label },
        { label: `${p.id}.scale.${s.id}.low`, text: s.lowAnchor },
        { label: `${p.id}.scale.${s.id}.high`, text: s.highAnchor },
      ),
    );
    // Sealed strings are post-completion user-facing — lint them too.
    p.arms.forEach((a) =>
      out.push(
        { label: `${p.id}.arm.${a.id}.description`, text: a.description },
        { label: `${p.id}.arm.${a.id}.constructionNote`, text: a.constructionNote },
      ),
    );
  }
  for (const [pid, cites] of Object.entries(PROTOCOL_CITATIONS)) {
    cites.forEach((c, i) => out.push({ label: `${pid}.citation[${i}]`, text: c.label }));
  }
  return out;
}

describe('PROTOCOLS schema', () => {
  it('has unique ids and covers the AC protocol set', () => {
    const ids = PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Priority order (Advisor gate #12): H9 ear-swap first, H4/H5 0 Hz floor second.
    expect(ids[0]).toBe('ql-ear-swap');
    expect(ids[1]).toBe('ql-rate-floor');
    expect(ids).toEqual(
      expect.arrayContaining([
        'ql-ear-swap',
        'ql-rate-floor',
        'ql-noise-ingredient',
        'ql-ramp-discomfort',
        'ql-noise-neurotype',
        'ql-active-placebo',
        'ql-percept-gate',
      ]),
    );
  });

  it('every protocol: full blinding, minSessions = 10, ≥2 arms, valid contrast', () => {
    for (const p of PROTOCOLS) {
      expect(p.blinding).toBe('full');
      expect(p.minSessions).toBe(10);
      expect(p.arms.length).toBeGreaterThanOrEqual(2);
      expect(p.primaryContrast.a).toBeGreaterThanOrEqual(0);
      expect(p.primaryContrast.b).toBeGreaterThanOrEqual(0);
      expect(p.primaryContrast.a).toBeLessThan(p.arms.length);
      expect(p.primaryContrast.b).toBeLessThan(p.arms.length);
      expect(p.primaryContrast.a).not.toBe(p.primaryContrast.b);
      expect(['adult', 'experimental']).toContain(p.safetyClass);
      expect(p.sessionMinutes).toBeGreaterThan(0);
      expect(p.screening.some((s) => s.id === 'optin')).toBe(true);
      // Arm ids unique within the protocol.
      expect(new Set(p.arms.map((a) => a.id)).size).toBe(p.arms.length);
    }
  });

  it('every arm maps to a valid engine Phase shape', () => {
    for (const p of PROTOCOLS) {
      for (const arm of p.arms) {
        expect(arm.phases.length).toBeGreaterThanOrEqual(1);
        for (const ph of arm.phases) {
          const keys: (keyof Phase)[] = ['durationSec', 'carrierHz', 'beatHz', 'mode', 'gainDb'];
          for (const k of keys) expect(ph).toHaveProperty(k);
          expect(Number.isFinite(ph.durationSec)).toBe(true);
          expect(ph.durationSec).toBeGreaterThan(0);
          expect(Number.isFinite(ph.carrierHz)).toBe(true);
          expect(Number.isFinite(ph.beatHz)).toBe(true);
          expect(ph.beatHz).toBeGreaterThanOrEqual(0);
          expect(['binaural', 'monaural', 'isochronic']).toContain(ph.mode);
          expect(ph.gainDb).toBeLessThanOrEqual(0);
          expect(arm.attackSec).toBeGreaterThan(0);
        }
      }
    }
  });

  it('respects psychoacoustic hard limits (audio-protocol-design SKILL)', () => {
    for (const p of PROTOCOLS) {
      for (const arm of p.arms) {
        for (const ph of arm.phases) {
          if (ph.mode === 'binaural') {
            expect(ph.carrierHz, `${p.id}/${arm.id} carrier`).toBeLessThanOrEqual(1000);
            // Δf ≤ 30 Hz — the single exception is ql-percept-gate's
            // above-ceiling control, where exceeding the perceptual window IS
            // the control condition (edge-case E-02).
            if (ph.beatHz > 30) {
              expect(p.id).toBe('ql-percept-gate');
              expect(arm.id).toBe('edge-45hz');
            }
          }
          // Level safety: ≤ −1 dBTP-ish by construction; gain never boosts.
          expect(ph.gainDb).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('ships the 0 Hz control arm the registry was missing (T1 flag)', () => {
    const withFloor = PROTOCOLS.filter((p) =>
      p.arms.some((a) => a.id === 'control-0hz' && a.phases.every((ph) => ph.beatHz === 0)),
    );
    expect(withFloor.map((p) => p.id).sort()).toEqual(['ql-active-placebo', 'ql-rate-floor']);
  });

  it('includes an X05-style active-placebo arm (registry rule 4: active comparator)', () => {
    const p = PROTOCOLS.find((x) => x.id === 'ql-active-placebo')!;
    const sham = p.arms.find((a) => a.id === 'sham-active')!;
    expect(sham.phases[0].beatHz).toBeCloseTo(7.37, 2);
    expect(sham.phases[0].mode).toBe('monaural');
    expect(p.registryLinks).toContain('X05');
  });

  it('ramp-discomfort protocol varies ONLY the envelope between arms', () => {
    const p = PROTOCOLS.find((x) => x.id === 'ql-ramp-discomfort')!;
    const [slow, fast] = p.arms;
    expect(slow.phases).toEqual(fast.phases);
    expect(slow.attackSec).toBeGreaterThan(fast.attackSec);
    expect(p.safetyClass).toBe('experimental');
  });

  it('ear-swap protocol arms differ only by the channelSwap flag', () => {
    const p = PROTOCOLS.find((x) => x.id === 'ql-ear-swap')!;
    const [a, b] = p.arms;
    expect(a.phases).toEqual(b.phases);
    expect(Boolean(a.channelSwap)).not.toBe(Boolean(b.channelSwap));
  });

  it('calm+focus scales exist wherever the primary contrast targets them', () => {
    for (const p of PROTOCOLS) {
      const ids = p.outcomeScales.map((s) => s.id);
      if (!p.primaryContrast.label.includes('salience')) {
        expect(ids).toEqual(expect.arrayContaining(['calm', 'focus']));
      }
      for (const s of p.outcomeScales) expect(s.max).toBeGreaterThan(s.min);
    }
  });

  it('Advisor gate #12 power corrections are present in power notes', () => {
    const h1 = PROTOCOLS.find((p) => p.hypothesisId === 'H1')!;
    expect(h1.powerNote).toContain('N≈256');
    const h12 = PROTOCOLS.find((p) => p.hypothesisId === 'H12')!;
    expect(h12.powerNote).toContain('N≈261'); // H6 2×2 interaction correction
  });

  it('Zhao 2025 is tagged low-medium confidence wherever cited', () => {
    const cites = Object.values(PROTOCOL_CITATIONS)
      .flat()
      .filter((c) => c.label.includes('Zhao'));
    expect(cites.length).toBeGreaterThan(0);
    for (const c of cites) {
      expect(c.confidence).toBe('low-medium');
      expect(c.label).toMatch(/preprint|thesis/i);
    }
  });
});

describe('claim lint (S12.2)', () => {
  it('no banned overclaim phrase in any protocol string', () => {
    for (const { label, text } of protocolStrings()) {
      for (const bad of BANNED) {
        expect(text.toLowerCase(), `${label} contains banned "${bad}"`).not.toContain(bad);
      }
    }
  });
});
