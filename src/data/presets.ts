/**
 * Session presets — plain-data session specifications with evidence grades.
 *
 * The Phase/SessionSpec types here are LOCAL to the data layer so the engine
 * (W3) stays decoupled; the engine adapts these into its own runtime types.
 */

import type { Grade } from './frequencies';

export type PresetCategory = 'Sleep' | 'Focus' | 'Relax' | 'Meditate' | 'Wellness' | 'Experimental' | 'Infant';

/**
 * Stimulus modality. Undefined means 'binaural' (legacy default).
 * Domain limits (psychoacoustics): binaural requires carrier <= ~1000 Hz and
 * beat <= ~30 Hz; monaural/isochronic AM stays audible well past 30 Hz and is
 * the correct modality for faster rhythms (canon: crit_r1 — stronger ASSR,
 * but ASSR strength is NOT a proven outcome).
 */
export type PresetMode = 'binaural' | 'monaural' | 'isochronic' | 'noise';

/** One continuous segment of a session. */
export interface Phase {
  name: string;
  /** Segment length in seconds (> 0). */
  durationSec: number;
  /** Carrier tone frequency in Hz (> 0). */
  carrierHz: number;
  /** Binaural beat / amplitude-modulation rate in Hz (0 = none). */
  beatHz: number;
  /** Digital gain in dBFS (<= 0; more negative = quieter). */
  gainDbFs: number;
  /** Stimulus modality for this phase (default: binaural). */
  mode?: PresetMode;
  /** Optional fade-in/out ramp at phase boundaries, seconds. */
  rampSec?: number;
  /** Optional low-pass cutoff in Hz (required for Infant presets). */
  lowpassHz?: number;
}

/** SessionSpec-shaped plain object (engine adapts; do not import engine types). */
export interface SessionSpec {
  phases: Phase[];
  autoShutoff: boolean;
  /** Heartbeat pulse rate, BPM (infant content only; 60-80 per AAP-aligned design). */
  heartbeatBpm?: number;
}

/**
 * WHO-ITU H.870 dose metadata. Digital gain is NOT an acoustic level, so the
 * estimate assumes a listening level and says so; measure your own chain.
 */
export interface PresetDoseInfo {
  /** Assumed listening level for the estimate, dBA. */
  assumedDbA: number;
  /** One full session as % of the adult weekly budget (80 dBA / 40 h / 7 d, 3 dB equal-energy exchange). */
  weeklyBudgetPct: number;
}

export interface Preset {
  id: string;
  title: string;
  category: PresetCategory;
  spec: SessionSpec;
  grade: Grade;
  rationale: string;
  citations: string[];
  /**
   * H.870 dose metadata — auto-computed for every entry of PRESETS below.
   * Optional on the type so external SessionSpec-shaped literals (e.g.
   * replication protocols) remain valid Presets without recomputing it.
   */
  dose?: PresetDoseInfo;
}

/** One session's share of the H.870 adult weekly budget at an assumed level. */
export function weeklyDosePct(durationMin: number, dbA: number): number {
  return (durationMin / (40 * 60)) * Math.pow(2, (dbA - 80) / 3) * 100;
}

/**
 * Assumed listening level for dose metadata: 50 dBA for infant content
 * (the AAP-aligned crib ceiling), 70 dBA for everything else (the app's
 * default comfort target). Stated assumption, not a measurement.
 */
function assumedLevelDbA(category: PresetCategory): number {
  return category === 'Infant' ? 50 : 70;
}

/** Preset as authored; H.870 dose metadata is attached automatically below. */
type PresetSpec = Omit<Preset, 'dose'>;

const RAW_PRESETS: readonly PresetSpec[] = [
  // ------------------------------------------------------------------- Sleep
  {
    id: 'sleep-delta-descent',
    title: 'Delta Descent',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'settle', durationSec: 600, carrierHz: 120, beatHz: 4, gainDbFs: -14, rampSec: 60 },
        { name: 'deep', durationSec: 3000, carrierHz: 100, beatHz: 2, gainDbFs: -16, rampSec: 120 },
        { name: 'fade', durationSec: 600, carrierHz: 90, beatHz: 1, gainDbFs: -20, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale:
      'Sleep evidence is small and mixed (Bavafa 2023 n=31; Sharma & Dhaka n=15). Wellness framing: relaxation before sleep; not an insomnia treatment — CBT-I remains first-line.',
    citations: ['chamgap.com/en/verdicts/sleep (2022-2026 synthesis of Bavafa 2023; Sharma & Dhaka; Dabiri 2022)'],
  },
  {
    id: 'sleep-slow-wave-cue',
    title: 'Slow-Wave Cueing (closed-loop analog)',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'sleep-onset', durationSec: 900, carrierHz: 110, beatHz: 3, gainDbFs: -18, rampSec: 90 },
        { name: 'slow-wave', durationSec: 2700, carrierHz: 100, beatHz: 1, gainDbFs: -18 },
      ],
    },
    grade: 'B',
    rationale:
      'Ngo et al. 2013 showed phase-locked acoustic stimulation during slow-wave sleep enhances slow oscillations and memory consolidation — but that was CLOSED-LOOP (EEG-triggered); this open-loop preset is a relaxation analog, not a replication.',
    citations: ['Ngo et al., Neuron 78(3):545-553 (2013)'],
  },
  {
    id: 'sleep-theta-drift',
    title: 'Theta Drift',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'drift', durationSec: 1200, carrierHz: 140, beatHz: 6, gainDbFs: -16, rampSec: 120 },
        { name: 'settle', durationSec: 1200, carrierHz: 110, beatHz: 4, gainDbFs: -20, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale: 'Theta-range relaxation before sleep; clinical sleep endpoints unproven in small trials.',
    citations: ['chamgap.com/en/verdicts/sleep (synthesis, 2022-2026)'],
  },
  {
    id: 'sleep-pink-quiet',
    title: 'Quiet Night (noise-only control)',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'pink', durationSec: 1800, carrierHz: 200, beatHz: 0, gainDbFs: -24 }],
    },
    grade: 'C',
    rationale:
      'Deliberate beat-free control preset. Ingendoh 2023 found embedding beats in noise associated with null EEG findings — honest baseline for comparison.',
    citations: ['Ingendoh et al., PLOS ONE (2023), PMC10198548'],
  },

  // ------------------------------------------------------------------- Focus
  {
    id: 'focus-smr',
    title: 'SMR Focus',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ramp', durationSec: 300, carrierHz: 180, beatHz: 13, gainDbFs: -12, rampSec: 60 },
        { name: 'hold', durationSec: 3000, carrierHz: 180, beatHz: 14, gainDbFs: -12 },
      ],
    },
    grade: 'C',
    rationale:
      'SMR (12-15 Hz) neurofeedback claims weakened by JAMA Psychiatry 2024 meta-analysis (SMD 0.04). Presented as a focus ritual, not cognitive enhancement.',
    citations: ['JAMA Psychiatry 2024 neurofeedback meta-analysis (SMD 0.04)'],
  },
  {
    id: 'focus-beta-block',
    title: 'Beta Block (50 min)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ramp', durationSec: 300, carrierHz: 220, beatHz: 15, gainDbFs: -12, rampSec: 60 },
        { name: 'deep-work', durationSec: 2700, carrierHz: 220, beatHz: 18, gainDbFs: -12 },
      ],
    },
    grade: 'C',
    rationale:
      'Beta="focus" mapping is inconsistent at individual-study level (Basu & Banerjee 2023). WARNING: the largest study (n=1000) found 15 Hz beats WORSENED fluid-intelligence scores during listening — avoid during high-stakes tasks.',
    citations: ['Basu & Banerjee 2023 (g = 0.40, caveated)', 'Klichowski et al., Sci Rep 2023 (n=1000 reverse effect)'],
  },
  {
    id: 'focus-pomodoro',
    title: 'Pomodoro Focus (25 min)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'sprint', durationSec: 1500, carrierHz: 200, beatHz: 15, gainDbFs: -14 }],
    },
    grade: 'C',
    rationale: 'Short-bounded focus session; 25-minute cap keeps exposure conservative and matches work-break hygiene.',
    citations: ['WHO-ITU H.870 (2019) safe-listening dose hygiene'],
  },
  {
    id: 'focus-alpha-flow',
    title: 'Alpha Flow',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'settle', durationSec: 420, carrierHz: 160, beatHz: 10, gainDbFs: -14, rampSec: 60 },
        { name: 'flow', durationSec: 2400, carrierHz: 160, beatHz: 11, gainDbFs: -14 },
      ],
    },
    grade: 'C',
    rationale: 'Low-beta/alpha boundary session for calm alertness; pooled entrainment effects modest (g≈0.4) with heterogeneity.',
    citations: ['Garcia-Argibay et al., Psychol Res 2019 (g = 0.45, heterogeneity caveats)'],
  },

  // ------------------------------------------------------------------- Relax
  {
    id: 'relax-alpha-ease',
    title: 'Alpha Ease',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ease-in', durationSec: 300, carrierHz: 150, beatHz: 10, gainDbFs: -14, rampSec: 60 },
        { name: 'rest', durationSec: 1500, carrierHz: 140, beatHz: 9, gainDbFs: -16, rampSec: 60 },
      ],
    },
    grade: 'B',
    rationale:
      'Alpha-range relaxation has the most consistent RCT support (peri-procedural anxiety: Padmanabhan 2005 26.3% STAI reduction, replicated 2016-2024). Benefit shown without demonstrated EEG entrainment.',
    citations: ['Padmanabhan et al., Anaesthesia 60:874-7 (2005), PMID 16115248'],
  },
  {
    id: 'relax-432-evening',
    title: '432 Hz Evening Unwind',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'unwind', durationSec: 1200, carrierHz: 432, beatHz: 0, gainDbFs: -16, rampSec: 90 }],
    },
    grade: 'B',
    rationale:
      'Grade B- pilot evidence: music tuned to A=432 Hz modestly lowered heart rate vs 440 Hz in a double-blind n=33 crossover (2020 corrigendum noted). Preliminary only.',
    citations: ['Calamassi & Pomponi, Explore 15(4):283-290 (2019) + 2020 corrigendum'],
  },
  {
    id: 'relax-schumann-sim',
    title: 'Schumann Simulation (7.83 Hz beat)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'ground', durationSec: 1500, carrierHz: 136.1, beatHz: 7.83, gainDbFs: -16, rampSec: 60 }],
    },
    grade: 'C',
    rationale:
      'Schumann resonance is real geophysics (grade A) but this audio is a SIMULATION (binaural beat, not the EM field); biological-coupling evidence is correlational and unreplicated (grade C).',
    citations: ['Balser & Wagner, Nature 188:638-641 (1960)', 'Saroka, Vares & Persinger, PLoS ONE 11(1):e0146595 (2016)'],
  },
  {
    id: 'relax-breath-pacer',
    title: 'Breath Pacer (0.1 Hz AM)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'breathe', durationSec: 900, carrierHz: 180, beatHz: 0.1, gainDbFs: -16, rampSec: 30 }],
    },
    grade: 'C',
    rationale: '0.1 Hz amplitude envelope doubles as a ~6 breaths/min pacer; slow-paced breathing itself (not beats) has autonomic support.',
    citations: ['Slow-paced breathing literature (HRV biofeedback); framed as pacing aid, not entrainment'],
  },
  {
    id: 'relax-heartbeat-calm',
    title: 'Calm Heartbeat',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      heartbeatBpm: 64,
      phases: [{ name: 'rest', durationSec: 1200, carrierHz: 90, beatHz: 0, gainDbFs: -18, lowpassHz: 800 }],
    },
    grade: 'C',
    rationale: 'Low-passed heartbeat-adjacent texture at 64 BPM (maternal resting range); comfort content, no clinical claim.',
    citations: ['Loewy et al., Pediatrics 2013 (womb-sound/heartbeat simulations, preterm infants)'],
  },

  // --------------------------------------------------------------- Meditate
  {
    id: 'meditate-theta-garden',
    title: 'Theta Garden',
    category: 'Meditate',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'descend', durationSec: 600, carrierHz: 136.1, beatHz: 8, gainDbFs: -14, rampSec: 60 },
        { name: 'dwell', durationSec: 2400, carrierHz: 136.1, beatHz: 6, gainDbFs: -14 },
      ],
    },
    grade: 'C',
    rationale: 'Theta-range meditation aid using the Cousto OM carrier (136.10 Hz) as cultural soundscape; no frequency-specific therapeutic claim.',
    citations: ['Cousto, The Cosmic Octave (1978/1984)', 'Garcia-Argibay 2019 (modest pooled effects)'],
  },
  {
    id: 'meditate-om-cousto',
    title: 'OM (Earth-Year Tone) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'om', durationSec: 1800, carrierHz: 136.1, beatHz: 0, gainDbFs: -14, rampSec: 60 }],
    },
    grade: 'D',
    rationale:
      'Cousto arithmetic is exact (grade A for the math) but therapeutic claims are grade D; offered explicitly as cultural/meditative soundscape.',
    citations: ['Cousto, The Cosmic Octave; planetware.de/octave'],
  },
  {
    id: 'meditate-solfeggio-528',
    title: 'Solfeggio 528 (honest label) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'tone', durationSec: 1200, carrierHz: 528, beatHz: 0, gainDbFs: -14, rampSec: 60 }],
    },
    grade: 'D',
    rationale:
      '1970s-1999 numerology construct (Puleo/Horowitz), NOT medieval. "DNA repair" claim unsupported (Babayi & Riazi 2017 measured no DNA endpoint). Kept as cultural content with honest labeling.',
    citations: ['Babayi & Riazi 2017 (no DNA endpoint)', 'musickanheal.com evidence review (2026)'],
  },
  {
    id: 'meditate-chakra-walk',
    title: 'Chakra Walk (396-963 Hz ascent) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'root', durationSec: 300, carrierHz: 396, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'sacral', durationSec: 300, carrierHz: 417, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'solar', durationSec: 300, carrierHz: 528, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'heart', durationSec: 300, carrierHz: 639, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'throat', durationSec: 300, carrierHz: 741, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'third-eye', durationSec: 300, carrierHz: 852, beatHz: 0, gainDbFs: -16, rampSec: 20 },
        { name: 'crown', durationSec: 300, carrierHz: 963, beatHz: 0, gainDbFs: -16, rampSec: 20 },
      ],
    },
    grade: 'D',
    rationale: 'Hz-chakra mapping is a 1990s numerological graft on a genuine contemplative system; meditation tool only, no physiological claim.',
    citations: ['soundr.xyz chakra-frequency guide (2024): claims lack peer-reviewed support'],
  },

  // ---------------------------------------------------------------- Wellness
  // Medical-frequency-healing research wave (Stage 13, research/medical_freq_healing.md).
  // Wellness framing only: relaxation / minor-ache territory per FDA Class I (ISA)
  // and general-wellness policy. NO disease claims anywhere in this section.
  {
    id: 'wellness-vat-40',
    title: 'VAT 40 (vibroacoustic analog)',
    category: 'Wellness',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'settle', durationSec: 300, carrierHz: 80, beatHz: 40, mode: 'isochronic', gainDbFs: -18, rampSec: 30 },
        { name: 'core', durationSec: 1080, carrierHz: 100, beatHz: 40, mode: 'isochronic', gainDbFs: -16 },
        { name: 'release', durationSec: 120, carrierHz: 80, beatHz: 40, mode: 'isochronic', gainDbFs: -20, rampSec: 30 },
      ],
    },
    grade: 'B',
    rationale:
      'Audio approximation of the most-studied vibroacoustic protocol: 40 Hz, ~25-minute sessions (Naghdi 2015 used 23 min, 2x/week, 5 weeks; Kantor 2022 scoping review: 40 Hz is the predominant VAT frequency, sessions 20-45 min). Real VAT is FELT through transducers in furniture — speakers/headphones only approximate it. Evidence covers pain, sleep, and fibromyalgia SYMPTOMS; no disease-modifying claim.',
    citations: [
      'Kantor et al., BMJ Open (2022) — VAT chronic-pain scoping review',
      'Naghdi et al., Pain Res Manag (2015); PMC4325896',
      'Fibromyalgia parallel RCT, n=50 (2019); PMC6396935',
    ],
  },
  {
    id: 'wellness-vat-scan',
    title: 'Physioacoustic Scan (30-120 Hz VAT band)',
    category: 'Wellness',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'scan-60', durationSec: 360, carrierHz: 60, beatHz: 40, mode: 'isochronic', gainDbFs: -18, rampSec: 20 },
        { name: 'scan-80', durationSec: 360, carrierHz: 80, beatHz: 40, mode: 'isochronic', gainDbFs: -18, rampSec: 20 },
        { name: 'scan-100', durationSec: 360, carrierHz: 100, beatHz: 40, mode: 'isochronic', gainDbFs: -18, rampSec: 20 },
        { name: 'scan-120', durationSec: 360, carrierHz: 120, beatHz: 40, mode: 'isochronic', gainDbFs: -18, rampSec: 20 },
      ],
    },
    grade: 'C',
    rationale:
      'Lehikoinen physioacoustic style: the tone scans the 30-120 Hz VAT band under a constant slow pulsation. Weaker evidence base than fixed 40 Hz (Kantor 2022); relaxation/minor-ache framing only — the FDA therapeutic-vibrator equivalence covers exactly that and nothing more.',
    citations: [
      'Kantor et al., BMJ Open (2022)',
      'Lehikoinen physioacoustic method description (vibrac.fi)',
      'FDA determination: vibroacoustic devices substantially equivalent to therapeutic vibrators (via Wikipedia VAT)',
    ],
  },
  {
    id: 'wellness-bowl-relax',
    title: 'Bowl Session (meditation-naive relaxation)',
    category: 'Wellness',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'arrive', durationSec: 240, carrierHz: 128, beatHz: 3, gainDbFs: -18, rampSec: 30 },
        { name: 'dwell', durationSec: 840, carrierHz: 128, beatHz: 2.5, gainDbFs: -18 },
        { name: 'return', durationSec: 120, carrierHz: 128, beatHz: 4, gainDbFs: -22, rampSec: 30 },
      ],
    },
    grade: 'C',
    rationale:
      'Singing-bowl meditation analog: a low 128 Hz tone under a slow delta-rate envelope. Goldsby 2017 (n=62, observational) found reduced tension/anger/fatigue and lower pain ratings after bowl meditation, strongest in meditation-naive listeners. No control group — this is the relaxation response, not a frequency-specific effect.',
    citations: ['Goldsby et al., J Evid Based Complementary Altern Med (2017); PMC5871151'],
  },
  {
    id: 'wellness-otto-128',
    title: 'Otto 128 (localized-vibration analog)',
    category: 'Wellness',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'tone', durationSec: 720, carrierHz: 128, beatHz: 0, gainDbFs: -16, rampSec: 20 }],
    },
    grade: 'C',
    rationale:
      'Plain 128 Hz tone standing in for the Otto weighted tuning fork used in bodywork. The plausible part is vibrotactile — mechanoreceptor/gate-control framing (Kantor 2022) — and a speaker is a poor fork. The "nitric oxide release" healing claim is vendor-traced and weak. Practitioner contraindications: bone weakness, pacemakers, metal implants.',
    citations: [
      'Kantor et al., BMJ Open (2022) — mechanoreceptor/gate-control framing',
      'Otto-fork practitioner literature (Biosonics ecosystem; rehab blogs 68/72/128 Hz) — folklore-adjacent, labeled as such',
    ],
  },

  // ------------------------------------------------------------ Experimental
  {
    id: 'exp-gamma-40',
    title: '40 Hz Gamma (experimental)',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'gamma', durationSec: 1800, carrierHz: 160, beatHz: 40, mode: 'monaural', gainDbFs: -14, rampSec: 30 }],
    },
    grade: 'B',
    rationale:
      'Mouse data robust (Iaccarino 2016; Martorell 2019); HUMAN EFFICACY UNPROVEN — Cognito OVERTURE pivotal trial missed its primary endpoint (Hajós 2024); failed replications exist (Soula 2023; Yang & Lai 2023). Experimental label, no disease claims.',
    citations: [
      'Iaccarino et al., Nature 540:230-235 (2016)',
      'Martorell et al., Cell 177:256-271 (2019)',
      'Hajós et al. 2024 (Cognito OVERTURE primary-endpoint miss)',
    ],
  },
  {
    id: 'exp-assr-40',
    title: 'ASSR Probe (40 Hz steady-state)',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'probe', durationSec: 600, carrierHz: 500, beatHz: 40, mode: 'monaural', gainDbFs: -16 }],
    },
    grade: 'B',
    rationale:
      'The 40 Hz auditory steady-state response (Galambos 1981) is a real, clinically used evoked response — the strongest evidence the brain FOLLOWS a 40 Hz amplitude envelope. Diagnostic phenomenon, not therapy.',
    citations: ['Galambos et al., 1981 (40 Hz auditory steady-state response)'],
  },
  {
    id: 'exp-lambda-label',
    title: 'Lambda Band (vendor construct, do not use clinically) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'demo', durationSec: 300, carrierHz: 300, beatHz: 100, mode: 'monaural', gainDbFs: -18 }],
    },
    grade: 'D',
    rationale: '"Lambda" (100-200 Hz) is a marketing construct, not a recognized EEG band; included for transparency/label-testing only.',
    citations: ['Evidence audit 2026: no peer-reviewed lambda-band literature'],
  },
  {
    id: 'exp-schumann-modes',
    title: 'Schumann Modes Sweep (measured values)',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'm1', durationSec: 300, carrierHz: 200, beatHz: 7.83, gainDbFs: -18, rampSec: 30 },
        { name: 'm2', durationSec: 300, carrierHz: 200, beatHz: 14.1, gainDbFs: -18, rampSec: 30 },
        { name: 'm3', durationSec: 300, carrierHz: 200, beatHz: 20.3, gainDbFs: -18, rampSec: 30 },
        { name: 'm4', durationSec: 300, carrierHz: 200, beatHz: 26.4, gainDbFs: -18, rampSec: 30 },
        { name: 'm5', durationSec: 300, carrierHz: 200, beatHz: 32, mode: 'monaural', gainDbFs: -18, rampSec: 30 },
      ],
    },
    grade: 'C',
    rationale:
      'Uses MEASURED Schumann modes (14.1/20.3/26.4/32) rather than the drifted values (14.3/20.8/27.3/33.8) propagated by wellness sites. Beat simulation only; entrainment claims unproven.',
    citations: ['Hylaty ELF station report (2016)', 'Balser & Wagner, Nature 1960'],
  },
  {
    id: 'exp-epsilon-null',
    title: 'Epsilon Sub-Delta — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'drift', durationSec: 600, carrierHz: 120, beatHz: 0.4, gainDbFs: -18 }],
    },
    grade: 'D',
    rationale: 'Epsilon (<0.5 Hz) entrainment has no literature support; included as labeled folklore, not therapy.',
    citations: ['Evidence audit 2026: no epsilon-band entrainment literature'],
  },
  {
    id: 'exp-rife-cafl',
    title: 'Rife CAFL Homage (727/787/880/2008 Hz) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'f727', durationSec: 240, carrierHz: 727, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 'f787', durationSec: 240, carrierHz: 787, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 'f880', durationSec: 240, carrierHz: 880, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 'f2008', durationSec: 240, carrierHz: 2008, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
      ],
    },
    grade: 'D',
    rationale:
      'The early-Rife audio set as circulated in the community CAFL list. Radionics ancestor: the "mortal oscillatory rate" concept has never survived a controlled test, and the American Cancer Society (1994) notes Rife-generator radio waves are too weak to destroy bacteria. Sellers who marketed such devices as disease treatment were criminally convicted (Folsom 2009). Shipped as history — NOT a medical protocol; never a substitute for oncology care.',
    citations: [
      'ACS "Questionable Methods of Cancer Management" (1994), via PolitiFact (2022-07-29)',
      'QuackWatch Device Watch — Rife enforcement archive (Folsom 2009; Frager 2011)',
      'CAFL v2023_05_25 (electroherbalism.com) — community folklore list',
    ],
  },
  {
    id: 'exp-cyma-commutation',
    title: 'Cyma Commutation Homage (5-tone stack) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 't1', durationSec: 240, carrierHz: 220, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 't2', durationSec: 240, carrierHz: 277, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 't3', durationSec: 240, carrierHz: 330, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 't4', durationSec: 240, carrierHz: 396, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
        { name: 't5', durationSec: 240, carrierHz: 528, beatHz: 0, mode: 'monaural', gainDbFs: -18, rampSec: 10 },
      ],
    },
    grade: 'D',
    rationale:
      'Homage to Manners\' five-frequency "commutation" format (Cyma 1000). The actual commutation codes are unpublished and proprietary — this is a REPRESENTATIVE stack, not a Cyma code. The devices are FDA Class I acoustic massagers whose own vendor states they "do not diagnose, treat, cure or prevent disease". No peer-reviewed trial supports any carcinoma claim. Cultural artifact only.',
    citations: [
      'Cyma Technologies Ordering Information (2025-04) — vendor\'s own Class I / no-disease-claims language',
      'vesica.org — Cymatherapy overview (Class I "electric acoustic massager" status)',
      'cymatechnologies.com — Manners/Cromwell history',
    ],
  },

  // ------------------------------------------- Brainwave band walks (full-band)
  {
    id: 'walk-delta',
    title: 'Delta Band Walk (3.5 to 1 Hz)',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'upper-delta', durationSec: 600, carrierHz: 120, beatHz: 3.5, gainDbFs: -16, rampSec: 60 },
        { name: 'mid-delta', durationSec: 1200, carrierHz: 110, beatHz: 2, gainDbFs: -18, rampSec: 120 },
        { name: 'low-delta', durationSec: 900, carrierHz: 100, beatHz: 1, gainDbFs: -20, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale:
      'Walks the full delta band. Sleep evidence is small and mixed (Bavafa 2023 n=31; Sharma & Dhaka n=15), and closed-loop delta cueing (Ngo 2013) does not transfer to open-loop playback — relaxation framing only.',
    citations: ['Bavafa et al. 2023; Sharma & Dhaka (n=15); Dabiri 2022 (bsu_dim01 sleep-trial synthesis)', 'Ngo et al., Neuron 78(3):545-553 (2013)'],
  },
  {
    id: 'walk-theta',
    title: 'Theta Band Walk (4-8 Hz)',
    category: 'Meditate',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'upper-theta', durationSec: 600, carrierHz: 140, beatHz: 7.5, gainDbFs: -14, rampSec: 60 },
        { name: 'mid-theta', durationSec: 1500, carrierHz: 140, beatHz: 6, gainDbFs: -14, rampSec: 120 },
        { name: 'low-theta', durationSec: 600, carrierHz: 120, beatHz: 4.5, gainDbFs: -16, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale:
      'Walks the theta band (4-8 Hz). Pooled behavioral effects are modest (g≈0.45) with heterogeneity, and 8 of 14 controlled EEG studies contradict the cortical-entrainment hypothesis — meditation aid, not a switch.',
    citations: ['Garcia-Argibay et al., Psychol Res 2019 (g = 0.45)', 'Ingendoh et al., PLOS ONE 2023 (14-study EEG review)'],
  },
  {
    id: 'walk-alpha',
    title: 'Alpha Band Walk (12.5 to 8.5 Hz)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'upper-alpha', durationSec: 300, carrierHz: 150, beatHz: 12.5, gainDbFs: -14, rampSec: 60 },
        { name: 'mid-alpha', durationSec: 1200, carrierHz: 150, beatHz: 10, gainDbFs: -14, rampSec: 60 },
        { name: 'low-alpha', durationSec: 600, carrierHz: 140, beatHz: 8.5, gainDbFs: -16, rampSec: 90 },
      ],
    },
    grade: 'B',
    rationale:
      'Walks the alpha band top-down. Alpha-range relaxation carries the most consistent RCT support in this literature (peri-procedural anxiety, Padmanabhan 2005, replicated 2016-2024); benefit shown without demonstrated EEG entrainment.',
    citations: ['Padmanabhan et al., Anaesthesia 60:874-7 (2005), PMID 16115248', 'Garcia-Argibay et al., Psychol Res 2019'],
  },
  {
    id: 'walk-smr',
    title: 'SMR Band Walk (12-15 Hz)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'low-smr', durationSec: 300, carrierHz: 180, beatHz: 12.5, gainDbFs: -12, rampSec: 60 },
        { name: 'mid-smr', durationSec: 1500, carrierHz: 180, beatHz: 13.5, gainDbFs: -12, rampSec: 60 },
        { name: 'high-smr', durationSec: 300, carrierHz: 180, beatHz: 15, gainDbFs: -14, rampSec: 60 },
      ],
    },
    grade: 'C',
    rationale:
      'Walks the sensorimotor-rhythm band. SMR neurofeedback claims were weakened by the JAMA Psychiatry 2024 meta-analysis (SMD 0.04, near-null); audio-only entrainment evidence is weaker still. Focus ritual, not cognitive enhancement.',
    citations: ['JAMA Psychiatry 2024 neurofeedback meta-analysis (SMD 0.04)'],
  },
  {
    id: 'walk-beta',
    title: 'Beta Band Walk (14-28 Hz)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'low-beta', durationSec: 300, carrierHz: 220, beatHz: 14, gainDbFs: -12, rampSec: 60 },
        { name: 'mid-beta', durationSec: 1500, carrierHz: 220, beatHz: 20, gainDbFs: -12, rampSec: 60 },
        { name: 'high-beta', durationSec: 300, carrierHz: 220, beatHz: 28, gainDbFs: -14, rampSec: 60 },
      ],
    },
    grade: 'C',
    rationale:
      'Walks the beta band up to 28 Hz (binaural ceiling ~30 Hz honored). Frequency-specific "beta = focus" claims are inconsistent (Basu & Banerjee 2023); WARNING: the largest trial (Klichowski 2023, n=1000) found 15 Hz beats WORSENED fluid-intelligence scores during listening.',
    citations: ['Basu & Banerjee 2023 (g = 0.40, caveated)', 'Klichowski et al., Sci Rep 2023 (n=1000 reverse effect)'],
  },
  {
    id: 'walk-gamma',
    title: 'Gamma Band Walk (30-80 Hz AM, monaural) — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'low-gamma', durationSec: 450, carrierHz: 240, beatHz: 30, mode: 'monaural', gainDbFs: -16, rampSec: 30 },
        { name: 'gamma-40', durationSec: 450, carrierHz: 240, beatHz: 40, mode: 'monaural', gainDbFs: -16, rampSec: 30 },
        { name: 'gamma-60', durationSec: 450, carrierHz: 240, beatHz: 60, mode: 'monaural', gainDbFs: -18, rampSec: 30 },
        { name: 'gamma-80', durationSec: 450, carrierHz: 240, beatHz: 80, mode: 'monaural', gainDbFs: -18, rampSec: 30 },
      ],
    },
    grade: 'C',
    rationale:
      'Walks 30-80 Hz as monaural AM — above ~30 Hz the binaural beat percept fails, so monaural is the domain-correct modality. Gamma oscillations are real neurophysiology (Gray & Singer 1989) but audio-driven gamma benefits in humans are UNPROVEN.',
    citations: ['Gray & Singer, PNAS 86:1698-1702 (1989)', 'bsu_dim02 gamma audit: human efficacy unproven (Hajós 2024 OVERTURE miss; Soula 2023)'],
  },

  // --------------------------------- Corrected-Schumann single-mode simulations
  {
    id: 'relax-schumann-m2',
    title: 'Schumann Mode 2 (measured 14.1 Hz)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mode-2', durationSec: 1500, carrierHz: 200, beatHz: 14.1, gainDbFs: -16, rampSec: 60 }],
    },
    grade: 'C',
    rationale:
      'Measured second cavity mode (14.1 Hz, Hylaty 2016) — Grade A geophysics — rendered as a binaural beat, i.e. a SIMULATION of the EM resonance, not the field itself. Biological-coupling evidence is correlational and unreplicated.',
    citations: ['Hylaty ELF station report (Pol. J. Environ. Stud., 2016): modes at 7.9/14.2/20.3/26.4/32.3 Hz', 'Balser & Wagner, Nature 188:638-641 (1960)'],
  },
  {
    id: 'relax-schumann-m3',
    title: 'Schumann Mode 3 (measured 20.3 Hz)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mode-3', durationSec: 1500, carrierHz: 200, beatHz: 20.3, gainDbFs: -16, rampSec: 60 }],
    },
    grade: 'C',
    rationale:
      'Measured third cavity mode (20.3 Hz; Balser & Wagner 1960 reported 19.6 Hz) — Grade A physics, simulation-only audio. Wellness sites propagate drifted-high values (20.8 Hz); this preset uses the measured mode.',
    citations: ['Hylaty station report (2016): 20.3 Hz', 'Balser & Wagner, Nature 1960: 19.6 Hz'],
  },
  {
    id: 'relax-schumann-m4',
    title: 'Schumann Mode 4 (measured 26.4 Hz)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mode-4', durationSec: 1500, carrierHz: 200, beatHz: 26.4, gainDbFs: -16, rampSec: 60 }],
    },
    grade: 'C',
    rationale:
      'Measured fourth cavity mode (26.4 Hz; Balser & Wagner 1960: 25.9 Hz) — Grade A physics, simulation-only audio, just under the binaural beat domain ceiling. Entrainment claims unproven.',
    citations: ['Hylaty station report (2016): 26.4 Hz', 'Balser & Wagner, Nature 1960: 25.9 Hz'],
  },
  {
    id: 'relax-schumann-m5',
    title: 'Schumann Mode 5 (measured 32 Hz, monaural)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mode-5', durationSec: 1500, carrierHz: 240, beatHz: 32, mode: 'monaural', gainDbFs: -16, rampSec: 60 }],
    },
    grade: 'C',
    rationale:
      'Measured fifth cavity mode (~32 Hz) — Grade A physics. At 32 Hz the binaural beat percept is past its ~30 Hz domain limit, so this preset uses a monaural AM envelope instead; still a simulation, not the EM field.',
    citations: ['Hylaty station report (2016): 32.3 Hz', 'Balser & Wagner, Nature 1960: 32 Hz'],
  },

  // ------------------------------------------------------- 432 vs 440 pairing
  {
    id: 'relax-440-control',
    title: '440 Hz Control (pairs with 432 Evening Unwind)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'unwind', durationSec: 1200, carrierHz: 440, beatHz: 0, gainDbFs: -16, rampSec: 90 }],
    },
    grade: 'B',
    rationale:
      'Beat-free control arm of the 432-vs-440 comparison pair. Grade B- pilot evidence only: a double-blind n=33 crossover found a modest heart-rate advantage for 432-tuned music over 440 (2020 corrigendum noted); authors call for larger trials.',
    citations: ['Calamassi & Pomponi, Explore 15(4):283-290 (2019) + 2020 corrigendum', 'Aravena 2020 dental-anxiety RCT n=42'],
  },

  // ------------------------------------------------- Monaural gamma (40 Hz AM)
  {
    id: 'exp-gamma-monaural',
    title: 'Monaural 40 Hz Gamma AM — experimental tier',
    category: 'Experimental',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'gamma-am', durationSec: 1800, carrierHz: 250, beatHz: 40, mode: 'monaural', gainDbFs: -14, rampSec: 30 }],
    },
    grade: 'B',
    rationale:
      'GENUS-style 40 Hz as a monaural AM envelope (binaural beats fail above ~30 Hz). Mouse data robust (Iaccarino 2016; Martorell 2019); human efficacy UNPROVEN and contested — Cognito OVERTURE missed its primary endpoint (Hajós 2024) and replications failed (Soula 2023; Yang & Lai 2023). No disease claims.',
    citations: [
      'Iaccarino et al., Nature 540:230-235 (2016)',
      'Hajós et al., Front Neurol 15:1343588 (2024) — OVERTURE primary-endpoint miss',
      'Soula et al., Nat Neurosci 26:570-578 (2023) — failed replication',
    ],
  },

  // --------------------------------------- Modality variants (isochronic/monaural)
  {
    id: 'focus-isochronic-beta',
    title: 'Isochronic Beta Focus (15 Hz gate)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ramp', durationSec: 300, carrierHz: 200, beatHz: 15, mode: 'isochronic', gainDbFs: -14, rampSec: 60 },
        { name: 'hold', durationSec: 1500, carrierHz: 200, beatHz: 15, mode: 'isochronic', gainDbFs: -14 },
      ],
    },
    grade: 'C',
    rationale:
      'Isochronic gating is the strongest AM stimulus of the three modalities, yet its dedicated evidence base is the weakest (2 quality RCTs of 17; McLeod 2019 found WORSE executive performance than control). Stimulus strength is not a proven outcome — Klichowski 2023 warning applies.',
    citations: ['crit_r1 isochronic audit (Aparecido-Kanzler 2021; McLeod 2019)', 'Klichowski et al., Sci Rep 2023 (n=1000 reverse effect)'],
  },
  {
    id: 'focus-monaural-smr',
    title: 'Monaural SMR Focus (13 Hz AM)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ramp', durationSec: 300, carrierHz: 180, beatHz: 13, mode: 'monaural', gainDbFs: -14, rampSec: 60 },
        { name: 'hold', durationSec: 1800, carrierHz: 180, beatHz: 13, mode: 'monaural', gainDbFs: -14 },
      ],
    },
    grade: 'C',
    rationale:
      'Monaural beats evoke a larger cortical ASSR than binaural at matched settings (Orozco Perez 2020) — but that study found no mood modulation by either stimulus. A bigger evoked response is not a demonstrated benefit.',
    citations: ['Orozco Perez, Dumas & Lehmann, eNeuro 7(2) (2020)', 'JAMA Psychiatry 2024 neurofeedback meta-analysis (SMD 0.04)'],
  },
  {
    id: 'sleep-isochronic-delta',
    title: 'Isochronic Delta Sleep (speaker-safe)',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'settle', durationSec: 600, carrierHz: 110, beatHz: 3, mode: 'isochronic', gainDbFs: -18, rampSec: 90 },
        { name: 'deep', durationSec: 1800, carrierHz: 100, beatHz: 2, mode: 'isochronic', gainDbFs: -20, rampSec: 120 },
        { name: 'fade', durationSec: 600, carrierHz: 90, beatHz: 1.5, mode: 'isochronic', gainDbFs: -24, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale:
      'Delta-rate isochronic pulses work on speakers (no interaural comparison needed). Sleep-trial evidence stays small and mixed (Bavafa 2023 n=31; Sharma & Dhaka n=15) — relaxation before sleep, not an insomnia treatment; CBT-I remains first-line.',
    citations: ['Bavafa et al. 2023; Sharma & Dhaka (n=15) — bsu_dim01 sleep-trial synthesis'],
  },
  {
    id: 'relax-monaural-alpha',
    title: 'Monaural Alpha Ease (10 Hz AM)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'ease-in', durationSec: 300, carrierHz: 160, beatHz: 10, mode: 'monaural', gainDbFs: -14, rampSec: 60 },
        { name: 'rest', durationSec: 1500, carrierHz: 150, beatHz: 9.5, mode: 'monaural', gainDbFs: -16, rampSec: 60 },
      ],
    },
    grade: 'B',
    rationale:
      'Alpha-range monaural AM for speakers; inherits the strongest RCT support in this literature (peri-procedural anxiety, Padmanabhan 2005). Note the mechanism caveat: benefit shown without demonstrated EEG entrainment.',
    citations: ['Padmanabhan et al., Anaesthesia 60:874-7 (2005)', 'Orozco Perez et al., eNeuro 2020 (stronger monaural ASSR, no mood effect)'],
  },

  // ------------------------------------------------------- Noise-only focus
  {
    id: 'focus-brown-noise',
    title: 'Brown Noise Focus (no beat)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mask', durationSec: 1800, carrierHz: 150, beatHz: 0, mode: 'noise', gainDbFs: -18 }],
    },
    grade: 'C',
    rationale:
      'Brown-noise (-6 dB/oct) masking texture with deliberately no beat — masking/comfort only, no entrainment claim. Honest context: masking moderators did not help beat efficacy (Garcia-Argibay 2019), and beats embedded in noise associate with null EEG findings (Ingendoh 2023).',
    citations: ['Garcia-Argibay et al., Psychol Res 2019 (masking moderator null)', 'Ingendoh et al., PLOS ONE 2023 (beats-in-noise null findings)'],
  },
  {
    id: 'focus-pink-noise',
    title: 'Pink Noise Focus (no beat)',
    category: 'Focus',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mask', durationSec: 1800, carrierHz: 200, beatHz: 0, mode: 'noise', gainDbFs: -18 }],
    },
    grade: 'C',
    rationale:
      'Pink-noise (-3 dB/oct) masking texture, beat-free by design. Presented as acoustic masking for distraction control; any focus benefit is expectancy-level and unproven at trial level.',
    citations: ['Ingendoh et al., PLOS ONE 2023 (pink-noise embedding associated with null EEG findings)'],
  },

  // ------------------------------------------------------------- Breath sync
  {
    id: 'relax-breath-coherence',
    title: 'Coherence Breath Pacer (0.1 Hz AM, monaural)',
    category: 'Relax',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'breathe', durationSec: 900, carrierHz: 180, beatHz: 0.1, mode: 'monaural', gainDbFs: -16, rampSec: 30 }],
    },
    grade: 'C',
    rationale:
      'A 0.1 Hz amplitude envelope paces ~6 breaths/min. The plausible active ingredient is paced breathing itself: a DoD double-blind study found audio plus guided breathing shifted HRV toward parasympathetic dominance (p<0.01). Framed as a pacing aid, not entrainment.',
    citations: ['DoD double-blind study: theta-band audio + guided breathing shifted HRV parasympathetic, p<0.01 (crit_r3 review)'],
  },
  {
    id: 'sleep-breath-wind-down',
    title: 'Breath Wind-Down (slowing pacer)',
    category: 'Sleep',
    spec: {
      autoShutoff: true,
      phases: [
        { name: 'settle', durationSec: 600, carrierHz: 140, beatHz: 0.18, mode: 'monaural', gainDbFs: -16, rampSec: 60 },
        { name: 'slow', durationSec: 900, carrierHz: 130, beatHz: 0.12, mode: 'monaural', gainDbFs: -18, rampSec: 90 },
        { name: 'rest', durationSec: 900, carrierHz: 120, beatHz: 0.08, mode: 'monaural', gainDbFs: -22, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale:
      'Amplitude-envelope pacer that slows from ~11 to ~5 breaths/min across the session. Slow-paced breathing has autonomic support; the audio is the metronome. Sleep endpoints unproven in small trials.',
    citations: ['DoD double-blind breathing/HRV study (crit_r3 review)', 'Bavafa et al. 2023; Sharma & Dhaka — bsu_dim01 sleep synthesis'],
  },

  // ------------------------------------------------------------------ Infant
  {
    id: 'infant-womb-hush',
    title: 'Womb Hush (infant)',
    category: 'Infant',
    spec: {
      autoShutoff: true,
      heartbeatBpm: 66,
      phases: [{ name: 'hush', durationSec: 1800, carrierHz: 120, beatHz: 0, gainDbFs: -28, lowpassHz: 900 }],
    },
    grade: 'B',
    rationale:
      'Low-passed (<1000 Hz) womb-sound design matches intrauterine acoustics; Cochrane: music/voice likely reduces infant heart rate, no harms found. Hard design rules: <=50 dBA at crib, >=2 m speaker distance, 30-min auto-shutoff, never in crib, NOT a SIDS-prevention device.',
    citations: [
      'Loewy et al., Pediatrics 2013',
      'Cochrane review: musical/vocal interventions for preterm infants',
      'Hugh et al., Pediatrics 2014 (PMID 24590753)',
      'AAP 2022 safe-sleep policy',
    ],
  },
  {
    id: 'infant-heartbeat-70',
    title: 'Maternal Heartbeat 70 (infant)',
    category: 'Infant',
    spec: {
      autoShutoff: true,
      heartbeatBpm: 70,
      phases: [{ name: 'heartbeat', durationSec: 1500, carrierHz: 80, beatHz: 0, gainDbFs: -30, lowpassHz: 500 }],
    },
    grade: 'B',
    rationale: 'Heartbeat at 70 BPM (maternal resting range 60-80), deep low-pass; volume path must be calibrated to <=50 dBA at crib (AAP-aligned).',
    citations: ['Loewy et al. 2013', 'Hugh et al., Pediatrics 2014'],
  },
  {
    id: 'infant-nap-fade',
    title: 'Nap Fade (infant, 20 min)',
    category: 'Infant',
    spec: {
      autoShutoff: true,
      heartbeatBpm: 72,
      phases: [
        { name: 'settle', durationSec: 600, carrierHz: 100, beatHz: 0, gainDbFs: -28, lowpassHz: 800, rampSec: 60 },
        { name: 'fade', durationSec: 600, carrierHz: 90, beatHz: 0, gainDbFs: -34, lowpassHz: 700, rampSec: 120 },
      ],
    },
    grade: 'C',
    rationale: 'Short NICU-style session length (20 min, within 20-45 min norms) with progressive fade and mandatory auto-shutoff.',
    citations: ['NICU music-therapy session norms 20-45 min', 'Hugh et al. 2014 (timers/auto-shutoff recommendation)'],
  },
  {
    id: 'infant-quiet-room',
    title: 'Quiet Room Masker (infant)',
    category: 'Infant',
    spec: {
      autoShutoff: true,
      phases: [{ name: 'mask', durationSec: 2700, carrierHz: 200, beatHz: 0, gainDbFs: -32, lowpassHz: 1000 }],
    },
    grade: 'C',
    rationale:
      'Low-level low-passed masking texture. NOTE: white-noise claims cannot lean on music-therapy evidence (Cochrane excludes white noise); keep <=50 dBA at crib and >=2 m away.',
    citations: ['Cochrane preterm-infant review (white noise excluded)', 'AAP 2023 noise-exposure policy statement'],
  },
];

/** Full preset catalog with H.870 dose metadata computed for every entry. */
export const PRESETS: readonly Preset[] = RAW_PRESETS.map((p) => {
  const dbA = assumedLevelDbA(p.category);
  const durationMin = p.spec.phases.reduce((acc, ph) => acc + ph.durationSec, 0) / 60;
  return { ...p, dose: { assumedDbA: dbA, weeklyBudgetPct: weeklyDosePct(durationMin, dbA) } };
});

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Total session duration in minutes (for governor checks). */
export function presetDurationMin(preset: Preset): number {
  return preset.spec.phases.reduce((acc, ph) => acc + ph.durationSec, 0) / 60;
}
