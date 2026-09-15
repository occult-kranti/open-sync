/**
 * features.ts integrity + claim-discipline audits.
 *
 * Guarantees:
 *  - every routed screen in the app has at least one documentation entry;
 *  - every entry carries non-empty simple + deep registers and how-to steps;
 *  - no banned overclaim phrases in any user-facing field;
 *  - the simple register stays readable (average sentence < 25 words);
 *  - ids are unique.
 */

import { describe, it, expect } from 'vitest';
import { APP_SCREENS, FEATURES, type FeatureEntry } from '../features';

/** Overclaim phrases forbidden in user-facing copy (case-insensitive). */
const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];

function userFacingFields(f: FeatureEntry): { label: string; text: string }[] {
  const fields: { label: string; text: string }[] = [
    { label: 'name', text: f.name },
    { label: 'simple', text: f.simple },
    { label: 'deep', text: f.deep },
    ...f.howTo.map((h, i) => ({ label: `howTo[${i}]`, text: h })),
  ];
  if (f.gradeScope) fields.push({ label: 'gradeScope', text: f.gradeScope });
  if (f.plot) {
    fields.push({ label: 'plot.axes', text: f.plot.axes });
    fields.push({ label: 'plot.good', text: f.plot.good });
    fields.push({ label: 'plot.bad', text: f.plot.bad });
  }
  return fields;
}

function sentences(text: string): string[] {
  // Split on sentence terminators followed by whitespace/end, so decimals
  // like "0.6" and abbreviations inside numbers do not count as boundaries.
  return text
    .split(/[.!?]+(?=\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('FEATURES integrity', () => {
  it('has unique ids', () => {
    const ids = FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every screen in the app has at least one entry', () => {
    for (const screen of APP_SCREENS) {
      const hits = FEATURES.filter((f) => f.route === screen.route);
      expect(hits.length, `no features entry for screen ${screen.route} (${screen.label})`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every entry routes to a known screen', () => {
    const routes = new Set(APP_SCREENS.map((s) => s.route));
    for (const f of FEATURES) {
      expect(routes.has(f.route), `${f.id} has unknown route ${f.route}`).toBe(true);
    }
  });

  it('every entry has non-empty simple, deep, and howTo', () => {
    for (const f of FEATURES) {
      expect(f.simple.trim().length, `${f.id}.simple`).toBeGreaterThan(0);
      expect(f.deep.trim().length, `${f.id}.deep`).toBeGreaterThan(0);
      expect(f.howTo.length, `${f.id}.howTo`).toBeGreaterThan(0);
      for (const step of f.howTo) {
        expect(step.trim().length, `${f.id} has an empty how-to step`).toBeGreaterThan(0);
      }
    }
  });

  it('simple register has 2–3 sentences; deep register has 3–5', () => {
    for (const f of FEATURES) {
      const s = sentences(f.simple).length;
      const d = sentences(f.deep).length;
      expect(s, `${f.id}.simple sentence count`).toBeGreaterThanOrEqual(2);
      expect(s, `${f.id}.simple sentence count`).toBeLessThanOrEqual(3);
      expect(d, `${f.id}.deep sentence count`).toBeGreaterThanOrEqual(3);
      expect(d, `${f.id}.deep sentence count`).toBeLessThanOrEqual(5);
    }
  });

  it('graded entries state their grade scope', () => {
    for (const f of FEATURES) {
      if (f.grade) {
        expect(f.gradeScope?.trim().length, `${f.id} graded without gradeScope`).toBeGreaterThan(0);
      }
    }
  });

  it('plot widgets carry full axes/good/bad explainers', () => {
    for (const f of FEATURES) {
      if (f.plot) {
        expect(f.plot.axes.trim().length, `${f.id}.plot.axes`).toBeGreaterThan(0);
        expect(f.plot.good.trim().length, `${f.id}.plot.good`).toBeGreaterThan(0);
        expect(f.plot.bad.trim().length, `${f.id}.plot.bad`).toBeGreaterThan(0);
      }
    }
  });
});

describe('claim discipline', () => {
  it('no banned overclaim phrases in any user-facing field', () => {
    for (const f of FEATURES) {
      for (const { label, text } of userFacingFields(f)) {
        const lower = text.toLowerCase();
        for (const phrase of BANNED) {
          expect(
            lower.includes(phrase),
            `${f.id}.${label} contains banned phrase "${phrase}"`,
          ).toBe(false);
        }
      }
    }
  });

  it('simple register averages under 25 words per sentence', () => {
    for (const f of FEATURES) {
      const sents = sentences(f.simple);
      const words = sents.reduce(
        (acc, s) => acc + s.split(/\s+/).filter(Boolean).length,
        0,
      );
      const avg = words / Math.max(1, sents.length);
      expect(avg, `${f.id}.simple average sentence length`).toBeLessThan(25);
    }
  });
});
