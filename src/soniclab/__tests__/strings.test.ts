/**
 * Sonic Lab UI-string lint: no banned overclaim phrases anywhere in the
 * catalog metadata or the page source; mandatory honesty labels present;
 * every card has a grade, a blurb, and a (pending) features.ts id.
 */

import { describe, expect, it } from 'vitest';
// vite `?raw` source import (typed via vite/client) — same pattern as
// src/ui/__tests__/ux-polish.test.tsx.
import pageSrc from '../../pages/SonicLab.tsx?raw';
import {
  ASTRO_MEANING_LABEL,
  BANNED_PHRASES,
  NEEDED_FEATURE_IDS,
  SONIC_CARDS,
  SONIC_GROUPS,
} from '../catalog';
import { ASTRO_LABEL } from '../generators';


function collectCatalogStrings(): string[] {
  const out: string[] = [ASTRO_MEANING_LABEL];
  for (const g of SONIC_GROUPS) out.push(g.title);
  for (const c of SONIC_CARDS) {
    out.push(c.title, c.blurb, c.featureId);
    if (c.caveat) out.push(c.caveat);
  }
  return out;
}

describe('banned-claim lint', () => {
  it('no banned overclaim phrases in catalog strings', () => {
    for (const s of collectCatalogStrings()) {
      const lower = s.toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(lower.includes(phrase), `catalog string contains banned phrase "${phrase}": ${s}`).toBe(false);
      }
    }
  });

  it('no banned overclaim phrases in the page source', () => {
    const src = pageSrc.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      expect(src.includes(phrase), `SonicLab.tsx contains banned phrase "${phrase}"`).toBe(false);
    }
  });
});

describe('catalog integrity', () => {
  it('every card has a known group, grade, blurb, and feature id', () => {
    const groupIds = new Set(SONIC_GROUPS.map((g) => g.id));
    for (const c of SONIC_CARDS) {
      expect(groupIds.has(c.group), `${c.id} group`).toBe(true);
      expect(['A', 'B', 'C', 'D']).toContain(c.grade);
      expect(c.blurb.length).toBeGreaterThan(20);
      expect(c.featureId.startsWith('soniclab-')).toBe(true);
    }
    expect(new Set(NEEDED_FEATURE_IDS).size).toBe(NEEDED_FEATURE_IDS.length);
  });

  it('every group has at least one card', () => {
    for (const g of SONIC_GROUPS) {
      expect(SONIC_CARDS.some((c) => c.group === g.id), `group ${g.id} empty`).toBe(true);
    }
  });

  it('astro honesty labels are the mandatory E2 strings', () => {
    expect(ASTRO_LABEL).toBe('astronomically derived; no evidence of special effect');
    expect(ASTRO_MEANING_LABEL.toLowerCase()).toContain('no evidence');
    // The astro card itself is graded D (meaning) and carries the caveat.
    const astro = SONIC_CARDS.find((c) => c.id === 'astro')!;
    expect(astro.grade).toBe('D');
    expect(astro.caveat).toBeTruthy();
  });

  it('page renders the mandatory D-grade meaning label', () => {
    expect(pageSrc.includes('ASTRO_MEANING_LABEL')).toBe(true);
  });
});
