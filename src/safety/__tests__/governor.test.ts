import { describe, it, expect } from 'vitest';
import {
  SafetyGovernor,
  DEFAULT_GOVERNOR_CONFIG,
  INFANT_MAX_LOWPASS_HZ,
  INFANT_HEARTBEAT_BPM_MIN,
  INFANT_HEARTBEAT_BPM_MAX,
  INFANT_MAX_SESSION_MIN,
  type GovernorSessionSpec,
} from '../governor';
import { INFANT_CEILING_DBA } from '../dose';

const ack = { drivingWarningAcknowledged: true };

const goodAdult: GovernorSessionSpec = { durationMin: 30, gainDbFs: -12 };

const goodInfant: GovernorSessionSpec = {
  durationMin: 30,
  gainDbFs: -28,
  lowpassHz: 900,
  autoShutoff: true,
  targetDbA: 48,
  heartbeatBpm: 70,
};

describe('general authorization', () => {
  it('blocks every session until the driving warning is acknowledged', () => {
    const g = new SafetyGovernor();
    const r = g.authorizeSession(goodAdult);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes('Driving'))).toBe(true);
  });

  it('authorizes a sane session once acknowledged', () => {
    const g = new SafetyGovernor(ack);
    expect(g.authorizeSession(goodAdult).ok).toBe(true);
  });

  it('enforces the default 90-minute cap', () => {
    const g = new SafetyGovernor(ack);
    const r = g.authorizeSession({ ...goodAdult, durationMin: 91 });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes('90-minute limit'))).toBe(true);
  });

  it('respects a custom session cap', () => {
    const g = new SafetyGovernor({ ...ack, maxSessionMin: 20 });
    expect(g.authorizeSession({ ...goodAdult, durationMin: 21 }).ok).toBe(false);
    expect(g.authorizeSession({ ...goodAdult, durationMin: 20 }).ok).toBe(true);
  });

  it('enforces the -6 dBFS gain cap', () => {
    const g = new SafetyGovernor(ack);
    const r = g.authorizeSession({ ...goodAdult, gainDbFs: -5 });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes('dBFS cap'))).toBe(true);
  });

  it('rejects non-positive durations and non-finite gain', () => {
    const g = new SafetyGovernor(ack);
    expect(g.authorizeSession({ ...goodAdult, durationMin: 0 }).ok).toBe(false);
    expect(g.authorizeSession({ ...goodAdult, durationMin: NaN }).ok).toBe(false);
    expect(g.authorizeSession({ ...goodAdult, gainDbFs: NaN }).ok).toBe(false);
  });
});

describe('infant mode', () => {
  const infant = new SafetyGovernor({ ...ack, infantMode: true });

  it('authorizes a compliant infant session', () => {
    expect(infant.authorizeSession(goodInfant).ok).toBe(true);
  });

  it('requires a low-pass at or below 1000 Hz', () => {
    expect(infant.authorizeSession({ ...goodInfant, lowpassHz: undefined }).ok).toBe(false);
    const r = infant.authorizeSession({ ...goodInfant, lowpassHz: INFANT_MAX_LOWPASS_HZ + 1 });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes('1000 Hz'))).toBe(true);
    expect(infant.authorizeSession({ ...goodInfant, lowpassHz: INFANT_MAX_LOWPASS_HZ }).ok).toBe(true);
  });

  it(`requires a calibrated target at or below ${INFANT_CEILING_DBA} dBA`, () => {
    const missing = infant.authorizeSession({ ...goodInfant, targetDbA: undefined });
    expect(missing.ok).toBe(false);
    expect(missing.reasons.some((s) => s.includes('calibrated output target'))).toBe(true);
    expect(infant.authorizeSession({ ...goodInfant, targetDbA: INFANT_CEILING_DBA + 1 }).ok).toBe(false);
    expect(infant.authorizeSession({ ...goodInfant, targetDbA: INFANT_CEILING_DBA }).ok).toBe(true);
  });

  it('requires automatic shutoff', () => {
    expect(infant.authorizeSession({ ...goodInfant, autoShutoff: false }).ok).toBe(false);
    expect(infant.authorizeSession({ ...goodInfant, autoShutoff: undefined }).ok).toBe(false);
  });

  it('caps infant sessions at NICU-norm length regardless of the general cap', () => {
    const r = infant.authorizeSession({ ...goodInfant, durationMin: INFANT_MAX_SESSION_MIN + 1 });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes(`${INFANT_MAX_SESSION_MIN} minutes`))).toBe(true);
    expect(infant.authorizeSession({ ...goodInfant, durationMin: INFANT_MAX_SESSION_MIN }).ok).toBe(true);
  });

  it('restricts heartbeat content to the maternal resting range', () => {
    expect(
      infant.authorizeSession({ ...goodInfant, heartbeatBpm: INFANT_HEARTBEAT_BPM_MIN - 1 }).ok,
    ).toBe(false);
    expect(
      infant.authorizeSession({ ...goodInfant, heartbeatBpm: INFANT_HEARTBEAT_BPM_MAX + 1 }).ok,
    ).toBe(false);
    expect(
      infant.authorizeSession({ ...goodInfant, heartbeatBpm: INFANT_HEARTBEAT_BPM_MIN }).ok,
    ).toBe(true);
    expect(
      infant.authorizeSession({ ...goodInfant, heartbeatBpm: INFANT_HEARTBEAT_BPM_MAX }).ok,
    ).toBe(true);
  });

  it('collects multiple violations at once', () => {
    const g = new SafetyGovernor({ infantMode: true });
    const r = g.authorizeSession({ durationMin: 120, gainDbFs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reasons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('panic sequence', () => {
  it('always ends in full silence within the step total', () => {
    const p = new SafetyGovernor().panicSequence();
    expect(p.endGainLinear).toBe(0);
    const stepSum = p.steps.reduce((a, s) => a + s.durationSec, 0);
    expect(stepSum).toBeCloseTo(p.totalSec, 10);
    expect(p.totalSec).toBeLessThanOrEqual(2.5);
    expect(p.steps[p.steps.length - 1].toGainLinear).toBe(0);
    expect(p.steps[0].fromGainLinear).toBeGreaterThan(0);
    expect(p.pulseHz).toBe(10);
  });
});

describe('advisory texts', () => {
  it('medication text is precautionary, never mechanistic', () => {
    const t = new SafetyGovernor().advisoryTexts().medication;
    expect(t.toLowerCase()).toContain('precaution');
    expect(t).toContain('no studies');
    expect(t.toLowerCase()).toContain('consult your clinician');
  });

  it('crisis text includes 988 and an international path', () => {
    const t = new SafetyGovernor().advisoryTexts().crisis;
    expect(t).toContain('988');
    expect(t).toContain('findahelpline.com');
  });

  it('seizure text excludes users with seizure history; driving text warns', () => {
    const a = new SafetyGovernor().advisoryTexts();
    expect(a.seizure.toLowerCase()).toContain('epilepsy');
    expect(a.driving.toLowerCase()).toContain('driving');
  });
});

describe('config', () => {
  it('defaults: 90 min, -6 dBFS, adult mode, unacknowledged', () => {
    expect(DEFAULT_GOVERNOR_CONFIG.maxSessionMin).toBe(90);
    expect(DEFAULT_GOVERNOR_CONFIG.maxGainDbFs).toBe(-6);
    expect(DEFAULT_GOVERNOR_CONFIG.infantMode).toBe(false);
    expect(DEFAULT_GOVERNOR_CONFIG.drivingWarningAcknowledged).toBe(false);
  });
});
