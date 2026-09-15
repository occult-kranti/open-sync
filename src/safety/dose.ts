/**
 * WHO-ITU H.870-style sound-dose tracking (pure, platform-independent).
 *
 * Reference exposures (ITU-T H.870 "Safe listening devices and systems", 2019):
 *   - Mode 1 (adults):             80 dBA for 40 h per 7 days  (1.6 Pa^2·h)
 *   - Mode 2 (children/sensitive): 75 dBA for 40 h per 7 days  (0.51 Pa^2·h)
 * Dose accumulates with a 3 dB exchange rate (equal-energy principle, as in
 * NIOSH REL): every +3 dB doubles the dose rate and halves the allowed time.
 *
 * Sources:
 *   - WHO-ITU H.870 factsheet WHO-NMH-NVI-19.4 (2019)
 *     https://iris.who.int/bitstream/handle/10665/330020/WHO-NMH-NVI-19.4-eng.pdf
 *   - NIOSH REL 85 dBA / 3 dB exchange: https://www.cdc.gov/niosh/noise/prevent/understand.html
 *
 * Infant/NICU reference ceilings (AAP 1997 / White 2007, reaffirmed in AAP 2023):
 *   - hourly Leq <= 45 dBA, L10 <= 50 dBA, Lmax <= 65 dBA
 *   - AAP-aligned crib guidance: keep playback <= 50 dBA at the infant's ear position
 *     (Hugh et al., Pediatrics 2014, PMID 24590753: all 14 tested infant sleep
 *     machines exceeded 50 dBA at 30 cm at max volume; 3 exceeded 85 dBA).
 */

/** H.870 Mode 1 reference level for adults, dBA. */
export const REF_LEVEL_ADULT_DBA = 80;
/** H.870 Mode 2 reference level for children/sensitive users, dBA. */
export const REF_LEVEL_CHILD_DBA = 75;
/** H.870 reference duration: 40 hours per 7-day window, in seconds. */
export const REF_WEEK_SECONDS = 40 * 3600;
/** Equal-energy exchange rate in dB: +3 dB doubles the dose rate. */
export const EXCHANGE_RATE_DB = 3;

/** AAP crib guidance: continuous sound at the infant's ear position should not exceed 50 dBA. */
export const INFANT_CEILING_DBA = 50;
/** AAP/White 2007 NICU hourly equivalent continuous level ceiling. */
export const NICU_LEQ_DBA = 45;
/** AAP/White 2007 NICU absolute maximum (transient peak) level. */
export const NICU_LMAX_DBA = 65;

export type DoseMode = 'adult' | 'child';

export interface ExposureEntry {
  dbA: number;
  seconds: number;
}

/**
 * Accumulates A-weighted sound exposure and reports it as a percentage of the
 * weekly H.870 "sound allowance" for the selected mode.
 *
 * Dose model (equal energy, 3 dB exchange):
 *   doseRate(dbA) = 2^((dbA - refLevelDbA) / 3)   [relative to reference rate]
 *   doseSeconds   = seconds * doseRate(dbA)       [equivalent seconds at ref level]
 *   dosePercent   = 100 * sum(doseSeconds) / REF_WEEK_SECONDS
 */
export class SoundDoseTracker {
  readonly mode: DoseMode;
  readonly refLevelDbA: number;
  private doseSeconds = 0;
  private entries: ExposureEntry[] = [];

  constructor(mode: DoseMode = 'adult') {
    this.mode = mode;
    this.refLevelDbA = mode === 'child' ? REF_LEVEL_CHILD_DBA : REF_LEVEL_ADULT_DBA;
  }

  /**
   * Record an exposure. Rejects non-finite, zero or negative durations and
   * non-finite levels (a silent/invalid measurement must never count as dose).
   */
  addExposure(dbA: number, seconds: number): void {
    if (!Number.isFinite(dbA)) {
      throw new RangeError(`dbA must be finite, got ${dbA}`);
    }
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new RangeError(`seconds must be a positive finite number, got ${seconds}`);
    }
    this.entries.push({ dbA, seconds });
    this.doseSeconds += seconds * this.doseRateAt(dbA);
  }

  /** Dose rate multiplier relative to the reference level (1.0 at refLevelDbA). */
  doseRateAt(dbA: number): number {
    return Math.pow(2, (dbA - this.refLevelDbA) / EXCHANGE_RATE_DB);
  }

  /** Seconds of exposure at `dbA` that would consume the entire weekly allowance. */
  weeklyAllowanceSecondsAt(dbA: number): number {
    if (!Number.isFinite(dbA)) {
      throw new RangeError(`dbA must be finite, got ${dbA}`);
    }
    return REF_WEEK_SECONDS / this.doseRateAt(dbA);
  }

  /** Raw (unclamped) percentage of the weekly allowance consumed. */
  rawDosePercent(): number {
    return (100 * this.doseSeconds) / REF_WEEK_SECONDS;
  }

  /** Percentage of the weekly allowance consumed, clamped to [0, 100]. */
  weeklyDosePercent(): number {
    return Math.min(100, Math.max(0, this.rawDosePercent()));
  }

  /** True once the weekly allowance is fully consumed (H.870 threshold). */
  isOverLimit(): boolean {
    return this.rawDosePercent() >= 100;
  }

  /**
   * Remaining listening time in seconds if all further exposure happens at `dbA`.
   * Returns 0 when the allowance is exhausted.
   */
  timeRemainingSec(dbA: number): number {
    if (!Number.isFinite(dbA)) {
      throw new RangeError(`dbA must be finite, got ${dbA}`);
    }
    const remainingDoseSeconds = Math.max(0, REF_WEEK_SECONDS - this.doseSeconds);
    return remainingDoseSeconds / this.doseRateAt(dbA);
  }

  /** Read-only log of recorded exposures (for UI dose history). */
  get history(): readonly ExposureEntry[] {
    return this.entries;
  }

  /** Start a new 7-day window. */
  reset(): void {
    this.doseSeconds = 0;
    this.entries = [];
  }
}
