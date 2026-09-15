/**
 * Shared types for the Open Sync research screens (W5).
 *
 * Content is distilled from /research/*.md (R1–R5 critical reviews, the G10
 * experiment registry, the stimulus-pack spec and the advisor goal tree).
 * Language discipline (S12.2 / registry rule 2): claims use hedged Advisor-
 * ratified wording — "biases toward", "is associated with", "produces a
 * measurable stimulus-locked response". "Induces", "synchronizes" and
 * "attunes" are banned in claim strings.
 */

import type { Grade } from '@/data/frequencies';

export type { Grade };

/** Six-pass review verdict vocabulary (critical-theory-review SKILL). */
export type Verdict = 'REPAIRABLE' | 'DEMOTE' | 'DISCARD' | 'OPEN';

export interface Citation {
  /** Short reference, e.g. "Ingendoh et al. 2023, PLOS ONE 18(5)". */
  label: string;
  url?: string;
}

/** A graded verdict scoped to a sub-claim (several entries split verdicts). */
export interface ScopedVerdict {
  verdict: Verdict;
  /** What part of the claim this verdict applies to. */
  scope: string;
}

export type ExperimentStatus = 'registered' | 'pilot' | 'parked';

export interface KillPromote {
  /** Claims this experiment can promote (hedged form) if confirmed. */
  promotes: string[];
  /** Claims this experiment demotes/kills if the mundane model wins. */
  demotes: string[];
}

export interface Experiment {
  id: string; // X01…X14
  title: string;
  /** Short class label, e.g. "EEG, in-lab". */
  classLabel: string;
  /** Ranking in the registry (1 = most decisive/cheap); null for the X14 bundle. */
  rank: number | null;
  hypothesis: string;
  /** Pre-registered primary prediction with direction/magnitude. */
  prediction: string;
  /** Null-handling rule — how a null is reported (never "no effect found"). */
  nullRule: string;
  /** Design summary (within/between, arms, blinding). */
  design: string;
  /** Mandatory mundane-explanation / active-placebo controls. */
  controls: string[];
  /** Sham / active-comparator construction. */
  sham: string;
  nTarget: number | null;
  /** Power/effect-size justification in one line. */
  powerNote: string;
  status: ExperimentStatus;
  /** Advisor-flagged decisive cheap experiment (X02, X03…). */
  advisorDecisive: boolean;
  /** Grade of the claim under test (not of the experiment). */
  claimGrade: Grade | null;
  /** True → render grade badge in the B− dashed variant. */
  gradeMinus?: boolean;
  killPromote: KillPromote;
  /** Pack file prefixes serving this protocol (e.g. 'x01_'). */
  packBlocks: string[];
  /** Success/failure decision rule (one line). */
  decisionRule: string;
  sources: string[];
}

export interface Flaw {
  id: string;
  flaw: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface KeyNumber {
  /** Mono readout value, e.g. "943 cents". */
  value: string;
  /** What it means. */
  label: string;
}

export interface Critique {
  id: string;
  title: string;
  /** Which R-pass reviewed it. */
  source: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  /** The claim under audit (popular formulation). */
  claim: string;
  verdicts: ScopedVerdict[];
  flaws: Flaw[];
  /** Strongest defensible version of the claim. */
  steelman: string;
  keyNumbers: KeyNumber[];
  citations: Citation[];
  linkedExperiments: string[];
}

export type HypothesisStatus = 'pre-registered, awaiting data';

export interface GradeChange {
  date: string;
  from: Grade;
  to: Grade;
  reason: string;
}

export interface TrackedHypothesis {
  id: string;
  claim: string;
  currentGrade: Grade;
  gradeMinus?: boolean;
  status: HypothesisStatus;
  /** What evidence would promote the claim. */
  promoteIf: string;
  /** What evidence would demote it. */
  demoteIf: string;
  linkedExperiments: string[];
  gradeHistory: GradeChange[];
}

export type DocumentedGrade = 'YES' | 'YES-T1' | 'NEGATIVE';
export type ValidatedGrade =
  | 'YES'
  | 'PARTIAL'
  | 'NO'
  | 'DISPROVED'
  | 'NEGATIVE'
  | 'NA';

export interface Program {
  /** 1–42, matching crit_r4 quick-reference numbering. */
  n: number;
  name: string;
  country: string;
  agency: string;
  years: string;
  /** Era bucket for the era filter. */
  era: '1950s–70s' | '1980s–90s' | '2000s' | '2010s' | '2020s';
  documented: DocumentedGrade;
  validated: ValidatedGrade;
  url: string | null;
  verdict: string;
  /** Official negative result — strongest debunking assets (R4 synthesis #4). */
  officialNegative?: boolean;
}

/** A stimulus-pack file entry (rendered copy or on-demand regeneration). */
export interface PackFile {
  file: string;
  block: string;
  description: string;
  durationS: number | null;
  sizeBytes: number | null;
  serves: string[];
  /** Present → rendered copy shipped in /stimulus_pack/. */
  url?: string;
  sha256?: string;
}
