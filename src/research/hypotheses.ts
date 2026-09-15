/**
 * Hypothesis Tracker content (S11.3) — tracked claims with grade-change
 * audit trail. Every entry is "pre-registered, awaiting data": grades shown
 * are the current evidence grades from the R1–R5 wave, and each entry states
 * exactly what evidence would promote or demote the claim, plus the linked
 * registry experiments that will decide it.
 */

import type { TrackedHypothesis } from './types';

export const TRACKED_HYPOTHESES: readonly TrackedHypothesis[] = [
  {
    id: 'H-entrainment-generic',
    claim: 'Rhythmic beat audio produces a measurable stimulus-locked cortical response (ASSR) at the beat frequency — and, under individualized conditions, may bias ongoing rhythms.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X02 shows post-offset persistence ≥1 s in ≥60% of screened responders with <20% jitter-control overlap, and X03 shows the pre-registered peak-at-IAF quadratic — then promote ONLY the individualized weak form ("biases ongoing rhythms near your eigenfrequency").',
    demoteIf:
      'X02: no persistence in ≥80% of responders → demote to "stimulus-locked evoked response" program-wide. X03: flat response across detuning (BF₁₀ < 0.33 for the flat model) → positive evidence for the evoked model.',
    linkedExperiments: ['X02', 'X03', 'X01'],
    gradeHistory: [
      { date: '2023-05', from: 'B', to: 'C', reason: 'Ingendoh 2023 systematic review: 8/14 controlled EEG studies null, all pink-noise-embedded studies null; generic claim demoted, individualized form kept OPEN.' },
      { date: '2026-02', from: 'C', to: 'C', reason: 'R1 six-pass review ratified the split verdict (DEMOTE strong form / OPEN weak form); registry X02/X03 seeded as decisive tests.' },
    ],
  },
  {
    id: 'H-monaural-superiority',
    claim: 'Monaural/isochronic stimulation produces a stronger measurable stimulus-locked response than binaural beats at matched Δf (engineering claim only — no outcome superiority is claimed).',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X06 replicates the ASSR ordering (monaural ≥ isochronic > binaural, PLV ratio ≥1.5×) → promote as an engineering statement. Behavioral superiority of any arm ≥ d=0.3 → promote that arm as default modality with hedged language.',
    demoteIf:
      'X06: ASSR ordering replicates but TOST declares behavioral equivalence → kill all "more potent" outcome marketing. Failure to replicate the ASSR ordering itself → pipeline audit (X01 gate should make this impossible).',
    linkedExperiments: ['X06'],
    gradeHistory: [
      { date: '2020-03', from: 'B', to: 'C', reason: 'Orozco Perez 2020: ASSR hierarchy real but no mood modulation by either stimulus — outcome superiority unsupported (endpoint substitution).' },
      { date: '2026-02', from: 'C', to: 'C', reason: 'R1 verdict REPAIRABLE: keep stimulus-strength hierarchy, discard outcome claim; X06 seeded to give "superiority" a meaning.' },
    ],
  },
  {
    id: 'H-432-relaxation',
    claim: 'Music retuned slightly downward (e.g. toward 432 Hz) may bias toward calmness in some listeners — a pitch-height effect, not a frequency-specific resonance at 432.',
    currentGrade: 'B',
    gradeMinus: true,
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X07 shows a monotone pitch-height ordering (432 < 436 < 440 all better than 440) → promote the hedged pitch-preference statement. A genuine dip at exactly 432 → anomaly, independent replication before any promotion.',
    demoteIf:
      'X07: total effect <1 bpm or TOST equivalence within ±1 bpm → close the file (evidence of absence at marketing-relevant magnitude). X04: no discontinuity at 432 in the carrier sweep → "432 carrier" claim discarded as physics.',
    linkedExperiments: ['X07', 'X04'],
    gradeHistory: [
      { date: '2019-07', from: 'C', to: 'B', reason: 'Calamassi & Pomponi 2019 pilot (n=33, HR −4.79 bpm, p=0.05) — real but boundary-grade pilot data; graded B−.' },
      { date: '2026-02', from: 'B', to: 'B', reason: 'R2 audit: cosmological claim numerically false (943-cent miss) → DISCARD; relaxation claim OPEN with pilot-inflation prior; B− retained pending X07.' },
    ],
  },
  {
    id: 'H-schumann-biology',
    claim: 'Human EEG/HRV co-varies with Schumann-band activity beyond what shared diurnal drivers and autocorrelation artifacts explain.',
    currentGrade: 'D',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X14/R2-E5 surrogate re-analysis: coherence survives Ebisuzaki phase-randomized surrogates + Bartlett effective-n correction, replicated by an independent lab with simultaneous local ELF measurement → promote to C (correlational) at most.',
    demoteIf:
      'Published-magnitude coherence reproducible from independent autocorrelated series (predicted) → demote to "unreplicated correlational reports from one research group"; all marketed therapeutic claims stay DEMOTED regardless.',
    linkedExperiments: ['X14'],
    gradeHistory: [
      { date: '2026-02', from: 'C', to: 'D', reason: 'R2 statistical audit: no effective-n/surrogate correction in any cited paper; Monte Carlo shows 65.6% false-positive rate at ρ=0.95; headline coherence shown on n=2–3; no independent replication.' },
    ],
  },
  {
    id: 'H-40hz-therapy',
    claim: '40 Hz sensory stimulation is associated with measurable cortical responses; therapeutic (disease-modifying) claims are unsupported and not made.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'Human Phase III (GENUS HOPE trial, readout ~2026) meets its primary endpoint; cortical ASSR at 40 Hz is already solid (Schwarz & Taylor 2005). Promotion would still be bounded to the studied population and endpoint.',
    demoteIf:
      'Soula 2023 (Buzsáki lab) and Yang & Lai 2023 failed replications stand; Cognito OVERTURE missed its primary endpoint → preclinical base contested; deep-structure engagement from passive flicker unsupported in AD mouse models.',
    linkedExperiments: ['X01'],
    gradeHistory: [
      { date: '2023-03', from: 'B', to: 'C', reason: 'Soula et al. 2023 (Nat Neurosci): 40 Hz flicker did not engage native gamma or change pathology in two AD mouse models; mice avoided the stimulus.' },
      { date: '2026-02', from: 'C', to: 'C', reason: 'R5: "mouse-to-mouse gap" — contested preclinical base; cortical ASSR in humans unaffected by these nulls. No Alzheimer\'s-adjacent claims permitted.' },
    ],
  },
  {
    id: 'H-expectancy-share',
    claim: 'Behavioral benefits of beat audio (meta-analytic g≈0.45) are substantially expectancy/relaxation-mediated; any beat-specific residue is small (pre-committed SESOI d=0.3).',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X05 stimulus term ≥ d=0.3 beyond the instruction term → promote "biases toward relaxation beyond generic expectancy" (hedged).',
    demoteIf:
      'X05 stimulus term < d=0.3 → all state-change claims demoted to "relaxation/expectancy-mediated"; marketing names the mundane mechanism.',
    linkedExperiments: ['X05'],
    gradeHistory: [
      { date: '2019-01', from: 'C', to: 'C', reason: 'Garcia-Argibay g≈0.45 and Basu g≈0.40 pooled over small, unpreregistered studies — treated as a prior, not a claim (Button 2013 logic).' },
      { date: '2026-02', from: 'C', to: 'C', reason: 'R1/R3: X05 seeded to price the expectancy share with an active sham and a triple-blind 2×2.' },
    ],
  },
  {
    id: 'H-dose-linearity',
    claim: 'Session benefit plateaus with duration (habituation model); "longer is stronger" is rejected pending data.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X11 shows a monotone increase with duration (would be the first within-subject dose-response evidence in the literature) → promote duration-based design.',
    demoteIf:
      'X11 plateau/inverted-U (40 ≤ 20 min contrast) → kill "longer is stronger" marketing; X13 adverse drift → program-wide safety advisory.',
    linkedExperiments: ['X11', 'X13'],
    gradeHistory: [
      { date: '2026-02', from: 'D', to: 'C', reason: 'R1: upgraded from folklore to testable — habituation physiology (~27 s ASSR asymptote) predicts plateau, but no within-subject curve exists either way; OPEN with presumption against linearity.' },
    ],
  },
  {
    id: 'H-responder-variability',
    claim: 'ASSR response to beat audio is individually variable; per-user verification is necessary because population response is not universal.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X01 delivers responder-rate CIs (half-width ≤±7%) and a predictor model with AUC > 0.65 → promote screening as a product feature.',
    demoteIf:
      'X01 ceiling null (≥90% respond to both modalities) → kill the folklore non-responder figure; <30% monaural response → pipeline audit before any literature conclusion.',
    linkedExperiments: ['X01', 'X10'],
    gradeHistory: [
      { date: '2026-02', from: 'D', to: 'C', reason: 'R1: the "20–40% non-responder" figure is folklore-grade (unverified), but individual variability (IAF ±2 Hz, percept unreliability) is documented — upgraded to testable claim, X01 seeded.' },
    ],
  },
  {
    id: 'H-planetary-fold',
    claim: 'Octave-folded period tones (Cousto OM and relatives) carry no period-specific physiological efficacy; the fold map is information-free.',
    currentGrade: 'D',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'Not promotable on current structure: X08 requires an octave-consistent positive AND survival of the X09 arbitrary-period control (predicted: impossible).',
    demoteIf:
      'X08 TOST equivalence (±d=0.2) between 136.10 and 137.20 Hz → discard physiological claims program-wide; X09 equivalence → empirical (not just mathematical) finality.',
    linkedExperiments: ['X08', 'X09'],
    gradeHistory: [
      { date: '2026-02', from: 'D', to: 'D', reason: 'R2: fold map carries zero bits of information (surjective onto every octave for every input); X08/X09 seeded to price the empirical residue.' },
    ],
  },
  {
    id: 'H-sleep-closed-loop',
    claim: 'Phase-locked acoustic stimulation during NREM up-states biases toward deeper slow-wave sleep (the only entrainment-adjacent claim with replicated gold-standard evidence).',
    currentGrade: 'B',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X12 pilot: SWA ≥ +5% with CI excluding 0 and phase error < 30° on consumer-adjacent hardware → promote to powered trial (n=34) on the G5 flagship pathway.',
    demoteIf:
      'SWA null at adequate phase precision → real non-replication, demote consumer closed-loop claims; missing phase precision is an engineering result, not a scientific null.',
    linkedExperiments: ['X12'],
    gradeHistory: [
      { date: '2026-02', from: 'B', to: 'B', reason: 'Ngo-lineage + SmartSleep vendor data (6.8% SWA) replicated at gold standard; physiological effect robust, cognitive benefit fragile — X12 pilot tests consumer-hardware transfer.' },
    ],
  },
  {
    id: 'H-daily-use-safety',
    claim: 'Daily 60-min beat-audio self-administration is low-risk over 30 days — currently an open safety question, not a claim.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X13 TOST equivalence (±d=0.3) vs active sham on all safety endpoints → licenses "low-risk" copy within evidence bounds.',
    demoteIf:
      'Any endpoint crossing d=0.4 with CI excluding 0 → DSMB-style review and program-wide safety advisory; until X13, no duration claim above 20 min ships.',
    linkedExperiments: ['X13', 'X11'],
    gradeHistory: [
      { date: '2026-02', from: 'D', to: 'C', reason: 'R1: only high-dose data point (Wahbeh 2007, n=8, uncontrolled) is adverse — upgraded from "unknown/folklore" to a pre-registered safety question with harm detection as its primary job.' },
    ],
  },
  {
    id: 'H-percept-gating',
    claim: 'Beat-mediated effects (where they exist) are gated by beat perception — effects require a perceivable beat at the claimed Δf/carrier.',
    currentGrade: 'C',
    status: 'pre-registered, awaiting data',
    promoteIf:
      'X10: detection threshold correlates r≥0.35 with ASSR PLV and behavioral effects concentrate in top-tertile perceivers → promote percept-screening UX.',
    demoteIf:
      'Effects in verified non-perceivers → percept-mediation falsified (implicates expectancy/peripheral artifacts); no correlation at all → demote to "auditory curiosity".',
    linkedExperiments: ['X10', 'X01'],
    gradeHistory: [
      { date: '2026-02', from: 'C', to: 'C', reason: 'R1 H1.1 seeded; 2025 unidistance replication showed substantial interindividual percept variability, motivating the gating test.' },
    ],
  },
];

export const TRACKER_STATUS_LABEL = 'pre-registered, awaiting data' as const;
