/**
 * Theory Explorer chain data — schema, verdict-enum, registry-link and
 * claim-lint audits.
 */

import { describe, expect, it } from 'vitest';
import { EXPERIMENTS } from '@/research/experiments';
import type { Verdict } from '@/research/types';
import { getChain, THEORY_CHAINS, type TheoryChain } from '../chains';

const VALID_VERDICTS: readonly Verdict[] = ['REPAIRABLE', 'DEMOTE', 'DISCARD', 'OPEN'];
const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
const REGISTRY_IDS = new Set(EXPERIMENTS.map((x) => x.id));

function chainStrings(c: TheoryChain): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [
    { label: `${c.id}.title`, text: c.title },
    { label: `${c.id}.claim`, text: c.claim },
    { label: `${c.id}.weakestArrowNote`, text: c.weakestArrowNote },
    { label: `${c.id}.verdictSummary`, text: c.verdictSummary },
    { label: `${c.id}.steelman`, text: c.steelman },
  ];
  c.steps.forEach((s) =>
    out.push(
      { label: `${c.id}.${s.id}.claim`, text: s.claim },
      { label: `${c.id}.${s.id}.evidence`, text: s.evidence },
      ...s.flawFlags.map((f) => ({ label: `${c.id}.${s.id}.${f.id}`, text: f.flaw })),
    ),
  );
  c.domainOfValidity.forEach((d, i) => out.push({ label: `${c.id}.domain[${i}]`, text: d }));
  c.alternatives.forEach((a, i) => out.push({ label: `${c.id}.alt[${i}]`, text: a }));
  c.verdicts.forEach((v, i) => out.push({ label: `${c.id}.verdict[${i}]`, text: v.scope }));
  c.citations.forEach((cit, i) => out.push({ label: `${c.id}.cit[${i}]`, text: cit.label }));
  return out;
}

describe('THEORY_CHAINS schema', () => {
  it('covers at least 8 audited theories with unique ids', () => {
    expect(THEORY_CHAINS.length).toBeGreaterThanOrEqual(8);
    const ids = THEORY_CHAINS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getChain(id)?.id).toBe(id);
  });

  it('covers the AC-required claim set', () => {
    const ids = THEORY_CHAINS.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'beat-percept',
        'assr-to-state',
        'band-maps',
        'dose-logic',
        'carrier-432',
        'cousto-octave',
        'solfeggio-numerology',
        'gateway-core',
      ]),
    );
  });

  it('every step has a flawFlags array (empty allowed when the link holds)', () => {
    for (const c of THEORY_CHAINS) {
      expect(c.steps.length).toBeGreaterThanOrEqual(3);
      for (const s of c.steps) {
        expect(Array.isArray(s.flawFlags), `${c.id}/${s.id}`).toBe(true);
        expect(s.claim.length).toBeGreaterThan(0);
        expect(s.evidence.length).toBeGreaterThan(0);
        for (const f of s.flawFlags) {
          expect(f.id.length).toBeGreaterThan(0);
          expect(['critical', 'high', 'medium', 'low']).toContain(f.severity);
        }
      }
    }
  });

  it('weakestArrow is a valid step index, and points at a flawed step', () => {
    for (const c of THEORY_CHAINS) {
      expect(c.weakestArrow, c.id).toBeGreaterThanOrEqual(0);
      expect(c.weakestArrow, c.id).toBeLessThan(c.steps.length);
      expect(c.steps[c.weakestArrow].flawFlags.length, `${c.id} weakest arrow should carry a flaw`).toBeGreaterThan(0);
      expect(c.weakestArrowNote.length).toBeGreaterThan(0);
    }
  });

  it('verdicts use the six-pass enum only', () => {
    for (const c of THEORY_CHAINS) {
      expect(c.verdicts.length).toBeGreaterThanOrEqual(1);
      for (const v of c.verdicts) {
        expect(VALID_VERDICTS, `${c.id}: ${v.verdict}`).toContain(v.verdict);
        expect(v.scope.length).toBeGreaterThan(0);
      }
    }
  });

  it('registry links exist in the experiment registry (X01–X14)', () => {
    for (const c of THEORY_CHAINS) {
      for (const x of c.registryLinks) {
        expect(REGISTRY_IDS.has(x), `${c.id} links unknown experiment ${x}`).toBe(true);
      }
    }
  });

  it('discarded claims carry an audited framing, never a live-option one', () => {
    for (const c of THEORY_CHAINS) {
      if (c.verdicts.some((v) => v.verdict === 'DISCARD')) {
        expect(c.verdictSummary.toLowerCase(), c.id).toContain('audited');
        // Discarded theories must not present themselves as usable protocols.
        for (const d of c.domainOfValidity) {
          expect(d.toLowerCase()).not.toMatch(/use this|try this session|recommended preset/);
        }
      }
    }
  });

  it('every chain names mundane alternatives (the ledger rule)', () => {
    for (const c of THEORY_CHAINS) {
      expect(c.alternatives.length, c.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('claim lint (S12.2)', () => {
  it('no banned overclaim phrase in any chain string', () => {
    for (const c of THEORY_CHAINS) {
      for (const { label, text } of chainStrings(c)) {
        for (const bad of BANNED) {
          expect(text.toLowerCase(), `${label} contains banned "${bad}"`).not.toContain(bad);
        }
      }
    }
  });
});
