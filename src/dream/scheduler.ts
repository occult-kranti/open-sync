/**
 * Sleep & Dream scheduler — PURE logic, node-testable (no DOM, no Date.now).
 *
 * Implements skills/lucid-dreaming-evidence-grading rules:
 *  - WBTB: wake 4.5–6 h after sleep onset, 20–40 min awake, capped at
 *    2–3 nights/week (enforced here: a 3rd+ plan in one ISO week is refused).
 *  - TLR: cue replay from ~6 h after sleep onset (Mallett 2024 home window)
 *    or after the WBTB return-to-sleep; cue windows are always asserted to
 *    fall inside the REM-rich last third of the night.
 *  - Screen-and-advise: insomnia / psychosis-spectrum / dissociative answers
 *    produce warnings; insomnia refuses WBTB (scheduled waking can entrench
 *    conditioned arousal).
 */

import type { ScreeningAnswers } from './protocols';

/** Minutes in a day. */
export const DAY_MIN = 1440;
/** WBTB cap: max nights per ISO week (skill rail: 2–3 nights/week). */
export const WBTB_WEEKLY_CAP = 3;
/** Validated WBTB wake window bounds (Aspy 2017 / LaBerge 2018). */
export const WBTB_WAKE_AFTER = { min: 270, default: 300, max: 360 } as const; // 4.5–6 h
export const WBTB_AWAKE = { min: 20, default: 30, max: 40 } as const; // minutes
/** TLR home replay assumption (Mallett 2024): cues begin ~6 h after sleep onset. */
export const TLR_REPLAY_AFTER_ONSET_MIN = 360;

// ---------------------------------------------------------------------------
// Clock helpers — all times are minutes; absolute times are mod 1440 so plans
// cross midnight correctly.
// ---------------------------------------------------------------------------

/** Minutes-since-midnight wrapper. */
export interface ClockPoint {
  /** Minutes since local midnight, 0..1439 (midnight-crossing safe). */
  absMin: number;
  /** Minutes after bedtime. */
  relMin: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Format absolute minutes as HH:MM (24 h). */
export function fmtMin(absMin: number): string {
  const m = ((Math.round(absMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Parse a bedtime string into minutes since midnight.
 * Accepts "HH:MM" (24 h) and "H:MM am/pm" (12 h, case-insensitive).
 * Returns null for anything else or out-of-range values.
 */
export function parseBedtime(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  const m12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(s);
  if (m12) {
    const h = Number(m12[1]);
    const min = Number(m12[2]);
    if (h < 1 || h > 12 || min > 59) return null;
    return ((h % 12) + (m12[3] === 'pm' ? 12 : 0)) * 60 + min;
  }
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Night plan
// ---------------------------------------------------------------------------

export interface NightPlanOptions {
  /** Bedtime, minutes since midnight (use parseBedtime for strings). */
  bedtimeMin: number;
  /** Assumed sleep-onset latency (default 15 min). */
  sleepOnsetLatencyMin?: number;
  /** Total sleep opportunity in minutes (default 480 = 8 h). */
  sleepOpportunityMin?: number;
  /** WBTB: wake this many minutes after sleep onset (clamped to 270–360). */
  wakeAfterMin?: number;
  /** WBTB: stay awake this long (clamped to 20–40). */
  awakeWindowMin?: number;
  /** Include a WBTB alarm (default true). */
  includeWbtb?: boolean;
  /** Include a TLR cue window (default true). */
  includeTlr?: boolean;
  /** Optional screening answers; insomnia refuses WBTB. */
  screening?: ScreeningAnswers;
}

export interface WbtbPlan {
  alarm: ClockPoint;
  backToBed: ClockPoint;
  awakeWindowMin: number;
}

export interface TlrPlan {
  /** Cue replay window. Always inside the REM-rich window and before wake. */
  windowStart: ClockPoint;
  windowEnd: ClockPoint;
  /** REM-rich (last-third-of-night) window the cues were fitted into. */
  remWindowStartRel: number;
  remWindowEndRel: number;
  /** Jittered inter-cue gap range, seconds (Wolk 2024). */
  interCueGapSec: { min: number; max: number };
}

export interface NightPlan {
  bedtime: ClockPoint;
  sleepOnset: ClockPoint;
  wakeTime: ClockPoint;
  wbtb: WbtbPlan | null;
  tlr: TlrPlan | null;
  warnings: string[];
}

const pt = (bedtimeMin: number, relMin: number): ClockPoint => ({
  absMin: (((bedtimeMin + relMin) % DAY_MIN) + DAY_MIN) % DAY_MIN,
  relMin,
});

/**
 * Compute tonight's plan from a bedtime. Never throws on sane ranges; bad
 * combinations produce warnings and omitted sub-plans instead.
 */
export function planNight(opts: NightPlanOptions): NightPlan {
  const warnings: string[] = [];
  const bedtimeMin = ((Math.round(opts.bedtimeMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const latency = clamp(opts.sleepOnsetLatencyMin ?? 15, 0, 120);
  const opportunity = clamp(opts.sleepOpportunityMin ?? 480, 240, 720);
  const includeWbtb0 = opts.includeWbtb ?? true;
  const includeTlr = opts.includeTlr ?? true;

  const onsetRel = latency;
  const wakeRel = latency + opportunity;
  // REM-rich window: final third of the sleep opportunity.
  const remStartRel = latency + (opportunity * 2) / 3;
  const remEndRel = wakeRel;

  // ---- screening advisories ------------------------------------------------
  let includeWbtb = includeWbtb0;
  const sc = opts.screening;
  if (sc?.insomnia) {
    if (includeWbtb0) {
      warnings.push(
        'Screening: insomnia — WBTB refused (scheduled waking can entrench conditioned arousal). Bedtime-only MILD is the low-cost default.',
      );
      includeWbtb = false;
    } else {
      warnings.push('Screening: insomnia — keep to bedtime-only MILD; consider CBT-I as first-line care.');
    }
  }
  if (sc?.psychosisSpectrum) {
    warnings.push(
      'Screening: psychosis-spectrum — deliberate dream/reality boundary work may exacerbate symptoms; consult a clinician before induction practice.',
    );
  }
  if (sc?.dissociative) {
    warnings.push(
      'Screening: dissociative/derealization-prone — reality-testing and induction correlate with dissociation measures; proceed only with clinical guidance.',
    );
  }
  if (sc?.nightmareDisorder) {
    warnings.push(
      'Screening: nightmare disorder — use the IRT-informed nightmare card; frequent nightmares plus lucidity associate with worse mood. Severe PTSD: clinical care first.',
    );
  }

  // ---- WBTB ----------------------------------------------------------------
  let wbtb: WbtbPlan | null = null;
  if (includeWbtb) {
    const wakeAfter = clamp(opts.wakeAfterMin ?? WBTB_WAKE_AFTER.default, WBTB_WAKE_AFTER.min, WBTB_WAKE_AFTER.max);
    const awake = clamp(opts.awakeWindowMin ?? WBTB_AWAKE.default, WBTB_AWAKE.min, WBTB_AWAKE.max);
    const alarmRel = onsetRel + wakeAfter;
    const backRel = alarmRel + awake;
    if (backRel >= wakeRel) {
      warnings.push('Sleep opportunity too short for a WBTB window — alarm omitted; get a full night instead.');
    } else {
      wbtb = { alarm: pt(bedtimeMin, alarmRel), backToBed: pt(bedtimeMin, backRel), awakeWindowMin: awake };
      if (wakeAfter !== (opts.wakeAfterMin ?? WBTB_WAKE_AFTER.default)) {
        warnings.push(`WBTB wake point clamped to the validated 4.5–6 h window (${wakeAfter} min after sleep onset).`);
      }
      if (awake !== (opts.awakeWindowMin ?? WBTB_AWAKE.default)) {
        warnings.push(`WBTB awake window clamped to the validated 20–40 min range (${awake} min).`);
      }
    }
  }

  // ---- TLR cue window -------------------------------------------------------
  let tlr: TlrPlan | null = null;
  if (includeTlr) {
    // Home/no-EEG: begin ~6 h after sleep onset; with WBTB, begin after
    // return-to-sleep (+ assumed re-onset latency).
    let cueStartRel = onsetRel + TLR_REPLAY_AFTER_ONSET_MIN;
    if (wbtb) cueStartRel = Math.min(cueStartRel, wbtb.backToBed.relMin + latency);
    // Never cue before the REM-rich window — deep-NREM cues are pointless + disruptive.
    if (cueStartRel < remStartRel) cueStartRel = remStartRel;
    const cueEndRel = remEndRel;
    if (cueStartRel >= cueEndRel) {
      warnings.push(
        'TLR cue window falls outside this sleep opportunity — cues omitted. TLR needs a long enough night to reach the REM-rich last third.',
      );
    } else {
      tlr = {
        windowStart: pt(bedtimeMin, cueStartRel),
        windowEnd: pt(bedtimeMin, cueEndRel),
        remWindowStartRel: remStartRel,
        remWindowEndRel: remEndRel,
        interCueGapSec: { min: 60, max: 300 },
      };
    }
  }

  if (includeWbtb0 && wbtb) {
    warnings.push(`WBTB rail: max ${WBTB_WEEKLY_CAP} nights/week, never before a high-stakes morning.`);
  }

  return {
    bedtime: pt(bedtimeMin, 0),
    sleepOnset: pt(bedtimeMin, onsetRel),
    wakeTime: pt(bedtimeMin, wakeRel),
    wbtb,
    tlr,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Weekly cap (ISO week, 2–3 WBTB nights/week)
// ---------------------------------------------------------------------------

/** ISO-8601 week key (year*100 + week) for a date — pure, timezone-stable for local dates. */
export function isoWeekKey(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Thursday of this week determines the ISO week/year.
  const day = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  date.setDate(date.getDate() - day + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const ftDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - ftDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return date.getFullYear() * 100 + week;
}

/**
 * Weekly-cap gate. `planned` = dates already holding a WBTB night this week.
 * Returns ok=false once WBTB_WEEKLY_CAP nights are already planned (so the
 * (CAP+1)-th plan — the 4th — is refused; at most WBTB_WEEKLY_CAP nights
 * per ISO week).
 */
export function wbtbWeeklyGate(
  planned: readonly Date[],
  candidate: Date,
): { ok: boolean; count: number; warning: string | null } {
  const key = isoWeekKey(candidate);
  const count = planned.filter((d) => isoWeekKey(d) === key).length;
  if (count >= WBTB_WEEKLY_CAP) {
    return {
      ok: false,
      count,
      warning: `Weekly WBTB cap reached (${WBTB_WEEKLY_CAP} nights this week). Sleep fragmentation is the primary real cost — use bedtime-only MILD until next week.`,
    };
  }
  return { ok: true, count, warning: null };
}

// ---------------------------------------------------------------------------
// Reality-check reminder schedule (≥5 genuine checks/day)
// ---------------------------------------------------------------------------

/** Evenly spaced reminder times (minutes since midnight) between start and end. */
export function realityCheckSchedule(opts: {
  startMin: number;
  endMin: number;
  count: number;
}): { timesMin: number[]; warnings: string[] } {
  const warnings: string[] = [];
  let count = Math.floor(opts.count);
  if (count < 5) {
    warnings.push('Reality testing needs ≥5 genuine checks/day — raised to 5.');
    count = 5;
  }
  if (count > 24) {
    warnings.push('More than 24 reminders/day is autopilot territory — capped at 24.');
    count = 24;
  }
  const start = clamp(Math.round(opts.startMin), 0, DAY_MIN - 1);
  const end = clamp(Math.round(opts.endMin), 0, DAY_MIN);
  if (end <= start) {
    const fallback = realityCheckSchedule({ startMin: 540, endMin: 1320, count });
    return {
      timesMin: fallback.timesMin,
      warnings: [...warnings, 'Reminder window is empty or inverted — using 09:00–22:00.', ...fallback.warnings],
    };
  }
  const span = end - start;
  const timesMin = Array.from({ length: count }, (_, i) =>
    Math.round(start + (span * (i + 0.5)) / count),
  );
  return { timesMin, warnings };
}
