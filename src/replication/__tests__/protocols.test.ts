import { describe, expect, it } from 'vitest';
import { checkPhaseGuardrails, renderPhase } from '@/engine';
import {
  REPLICATION_BANNER,
  REPLICATION_CARDS,
  engineDurationSec,
  isRunnable,
  toPreset,
  toSessionSpec,
  validateRunnableCard,
  type ReplicationCard,
} from '../protocols';

const RUNNABLE = REPLICATION_CARDS.filter(isRunnable);
const MUSEUM = REPLICATION_CARDS.filter((c) => !isRunnable(c));
const byId = (id: string): ReplicationCard => {
  const c = REPLICATION_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`missing card ${id}`);
  return c;
};

/** All user-facing strings on a card (claim-lint surface). */
function userFacingStrings(c: ReplicationCard): string[] {
  return [
    c.name,
    c.program,
    c.originalClaim,
    c.summary,
    ...(c.fidelityNote ? [c.fidelityNote] : []),
    ...(c.divergenceNote ? [c.divergenceNote] : []),
    ...(c.engineNote ? [c.engineNote] : []),
    ...(c.nonReplicableReason ? [c.nonReplicableReason] : []),
    ...(c.museumText ? [c.museumText] : []),
    ...(c.verificationPending ? [c.verificationPending] : []),
    ...(c.safety?.warnings ?? []),
    ...c.citations,
  ];
}

describe('replication card data integrity', () => {
  it('covers the mandated program set', () => {
    const ids = REPLICATION_CARDS.map((c) => c.id);
    for (const id of [
      'rep-gateway-focus10',
      'rep-genus-40hz-audio',
      'rep-tmr-cue-replay',
      'rep-clas-slow-oscillation',
      'rep-dod-theta-bbf-sleep',
      'rep-lida-audio-analog',
      'doc-medusa-lrad',
      'doc-synthetic-telepathy',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('every card has both classification axes, original claim, grade, citations', () => {
    for (const c of REPLICATION_CARDS) {
      expect(typeof c.documented, c.id).toBe('boolean');
      expect(['VALIDATED', 'PARTIAL', 'CONTESTED', 'UNVALIDATED', 'DISPROVED'], c.id).toContain(c.claimGrade);
      expect(['A', 'B', 'C', 'D'], c.id).toContain(c.ourGrade);
      expect(c.originalClaim.length, c.id).toBeGreaterThan(0);
      expect(c.citations.length, c.id).toBeGreaterThan(0);
      expect(['adult', 'experimental'], c.id).toContain(c.safetyClass);
    }
  });

  it('every runnable card has safety rails and an H.870 dose fraction under 1% of weekly dose', () => {
    for (const c of RUNNABLE) {
      expect(c.safety, c.id).not.toBeNull();
      expect(c.safety!.maxLevelDbA, c.id).toBeLessThanOrEqual(70);
      expect(c.safety!.h870WeeklyDoseFraction, c.id).toBeLessThan(0.01);
      expect(c.safety!.warnings.length, c.id).toBeGreaterThan(0);
    }
  });

  it('museum cards are documentation-only: engine null + non-replicable explainer', () => {
    for (const c of MUSEUM) {
      expect(c.engine, c.id).toBeNull();
      expect(c.nonReplicableReason?.length, c.id).toBeGreaterThan(0);
      expect(toSessionSpec(c), c.id).toBeNull();
      expect(toPreset(c), c.id).toBeNull();
    }
  });
});

describe('runnable cards validate against the SessionSpec domain', () => {
  it('pass the domain-limit validator (durations > 0, binaural beats ≤ 30 Hz, gain ≤ 0)', () => {
    for (const c of RUNNABLE) {
      expect(validateRunnableCard(c), `${c.id}: ${validateRunnableCard(c).join('; ')}`).toEqual([]);
    }
  });

  it('map to a well-formed engine SessionSpec', () => {
    for (const c of REPLICATION_CARDS.filter((x) => x.engine)) {
      const spec = toSessionSpec(c)!;
      expect(spec.phases.length).toBeGreaterThan(0);
      expect(spec.sampleRate).toBe(48000);
      for (const p of spec.phases) {
        expect(p.durationSec, c.id).toBeGreaterThan(0);
        expect(p.carrierHz, c.id).toBeGreaterThan(0);
        expect(p.gainDb, c.id).toBeLessThanOrEqual(0);
        // >30 Hz modulation must use monaural/isochronic (binaural ceiling).
        if (p.beatHz > 30) expect(p.mode, c.id).not.toBe('binaural');
      }
    }
  });

  it('every phase renders without engine guardrail warnings', () => {
    for (const c of RUNNABLE) {
      const sets = [c.engine, c.offlineEngine].filter(Boolean) as (typeof c.engine)[];
      for (const phases of sets) {
        for (const p of phases!) {
          // Render a 0.5 s truncation to prove renderability without huge buffers.
          const probe = { ...p, durationSec: 0.5 };
          const r = renderPhase(probe, 48000);
          expect(checkPhaseGuardrails(p, 48000), `${c.id}: ${JSON.stringify(p)}`).toEqual([]);
          expect(r.left.length).toBe(24000);
        }
      }
    }
  });

  it('toPreset adapts to the Studio data-layer shape', () => {
    for (const c of REPLICATION_CARDS.filter((x) => x.engine)) {
      const preset = toPreset(c)!;
      expect(preset.category).toBe('Experimental');
      expect(preset.spec.autoShutoff).toBe(true);
      expect(preset.rationale).toContain(REPLICATION_BANNER);
      for (const p of preset.spec.phases) {
        expect(p.durationSec).toBeGreaterThan(0);
        expect(p.gainDbFs).toBeLessThanOrEqual(0);
      }
    }
  });

  it('durations are sane and positive', () => {
    const gw = byId('rep-gateway-focus10');
    expect(engineDurationSec(gw.engine!)).toBe(2100); // 35 min per documented tape length
  });
});

describe('mandatory framing (replication-pack-qa)', () => {
  it('banner string is the literal required text', () => {
    expect(REPLICATION_BANNER).toBe('Stimulus replication ≠ claim validation.');
  });

  it('Gateway cites the 1983 CIA doc as a theoretical assessment with no experiments', () => {
    const g = byId('rep-gateway-focus10');
    expect(g.citations.some((c) => c.includes('CIA-RDP96-00788R001700210016-5'))).toBe(true);
    expect(userFacingStrings(g).join(' ')).toMatch(/no experiments/i);
    expect(g.fidelityNote).toMatch(/reconstruction/i);
    expect(g.claimGrade).toBe('UNVALIDATED');
  });

  it('GENUS cites BOTH the patent thicket AND the OVERTURE primary-endpoint miss', () => {
    const g = byId('rep-genus-40hz-audio');
    const all = userFacingStrings(g).join(' ');
    expect(all).toMatch(/patent thicket/i);
    expect(all).toMatch(/OVERTURE/);
    expect(all).toMatch(/missed/i);
    expect(g.claimGrade).toBe('CONTESTED');
    expect(g.divergenceNote).toMatch(/audio-only/i);
  });

  it('GENUS load is gated: SPL parameter verification pending (S3 gate condition 1)', () => {
    const g = byId('rep-genus-40hz-audio');
    expect(g.verificationPending).toBeTruthy();
    expect(g.verificationPending).toMatch(/STAR Methods/i);
  });

  it('GENUS carries the infant-mode exclusion and 1 h/day cooldown notes (S3 gate condition 2)', () => {
    const g = byId('rep-genus-40hz-audio');
    const w = g.safety!.warnings.join(' ');
    expect(w).toMatch(/INFANT MODE EXCLUDED/);
    expect(w).toMatch(/1 kHz/);
    expect(w).toMatch(/50 dBA/);
    expect(w).toMatch(/1 h\/day/);
  });

  it('S3 dose-arithmetic corrections are applied (condition 5)', () => {
    expect(byId('rep-gateway-focus10').safety!.h870WeeklyDoseFraction).toBeCloseTo(3.2e-5, 7);
    expect(byId('rep-lida-audio-analog').safety!.h870WeeklyDoseFraction).toBeCloseTo(8.8e-5, 7);
  });

  it('Ngo-CLAS live mode requires EEG; offline variant is honestly labeled open-loop', () => {
    const n = byId('rep-clas-slow-oscillation');
    expect(n.requiresEeg).toBe(true);
    expect(n.requiresDevice).toBe(true);
    expect(n.engine).toBeNull();
    expect(n.offlineEngine!.length).toBeGreaterThan(0);
    expect(userFacingStrings(n).join(' ')).toMatch(/NOT this protocol|not-the-protocol/i);
    expect(userFacingStrings(n).join(' ')).toMatch(/Henin/); // null memory replication disclosed
  });

  it('TMR ships only the timed fallback with the stage-targeting honesty note (S3 gate condition 4)', () => {
    const t = byId('rep-tmr-cue-replay');
    expect(t.requiresDevice).toBe(true);
    expect(t.fidelityNote).toMatch(/timed fallback/i);
    expect(t.fidelityNote).toMatch(/[Ss]tage targeting is an active ingredient/);
    expect(t.claimGrade).toBe('VALIDATED');
  });

  it('LIDA carries the mandatory divergence note and correct patent pulse rate', () => {
    const l = byId('rep-lida-audio-analog');
    expect(l.divergenceNote).toBeTruthy();
    expect(userFacingStrings(l).join(' ')).toMatch(/40–80\/min|40-80\/min/);
    expect(l.claimGrade).toBe('UNVALIDATED');
  });

  it('MEDUSA/LRAD and synthetic telepathy are museum-only', () => {
    expect(MUSEUM.map((c) => c.id).sort()).toEqual(['doc-medusa-lrad', 'doc-synthetic-telepathy']);
    expect(byId('doc-medusa-lrad').museumText).toMatch(/thermoelastic/);
  });
});

describe('banned-claim lint over replication strings', () => {
  const all = REPLICATION_CARDS.flatMap((c) => userFacingStrings(c).map((s) => ({ id: c.id, s })));

  it('never presents claims as validated capabilities', () => {
    for (const { id, s } of all) {
      expect(/guarantee/i.test(s), `${id}: ${s}`).toBe(false);
      expect(/proven to induce/i.test(s), `${id}: ${s}`).toBe(false);
      expect(/mind control works/i.test(s), `${id}: ${s}`).toBe(false);
    }
  });

  it('"subliminal" appears only in explicit negations', () => {
    for (const { id, s } of all) {
      if (/subliminal/i.test(s)) {
        expect(/(never|no)\b[^.]*subliminal|subliminal[^.]*\b(never|no)\b/i.test(s), `${id}: ${s}`).toBe(true);
      }
    }
  });

  it('the typo "combined-genius" does not appear (S3 gate condition 6)', () => {
    for (const { id, s } of all) {
      expect(/combined-genius/i.test(s), `${id}: ${s}`).toBe(false);
    }
  });
});
