/**
 * Quick Lab — shared types for the blinded n-of-1 self-experiment runner.
 *
 * Protocols are distilled from the T1 fast-test matrix
 * (research/deep_theory_edge_cases.md, Part 5) and the G10 experiment
 * registry (research/experiment_registry.md, X01–X14).
 *
 * Language discipline (registry rule 2 / Advisor S12.2): every user-facing
 * string uses hedged wording ("biases toward", "is associated with");
 * "induces", "synchronizes", "attunes", "CIA-validated", "digital drug" are
 * banned and enforced by the claim lint in src/quicklab/__tests__.
 *
 * Blinding model (S20.1): the session log stores only opaque condition
 * codes. The code→arm mapping (the "sealed key") is fixed at enrollment by
 * a logged seed and is revealed only after the protocol completes.
 */

import type { Phase } from '@/engine';

/** All Quick Lab arms are fully blinded until protocol completion. */
export type Blinding = 'full';

/** Safety class per audio-protocol-design SKILL (experimental ⇒ explicit opt-in). */
export type SafetyClass = 'adult' | 'experimental';

/**
 * One arm of a protocol. `id` and `description` are SEALED material: they
 * must never appear in the blinded session log or in pre-completion UI.
 * Only `code` (an opaque label derived from the enrollment seed) is visible
 * while the protocol is running.
 */
export interface ArmSpec {
  /**
   * Sealed arm identity, e.g. 'veridical' | 'sham-active' | 'control-0hz'.
   * Never rendered before completion.
   */
  id: string;
  /** Sealed plain-language description, revealed after completion. */
  description: string;
  /**
   * Session stimulus mapped to the engine Phase shape (src/engine/types.ts).
   * Rendered through the live session engine; all levels respect the
   * audio-protocol-design hard limits (binaural carrier ≤ ~1 kHz,
   * |Δf| ≤ ~30 Hz for percept-bearing arms, ≤ −1 dBTP ceiling).
   */
  phases: Phase[];
  /**
   * Onset ramp in seconds for the phase plan (H3-style envelope ergonomics
   * parameter; recorded in the render manifest). 10 s = slow ritual ramp,
   * 0.01 s = near-abrupt onset (discomfort arm).
   */
  attackSec: number;
  /** Sealed citation note for the arm construction (e.g. "X05 sham: 7.37 Hz"). */
  constructionNote: string;
  /**
   * H9 ear-swap flag: play the phase plan with L/R assignments exchanged
   * (rendered as carrierHz+beatHz on the left, −beatHz on the right), which
   * reverses the perceived rotation direction while leaving the rate intact.
   */
  channelSwap?: boolean;
}

/** A 1–7 (or wider) post-session self-report scale. */
export interface OutcomeScale {
  id: string;
  /** Short label, e.g. "Calm". */
  label: string;
  /** Anchor text for the low end. */
  lowAnchor: string;
  /** Anchor text for the high end. */
  highAnchor: string;
  min: number;
  max: number;
}

/** Which two arms the primary n-of-1 contrast compares (indices into arms). */
export interface PrimaryContrast {
  /** "Treatment-like" arm index. */
  a: number;
  /** "Control-like" arm index. */
  b: number;
  /** Hedged plain-language description of the contrast, e.g. "sessions with arm A vs arm B on calm+focus". */
  label: string;
}

export interface QuickLabProtocol {
  id: string;
  title: string;
  /** T1 hypothesis id (H1–H12 from deep_theory_edge_cases.md Part 4). */
  hypothesisId: string;
  /** Registry experiments this protocol cheaply proxies (X01–X14). */
  registryLinks: string[];
  /** The falsifiable question, hedged. */
  question: string;
  /** What a mundane (ritual/expectancy/noise) model predicts — the ledger entry to beat. */
  mundaneModel: string;
  arms: ArmSpec[];
  primaryContrast: PrimaryContrast;
  /** Outcome scales collected after every session (calm/focus are mandatory). */
  outcomeScales: OutcomeScale[];
  /** Whether the optional 60 s reaction-time tap test is offered. */
  tapTest: boolean;
  /** Honesty gate: no verdict below this many completed sessions. */
  minSessions: number;
  blinding: Blinding;
  safetyClass: SafetyClass;
  /** Session length in minutes (dose accounting uses this). */
  sessionMinutes: number;
  /** Screening questions shown at enrollment (before schedule generation). */
  screening: { id: string; prompt: string; kind: 'yes-no' | 'acknowledge' }[];
  /**
   * Power note (Advisor gate #12 corrected): what group-scale N the same
   * question would need; the n-of-1 run is an estimation exercise, never a
   * confirmatory test.
   */
  powerNote: string;
  /** One-line "why this first/why at all" from the T1 priority ordering. */
  priorityNote: string;
}

/** Confidence tag for citations (Advisor gate #12: Zhao 2025 is low-medium). */
export type CitationConfidence = 'high' | 'medium' | 'low-medium';

export interface ProtocolCitation {
  label: string;
  url?: string;
  confidence?: CitationConfidence;
}
