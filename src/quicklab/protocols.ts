/**
 * Quick Lab self-test protocols — distilled from the T1 fast-test matrix
 * (deep_theory_edge_cases.md Part 5), priority order ratified by Advisor
 * gate #12: H9 ear-swap first (same-day, zero render cost), then the
 * H4+H5 piggyback (installs the missing 0 Hz floor + the salience
 * mediator), then H1 (noise-is-the-active-ingredient), H3 (ramp-shape
 * discomfort), H12 (noise-bed neurotype sign-flip), the X05-style
 * active-placebo run, and the percept-gating responder screen.
 *
 * Every protocol: full blinding, minSessions = 10, an active comparator
 * (registry rule 4), and a sessionSpec per arm mapped to the engine Phase
 * shape. The registry previously had NO zero-rate arm anywhere (T1 flag);
 * the 0 Hz control ships here in ql-rate-floor and ql-active-placebo.
 *
 * Power notes carry the Advisor gate #12 corrections: n=128 detects only
 * d≈0.50; d=0.35 needs N≈256; a 2×2 interaction of f=0.2 needs N≈261.
 * Zhao 2025 is cited as a BA-thesis/PsyArXiv preprint (low-medium
 * confidence) — its transferable value is the 0 Hz-floor DESIGN.
 */

import type { Phase } from '@/engine';
import type { OutcomeScale, ProtocolCitation, QuickLabProtocol } from './types';

const MIN_SESSIONS = 10;

/** Identical low-level 1/f pink-noise ritual bed for all arms of a protocol (−20 dB rel, per X05 spec). */
const NOISE_BED = { color: 'pink' as const, level: 0.1 };

function tone(over: Partial<Phase> & { durationSec: number }): Phase {
  return {
    carrierHz: 400,
    beatHz: 10,
    mode: 'binaural',
    gainDb: -14,
    ...over,
  };
}

const CALM_FOCUS: OutcomeScale[] = [
  { id: 'calm', label: 'Calm', lowAnchor: 'Not at all calm', highAnchor: 'Very calm', min: 1, max: 7 },
  { id: 'focus', label: 'Focus', lowAnchor: 'Scattered', highAnchor: 'Very focused', min: 1, max: 7 },
];

const SALIENCE: OutcomeScale = {
  id: 'salience',
  label: 'Beat salience',
  lowAnchor: 'No pulsing/beating heard',
  highAnchor: 'Strong, clear pulsing',
  min: 0,
  max: 10,
};

const DISCOMFORT: OutcomeScale = {
  id: 'discomfort',
  label: 'Discomfort',
  lowAnchor: 'None',
  highAnchor: 'Wanted to stop immediately',
  min: 0,
  max: 10,
};

export const PROTOCOL_CITATIONS: Record<string, ProtocolCitation[]> = {
  'ql-ear-swap': [
    { label: 'Vassilakis P, ICMPC8 — low-rate dichotic beats are perceived as sound-source rotation', url: 'https://www.acousticslab.org/papers/ICMPC8.htm' },
    { label: 'T1 edge-case survey: no ear-swap/rotation-direction outcome study located (absence confirmed)', confidence: 'high' },
  ],
  'ql-rate-floor': [
    { label: 'Zhao et al. (2025), 0 Hz single-tone control design — BA thesis / PsyArXiv preprint; the 0 Hz-floor design transfers, the point estimates are provisional', url: 'https://haplab.ca/pubs/2025_Zhao.pdf', confidence: 'low-medium' },
    { label: 'Licklider, Webster & Hedlun (1950), JASA 22(4):468–473 — percept limits' },
  ],
  'ql-noise-ingredient': [
    { label: 'Melnichuk, Cooper & Hawk (2025), Sci Rep 15:4308 — noise weakened measured entrainment yet was the only behavioral-benefit cell', url: 'https://pubmed.ncbi.nlm.nih.gov/39910150/' },
    { label: 'Ingendoh, Posny & Heine (2023), PLOS ONE 18(5):e0286023 — all pink-noise-embedded EEG studies null', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/' },
    { label: 'Nigg et al. (2024), JAACAP meta-analysis — noise effects are neurotype-signed', confidence: 'medium' },
  ],
  'ql-ramp-discomfort': [
    { label: 'Klichowski et al. (2023), Sci Rep 13:11079 — n=1,000, rate-invariant impairment; authors\' mundane candidate: beats are "bothersome and disturbing"', url: 'https://www.nature.com/articles/s41598-023-38313-4.pdf' },
    { label: 'T1 edge-case survey: no beat study has ever parametrically varied onset ramp (absence confirmed)', confidence: 'high' },
  ],
  'ql-noise-neurotype': [
    { label: 'Nigg et al. (2024), JAACAP — white/pink noise g=+0.249 ADHD, g=−0.212 non-ADHD (13 studies, 335 participants)', confidence: 'high' },
    { label: 'Rijmen & Wiersema (2024), Neuropsychologia 202:108961 — a pure tone matched pink noise\'s benefit', confidence: 'medium' },
  ],
  'ql-active-placebo': [
    { label: 'Registry X05 — active-placebo / expectancy decomposition (2×2), sham = 7.37 Hz off-band AM' },
    { label: 'Subliminal-tape placebo lineage (Russell/Rowe/Smouse 1991; Merikle & Skanes 1992) — labeled placebos produce the labeled effect', url: 'https://repository.lib.fsu.edu/islandora/object/fsu:176223/', confidence: 'medium' },
  ],
  'ql-percept-gate': [
    { label: 'Unidistance/FernUniversität replication of Licklider 1950 (2025) — classical detection pattern not consistently reproduced across participants', url: 'https://unidistance.ch/en/psychology/research-project/psychophysics-of-binaural-beats', confidence: 'medium' },
    { label: 'Schwarz & Taylor (2005), Clin Neurophysiol 116:658–668 — binaural ASSR dies above ~3 kHz carrier' },
  ],
};

export const PROTOCOLS: readonly QuickLabProtocol[] = [
  {
    id: 'ql-ear-swap',
    title: 'Ear-swap invariance (rotation direction)',
    hypothesisId: 'H9',
    registryLinks: [],
    question:
      'Does reversing which ear gets which tone — flipping the perceived rotation direction of the beat — change anything for you? A rate-entrainment account predicts no difference; a spatial-attention account predicts one.',
    mundaneModel:
      'No difference at all: both arms are the same two tones with the channels swapped, so any average difference points at lateralization/attention, not at the beat rate.',
    arms: [
      {
        id: 'rotation-a',
        description: 'One channel assignment of the same 10 Hz beat pair (400 Hz / 410 Hz).',
        phases: [tone({ durationSec: 600, carrierHz: 400, beatHz: 10 })],
        attackSec: 2,
        constructionNote: 'Binaural 400/410 Hz — one render line.',
      },
      {
        id: 'rotation-b',
        description: 'The exact same tones with the channels swapped (410 Hz / 400 Hz): rotation direction reverses, rate is unchanged.',
        phases: [tone({ durationSec: 600, carrierHz: 400, beatHz: 10 })],
        attackSec: 2,
        channelSwap: true,
        constructionNote: 'Channel swap is applied at playback time (single flag), keeping the arms acoustically identical in rate and level.',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'sessions with one ear assignment vs the swapped assignment' },
    outcomeScales: CALM_FOCUS,
    tapTest: true,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 10,
    screening: [
      { id: 'headphones', prompt: 'I will use stereo headphones for these sessions (the test is meaningless on speakers).', kind: 'acknowledge' },
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 12 sessions recommended (you may stop at 10+ for an estimate). Group scale: n=90 paired detects dz=0.3. Fastest test in the matrix — same-day build, zero render cost.',
    priorityNote: 'Ranked first by T1 (Advisor-ratified): tests a mechanism nobody has tested, at literally one channel-swap flag of cost.',
  },
  {
    id: 'ql-rate-floor',
    title: 'The 0 Hz floor (is it the beat, or the ritual?)',
    hypothesisId: 'H4',
    registryLinks: ['X05'],
    question:
      'Do your calm/focus ratings differ between a real 10 Hz beat and an identical session where the two tones carry no beat at all (0 Hz — the true floor)? Any benefit at 0 Hz is priced as ritual/expectancy, not beat rate.',
    mundaneModel:
      'Both arms feel identical (same carrier region, same noise bed, same ritual), so ratings are equal; a beat-specific benefit shows up only as a step above the 0 Hz floor.',
    arms: [
      {
        id: 'veridical-10hz',
        description: 'A real 10 Hz binaural beat on a 400 Hz carrier, in the standard pink-noise bed.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 10, noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'fc 400 Hz, Δf 10 Hz, bed −20 dB — the H4 rate-ladder cell with the floor installed.',
      },
      {
        id: 'control-0hz',
        description: 'Identical session structure and noise bed, but the two channels carry the same frequency: no beat, no rate — the 0 Hz floor control the registry was missing.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 0, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'Δf = 0 Hz (identical tones). Zhao 2025 used exactly this control; the design transfers even though that preprint is low-medium confidence.',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'beat sessions vs 0 Hz floor sessions' },
    outcomeScales: [...CALM_FOCUS, SALIENCE],
    tapTest: false,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 15,
    screening: [
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 16 sessions recommended across the ladder (10+ unlocks an estimate). Group scale for the 4-level rate ladder: n=120 paired at dz=0.3. The 0 Hz floor is the design contribution; Zhao 2025 (BA thesis / PsyArXiv preprint, low-medium confidence) is the existence proof, not the evidence base.',
    priorityNote: 'T1: installs the missing 0 Hz floor and the salience mediator (H5 piggyback) in one deploy — second priority, Advisor-ratified.',
  },
  {
    id: 'ql-noise-ingredient',
    title: 'Is the noise bed the active ingredient?',
    hypothesisId: 'H1',
    registryLinks: ['X05'],
    question:
      'On days you need to sustain attention, does a beat-in-noise session beat a noise-only session — or does the noise bed alone carry the effect, as the best parametric study suggests?',
    mundaneModel:
      'Noise-only ≈ beat+noise: the behavioral benefit of commercial tracks is predicted by noise-and-ritual models without any beat mechanism (Melnichuk 2025 direction).',
    arms: [
      {
        id: 'beat-plus-noise',
        description: 'A 10 Hz binaural beat embedded in the standard pink-noise bed — the commercial default format.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 10, noise: NOISE_BED })],
        attackSec: 5,
        constructionNote: 'Replicates the Melnichuk gamma+noise cell structure at a perceptible rate, behavioral-only.',
      },
      {
        id: 'noise-only',
        description: 'The identical pink-noise bed with the carrier tone dropped below audibility — same ritual texture, no beat.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 0, mode: 'monaural', gainDb: -60, noise: NOISE_BED })],
        attackSec: 5,
        constructionNote: 'Noise-only active control (registry rule 4: silence is never the sole comparator).',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'beat-plus-noise sessions vs noise-only sessions' },
    outcomeScales: CALM_FOCUS,
    tapTest: true,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 12,
    screening: [
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 12 sessions (3/arm logic compressed to 2 arms). Group scale, Advisor gate #12 corrected: n=128 detects only d≈0.50; detecting d=0.35 needs N≈256.',
    priorityNote: 'Replicates the wave\'s most important dissociation behaviorally — third in the ratified order.',
  },
  {
    id: 'ql-ramp-discomfort',
    title: 'Ramp shape and discomfort (harm-artifact test)',
    hypothesisId: 'H3',
    registryLinks: ['X13'],
    question:
      'Does the same 15 Hz beat feel more abrasive and perform worse when it starts abruptly than when it fades in slowly? If yes, the largest home-use harm signal on record may be a discomfort artifact of envelope texture, not frequency-specific neuromodulation.',
    mundaneModel:
      'Discomfort tracks ramp harshness, not beat rate: sharp onsets recruit startle; slow ramps do not. Flat discomfort across ramps would falsify the artifact theory.',
    arms: [
      {
        id: 'ramp-slow',
        description: 'A 15 Hz beat that fades in over 10 seconds.',
        phases: [tone({ durationSec: 720, carrierHz: 250, beatHz: 15 })],
        attackSec: 10,
        constructionNote: 'Long raised-cosine onset (10 s), per standard anti-startle practice extended an order of magnitude.',
      },
      {
        id: 'ramp-fast',
        description: 'The identical 15 Hz beat that reaches full level in 10 milliseconds.',
        phases: [tone({ durationSec: 720, carrierHz: 250, beatHz: 15 })],
        attackSec: 0.01,
        constructionNote: 'Near-abrupt onset — the Klichowski stimulus class. Rate and level identical to the slow arm; only the envelope differs.',
      },
    ],
    primaryContrast: { a: 1, b: 0, label: 'abrupt-onset sessions vs slow-ramp sessions' },
    outcomeScales: [...CALM_FOCUS, DISCOMFORT],
    tapTest: true,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'experimental',
    sessionMinutes: 12,
    screening: [
      { id: 'startle', prompt: 'One arm of this protocol starts abruptly and may feel unpleasant. I opt in knowingly.', kind: 'acknowledge' },
      { id: 'no-sound-sensitivity', prompt: 'I do not have a sound-sensitivity condition (e.g. hyperacusis, misophonia) that abrupt onsets could aggravate.', kind: 'acknowledge' },
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 9–12 sessions. Group scale: n=100 paired. Prices the Klichowski harm artifact before any home-use claim ships.',
    priorityNote: 'Fourth in the ratified order — the cheapest lever that could flip the sign of the home-use literature.',
  },
  {
    id: 'ql-noise-neurotype',
    title: 'Noise bed: helps some, hurts others?',
    hypothesisId: 'H12',
    registryLinks: [],
    question:
      'Does a steady noise bed help YOUR focus or hurt it — and does the answer flip with attention style? Meta-analytic data show noise aiding ADHD-task performance while impairing non-ADHD performance; this run measures which side you land on.',
    mundaneModel:
      'The noise bed is an arousal regulator whose sign depends on neurotype (Nigg 2024: g=+0.249 ADHD / g=−0.212 non-ADHD); it is not an inert bedding layer.',
    arms: [
      {
        id: 'noise-on',
        description: 'A plain 400 Hz tone session (no beat) with the standard pink-noise bed on.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 0, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 5,
        constructionNote: 'Rijmen & Wiersema 2024: a pure tone matched pink noise\'s benefit — tone-plus-noise keeps both candidate actives present.',
      },
      {
        id: 'noise-off',
        description: 'The identical tone session with the noise bed removed.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 0, mode: 'monaural' })],
        attackSec: 5,
        constructionNote: 'Same carrier, same ramp, same ritual; only the bed differs.',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'noise-bed sessions vs no-noise sessions' },
    outcomeScales: CALM_FOCUS,
    tapTest: true,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 12,
    screening: [
      {
        id: 'attention-style',
        prompt: 'Have you been diagnosed with ADHD, or do you identify with persistent attention-difficulty traits? (Stored locally; used only to interpret your own result.)',
        kind: 'yes-no',
      },
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1 estimates your own sign. Group scale (moderation r≈0.25): N≈150+; for the related 2×2 device-moderation design (H6), Advisor gate #12 correction: f=0.2 needs N≈261 (N=150 detects only f≈0.26).',
    priorityNote: 'Fifth in the ratified order — the cheapest validated personalization in the program (noise default on/off by screener).',
  },
  {
    id: 'ql-active-placebo',
    title: 'Real beat vs active placebo vs 0 Hz (expectancy decomposition)',
    hypothesisId: 'H4',
    registryLinks: ['X05'],
    question:
      'Three indistinguishable rituals: a real 10 Hz beat, an active sham (a comparably textured off-band warble that carries no beat at the claimed rate), and a 0 Hz floor. Which of your ratings actually move — and is it the beat that moves them?',
    mundaneModel:
      'Sham ≈ real ≈ 0 Hz on ratings: labeled-ritual effects replicate across all three arms (the subliminal-tape placebo lineage), and any beat-specific residue must separate the real arm from BOTH controls.',
    arms: [
      {
        id: 'veridical-10hz',
        description: 'A real 10 Hz binaural beat on a 400 Hz carrier in the standard noise bed.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 10, noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'X05 veridical cell, 15-min relaxation-context version.',
      },
      {
        id: 'sham-active',
        description: 'An active placebo: the same carrier with a 7.37 Hz amplitude warble — comparably textured, deliberately off every target band, carrying no beat at the claimed rate.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 7.37, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'X05 sham construction: 7.37 Hz monaural AM, iso-intense, off-band (registry rule 4 active comparator).',
      },
      {
        id: 'control-0hz',
        description: 'The 0 Hz floor: identical tones, identical bed, full ritual, no beat and no warble.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 0, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'Zero-rate control — absent from the X-registry (T1 flag); installed here.',
      },
    ],
    primaryContrast: { a: 0, b: 2, label: 'real-beat sessions vs 0 Hz floor sessions' },
    outcomeScales: CALM_FOCUS,
    tapTest: false,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 15,
    screening: [
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 15 sessions (5/arm). Group scale (X05 proper): n=128 detects a stimulus main effect of d=0.5; the pre-registered smallest effect of interest is d=0.3, which needs roughly N≈350 between-groups — stated so nobody over-reads a small run.',
    priorityNote: 'Prices the expectancy share of your own response — the app-scale shadow of registry rank-3 X05.',
  },
  {
    id: 'ql-percept-gate',
    title: 'Can you actually hear the beat? (responder screen)',
    hypothesisId: 'H5',
    registryLinks: ['X01', 'X10'],
    question:
      'The beat percept is unreliable person-to-person — a 2025 replication failed to reproduce the classical detection pattern consistently. This screen checks whether YOU reliably hear a beat at the parameters this app delivers, before you read anything into beat outcomes.',
    mundaneModel:
      'If your salience ratings do not separate a clearly perceptible beat from one designed to sit at the edge of perception, beat-mediated accounts are gated off for you — any effects you do get belong to ritual, noise, or rest.',
    arms: [
      {
        id: 'perceptible-10hz',
        description: 'A 10 Hz beat on a 400 Hz carrier — squarely inside the perceptible window (carrier ≲1 kHz, Δf ≲30 Hz).',
        phases: [tone({ durationSec: 420, carrierHz: 400, beatHz: 10 })],
        attackSec: 3,
        constructionNote: 'X01 screening cell, perceptible anchor.',
      },
      {
        id: 'edge-45hz',
        description: 'A 45 Hz rate on the same carrier — above the ~30 Hz ceiling where the beat percept dissolves into roughness; by construction there is no "beat" to hear.',
        phases: [tone({ durationSec: 420, carrierHz: 400, beatHz: 45 })],
        attackSec: 3,
        constructionNote: 'Above the Licklider/Oster perceptual ceiling: a percept-free stimulus (engine guardrail acknowledges >30 Hz is not heard as a beat — here that limit IS the control).',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'in-window sessions vs above-ceiling sessions on rated salience' },
    outcomeScales: [SALIENCE, ...CALM_FOCUS],
    tapTest: false,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 7,
    screening: [
      { id: 'headphones', prompt: 'I will use stereo headphones for these sessions.', kind: 'acknowledge' },
      { id: 'optin', prompt: 'I understand this is a self-experiment: no health benefit is promised, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1 screen: salience separation is the endpoint, 10+ sessions. This is the behavioral proxy for X01/X10 (EEG percept-gating); it cannot certify "responder" status — only EEG can.',
    priorityNote: 'The percept-gating responder screen: if the percept is not there for you, every beat-outcome question is moot.',
  },
];

export function getProtocol(id: string): QuickLabProtocol | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}
