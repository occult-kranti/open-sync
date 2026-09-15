/**
 * Quick Lab engine — PURE, node-testable. No Web Audio, no DOM except an
 * optional StorageLike injection (defaults to globalThis.localStorage when
 * present, in-memory otherwise).
 *
 * Responsibilities:
 *  - seeded RNG (mulberry32) and block-randomized arm assignment fixed at
 *    enrollment (seed logged on the enrollment record);
 *  - blinding (S20.1): the session log carries only opaque condition codes;
 *    the code→arm key is sealed until the protocol completes;
 *  - session log persistence with corrupt-storage salvage;
 *  - n-of-1 stats: n, mean difference, 95% t-based CI, with the honesty
 *    gates (< minSessions → 'keep-going' only; CI spanning 0 →
 *    'inconclusive', never "no effect"; zero variance → 'inconclusive');
 *  - H.870 dose integration helpers (refuse when the weekly dose is spent).
 */

import { SoundDoseTracker } from '@/safety/dose';
import type { QuickLabProtocol } from './types';

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

/** mulberry32: tiny deterministic PRNG, seed → [0,1) stream. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a fresh seed from crypto when available, else from time. */
export function freshSeed(): number {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } };
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    g.crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Date.now() ^ 0x9e3779b9) >>> 0;
}

// ---------------------------------------------------------------------------
// Block-randomized schedule
// ---------------------------------------------------------------------------

/**
 * Block-randomized arm assignment, fixed at enrollment. Each block of
 * `armCount` sessions is a shuffled permutation of the arms, so at any
 * session prefix the per-arm counts differ by at most 1.
 */
export function createSchedule(armCount: number, seed: number, totalSessions: number): number[] {
  if (armCount < 2) throw new RangeError('need at least 2 arms');
  if (totalSessions <= 0) return [];
  const rand = mulberry32(seed);
  const out: number[] = [];
  while (out.length < totalSessions) {
    const block = Array.from({ length: armCount }, (_, i) => i);
    // Fisher–Yates with the seeded stream.
    for (let i = block.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [block[i], block[j]] = [block[j], block[i]];
    }
    out.push(...block);
  }
  return out.slice(0, totalSessions);
}

/** Per-arm counts for a schedule prefix — used by the balance property test. */
export function armCounts(schedule: readonly number[], armCount: number): number[] {
  const counts = Array.from({ length: armCount }, () => 0);
  for (const a of schedule) counts[a] += 1;
  return counts;
}

/** Opaque condition code for one session slot (no arm identity inside). */
export function sessionCode(seed: number, index: number): string {
  const rand = mulberry32((seed ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0);
  const n = Math.floor(rand() * 0xffff);
  return `QL-${n.toString(16).toUpperCase().padStart(4, '0')}-${index + 1}`;
}

// ---------------------------------------------------------------------------
// Enrollment state & session log
// ---------------------------------------------------------------------------

export interface ScreeningAnswer {
  id: string;
  answer: boolean;
}

export interface SessionRecord {
  /** Opaque code from the schedule — never an arm id. */
  code: string;
  /** ISO timestamps; a session may start before and end after midnight. */
  startedAt: string;
  completedAt: string;
  /** Local calendar day of the START time (YYYY-MM-DD) — sessions belong to the day they began. */
  day: string;
  /** Scale id → value. */
  scales: Record<string, number>;
  /** Optional 60 s reaction-time tap test. */
  tapTest?: { taps: number; medianMs: number };
  /** True once the session's exposure was debited to the H.870 tracker. */
  doseDebited: boolean;
}

export interface Enrollment {
  version: 1;
  protocolId: string;
  /** Logged seed — the whole schedule is reproducible from it. */
  seed: number;
  createdAt: string;
  /** Number of sessions the schedule was generated for. */
  plannedSessions: number;
  /** Opaque codes, one per session slot. Arm identity is NOT stored here. */
  codes: string[];
  /**
   * Sealed key: codes[i] → arm index. Present in the persisted record (the
   * app must survive reloads) but excluded from every blinded view/export
   * and never rendered until completion.
   */
  sealedKey: number[];
  screening: ScreeningAnswer[];
  sessions: SessionRecord[];
  completedAt: string | null;
}

export function enroll(
  protocol: QuickLabProtocol,
  opts: { seed?: number; plannedSessions?: number; screening?: ScreeningAnswer[]; now?: Date } = {},
): Enrollment {
  const seed = opts.seed ?? freshSeed();
  const plannedSessions = Math.max(opts.plannedSessions ?? protocol.minSessions, protocol.minSessions);
  const assignment = createSchedule(protocol.arms.length, seed, plannedSessions);
  return {
    version: 1,
    protocolId: protocol.id,
    seed,
    createdAt: (opts.now ?? new Date()).toISOString(),
    plannedSessions,
    codes: Array.from({ length: plannedSessions }, (_, i) => sessionCode(seed, i)),
    sealedKey: assignment,
    screening: opts.screening ?? [],
    sessions: [],
    completedAt: null,
  };
}

/** Local calendar day (YYYY-MM-DD) for an ISO timestamp. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Next session slot index, or null when the schedule is exhausted. */
export function nextSessionIndex(e: Enrollment): number | null {
  if (e.completedAt) return null;
  const i = e.sessions.length;
  return i < e.plannedSessions ? i : null;
}

/**
 * The arm index for a session slot. SEALED: throws while the protocol is
 * incomplete so UI code cannot accidentally reveal it.
 */
export function armForSession(e: Enrollment, index: number): number {
  if (!e.completedAt) {
    throw new Error('arm assignment is sealed until protocol completion');
  }
  const arm = e.sealedKey[index];
  if (arm === undefined) throw new RangeError(`no session slot ${index}`);
  return arm;
}

/**
 * Internal runner-only lookup: which arm index to PLAY for the next session.
 * Used by the session runner to configure the audio engine; the result must
 * never be rendered. (Blinding is at the UI/log layer, not at playback.)
 */
export function armToPlay(e: Enrollment): { index: number; armIndex: number; code: string } | null {
  const i = nextSessionIndex(e);
  if (i === null) return null;
  return { index: i, armIndex: e.sealedKey[i], code: e.codes[i] };
}

/** Append a completed session; marks the enrollment complete at the planned n. */
export function recordSession(e: Enrollment, rec: Omit<SessionRecord, 'code' | 'day'>): Enrollment {
  const i = nextSessionIndex(e);
  if (i === null) throw new Error('protocol already complete');
  const full: SessionRecord = { ...rec, code: e.codes[i], day: dayKey(rec.startedAt) };
  const sessions = [...e.sessions, full];
  const done = sessions.length >= e.plannedSessions;
  return { ...e, sessions, completedAt: done ? rec.completedAt : e.completedAt };
}

/**
 * Blinded export — everything the UI may show pre-completion. The sealed
 * key and any arm identity are stripped. Post-completion the key stays out
 * of the log too; use revealSchedule() for the one-time reveal.
 */
export function blindedView(e: Enrollment): Omit<Enrollment, 'sealedKey'> {
  const copy: Partial<Enrollment> = { ...e };
  delete copy.sealedKey;
  return copy as Omit<Enrollment, 'sealedKey'>;
}

/** Reveal the assignment (only valid after completion). */
export function revealSchedule(e: Enrollment): { code: string; armIndex: number }[] {
  if (!e.completedAt) throw new Error('schedule is sealed until protocol completion');
  return e.codes.map((code, i) => ({ code, armIndex: e.sealedKey[i] }));
}

// ---------------------------------------------------------------------------
// Persistence (localStorage-compatible, injectable)
// ---------------------------------------------------------------------------

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'opensync.quicklab.v1';

/** In-memory StorageLike (tests / SSR). */
export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Default storage: localStorage when present, else in-memory. */
export function defaultStorage(): StorageLike {
  const g = globalThis as { localStorage?: StorageLike };
  try {
    if (g.localStorage) {
      // Probe — Safari private mode throws on write.
      g.localStorage.setItem('__ql_probe__', '1');
      g.localStorage.removeItem('__ql_probe__');
      return g.localStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return memoryStorage();
}

function isEnrollment(x: unknown): x is Enrollment {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Partial<Enrollment>;
  return (
    e.version === 1 &&
    typeof e.protocolId === 'string' &&
    typeof e.seed === 'number' &&
    Array.isArray(e.codes) &&
    Array.isArray(e.sealedKey) &&
    Array.isArray(e.sessions)
  );
}

/**
 * Load enrollments, salvaging what can be salvaged. A corrupt blob is never
 * thrown on: it is quarantined under `${key}.corrupt` and the store reset.
 * Records failing the shape check are dropped individually.
 */
export function loadEnrollments(storage: StorageLike, key: string = STORAGE_KEY): Enrollment[] {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      storage.setItem(`${key}.corrupt`, raw);
      storage.removeItem(key);
    } catch {
      /* storage may be read-only; salvage still returns [] */
    }
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isEnrollment);
}

export function saveEnrollments(storage: StorageLike, enrollments: Enrollment[], key: string = STORAGE_KEY): void {
  storage.setItem(key, JSON.stringify(enrollments));
}

export function upsertEnrollment(storage: StorageLike, e: Enrollment, key: string = STORAGE_KEY): Enrollment[] {
  const all = loadEnrollments(storage, key);
  const idx = all.findIndex((x) => x.protocolId === e.protocolId && x.createdAt === e.createdAt);
  if (idx >= 0) all[idx] = e;
  else all.push(e);
  saveEnrollments(storage, all, key);
  return all;
}

// ---------------------------------------------------------------------------
// Stats — honesty-gated n-of-1 estimate
// ---------------------------------------------------------------------------

export type VerdictState = 'keep-going' | 'inconclusive' | 'signal';

export interface AnalysisResult {
  state: VerdictState;
  /** Sessions completed in the two contrast arms (n_a, n_b) and total. */
  n: { a: number; b: number; total: number };
  /** Primary outcome per session = mean of the mandatory calm/focus scales. */
  meanDiff: number | null;
  ci95: [number, number] | null;
  /** True when both contrast arms have zero variance (CI width degenerate). */
  zeroVariance: boolean;
  /** Claim-lint-compliant result text. */
  text: string;
}

/** Primary outcome for a session: mean of the first two scales (calm/focus) unless the protocol's contrast targets salience. */
export function primaryOutcome(protocol: QuickLabProtocol, rec: SessionRecord): number | null {
  const target = protocol.primaryContrast.label.includes('salience') ? 'salience' : null;
  if (target && typeof rec.scales[target] === 'number') return rec.scales[target];
  const calm = rec.scales['calm'];
  const focus = rec.scales['focus'];
  if (typeof calm === 'number' && typeof focus === 'number') return (calm + focus) / 2;
  return null;
}

/** Exact t0.975 table for small df (Student, two-tailed 95%). */
const T975_TABLE: readonly number[] = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145,
  2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048,
  2.045, 2.042, 2.04, 2.037, 2.035, 2.032, 2.03, 2.028, 2.026, 2.024, 2.023, 2.021,
];

/**
 * Two-tailed 97.5% critical value of Student's t: exact table (linearly
 * interpolated on non-integer Welch df) for df ≤ 40, Cornish–Fisher
 * expansion beyond.
 */
export function tCrit975(df: number): number {
  if (df <= 0 || !Number.isFinite(df)) return NaN;
  if (df <= T975_TABLE.length) {
    const lo = Math.max(1, Math.floor(df));
    const hi = Math.min(T975_TABLE.length, lo + 1);
    const frac = df - lo;
    return T975_TABLE[lo - 1] + frac * (T975_TABLE[hi - 1] - T975_TABLE[lo - 1]);
  }
  const z = 1.959963984540054;
  const z3 = z ** 3 + z;
  const z5 = 5 * z ** 5 + 16 * z ** 3 + 3 * z;
  const z7 = 3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z;
  return z + z3 / (4 * df) + z5 / (96 * df ** 2) + z7 / (384 * df ** 3);
}

function mean(xs: number[]): number {
  return xs.reduce((a, x) => a + x, 0) / xs.length;
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

/**
 * Analyze the pre-registered primary contrast (arm a vs arm b) of a
 * completed-or-in-progress enrollment.
 *
 * Honesty gates, in order:
 *  1. total completed sessions < minSessions → 'keep-going' (no estimate shown);
 *  2. fewer than 2 sessions in either contrast arm → 'inconclusive';
 *  3. zero variance in BOTH arms → 'inconclusive' (a degenerate CI of
 *     width 0 would overclaim precision; reported as zeroVariance);
 *  4. CI spans 0 → 'inconclusive' — NEVER worded as "no effect";
 *  5. otherwise → 'signal', worded as an n-of-1 association, not a cause.
 */
export function analyze(protocol: QuickLabProtocol, e: Enrollment): AnalysisResult {
  const total = e.sessions.length;
  const base: AnalysisResult = {
    state: 'keep-going',
    n: { a: 0, b: 0, total },
    meanDiff: null,
    ci95: null,
    zeroVariance: false,
    text: '',
  };
  if (total < protocol.minSessions) {
    base.text = `Keep going — ${total} of ${protocol.minSessions} sessions completed. Estimates unlock at ${protocol.minSessions}; nothing below that is worth reading.`;
    return base;
  }

  const { a, b } = protocol.primaryContrast;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const rec of e.sessions) {
    const idx = e.codes.indexOf(rec.code);
    if (idx < 0) continue;
    const arm = e.sealedKey[idx];
    const v = primaryOutcome(protocol, rec);
    if (v === null) continue;
    if (arm === a) xs.push(v);
    else if (arm === b) ys.push(v);
  }
  base.n = { a: xs.length, b: ys.length, total };

  if (xs.length < 2 || ys.length < 2) {
    base.state = 'inconclusive';
    base.text = `Sessions completed: ${total}, but the two compared conditions have ${xs.length} and ${ys.length} — too few per condition for an estimate. Keep going.`;
    return base;
  }

  const ma = mean(xs);
  const mb = mean(ys);
  const diff = ma - mb;
  base.meanDiff = diff;
  const va = variance(xs);
  const vb = variance(ys);

  if (va === 0 && vb === 0) {
    base.state = 'inconclusive';
    base.zeroVariance = true;
    base.ci95 = [diff, diff];
    base.text =
      ma === mb
        ? `Every session scored identically (${ma}). The interval has zero width at a difference of 0 — this means the measure did not vary, not that the conditions are equivalent. Inconclusive.`
        : `Every session in each condition scored identically (${ma} vs ${mb}), so the uncertainty interval degenerates to zero width — the scale was too coarse to measure a difference. Inconclusive, not a confirmed effect.`;
    return base;
  }

  // Welch two-sample CI.
  const se = Math.sqrt(va / xs.length + vb / ys.length);
  const df = (va / xs.length + vb / ys.length) ** 2 /
    ((va / xs.length) ** 2 / (xs.length - 1) + (vb / ys.length) ** 2 / (ys.length - 1));
  const tc = tCrit975(df);
  const ci: [number, number] = [diff - tc * se, diff + tc * se];
  base.ci95 = ci;

  const fmt = (x: number) => (Math.round(x * 100) / 100).toFixed(2);
  if (ci[0] <= 0 && ci[1] >= 0) {
    base.state = 'inconclusive';
    base.text =
      `After ${total} sessions the average difference on calm+focus between the two conditions is ${fmt(diff)} ` +
      `(95% CI [${fmt(ci[0])}, ${fmt(ci[1])}]). The interval spans zero: your data are compatible with a small real ` +
      `difference in either direction AND with none at all. Verdict: inconclusive — an interval that spans zero ` +
      `rules nothing in and rules nothing out.`;
    return base;
  }

  base.state = 'signal';
  base.text =
    `After ${total} sessions, ${protocol.primaryContrast.label} averaged ${fmt(diff)} points apart on calm+focus ` +
    `(95% CI [${fmt(ci[0])}, ${fmt(ci[1])}], interval excludes zero). In your own n-of-1 data the two conditions are ` +
    `associated with different ratings. This is an association under self-blinding — it does not establish a cause, ` +
    `and it does not transfer to other people.`;
  return base;
}

// ---------------------------------------------------------------------------
// Dose integration (WHO-ITU H.870)
// ---------------------------------------------------------------------------

export interface DoseCheck {
  ok: boolean;
  reason?: string;
  /** Dose seconds this session would add at the reference exchange rate. */
  addedDoseSeconds: number;
  /** Weekly dose percent AFTER this session. */
  projectedPercent: number;
}

/**
 * Pre-session dose gate: refuse when the weekly H.870 allowance is already
 * exhausted. Quick Lab sessions run at the protocol's fixed level
 * (−14 dBFS ≈ 62 dBA at the design reference point, DBFS_TO_DBA_OFFSET=76).
 */
export function checkDose(
  tracker: Pick<SoundDoseTracker, 'doseRateAt' | 'rawDosePercent' | 'isOverLimit'>,
  dbA: number,
  seconds: number,
): DoseCheck {
  const addedDoseSeconds = seconds * tracker.doseRateAt(dbA);
  const addedPercent = (100 * addedDoseSeconds) / (40 * 3600);
  const projectedPercent = tracker.rawDosePercent() + addedPercent;
  if (tracker.isOverLimit()) {
    return {
      ok: false,
      reason: 'Weekly sound-dose allowance (WHO-ITU H.870) is already exhausted. Quick Lab sessions are refused until the 7-day window resets — safety outranks data.',
      addedDoseSeconds,
      projectedPercent,
    };
  }
  return { ok: true, addedDoseSeconds, projectedPercent };
}

/** Debit a finished session to the tracker. Returns the post-debit percent. */
export function debitDose(tracker: SoundDoseTracker, dbA: number, seconds: number): number {
  tracker.addExposure(dbA, seconds);
  return tracker.weeklyDosePercent();
}

/** Playback level for all Quick Lab arms: −14 dBFS ≈ 62 dBA design point. */
export const QUICKLAB_DBA = 62;

/**
 * Median of a numeric sample (reaction-time tap test). Even-sized samples
 * average the two middle values — the upper-midpoint shortcut would bias the
 * logged statistic high by half an inter-tap step.
 */
export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
