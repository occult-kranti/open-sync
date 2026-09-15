/**
 * Stage-13 medical-frequency registry integrity:
 *  - registries are well-formed (unique ids, citations everywhere)
 *  - the honesty contract holds: no disease-cure language, grades match tiers
 *  - the page's linked presets exist and obey the graded-label rules
 */
import { describe, it, expect } from 'vitest';
import {
  ISA_FACT,
  MED_COMMUNITY,
  MED_DEVICES,
  MED_ENFORCEMENT,
  MED_PAPERS,
  MED_TIMELINE,
  WELLNESS_FACT,
  type MedDevice,
} from '../medical';
import { PRESETS, getPresetById } from '../presets';

const GRADES = ['A', 'B', 'C', 'D'] as const;
const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
/** Disease-treatment claims we never make for wellness/folklore items. */
const OVERCLAIM = [/cure[sd]?\b(?!.*(never|no|not|cannot|don't|do not))/i];

function allText(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

describe('medical registry integrity', () => {
  it('device ids are unique and every device is graded + cited', () => {
    const ids = MED_DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of MED_DEVICES) {
      expect(GRADES, d.id).toContain(d.grade);
      expect(d.summary.trim().length, d.id).toBeGreaterThan(0);
      expect(d.citation.trim().length, d.id).toBeGreaterThan(0);
      expect(d.status.trim().length, d.id).toBeGreaterThan(0);
    }
  });

  it('papers, timeline, enforcement, community all carry citations/notes', () => {
    for (const p of MED_PAPERS) {
      expect(GRADES, p.id).toContain(p.grade);
      expect(p.finding.trim().length, p.id).toBeGreaterThan(0);
      expect(p.limitation.trim().length, `${p.id} limitation`).toBeGreaterThan(0);
      expect(p.citation.trim().length, p.id).toBeGreaterThan(0);
    }
    for (const e of MED_TIMELINE) {
      expect(GRADES, e.label).toContain(e.grade);
      expect(e.note.trim().length, e.label).toBeGreaterThan(0);
    }
    expect(MED_ENFORCEMENT.length).toBeGreaterThanOrEqual(4);
    for (const c of MED_ENFORCEMENT) expect(c.outcome.trim().length, c.caseName).toBeGreaterThan(0);
    for (const s of MED_COMMUNITY) {
      expect(s.url.trim().length, s.name).toBeGreaterThan(0);
      expect(s.note.trim().length, s.name).toBeGreaterThan(0);
    }
  });

  it('grading matches the four-tier map', () => {
    const byKind = (k: MedDevice['kind']) => MED_DEVICES.filter((d) => d.kind === k);
    for (const d of byKind('acoustic-medicine')) expect(d.grade, d.id).toBe('A');
    for (const d of byKind('folklore')) expect(d.grade, d.id).toBe('D');
    expect(byKind('vibroacoustic').some((d) => d.grade === 'B')).toBe(true);
    expect(byKind('experimental').length).toBeGreaterThan(0);
  });

  it('regulatory canon strings state the Class I / no-disease-claim facts', () => {
    expect(ISA_FACT).toContain('ISA');
    expect(ISA_FACT).toContain('890.5660');
    expect(ISA_FACT.toLowerCase()).toContain('class i');
    expect(WELLNESS_FACT.toLowerCase()).toContain('unapproved medical device');
  });

  it('no banned hype phrases anywhere in the registry', () => {
    const corpus = [
      ...MED_DEVICES.map((d) => allText(d.name, d.status, d.summary, d.citation)),
      ...MED_PAPERS.map((p) => allText(p.title, p.finding, p.limitation, p.citation)),
      ...MED_TIMELINE.map((e) => allText(e.label, e.note)),
      ...MED_COMMUNITY.map((s) => allText(s.name, s.note)),
    ].join(' ');
    for (const phrase of BANNED) {
      expect(corpus.includes(phrase), `banned phrase "${phrase}"`).toBe(false);
    }
  });

  it('folklore devices never carry cure language without a negation', () => {
    for (const d of MED_DEVICES.filter((x) => x.kind === 'folklore')) {
      // Strip the cited Lynes book title — a proper noun, not a claim we make.
      const text = allText(d.name, d.status, d.summary).replace(/[“"]the cancer cure that worked[”"]/g, '');
      for (const re of OVERCLAIM) {
        expect(re.test(text), `${d.id} cure-language check`).toBe(false);
      }
    }
  });
});

describe('Stage-13 linked presets', () => {
  const LINKED = [
    'wellness-vat-40',
    'wellness-vat-scan',
    'wellness-bowl-relax',
    'wellness-otto-128',
    'exp-rife-cafl',
    'exp-cyma-commutation',
  ] as const;

  it('all linked presets exist', () => {
    for (const id of LINKED) expect(getPresetById(id), id).toBeDefined();
  });

  it('Wellness presets are grade B/C and stay in the Wellness category', () => {
    for (const p of PRESETS.filter((x) => x.category === 'Wellness')) {
      expect(['B', 'C'], p.id).toContain(p.grade);
    }
    expect(PRESETS.some((p) => p.category === 'Wellness')).toBe(true);
  });

  it('folklore homages are grade D, Experimental, and labeled experimental tier', () => {
    for (const id of ['exp-rife-cafl', 'exp-cyma-commutation']) {
      const p = getPresetById(id)!;
      expect(p.grade, id).toBe('D');
      expect(p.category, id).toBe('Experimental');
      expect(p.title.toLowerCase(), id).toContain('experimental tier');
    }
  });

  it('VAT 40 analog uses the studied rate (40 Hz AM) and a 20-45 min session arc', () => {
    const p = getPresetById('wellness-vat-40')!;
    for (const ph of p.spec.phases) {
      expect(ph.beatHz, ph.name).toBe(40);
      expect(ph.mode, ph.name).toBe('isochronic');
    }
    const min = p.spec.phases.reduce((a, ph) => a + ph.durationSec, 0) / 60;
    expect(min).toBeGreaterThanOrEqual(20);
    expect(min).toBeLessThanOrEqual(45);
  });

  it('Rife homage uses the circulated audio set as carriers, beat-free', () => {
    const p = getPresetById('exp-rife-cafl')!;
    expect(p.spec.phases.map((ph) => ph.carrierHz)).toEqual([727, 787, 880, 2008]);
    for (const ph of p.spec.phases) expect(ph.beatHz).toBe(0);
  });
});
