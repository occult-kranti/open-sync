/**
 * Replication Bay — typed protocol data (Swarm W7).
 *
 * Distilled from research/replication_designs.md under
 * skills/replication-pack-qa/SKILL.md rules:
 *  - Runnable cards: audio-only, within H.870 dose rails, fully specified
 *    from public sources; each shows source + original claim + our grade +
 *    the "stimulus replication ≠ claim validation" banner (module constant,
 *    rendered on every runnable card).
 *  - Divergent analogs ship only with an explicit divergence note (LIDA).
 *  - Documentation-only museum cards have engine: null (MEDUSA, LRAD,
 *    synthetic telepathy).
 *  - GENUS/40 Hz cites BOTH the MIT/Cognito patent thicket AND the OVERTURE
 *    primary-endpoint miss. Gateway cites the 1983 CIA doc as a theoretical
 *    assessment with no experiments.
 *
 * Engine mapping: `engine` phases use src/engine/types.ts Phase shape so
 * `toSessionSpec()` produces a valid, renderable SessionSpec; `toPreset()`
 * adapts the same phases to the Studio's data-layer Preset (LOAD INTO STUDIO).
 */

import type { Phase as EnginePhase, SessionSpec } from '@/engine/types';
import type { Preset } from '@/data/presets';
import type { GradeLetter } from '@/ui/theme';

/** Mandatory banner on every runnable card (replication-pack-qa). */
export const REPLICATION_BANNER = 'Stimulus replication ≠ claim validation.';

/** Honest grading of the ORIGINAL program's claim (not our stimulus). */
export type ClaimGrade = 'VALIDATED' | 'PARTIAL' | 'CONTESTED' | 'UNVALIDATED' | 'DISPROVED';

export type ReplicationSafetyClass = 'adult' | 'experimental';

export interface ReplicationSafety {
  maxLevelDbA: number;
  sessionMin: number;
  h870WeeklyDoseFraction: number;
  headphonesRequired: boolean;
  warnings: string[];
}

export interface ReplicationCard {
  id: string;
  name: string;
  /** Documented program lineage. */
  program: string;
  era: string;
  /** Two-axis chip 1: is the program documented (primary source)? */
  documented: boolean;
  /** Two-axis chip 2: honest grade of the original claim. */
  claimGrade: ClaimGrade;
  /** What the original program claimed. */
  originalClaim: string;
  /** Our A–D evidence grade of that claim (for GradeBadge). */
  ourGrade: GradeLetter;
  summary: string;
  /** Fidelity honesty: what is reconstruction vs documented. */
  fidelityNote?: string;
  /** Mandatory for divergent analogs: how we differ from the original. */
  divergenceNote?: string;
  /** Experiment registry link (X-series), or null for museum cards. */
  registryId: string | null;
  safetyClass: ReplicationSafetyClass;
  safety: ReplicationSafety | null;
  citations: string[];
  /**
   * Runnable stimulus as engine phases, or null for documentation-only cards.
   */
  engine: EnginePhase[] | null;
  /** Mapping honesty note (what the engine can and cannot reproduce). */
  engineNote?: string;
  /** Live mode requires EEG input — card shows an "EEG required" state. */
  requiresEeg?: boolean;
  /**
   * Live-trigger mode requires external hardware (EEG). The device-dependent
   * mode is hidden behind this flag; only timed-fallback/offline variants load.
   */
  requiresDevice?: boolean;
  /**
   * S3 gate: one or more stimulus parameters are not yet verified against the
   * primary source's methods section. Card ships for documentation, but LOAD
   * is gated behind this flag until verification lands. Value = what's pending.
   */
  verificationPending?: string;
  /** Offline (no-EEG) pre-rendered variant, where one exists. */
  offlineEngine?: EnginePhase[];
  /** Museum cards: why this can never be a runnable audio preset. */
  nonReplicableReason?: string;
  museumText?: string;
}

// ---------------------------------------------------------------------------
// Runnable cards
// ---------------------------------------------------------------------------

/** Gateway ramp helper: 60 s steps between two beat values (engine phases are constant-beat). */
function rampSteps(fromHz: number, toHz: number, steps: number, base: Omit<EnginePhase, 'beatHz' | 'durationSec'>): EnginePhase[] {
  const out: EnginePhase[] = [];
  for (let i = 0; i < steps; i++) {
    const k = (i + 1) / steps;
    out.push({ ...base, durationSec: 60, beatHz: Math.round((fromHz + (toHz - fromHz) * k) * 100) / 100 });
  }
  return out;
}

const GATEWAY_BASE = { carrierHz: 275, mode: 'binaural' as const, gainDb: -30 };

const GATEWAY_ENGINE: EnginePhase[] = [
  // 0:00–5:00 alpha settle (US 5,213,562 Oersted-optimal carrier ~275 Hz).
  { ...GATEWAY_BASE, durationSec: 300, beatHz: 10 },
  // 5:00–10:00 ramp 10 → 5.5 Hz (alpha → Focus-10-class theta).
  ...rampSteps(10, 5.5, 5, GATEWAY_BASE),
  // 10:00–29:30 theta hold; Focus-12-class pink-sound bed at −12 dB rel carriers.
  { ...GATEWAY_BASE, durationSec: 1170, beatHz: 5.5, noise: { color: 'pink', level: 0.25 } },
  // 29:30–34:30 ramp back 5.5 → 10 Hz.
  ...rampSteps(5.5, 10, 5, GATEWAY_BASE),
  // 34:30–35:00 beta return cue.
  { ...GATEWAY_BASE, durationSec: 30, beatHz: 14 },
];

const GENUS_ENGINE: EnginePhase[] = [
  // AM variant (documented tolerability alternative to the 10 kHz pip train):
  // full-depth 40 Hz sinusoidal AM — the classic ASSR stimulus.
  { durationSec: 3600, carrierHz: 200, beatHz: 40, mode: 'monaural', gainDb: -11 },
];

const TMR_ENGINE: EnginePhase[] = [
  // No-EEG timed fallback: quiet cue-train analog, one gated pulse every 5 s
  // (≥5 s ISI per Rudoy-style pacing), first-2h SWS-rich window only.
  { durationSec: 7200, carrierHz: 200, beatHz: 0.2, mode: 'isochronic', gainDb: -40 },
];

const NGO_OFFLINE_ENGINE: EnginePhase[] = [
  // Offline variant: pre-rendered ~1 Hz burst train after a quiet settle.
  // NOT closed-loop — phase targeting (the active ingredient) is absent.
  { durationSec: 300, carrierHz: 250, beatHz: 0, mode: 'monaural', gainDb: -60 },
  { durationSec: 12000, carrierHz: 250, beatHz: 0.93, mode: 'isochronic', gainDb: -21 },
];

const GANTT_ENGINE: EnginePhase[] = [
  // Phase-1 bedtime protocol: ≥30 min, theta-band BBF (250 Hz carrier per BB
  // literature; Gantt's exact carrier unpublished — flagged in fidelityNote).
  { durationSec: 180, carrierHz: 250, beatHz: 10, mode: 'binaural', gainDb: -36 },
  { durationSec: 1620, carrierHz: 250, beatHz: 6, mode: 'binaural', gainDb: -36 },
];

const LIDA_ENGINE: EnginePhase[] = [
  // Pulsed-sound analog: 1 Hz gating (patent band 40–80 pulses/min), 250 Hz.
  { durationSec: 1800, carrierHz: 250, beatHz: 1, mode: 'isochronic', gainDb: -26 },
];

const GATEWAY: ReplicationCard = {
  id: 'rep-gateway-focus10',
  name: 'Gateway-class Focus Progression (Hemi-Sync reconstruction)',
  program: 'Monroe Gateway Experience; US Army INSCOM Gateway assessment 1983',
  era: '1975–1984',
  documented: true,
  claimGrade: 'UNVALIDATED',
  originalClaim:
    'Focused consciousness states (“Focus 10/12/15/21”) up to out-of-body perception and “escaping spacetime”.',
  ourGrade: 'C',
  summary:
    'Replicates the stimulus class described in the expired Monroe patents (US 5,213,562: stereo carriers, ' +
    'binaural beat f1−f2, Oersted-optimal ~275 Hz carrier, “Phased Pink Sound” bed) and the 1983 CIA ' +
    'INSCOM assessment. The Army judged the method “plausible” and purchased the technology — a documented ' +
    'program — but the report contains no experiments, and the consciousness claims are unvalidated.',
  fidelityNote:
    'Monroe’s exact per-tape beat progressions are proprietary and unpublished. This is a patent-derived ' +
    'reconstruction (Focus 10 ≈ theta 4–7 Hz bed, alpha entry/exit), not a copy of any commercial tape.',
  registryId: 'X05',
  safetyClass: 'adult',
  safety: {
    maxLevelDbA: 45,
    sessionMin: 35,
    // S3-corrected dose arithmetic: 45 dBA × 35 min/day → 3.2e-5 of H.870 weekly.
    h870WeeklyDoseFraction: 3.2e-5,
    headphonesRequired: true,
    warnings: ['no driving/machinery (deep-relaxation audio)', 'seizure-history caution', 'tinnitus: start −20 dB'],
  },
  citations: [
    'CIA-RDP96-00788R001700210016-5 (1983; theoretical assessment, no experiments)',
    'US 5,213,562 (Monroe 1993, expired); US 3,884,218; US 5,356,368',
    'Emerson, Secret Warriors (1988) pp. 103–4 — INSCOM–Monroe contracts ~1981–84',
  ],
  engine: GATEWAY_ENGINE,
  engineNote:
    'Ramp segments are rendered as 60 s constant-beat steps (the engine crossfades phases). ' +
    'The optional 2877.3 Hz “beta” OBE-exercise carrier is documented verbatim in the CIA report but ' +
    'omitted here: above the ~1 kHz binaural-perception ceiling it would be silent nonsense.',
};

const GENUS: ReplicationCard = {
  id: 'rep-genus-40hz-audio',
  name: 'GENUS 40 Hz Auditory (audio-only)',
  program: 'NIH/NIA GENUS (R01AG069232; R01AT011460) → Cognito Therapeutics',
  era: '2016–present',
  documented: true,
  claimGrade: 'CONTESTED',
  originalClaim:
    '40 Hz sensory stimulation reduces Alzheimer’s pathology and preserves cognition.',
  ourGrade: 'D',
  summary:
    'Replicates the auditory channel of Martorell et al. (Cell 2019): 40 Hz stimulation, 1 h/day. ' +
    'Mouse effects replicated by the originating lab but failed independent replication; Cognito’s ' +
    'Phase II OVERTURE (NCT03556280) missed its primary endpoint; Phase III HOPE is pending. ' +
    'Commercial 40 Hz devices sit inside an MIT/Cognito patent thicket — we document, we do not sell treatment.',
  fidelityNote:
    'Faithful stimulus is 1-ms 10 kHz pips every 25 ms. The engine renders the documented AM-noise ' +
    'variant (full-depth 40 Hz AM — the classic ASSR stimulus) because pip trains are outside its ' +
    'phase model. ASSR entrainment at 40 Hz is robust physiology; ASSR strength ≠ proven outcome.',
  divergenceNote:
    'The strongest mouse effects used combined light+sound; the 40 Hz light flicker is excluded ' +
    'by design (photosensitive-seizure risk). This is an audio-only replication — safer but less faithful.',
  registryId: 'X01',
  safetyClass: 'experimental',
  verificationPending:
    'Martorell 2019 stimulus level (~60–65 dB SPL) is MEDIUM-confidence and not yet verified against the Cell 2019 STAR Methods. LOAD stays gated until verification lands.',
  safety: {
    maxLevelDbA: 65,
    sessionMin: 60,
    h870WeeklyDoseFraction: 0.006,
    headphonesRequired: false,
    warnings: [
      'tinnitus caution (10 kHz content in the original pip train)',
      'fatigue/annoyance documented for 40 Hz trains',
      'not a medical treatment; not a substitute for clinical care',
      'INFANT MODE EXCLUDED: the 10 kHz pip content violates the ≤1 kHz lowpass / ≤50 dBA infant envelope',
      'session cooldown: max 1 h/day (documented GENUS regimen) — do not stack sessions',
    ],
  },
  citations: [
    'Martorell et al. 2019 Cell 177:256–271 (stimulus params)',
    'OVERTURE NCT03556280 — Phase II primary endpoint MISSED',
    'Soula 2023 Nat Neurosci; Yang & Lai 2023 eNeuro — failed independent mouse replications',
    'MIT/Cognito patent thicket (40 Hz sensory-stimulation IP) — avoided; not licensed',
  ],
  engine: GENUS_ENGINE,
  engineNote:
    '40 Hz exceeds the ~30 Hz binaural-perception ceiling, so this renders as monaural AM ' +
    '(per audio-protocol-design: >30 Hz rhythms use monaural/isochronic). Max 1 h/day.',
};

const TMR: ReplicationCard = {
  id: 'rep-tmr-cue-replay',
  name: 'Targeted Memory Reactivation (Rudoy / DARPA-TNT class)',
  program: 'DARPA Targeted Neuroplasticity Training (Teledyne, W911NF-17-2-0002)',
  era: '2007–2018',
  documented: true,
  claimGrade: 'VALIDATED',
  originalClaim:
    'Replaying learning-linked cues during slow-wave sleep strengthens the associated memories; ' +
    'DARPA’s arm reported ~40% faster virtual-city navigation.',
  ourGrade: 'B',
  summary:
    'Replicates the acoustic cue-replay protocol of Rasch 2007 / Rudoy 2009 and DARPA TNT’s Teledyne arm ' +
    '(Shimizu 2018: 700 ms naturalistic cues, just-above-threshold level, adaptive staircase, arousal abort). ' +
    'Meta-analytic effect g ≈ 0.40 — modest but among the best-validated effects in this collection; the ' +
    'DARPA 40% speedup (d ≈ 1.4) is a single-paradigm result, not independently replicated.',
  fidelityNote:
    'True TMR pairs YOUR learning items with cues and replays them in detected N2/N3. Without EEG this ' +
    'card runs the documented timed fallback: cue-train analog only in the first ~2 h (SWS-rich window). ' +
    'Stage targeting is an active ingredient — expect a weaker effect in fallback mode.',
  requiresDevice: true,
  registryId: 'X12',
  safetyClass: 'adult',
  safety: {
    maxLevelDbA: 45,
    sessionMin: 120,
    h870WeeklyDoseFraction: 0.0001,
    headphonesRequired: false,
    warnings: ['may fragment sleep in sensitive users; auto-abort on arousal in EEG mode'],
  },
  citations: [
    'Shimizu et al. 2018 Front Hum Neurosci (PMC5808124) — DARPA TNT closed-loop TMR',
    'Rudoy et al. 2009 Science; Rasch et al. 2007 Science',
    'Hu et al. 2020 meta-analysis — g ≈ 0.40',
  ],
  engine: TMR_ENGINE,
  engineNote:
    'Engine renders a 0.2 Hz isochronically gated quiet carrier as the cue-train analog (one pulse per ' +
    '5 s, honoring the ≥5 s inter-cue interval). Naturalistic 700 ms sound cues and the adaptive ' +
    'level staircase require the EEG loop.',
};

const NGO_CLAS: ReplicationCard = {
  id: 'rep-clas-slow-oscillation',
  name: 'Closed-Loop Slow-Oscillation Stimulation (Ngo 2013 class)',
  program: 'Born-lab closed-loop sleep-stimulation lineage (DARPA-adjacent)',
  era: '2013–present',
  documented: true,
  claimGrade: 'PARTIAL',
  originalClaim:
    'EEG phase-locked acoustic stimulation in NREM up-states enhances slow oscillations, spindles, and memory.',
  ourGrade: 'B',
  summary:
    'Ngo et al. (Neuron 2013): on detection of a slow-oscillation down-state, two 50 ms pink-noise bursts ' +
    '(55 dB SPL, 1075 ms apart) land on predicted up-states. Physiology (SO power, spindle boost) validated ' +
    'across labs; memory benefit partial — replicated by some, null in Henin 2019 (report both).',
  fidelityNote:
    'Live mode is closed-loop by definition: SO detection (0.5–4 Hz, adaptive −50 µV threshold), phase ' +
    'targeting (~240°, Santostasi convention), 2.5 s refractory, arousal abort. A fixed-schedule ' +
    '“pink noise all night” file is NOT this protocol.',
  registryId: 'X12',
  safetyClass: 'experimental',
  safety: {
    maxLevelDbA: 55,
    sessionMin: 210,
    h870WeeklyDoseFraction: 0.0001,
    headphonesRequired: false,
    warnings: ['mandatory arousal-abort logic in live mode', 'not for use without EEG in live mode'],
  },
  citations: [
    'Ngo et al. 2013 Neuron 78:545–553',
    'Papalambros et al. 2017 Front Hum Neurosci 11:109 (older adults)',
    'Henin et al. 2019 eNeuro 6(6) — physiology enhanced, memory NULL',
    'Santostasi et al. 2016 — phase-locked prediction',
  ],
  engine: null,
  requiresEeg: true,
  requiresDevice: true,
  offlineEngine: NGO_OFFLINE_ENGINE,
  engineNote:
    'Live mode: EEG required (single frontal channel class hardware + real-time phase detector — not ' +
    'shipped here). Offline variant renders pre-rendered ~1 Hz burst trains after a 5-min settle — an ' +
    'open-loop analog honestly labeled as not-the-protocol.',
};

const GANTT: ReplicationCard = {
  id: 'rep-dod-theta-bbf-sleep',
  name: 'DoD Theta-BBF Sleep (Gantt 2017 / HU0001-16-1-TS02)',
  program: 'DoD TriService Nursing Research Program HU0001-16-1-TS02',
  era: '2012–present',
  documented: true,
  claimGrade: 'PARTIAL',
  originalClaim:
    'Theta-band binaural beats in music at bedtime improve sleep and reduce stress in post-deployment service members.',
  ourGrade: 'C',
  summary:
    'Phase 1 (Gantt 2017, N=74): ≥30 min at bedtime, ≥3 nights/week, 4 weeks — HRV autonomic relaxation ' +
    'shifts validated (p = 0.01); sleep-latency improvement neither confirmed nor rejected. The follow-on ' +
    '8-h hypnogram-mapped protocol (PMC9909225) is published but outcome trials are ongoing.',
  fidelityNote:
    'Gantt’s exact carrier is unpublished; 250 Hz chosen per BB literature (Pratt 2010; Jirakittayakorn ' +
    '2017). Beat bands per PMC9909225 Table 1 (alpha onset 10 Hz → theta 6 Hz). The original embeds beats ' +
    '6 dB below a slow instrumental bed; this card renders beats alone.',
  registryId: 'X13',
  safetyClass: 'adult',
  safety: {
    maxLevelDbA: 40,
    sessionMin: 30,
    h870WeeklyDoseFraction: 0.0002,
    headphonesRequired: true,
    warnings: ['research-grade relaxation aid, not an insomnia treatment (CBT-I is first-line)'],
  },
  citations: [
    'Gantt et al. 2017 J Nurs Scholarsh 49:411–420 (PMID 28544507)',
    'PMC9909225 — all-night hypnogram-mapped protocol (8-h variant documented, not loaded here)',
    'TriService award HU0001-16-1-TS02; USAMRMC IRB M-10544',
  ],
  engine: GANTT_ENGINE,
  engineNote:
    'Loads the Phase-1 30-min bedtime track (alpha onset → theta). The 8-h hypnogram variant exceeds the ' +
    'app’s 90-min session cap by design and stays documented, not loaded.',
};

const LIDA: ReplicationCard = {
  id: 'rep-lida-audio-analog',
  name: 'LIDA Pulsed-Sound Analog (audio-only divergence)',
  program: 'Soviet electrosleep device program (Rabichev et al.), US Patent 3,773,049',
  era: '1950s–1978',
  documented: true,
  claimGrade: 'UNVALIDATED',
  originalClaim:
    'Pulsed fields/light/sound/heat (40–80 pulses/min) put patients to sleep “within 15 minutes” — 740 patients over 8 years.',
  ourGrade: 'D',
  summary:
    'The LIDA was described by W. Ross Adey in 1978 with a crucial admission: “We have not tested the ' +
    'instrument yet.” No independent test results were ever published — a patent proves filing, not ' +
    'efficacy. Documented pulse rate is 40–80/min (delta/SO range), NOT the 40–100 Hz sometimes quoted.',
  divergenceNote:
    'The claimed sleep effect was attributed primarily to the pulsed 40 MHz/40 W RF field, with sound as ' +
    'an auxiliary channel. RF is not audio-replicable (and would be neither safe nor legal); pulsed light ' +
    'is excluded for photosensitivity. This card replicates ONLY the documented auditory pulse parameters. ' +
    'Nothing about the Soviet therapeutic claims is implied.',
  fidelityNote:
    'Patent specifies 200 ms pulses at 40–80/min. The engine’s isochronic gate has a fixed 50% duty ' +
    'cycle, so pulse RATE (1 Hz, mid-band) is matched and pulse SHAPE is not.',
  registryId: null,
  safetyClass: 'experimental',
  safety: {
    maxLevelDbA: 50,
    sessionMin: 30,
    // S3-corrected dose arithmetic: 50 dBA × 30 min/day → 8.8e-5 of H.870 weekly.
    h870WeeklyDoseFraction: 8.8e-5,
    headphonesRequired: false,
    warnings: ['no driving/machinery (sleep-onset intent)'],
  },
  citations: [
    'US Patent 3,773,049 (Rabichev et al.)',
    'Adey statement, LBL Biomagnetic Effects Workshop, Apr 1978 (“We have not tested the instrument yet”)',
  ],
  engine: LIDA_ENGINE,
  engineNote: 'Audio analog of the documented pulsed-sound channel only — see divergence note.',
};

// ---------------------------------------------------------------------------
// Documentation-only museum cards (engine: null by rule)
// ---------------------------------------------------------------------------

const MEDUSA_LRAD: ReplicationCard = {
  id: 'doc-medusa-lrad',
  name: 'MEDUSA / LRAD — documentation-only exhibit',
  program: 'Navy SBIR MEDUSA (WaveBand Corp., 2003–2008); LRAD/Genasys procurement',
  era: '2003–2014',
  documented: true,
  claimGrade: 'UNVALIDATED',
  originalClaim:
    'MEDUSA: microwave-auditory-effect crowd incapacitation. LRAD: acoustic “non-lethal weapon” deterrence.',
  ourGrade: 'D',
  summary: 'Two documented programs that can never be audio presets in this app.',
  registryId: null,
  safetyClass: 'experimental',
  safety: null,
  citations: [
    'Navy SBIR award text (WaveBand, $99,965 Phase I, Nov 2003–May 2004)',
    'NATO RTO-TR-SAS-040 (2004) — acoustic NLWs “of uncertain effectiveness”',
    'Jauchem & Cook, Mil Med 172:182 (2007) — “A Lack of Useful Systems”',
  ],
  engine: null,
  nonReplicableReason:
    'MEDUSA runs on the microwave auditory effect: each RF pulse launches a minuscule pressure wave via ' +
    'thermoelastic expansion INSIDE the head — no speaker can deposit energy that way, and building the RF ' +
    'device is hazardous by design. LRAD’s only real effect is hazardous loudness (>150 dB at 1 m): ' +
    'replicating it would violate H.870 dose limits by orders of magnitude.',
  museumText:
    'MEDUSA (2003–2008) was a US Navy-funded attempt to turn the microwave auditory effect — hearing clicks ' +
    'induced by pulsed radio waves via thermoelastic expansion of brain tissue — into a crowd-control weapon. ' +
    'The physics of the sensation is real and validated; the weapon was never validated as safe or effective ' +
    'and was discontinued by ~2008. It cannot be demonstrated with ordinary sound. LRAD is simply a very ' +
    'loud, very directional loudspeaker: no entrainment, no subliminal mechanism. File under: documented ' +
    'program, unvalidated weapon.',
};

const SYNTHETIC_TELEPATHY: ReplicationCard = {
  id: 'doc-synthetic-telepathy',
  name: 'Army “Synthetic Telepathy” MURI — documentation card',
  program: 'US Army Research Office MURI, UC Irvine (D’Zmura, with CMU/UMD)',
  era: '2008 (~$4M)',
  documented: true,
  claimGrade: 'PARTIAL',
  originalClaim: 'EEG decoding of imagined speech for battlefield communication.',
  ourGrade: 'D',
  summary:
    'Validated only as slow, training-intensive, rudimentary brain–computer interface work — nothing ' +
    'resembling telepathy. The program’s name outruns its science.',
  registryId: null,
  safetyClass: 'experimental',
  safety: null,
  citations: ['US Army Research Office MURI award (~$4M, 2008), UC Irvine (D’Zmura)'],
  engine: null,
  nonReplicableReason:
    'There is no auditory stimulus to replicate: the program is an EEG brain–computer-interface effort. ' +
    'Its only honest role here is documentation.',
};

export const REPLICATION_CARDS: readonly ReplicationCard[] = [
  GATEWAY,
  GENUS,
  TMR,
  NGO_CLAS,
  GANTT,
  LIDA,
  MEDUSA_LRAD,
  SYNTHETIC_TELEPATHY,
];

// ---------------------------------------------------------------------------
// Engine / Studio mapping + validation
// ---------------------------------------------------------------------------

/** Runnable = has engine phases or a no-EEG offline variant. */
export function isRunnable(card: ReplicationCard): boolean {
  return card.engine !== null || (card.offlineEngine?.length ?? 0) > 0;
}

/** Total duration in seconds of a phase list. */
export function engineDurationSec(phases: readonly EnginePhase[]): number {
  return phases.reduce((a, p) => a + p.durationSec, 0);
}

/** Map a runnable card to a reproducible engine SessionSpec (src/engine/types). */
export function toSessionSpec(card: ReplicationCard, opts?: { offline?: boolean }): SessionSpec | null {
  const phases = opts?.offline ? card.offlineEngine : card.engine;
  if (!phases || phases.length === 0) return null;
  return {
    name: card.name,
    sampleRate: 48000,
    crossfadeSec: 2,
    masterGainDb: -6,
    phases: phases.map((p) => ({ ...p })),
  };
}

/**
 * Adapt a runnable card to the Studio's data-layer Preset shape so the
 * SessionContext.loadPreset() path (LOAD INTO STUDIO) works unchanged.
 * Engine gainDb maps to the data layer's gainDbFs; engine-only fields
 * (noise beds) are summarized in the rationale.
 */
export function toPreset(card: ReplicationCard, opts?: { offline?: boolean }): Preset | null {
  const phases = opts?.offline ? card.offlineEngine : card.engine;
  if (!phases || phases.length === 0) return null;
  return {
    id: card.id,
    title: card.name,
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: phases.map((p, i) => ({
        name: `phase-${i + 1}`,
        durationSec: p.durationSec,
        carrierHz: p.carrierHz,
        beatHz: p.beatHz,
        gainDbFs: Math.min(0, p.gainDb),
      })),
    },
    grade: card.ourGrade,
    rationale: `${card.summary} — ${REPLICATION_BANNER}`,
    citations: card.citations,
  };
}

/**
 * Domain-limit validation for runnable cards (audio-protocol-design rails):
 * every phase must have positive finite duration/gain-domain values, binaural
 * beats ≤ 30 Hz, carriers ≤ 1000 Hz, beats ≥ 0. Returns issue strings (empty = ok).
 */
export function validateRunnableCard(card: ReplicationCard): string[] {
  const issues: string[] = [];
  const sets: { label: string; phases: EnginePhase[] | null | undefined }[] = [
    { label: 'engine', phases: card.engine },
    { label: 'offlineEngine', phases: card.offlineEngine },
  ];
  for (const { label, phases } of sets) {
    if (phases === null || phases === undefined) continue;
    if (phases.length === 0) issues.push(`${label}: empty phase list`);
    for (const [i, p] of phases.entries()) {
      const at = `${label}.phases[${i}]`;
      if (!Number.isFinite(p.durationSec) || p.durationSec <= 0) issues.push(`${at}: durationSec must be > 0`);
      if (!Number.isFinite(p.carrierHz) || p.carrierHz <= 0) issues.push(`${at}: carrierHz must be > 0`);
      if (!Number.isFinite(p.beatHz) || p.beatHz < 0) issues.push(`${at}: beatHz must be ≥ 0`);
      if (!Number.isFinite(p.gainDb) || p.gainDb > 0) issues.push(`${at}: gainDb must be ≤ 0`);
      if (p.mode === 'binaural' && p.carrierHz > 1000)
        issues.push(`${at}: binaural carrier ${p.carrierHz} Hz > 1000 Hz (beat percept fails)`);
      if (p.mode === 'binaural' && p.beatHz > 30)
        issues.push(`${at}: binaural beat ${p.beatHz} Hz > 30 Hz (not perceivable as a beat)`);
      if (p.noise && (p.noise.level < 0 || p.noise.level > 1))
        issues.push(`${at}: noise level ${p.noise.level} outside 0..1`);
    }
  }
  if (card.engine === null && card.offlineEngine == null && !card.nonReplicableReason) {
    issues.push('documentation-only card without nonReplicableReason');
  }
  if (card.safety && card.safety.maxLevelDbA > 70) {
    issues.push(`maxLevelDbA ${card.safety.maxLevelDbA} exceeds the 70 dBA-equivalent default rail`);
  }
  return issues;
}
