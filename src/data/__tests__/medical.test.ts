import { describe, expect, it } from 'vitest';
import { MEDICAL_DISCLAIMERS, MEDICAL_SCREENS } from '../medical';

describe('medical boundary data', () => {
  it('includes the FDA General Wellness boundary statement', () => {
    const joined = MEDICAL_DISCLAIMERS.join(' ');
    expect(joined).toMatch(/General Wellness/i);
    expect(joined).toMatch(/not a medical device/i);
  });

  it('flags seizure-disorder exclusion prominently', () => {
    const joined = MEDICAL_DISCLAIMERS.join(' ');
    expect(joined).toMatch(/seizure|epilep/i);
  });

  it('every screen routes to a non-diagnostic outcome', () => {
    for (const s of MEDICAL_SCREENS) {
      expect(s.outcome).toMatch(/not a diagnosis|consult|professional/i);
    }
  });

  it('crisis resources are present with real contact paths', () => {
    const joined = MEDICAL_DISCLAIMERS.join(' ');
    expect(joined).toMatch(/988/); // US Suicide & Crisis Lifeline
  });
});
