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
      { id: 'no-seizure', prompt: 'I have no personal or family history of photosensitive or sound-evoked seizures (the abrupt-onset arm is deliberately startling).', kind: 'acknowledge' },
      { id: 'not-driving', prompt: 'I will not run these sessions while driving or operating machinery.', kind: 'acknowledge' },
      { id: 'optin', prompt: 'I understand the abrupt-onset arm is intentionally uncomfortable, and I can stop instantly at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 12 sessions. Group scale: n=90 paired at dz=0.3. If discomfort explains Klichowski 2023 (n=1,000), discomfort should track ramp, not rate — this protocol is that test.',
    priorityNote: 'Tests the wave\'s most consequential mundane alternative directly.',
  },
  {
    id: 'ql-noise-neurotype',
    title: 'Does the noise bed help or hurt you? (neurotype screen)',
    hypothesisId: 'H12',
    registryLinks: [],
    question:
      'Does adding the 1/f noise bed under the same beat help or hurt your focus and calm? The meta-analytic sign of noise effects flips with neurotype (helps in ADHD, hurts outside it) — this tells you which side of that line your own response falls on.',
    mundaneModel:
      'Most users are outside the ADHD subgroup, so the bed should be neutral-to-slightly-negative on average; a positive response is the interesting, minority cell.',
    arms: [
      {
        id: 'beat-with-bed',
        description: 'The standard beat session with the pink-noise bed on.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 10, noise: NOISE_BED })],
        attackSec: 5,
        constructionNote: 'Bed at −20 dB, the commercial default.',
      },
      {
        id: 'beat-bare',
        description: 'The identical beat with the noise bed off — bare carrier pair only.',
        phases: [tone({ durationSec: 720, carrierHz: 400, beatHz: 10 })],
        attackSec: 5,
        constructionNote: 'Same carrier, rate, level, ramp; only the bed differs.',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'sessions with the noise bed vs sessions without it' },
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
      'n-of-1: 12 sessions. Group scale, Advisor gate #12 corrected for the 2×2 interaction (bed × neurotype, f=0.2): N≈261.',
    priorityNote: 'T1: the noise-bed neurotype cell is understudied inside beat products specifically.',
  },
  {
    id: 'ql-active-placebo',
    title: 'Active placebo run (expectancy decomposition)',
    hypothesisId: 'H6',
    registryLinks: ['X05'],
    question:
      'Do you respond to a genuine 10 Hz beat, to a physiologically near-identical decoy (an off-band 7.37 Hz monaural wobble), or to nothing — and how big is the expectancy share of your response?',
    mundaneModel:
      'Decoy ≈ veridical ≈ floor on calm/focus: the measured benefit of beat products is mostly labeled-ritual expectancy (subliminal-tape lineage). A veridical-only step is the specific effect; a decoy step is expectancy.',
    arms: [
      {
        id: 'veridical-10hz',
        description: 'A genuine 10 Hz binaural beat in the standard noise bed.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 10, noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'The X05 veridical cell, n-of-1 form.',
      },
      {
        id: 'sham-active',
        description: 'An active decoy with equivalent loudness and texture: a 7.37 Hz off-band monaural AM — perceptible pulsing, outside the claimed mechanism.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 7.37, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'Registry X05 sham: 7.37 Hz monaural AM in the identical bed — the active comparator (silence is never the only control).',
      },
      {
        id: 'control-0hz',
        description: 'The 0 Hz floor: same session, no beat at all.',
        phases: [tone({ durationSec: 900, carrierHz: 400, beatHz: 0, mode: 'monaural', noise: NOISE_BED })],
        attackSec: 10,
        constructionNote: 'Installed per the T1 floor-flag.',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'veridical sessions vs active-decoy sessions' },
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
      'n-of-1: 18 sessions recommended (6/arm, 3 arms). Group scale: the X05 2×2 runs at n=120 with the graded-replication escalation rule.',
    priorityNote: 'Expectancy decomposition is the registry\'s highest-value cell (X05); this is its n-of-1 shadow.',
  },
  {
    id: 'ql-percept-gate',
    title: 'Percept gating (are you a responder?)',
    hypothesisId: 'H10',
    registryLinks: ['X08'],
    question:
      'Can you actually hear the beat at the rates used in sessions? Salience ratings above and below the classical perceptual ceiling tell you — and gate every other beat experiment you run on yourself.',
    mundaneModel:
      'Salience collapses above ~30 Hz and at very high carriers for nearly everyone (Licklider limits); the interesting cell is the mid-window maximum.',
    arms: [
      {
        id: 'in-window-10hz',
        description: 'A beat at 10 Hz on a 400 Hz carrier — inside the classical perceptual window.',
        phases: [tone({ durationSec: 300, carrierHz: 400, beatHz: 10 })],
        attackSec: 2,
        constructionNote: 'Reference salience cell (Licklider max region).',
      },
      {
        id: 'edge-45hz',
        description: 'A beat at 45 Hz on a 400 Hz carrier — above the classical beat-percept ceiling.',
        phases: [tone({ durationSec: 300, carrierHz: 400, beatHz: 45 })],
        attackSec: 2,
        constructionNote: 'Above-ceiling control: reports of a "beat" here index expectation, not perception.',
      },
      {
        id: 'high-carrier-10hz',
        description: 'A beat at 10 Hz on a 3200 Hz carrier — inside the rate window but at a carrier where cortical beat responses die.',
        phases: [tone({ durationSec: 300, carrierHz: 3200, beatHz: 10 })],
        attackSec: 2,
        constructionNote: 'Carrier-ceiling control (Schwarz & Taylor 2005: binaural ASSR collapses above ~3 kHz).',
      },
    ],
    primaryContrast: { a: 0, b: 1, label: 'salience inside the perceptual window vs above its ceiling' },
    outcomeScales: [SALIENCE],
    tapTest: false,
    minSessions: MIN_SESSIONS,
    blinding: 'full',
    safetyClass: 'adult',
    sessionMinutes: 5,
    screening: [
      { id: 'optin', prompt: 'I understand this is a perception screening, not a treatment, and I can stop at any time.', kind: 'acknowledge' },
    ],
    powerNote:
      'n-of-1: 12 sessions (4/arm). Group scale: n=60. Run this FIRST among perception-gated protocols — non-perceivers cannot certify "responder" status anywhere else.',
    priorityNote: 'Responder screen that gates the meaning of every other Quick Lab result.',
  },
];

/** Lookup by protocol id. */
export function getProtocol(id: string): QuickLabProtocol | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}
