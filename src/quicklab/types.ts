/**
 * Quick Lab self-test protocol types (S20.1).
 *
 * The page + engine run blinded n-of-1 self-experiments: seeded,
 * block-randomized schedules whose arm assignment is logged (seed) but
 * never revealed until the protocol completes; post-session sliders and an
 * optional 60 s reaction tap test; results render ONLY as n + estimate +
 * 95% CI with the honesty gates. These types are the contract.
 */

import type { NoiseColor, Phase } from '@/engine';

export type { Phase, NoiseColor };

/** One playable condition of a self-test protocol. */
export interface ArmSpec {
  /** Stable opaque id (never shown pre-completion). */
  id: string;
  /** Post-completion user-facing description (sealed until reveal). */
  description: string;
  /**
   * The engine render spec for this arm. Exactly one phase for v1
   * (single-session protocols); the runner configures the session engine
   * from phases[0].
   */
  phases: Phase[];
  /** Onset ramp (seconds) applied by the runner before playback. */
  attackSec: number;
  /**
   * When true the runner swaps L/R at playback time (H9 ear-swap).
   * Identity lives here, NOT in the session log.
   */
  channelSwap?: boolean;
  /** Post-completion construction note (shown at reveal). */
  constructionNote?: string;
}

/** A post-session slider. */
export interface OutcomeScale {
  id: string;
  label: string;
  lowAnchor: string;
  highAnchor: string;
  min: number;
  max: number;
}

/** Screening / opt-in item shown before enrollment. */
export interface ScreeningItem {
  id: string;
  prompt: string;
  /** 'acknowledge' requires a checked box; 'info' is display-only. */
  kind: 'acknowledge' | 'info';
}

export interface QuickLabProtocol {
  id: string;
  title: string;
  /** Matrix hypothesis id (H1/H3/H4/H5/H9/H10/H12…). */
  hypothesisId: string;
  /** Registry experiments this n-of-1 run shadows (e.g. X05). */
  registryLinks: string[];
  /** User-facing question (safe to show pre-completion — describes the design, not the assignment). */
  question: string;
  /** Mundane-alternative summary (the thing the protocol must beat). */
  mundaneModel: string;
  arms: ArmSpec[];
  /** Indices into `arms` for the pre-registered primary contrast (a − b). */
  primaryContrast: { a: number; b: number; label: string };
  outcomeScales: OutcomeScale[];
  /** Include the optional 60 s reaction tap test. */
  tapTest: boolean;
  /** Minimum sessions before any estimate renders (hard floor: 10). */
  minSessions: number;
  /** Blinding mode — v1 ships only full (assignment hidden until completion). */
  blinding: 'full';
  /** Safety class (adult default; experimental for ramp-discomfort). */
  safetyClass: 'adult' | 'experimental';
  /** Planned session length in minutes (dose accounting + display). */
  sessionMinutes: number;
  screening: ScreeningItem[];
  /** Honest power note (group-scale + n-of-1). */
  powerNote: string;
  /** Priority / ratified-order note. */
  priorityNote: string;
}

/** Citation entry for protocol cards (Zhao 2025 must carry its confidence tag). */
export interface ProtocolCitation {
  label: string;
  url?: string;
  confidence?: 'high' | 'medium' | 'low-medium';
}
