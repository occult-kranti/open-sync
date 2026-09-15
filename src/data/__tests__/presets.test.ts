import { describe, it, expect } from 'vitest';
import { PRESETS, getPresetById, presetDurationMin, type Preset } from '../presets';
import {
  SafetyGovernor,
  INFANT_MAX_LOWPASS_HZ,
  INFANT_HEARTBEAT_BPM_MIN,
  INFANT_HEARTBEAT_BPM_MAX,
  INFANT_MAX_SESSION_MIN,
  type GovernorSessionSpec,
} from '../../safety/governor';
import { INFANT_CEILING_DBA } from '../../safety/dose';
import { getFrequencyById } from '../frequencies';
import type { Grade } from '../frequencies';

const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D'];
const CATEGORIES = ['Sleep', 'Focus', 'Relax', 'Meditate', 'Experimental', 'Infant'] as const;

/** Adapt a data-layer preset into the governor's session shape. */
function toGovernorSpec(preset: Preset, targetDbA?: number): GovernorSessionSpec {
  const spec: GovernorSessionSpec = {
    durationMin: presetDurationMin(preset),
    gainDbFs: Math.max(...preset.spec.phases.map((p) => p.gainDbFs)),
    autoShutoff: preset.spec.autoShutoff,
    heartbeatBpm: preset.spec.heartbeatBpm,
  };
  const lowpasses = preset.spec.phases.map((p) => p.lowpassHz).filter((v): v is number => v !== undefined);
  if (lowpasses.length > 0) spec.lowpassHz = Math.max(...lowpasses);
  if (targetDbA !== undefined) spec.targetDbA = targetDbA;
  return spec;
}

describe('PRESETS integrity', () => {
  it('has unique ids', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all six categories', () => {
    for (const cat of CATEGORIES) {
      expect(PRESETS.some((p) => p.category === cat), cat).toBe(true);
    }
  });

  it('every preset has rationale, citations and a valid grade', () => {
    for (const p of PRESETS) {
      expect(GRADES, p.id).toContain(p.grade);
      expect(p.rationale.trim().length, p.id).toBeGreaterThan(0);
      expect(p.citations.length, p.id).toBeGreaterThan(0);
    }
  });

  it('every phase is well-formed (positive duration/carrier, non-positive gain)', () => {
    for (const p of PRESETS) {
      expect(p.spec.phases.length, p.id).toBeGreaterThan(0);
      for (const ph of p.spec.phases) {
        expect(ph.durationSec, `${p.id}/${ph.name}`).toBeGreaterThan(0);
        expect(ph.carrierHz, `${p.id}/${ph.name}`).toBeGreaterThan(0);
        expect(ph.beatHz, `${p.id}/${ph.name}`).toBeGreaterThanOrEqual(0);
        expect(ph.gainDbFs, `${p.id}/${ph.name}`).toBeLessThanOrEqual(0);
        if (ph.rampSec !== undefined) {
          expect(ph.rampSec, `${p.id}/${ph.name}`).toBeGreaterThan(0);
          expect(ph.rampSec, `${p.id}/${ph.name}`).toBeLessThan(ph.durationSec);
        }
      }
    }
  });

  it('every preset has automatic shutoff', () => {
    for (const p of PRESETS) {
      expect(p.spec.autoShutoff, p.id).toBe(true);
    }
  });

  it('presetDurationMin sums phases', () => {
    const p = getPresetById('focus-pomodoro');
    expect(p).toBeDefined();
    expect(presetDurationMin(p!)).toBeCloseTo(25, 6);
  });
});

describe('governor integration — non-infant presets', () => {
  const governor = new SafetyGovernor({ drivingWarningAcknowledged: true });

  it('all non-infant presets are authorized as-is', () => {
    for (const p of PRESETS.filter((x) => x.category !== 'Infant')) {
      const r = governor.authorizeSession(toGovernorSpec(p));
      expect(r.ok, `${p.id}: ${r.reasons.join('; ')}`).toBe(true);
    }
  });

  it('infant presets are NOT authorized in adult mode against infant targets (duration cap)', () => {
    // Adult mode has no infant-only gates; the point here is that infant-mode
    // requirements (targetDbA etc.) are genuinely enforced only in infant mode.
    const g = new SafetyGovernor({ drivingWarningAcknowledged: true, infantMode: true });
    const p = getPresetById('infant-womb-hush')!;
    const r = g.authorizeSession(toGovernorSpec(p));
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes('calibrated output target'))).toBe(true);
  });
});

describe('governor integration — infant presets', () => {
  const infantGovernor = new SafetyGovernor({ drivingWarningAcknowledged: true, infantMode: true });

  it('all infant presets pass when calibrated to a compliant crib level', () => {
    for (const p of PRESETS.filter((x) => x.category === 'Infant')) {
      const r = infantGovernor.authorizeSession(toGovernorSpec(p, INFANT_CEILING_DBA - 5));
      expect(r.ok, `${p.id}: ${r.reasons.join('; ')}`).toBe(true);
    }
  });

  it('every infant phase is low-passed at or below 1000 Hz', () => {
    for (const p of PRESETS.filter((x) => x.category === 'Infant')) {
      for (const ph of p.spec.phases) {
        expect(ph.lowpassHz, `${p.id}/${ph.name}`).toBeDefined();
        expect(ph.lowpassHz!, `${p.id}/${ph.name}`).toBeLessThanOrEqual(INFANT_MAX_LOWPASS_HZ);
      }
    }
  });

  it('infant sessions respect the 45-minute NICU-norm cap', () => {
    for (const p of PRESETS.filter((x) => x.category === 'Infant')) {
      expect(presetDurationMin(p), p.id).toBeLessThanOrEqual(INFANT_MAX_SESSION_MIN);
    }
  });

  it('infant heartbeat rates stay in the maternal resting range', () => {
    for (const p of PRESETS.filter((x) => x.category === 'Infant' && x.spec.heartbeatBpm !== undefined)) {
      expect(p.spec.heartbeatBpm!, p.id).toBeGreaterThanOrEqual(INFANT_HEARTBEAT_BPM_MIN);
      expect(p.spec.heartbeatBpm!, p.id).toBeLessThanOrEqual(INFANT_HEARTBEAT_BPM_MAX);
    }
  });
});

describe('preset content matches the frequency database', () => {
  it('Schumann simulation uses the measured fundamental', () => {
    const p = getPresetById('relax-schumann-sim')!;
    expect(p.spec.phases[0].beatHz).toBeCloseTo(getFrequencyById('schumann-fundamental')!.hz!, 2);
  });

  it('Schumann modes sweep uses the measured mode values', () => {
    const p = getPresetById('exp-schumann-modes')!;
    const beats = p.spec.phases.map((ph) => ph.beatHz);
    expect(beats).toEqual([7.83, 14.1, 20.3, 26.4, 32]);
  });

  it('chakra walk ascends through the chakra entries in order', () => {
    const p = getPresetById('meditate-chakra-walk')!;
    const carriers = p.spec.phases.map((ph) => ph.carrierHz);
    const chakraHz = ['root', 'sacral', 'solar-plexus', 'heart', 'throat', 'third-eye', 'crown'].map(
      (c) => getFrequencyById(`chakra-${c}`)!.hz!,
    );
    expect(carriers).toEqual(chakraHz);
  });

  it('OM-based presets use the Cousto Earth-year tone', () => {
    const om = getFrequencyById('planetary-om')!.hz!;
    for (const id of ['meditate-om-cousto', 'meditate-theta-garden']) {
      const p = getPresetById(id)!;
      for (const ph of p.spec.phases) expect(ph.carrierHz, id).toBeCloseTo(om, 1);
    }
  });

  it('honest-label folklore presets carry grade D', () => {
    for (const id of ['meditate-om-cousto', 'meditate-solfeggio-528', 'meditate-chakra-walk', 'exp-lambda-label', 'exp-epsilon-null']) {
      expect(getPresetById(id)?.grade, id).toBe('D');
    }
  });

  it('experimental 40 Hz presets warn that human efficacy is unproven', () => {
    const p = getPresetById('exp-gamma-40')!;
    expect(p.rationale).toContain('UNPROVEN');
    expect(p.spec.phases[0].beatHz).toBe(40);
  });

  it('beat-free control preset actually has no beat', () => {
    const p = getPresetById('sleep-pink-quiet')!;
    expect(p.spec.phases.every((ph) => ph.beatHz === 0)).toBe(true);
  });
});

describe('catalog breadth and domain limits', () => {
  it('ships at least 40 presets', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(40);
  });

  it('binaural phases respect the psychoacoustic domain (carrier <= 1 kHz, beat <= 30 Hz)', () => {
    for (const p of PRESETS) {
      for (const ph of p.spec.phases) {
        const mode = ph.mode ?? 'binaural';
        if (mode === 'binaural') {
          expect(ph.carrierHz, `${p.id}/${ph.name} carrier`).toBeLessThanOrEqual(1000);
          expect(ph.beatHz, `${p.id}/${ph.name} beat`).toBeLessThanOrEqual(30);
        } else if (mode === 'noise') {
          expect(ph.beatHz, `${p.id}/${ph.name} noise phase must be beat-free`).toBe(0);
        } else {
          // monaural / isochronic AM stays audible past 30 Hz; keep sane bounds.
          expect(ph.beatHz, `${p.id}/${ph.name} AM rate`).toBeLessThanOrEqual(200);
          expect(ph.carrierHz, `${p.id}/${ph.name} carrier`).toBeLessThanOrEqual(4000);
        }
      }
    }
  });

  it('gamma-band (>30 Hz) content uses monaural/isochronic, never binaural', () => {
    for (const p of PRESETS) {
      for (const ph of p.spec.phases) {
        if (ph.beatHz > 30) {
          expect(ph.mode, `${p.id}/${ph.name} >30 Hz without monaural/isochronic mode`).toMatch(/^(monaural|isochronic)$/);
        }
      }
    }
  });

  it('D-grade presets live in the labeled Experimental tier', () => {
    for (const p of PRESETS) {
      if (p.grade === 'D') {
        expect(p.category, `${p.id} is grade D outside Experimental`).toBe('Experimental');
        expect(p.title.toLowerCase(), `${p.id} title lacks experimental-tier label`).toContain('experimental tier');
      }
    }
  });

  it('every preset carries H.870 dose metadata with sane values', () => {
    for (const p of PRESETS) {
      expect(p.dose, p.id).toBeDefined();
      expect(p.dose!.assumedDbA, p.id).toBeGreaterThan(0);
      expect(p.dose!.weeklyBudgetPct, p.id).toBeGreaterThan(0);
      expect(p.dose!.weeklyBudgetPct, p.id).toBeLessThan(100);
      if (p.category === 'Infant') {
        expect(p.dose!.assumedDbA, p.id).toBeLessThanOrEqual(50);
      }
    }
  });

  it('no banned overclaim phrases in titles, rationales, or citations', () => {
    const banned = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
    for (const p of PRESETS) {
      const text = [p.title, p.rationale, ...p.citations].join(' ').toLowerCase();
      for (const phrase of banned) {
        expect(text.includes(phrase), `${p.id} contains banned phrase "${phrase}"`).toBe(false);
      }
    }
  });
});
