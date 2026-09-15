/**
 * Replication Bay protocol data — honesty audits (S3 + fixed-item fixes).
 *
 * Static content checks run in node against REPLICATION_CARDS: stimulus
 * replication ≠ claim validation (banner literal), two-axis grading
 * (documented / validated / safety) per card, museum cards with engine:
 * null that never produce audio, citation quality, per-card safety caps.
 */

import { describe, expect, it } from 'vitest';
import {
  REPLICATION_BANNER,
  REPLICATION_CARDS,
  engineDurationSec,
  isRunnable,
  toPreset,
  type ReplicationCard,
} from '../protocols';

const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];

function allStrings(c: ReplicationCard): string[] {
  const out = [
    c.name, c.program, c.era, c.summary, c.originalClaim,
    c.engineNote ?? '', c.fidelityNote ?? '', c.divergenceNote ?? '',
    c.museumText ?? '', c.nonReplicableReason ?? '',
    ...c.citations,
  ];
  for (const s of c.safety?.warnings ?? []) out.push(s);
  return out;
}

describe('REPLICATION_CARDS schema', () => {
  it('has unique ids and covers the committed card set', () => {
    const ids = REPLICATION_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'monroe-ffr-1975',
        'cia-gateway-1983',
        'ngo-sws-closed-loop',
        'medusa-lrad-museum',
        'synthetic-telepathy-museum',
      ]),
    );
  });

  it('every card carries the two grading axes + safety class + era + program', () => {
    for (const c of REPLICATION_CARDS) {
      expect(['VALIDATED', 'PARTIAL', 'CONTESTED', 'UNVALIDATED', 'DISPROVED']).toContain(c.claimGrade);
      expect(['A', 'B', 'C', 'D']).toContain(c.ourGrade);
      expect(['adult', 'experimental']).toContain(c.safetyClass);
      expect(typeof c.documented).toBe('boolean');
      expect(c.program.length).toBeGreaterThan(0);
      expect(c.era.length).toBeGreaterThan(0);
      expect(c.originalClaim.length).toBeGreaterThan(0);
    }
  });
});

describe('S3 gate: stimulus replication ≠ claim validation', () => {
  it('the banner literal is exported verbatim for the UI', () => {
    expect(REPLICATION_BANNER).toBe('stimulus replication ≠ claim validation');
  });

  it('every runnable card shows the banner and an original-claim line', () => {
    for (const c of REPLICATION_CARDS.filter(isRunnable)) {
      // The UI renders the literal banner from REPLICATION_BANNER; the card
      // must also carry its original claim so the two can never merge.
      expect(c.originalClaim.trim().length).toBeGreaterThan(10);
      expect(c.engine ?? c.offlineEngine).toBeTruthy();
    }
  });

  it('no card text contains a banned overclaim phrase', () => {
    for (const c of REPLICATION_CARDS) {
      for (const s of allStrings(c)) {
        const low = s.toLowerCase();
        for (const b of BANNED) {
          expect(low, `${c.id}: "${s}" contains banned "${b}"`).not.toContain(b);
        }
      }
    }
  });
});

describe('museum cards (never runnable)', () => {
  it('every museum card has engine: null and a non-replicable reason', () => {
    const museum = REPLICATION_CARDS.filter((c) => !isRunnable(c));
    expect(museum.length).toBeGreaterThanOrEqual(2);
    for (const c of museum) {
      expect(c.engine).toBeNull();
      expect(c.offlineEngine).toBeUndefined();
      expect(c.nonReplicableReason && c.nonReplicableReason.length > 20).toBe(true);
      expect(c.safety).toBeUndefined();
      expect(toPreset(c)).toBeNull();
      expect(c.documented).toBe(true);
    }
  });

  it('MEDUSA/LRAD museum card is documented but claim-unvalidated', () => {
    const m = REPLICATION_CARDS.find((c) => c.id === 'medusa-lrad-museum')!;
    expect(m.claimGrade).toBe('UNVALIDATED');
    expect(m.nonReplicableReason).toMatch(/pulsed microwave|hazard|not audio/i);
  });

  it('synthetic telepathy museum card states the 1976 misunderstanding correction', () => {
    const s = REPLICATION_CARDS.find((c) => c.id === 'synthetic-telepathy-museum')!;
    expect(s.nonReplicableReason).toMatch(/Sharp|Grove|microwave/i);
  });
});

describe('runnable cards: engine + safety + citations', () => {
  it('every engine phase maps to the engine Phase shape with sane limits', () => {
    for (const c of REPLICATION_CARDS) {
      for (const spec of [c.engine, c.offlineEngine]) {
        if (!spec) continue;
        for (const ph of spec) {
          for (const k of ['durationSec', 'carrierHz', 'beatHz', 'mode', 'gainDb'] as const) {
            expect(ph).toHaveProperty(k);
          }
          expect(ph.durationSec).toBeGreaterThan(0);
          expect(ph.carrierHz).toBeGreaterThan(0);
          expect(ph.carrierHz).toBeLessThanOrEqual(1000);
          expect(ph.beatHz).toBeGreaterThanOrEqual(0);
          if (ph.mode === 'binaural') expect(ph.beatHz).toBeLessThanOrEqual(30);
          expect(ph.gainDb).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('every runnable card has per-card safety caps and headphones note where relevant', () => {
    for (const c of REPLICATION_CARDS.filter(isRunnable)) {
      expect(c.safety).toBeTruthy();
      expect(c.safety!.maxLevelDbA).toBeLessThanOrEqual(62);
      expect(c.safety!.sessionMin).toBeGreaterThan(0);
      expect(c.safety!.h870WeeklyDoseFraction).toBeGreaterThan(0);
      expect(c.safety!.h870WeeklyDoseFraction).toBeLessThan(0.2);
    }
  });

  it('every card has at least one citation; museum cards cite primary docs', () => {
    for (const c of REPLICATION_CARDS) {
      expect(c.citations.length).toBeGreaterThan(0);
    }
    const medusa = REPLICATION_CARDS.find((c) => c.id === 'medusa-lrad-museum')!;
    expect(medusa.citations.join(' ')).toMatch(/6,356,506|6,587,178/);
  });

  it('cia-gateway card is documented, claim-contested, safety adult, fidelity-noted', () => {
    const g = REPLICATION_CARDS.find((c) => c.id === 'cia-gateway-1983')!;
    expect(g.documented).toBe(true);
    expect(g.claimGrade).toBe('CONTESTED');
    expect(g.safetyClass).toBe('adult');
    expect(g.fidelityNote).toMatch(/fidelity/i);
  });

  it('ngo-sws card is NOT a true replication: divergence note + offline burst variant', () => {
    const n = REPLICATION_CARDS.find((c) => c.id === 'ngo-sws-closed-loop')!;
    expect(n.divergenceNote).toMatch(/not a true replication|open-loop|in-phase detection/i);
    expect(n.requiresEeg).toBe(true);
    expect(n.offlineEngine).toBeTruthy();
    const p = toPreset(n, { offline: true });
    expect(p).toBeTruthy();
    expect(p!.title).toMatch(/offline/i);
  });

  it('engineDurationSec sums phases', () => {
    const n = REPLICATION_CARDS.find((c) => c.id === 'ngo-sws-closed-loop')!;
    expect(engineDurationSec(n.engine!)).toBe(n.engine!.reduce((a, p) => a + p.durationSec, 0));
  });

  it('toPreset builds a valid preset-shaped object for engine and offline variants', () => {
    for (const c of REPLICATION_CARDS.filter(isRunnable)) {
      const p = toPreset(c)!;
      expect(p.id).toContain(c.id);
      expect(p.spec.phases.length).toBeGreaterThan(0);
      expect(p.citations.length).toBeGreaterThan(0);
      if (c.offlineEngine) {
        const off = toPreset(c, { offline: true })!;
        expect(off.spec.phases).toEqual(c.offlineEngine);
      }
    }
  });
});
