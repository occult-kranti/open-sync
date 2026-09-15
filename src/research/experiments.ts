/**
 * Experiment registry (G10 / S10.1–S10.2) — typed distillate of
 * /research/experiment_registry.md v1.0 (X01–X14, deduped from R1/R2/R3
 * candidates). Every entry carries a falsifiable prediction and a
 * null-handling rule; nothing here asserts an effect — all entries are
 * pre-registered and awaiting data.
 */

import type { Experiment } from './types';

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: 'X01',
    title: 'Per-user ASSR responder screening (foundational)',
    classLabel: 'EEG, foundational',
    rank: 5,
    hypothesis:
      'A standard 10 Hz binaural beat and a 10 Hz monaural AM tone produce a statistically detectable cortical ASSR (PLV / F-test, p<0.01 per person) in a pre-registered majority fraction of healthy adults; responder rate and its predictors (IAF, beat-perception threshold, resting alpha, headphone channel fidelity) are estimable with CI width ≤±7%.',
    prediction:
      'Monaural-AM responder fraction exceeds binaural-beat responder fraction by ≥20 percentage points (Orozco Perez 2020 / Schwarz & Taylor 2005 amplitude hierarchy); binaural responder rate lands inside 50–80%, quantifying the folklore "20–40% non-response" figure; binaural ASSR PLV ≈ 0.3–0.6 of monaural PLV at matched intensity.',
    nullRule:
      'If ≥90% respond to BOTH modalities: publish responder rate ≈ ceiling and demote the "large non-responder population" claim. If <30% respond even to monaural AM under verified hardware: halt all downstream ASSR-gated experiments and audit the measurement chain first — that outcome indicts our pipeline, not the literature.',
    design:
      'Within-subject, single visit: two modalities × two Δf (10 Hz; 40 Hz monaural-only sanity condition); 90 s per condition, 65 dB SPL; OSF pre-registration before first participant.',
    controls: [
      'Headphone channel-balance verification per participant',
      'Beat-perception probe (method of adjustment)',
      'Non-entraining active control: AM at 7.37 Hz, off every target band edge',
      'Diotic steady-tone control (no modulation)',
    ],
    sham:
      'Active sham = 400 Hz carrier, 100% AM at 7.370 Hz — real acoustic modulation, iso-intense, no beat percept at any claimed band rate.',
    nTarget: 200,
    powerNote:
      'Prevalence estimation: n=200 gives 95% CI half-width ≤7% for any true rate in 30–70% — exceeds Button-critique standards because the endpoint is a population parameter.',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'C',
    killPromote: {
      promotes: [
        'Per-user EEG verification is necessary because response is individually variable — the program\'s strongest defensible claim.',
      ],
      demotes: [
        '"Everyone entrains to band-f tracks" (universal-effect marketing).',
        'Ceiling-null case kills the folklore 20–40% non-responder figure itself.',
      ],
    },
    packBlocks: ['x01_'],
    decisionRule:
      'Success = responder CIs delivered + predictor model AUC > 0.65 (screening becomes a product feature). Failure = screening offered as raw measurement only, no "responder report" claim in UI.',
    sources: ['R1-E11', 'G10 seed (a)'],
  },
  {
    id: 'X02',
    title: 'Offset-persistence: entrainment-vs-ASSR dissociation',
    classLabel: 'EEG, in-lab',
    rank: 1,
    hypothesis:
      'If rhythmic beat stimulation entrains an endogenous oscillator (rather than evoking a superposed evoked response), oscillatory power at the stimulus frequency persists above baseline for ≥1 s after stimulus offset; a pure ASSR decays to baseline within <300 ms of offset.',
    prediction:
      'Evoked-response model (base-rate expectation per Ingendoh 2023, Duecker 2021, Capilla 2011): post-offset power at f returns to baseline <300 ms and the jittered-beat control reproduces ≥80% of the steady-state spectral peak. True entrainment: persistence ≥1 s with free-running decay and <20% jitter overlap. EITHER outcome is publishable and decision-grade.',
    nullRule:
      '"No persistence" is NOT ambiguous — it is the predicted signature of the evoked model and demotes the entrainment claim. Indeterminate zone (300 ms–1 s, partial jitter overlap) triggers the IAF-matched contrast from X03 before any verdict.',
    design:
      'Within-subject, 3 conditions (periodic beat at participant IAF; periodic beat at fixed 10 Hz; jittered-isochronous control, identical mean rate, ISI uniform ±40%); 60 trials of 20 s ON / 10 s OFF per condition; EEG throughout; analysis script frozen at pre-registration.',
    controls: [
      'Jittered control: identical transient density, zero periodicity (Capilla-style superposition control)',
      'ERP-superposition forward model: convolve offset ERP with stimulus train and subtract (Capilla 2011 / Zach 2008)',
      'ON-segment phase restarts at 0 — required for the forward model',
    ],
    sham:
      'Jittered isochronous AM (diotic, mean rate 10 Hz, ISI uniform 50–150 ms), energy-matched to ±0.5 dB per ON segment.',
    nTarget: 40,
    powerNote:
      'Within-subject persistence contrast, expected dz≥0.5 if real (visual after-effect dz≈0.6–0.8); n=40 → 80% power at dz=0.45, >95% at dz=0.6. Powered for the dissociation, not a small main effect.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'C',
    killPromote: {
      promotes: [
        'Individualized weak form only, and only if persistence is real: "stimulation near your measured eigenfrequency biases ongoing rhythms."',
      ],
      demotes: [
        '"Binaural beats entrain cortical rhythms" (strong form).',
        'All "sync your brainwaves" marketing — demoted to "stimulus-locked evoked response" across program copy.',
      ],
    },
    packBlocks: ['x02_'],
    decisionRule:
      'Persistence ≥1 s in ≥60% of X01-screened ASSR-responders with <20% jitter overlap → entrainment reading PROMOTED. No persistence in ≥80% of responders → generic entrainment claim DEMOTED program-wide.',
    sources: ['R1-E2', 'advisor-flagged decisive cheap'],
  },
  {
    id: 'X03',
    title: '±1–2 Hz eigenfrequency pulling (IAF-detuned beats)',
    classLabel: 'EEG, in-lab',
    rank: 2,
    hypothesis:
      'If beat stimulation biases an endogenous oscillator, effect size is maximal when the beat equals the participant\'s measured eigenfrequency (IAF) and falls monotonically with ±1 / ±2 Hz detuning; a flat response across detuning falsifies the entrainment reading and is exactly what an evoked-response account predicts.',
    prediction:
      'Entrainment model: V-shaped (peak-at-IAF) moderation with ≥30% effect drop at ±2 Hz detuning (Gulbinaite 2017 magnitudes); behavioral co-endpoints (resting alpha change, arousal) peak likewise. Evoked/relaxation model: flat (±10%) across all detunings.',
    nullRule:
      'A flat EEG response is reported as POSITIVE evidence for the evoked-response model (pre-registered model comparison, BF₁₀ < 0.33 = evidence for flat). Non-responders stay the pre-registered X01 non-responder subgroup — never post-hoc re-labeled.',
    design:
      'Within-subject, 5 beat frequencies (IAF−2 … IAF+2 Hz) × fixed 400 Hz carrier, randomized, double-blind; IAF measured eyes-closed before each session and frozen per participant; absorbs the R1-E4 band-mapping falsification as behavioral co-endpoint.',
    controls: [
      'Diotic energy-matched irregular-envelope AM control at IAF rate',
      'IAF frozen per participant before data collection',
      'Files coded by third party; condition labels hashed',
    ],
    sham:
      'Diotic 400 Hz with irregular AM envelope matched in RMS and modulation energy to the IAF-rate condition (non-periodic active control).',
    nTarget: 48,
    powerNote:
      'Primary test is the quadratic (peak-at-IAF) trend across 5 within-subject levels; n=48 → 80% power at dz=0.41, 90% at dz=0.48.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'C',
    killPromote: {
      promotes: [
        'IAF-calibrated stimulation as the program\'s scientific differentiator (hedged: "biases ongoing alpha near your eigenfrequency").',
      ],
      demotes: [
        'Universal fixed-frequency band mapping ("10 Hz alpha track relaxes everyone") — DISCARDED on a flat result.',
        'Any non-calibrated "frequency dial" marketing.',
      ],
    },
    packBlocks: ['x03_'],
    decisionRule:
      'Significant quadratic with ≥30% ±2 Hz drop → PROMOTE individualized entrainment. Flat → fixed-band mapping DISCARDED; fixed-band product claims re-labeled as relaxation audio.',
    sources: ['R1-E3 (+absorbs R1-E4)', 'advisor-flagged decisive cheap'],
  },
  {
    id: 'X04',
    title: 'Carrier sweep incl. 432 falsification',
    classLabel: 'EEG, in-lab',
    rank: 4,
    hypothesis:
      'Cortical ASSR amplitude to a fixed Δf=10 Hz binaural beat declines smoothly and monotonically with log carrier frequency across 250–1000 Hz, with no local maximum or discontinuity at 432 Hz.',
    prediction:
      'Monotonic log-frequency decline ≈30%/octave (Ross 2003 slope); predicted 432-vs-440 difference ≈ 0.8% — zero at our measurement precision. A 432-specific local maximum exceeding the 95% bootstrap CI of the smooth-fit residual is the ONLY outcome supporting the spiritual claim; predicted null.',
    nullRule:
      'Smooth monotone fit with the 432 residual inside CI = the 432-carrier claim DISCARDED as physics — a falsification, not a "failure to replicate". A sweep flat everywhere falsifies the Ross/Melnichuk engineering claim instead and triggers a measurement-chain audit before any 432 verdict.',
    design:
      'Within-subject, 7 carriers {250, 340, 400, 432, 440, 500, 1000} Hz × Δf=10 Hz binaural, randomized, one session; 1000 Hz included deliberately as the Oster-limit percept-degradation anchor; blind salience rating per condition.',
    controls: [
      'ISO 226:2003 equal-loudness normalization at 65 phon (A-weighted fallback recorded as deviation)',
      'Diotic non-beat control at 440 Hz',
      'No pairwise 432-vs-440 fishing permitted — residual test only',
    ],
    sham: '440 Hz diotic steady tone, loudness-normalized identically; non-beat control at the contested pitch region.',
    nTarget: 40,
    powerNote:
      'Within-subject log-linear trend across 7 levels, expected dz≥0.5; n=40 → 80% power at dz=0.45. Residual CI at any carrier ≈±12% vs the ~0.8% predicted 432 deviation — adequate to falsify a marketing-relevant 432 peak.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'D',
    killPromote: {
      promotes: [
        'Engineering guidance (already supported): carriers 250–500 Hz for binaural work; amplitude falls with carrier.',
      ],
      demotes: ['"Use a 432 Hz carrier for entrainment" and all numeric-specificity stimulus marketing.'],
    },
    packBlocks: ['x04_'],
    decisionRule:
      '432 residual outside CI (either direction) → anomaly declared, independent replication before any promotion. Residual inside CI + monotone slope → "432 Hz is a special carrier" DISCARDED in all program copy.',
    sources: ['R1-E8', 'advisor-flagged'],
  },
  {
    id: 'X05',
    title: 'Active-placebo / expectancy decomposition (2×2)',
    classLabel: 'Behavioral + EEG',
    rank: 3,
    hypothesis:
      'Reported relaxation/absorption effects of beat audio are decomposable: if beat-frequency specificity is real, the veridical-vs-sham stimulus term is significant beyond the instruction (expectancy) term; if effects are expectancy/relaxation, instruction and context absorb the effect and the stimulus term is null.',
    prediction:
      'Instruction ("entrainment audio" vs "relaxation audio") accounts for ≥60% of explainable variance on STAI/absorption; the veridical-beat term contributes dz ≤ 0.2 behaviorally but a real ASSR difference on EEG (decoupling physiology from psychology, per Orozco Perez 2020\'s ASSR-without-mood-effect result).',
    nullRule:
      'Null stimulus term = SUCCESS of the decomposition: the mundane model wins and product claims are re-labeled "relaxation audio with optional beat texture". Null on BOTH terms = expectancy-manipulation check failure → session invalidated, not a verdict.',
    design:
      '2×2 factorial (stimulus: veridical 10 Hz BB vs active sham) × (instruction framing), randomized, triple-blind, single 20-min session; manipulation check + expectancy ratings pre/post.',
    controls: [
      'Active sham: monaural AM at 7.37 Hz, off-band, iso-intense — silence/noise arms are additional, never sole control',
      'Identical pink-noise bed (−20 dB rel) and identical spoken induction, two scripts differing only in framing words',
      'EEG ASSR at 10 Hz as manipulation-of-physiology check (must be present in veridical, weak in sham)',
      'Pre-registered SESOI d=0.3 — smaller effects declared negligible by pre-commitment',
    ],
    sham:
      'Diotic 400 Hz with 7.370 Hz sinusoidal AM at matched modulation depth and RMS — comparably "textured", no beat percept at the claimed band, off Oster-curve salience.',
    nTarget: 128,
    powerNote:
      '32/cell; powered for stimulus main effect d=0.5 (64 vs 64) and interaction f=0.25 at 80%; SESOI d=0.3 inverts the "any p<0.05 = works" pattern.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'C',
    killPromote: {
      promotes: [
        'If stimulus term ≥ d=0.3 beyond instruction: "biases toward relaxation beyond generic expectancy" (hedged).',
      ],
      demotes: [
        'Every "the frequency does the work" behavioral claim — Gateway relaxation benefits, theta-for-anxiety products.',
        'Prices the expectancy share of the g≈0.45 meta-analytic effect.',
      ],
    },
    packBlocks: ['x05_'],
    decisionRule:
      'Stimulus term ≥ d=0.3 → beat-specific relaxation PROMOTED (hedged). < d=0.3 → all state-change claims DEMOTED to expectancy/relaxation-mediated; marketing names the mundane mechanism.',
    sources: ['R3-E1 + R3-E4 (+absorbs R1-E10)', 'advisor-flagged "R3 active-placebo decomposition"'],
  },
  {
    id: 'X06',
    title: 'Monaural vs binaural vs isochronic head-to-head',
    classLabel: 'EEG + behavioral',
    rank: 6,
    hypothesis:
      'At matched Δf, carrier, level and session structure, the ASSR-amplitude ordering (monaural ≥ isochronic > binaural) replicates — and behavioral/mood outcome ordering either follows the ASSR ordering ("stronger stimulus = stronger effect") or does not (decapitating the superiority claim).',
    prediction:
      'ASSR: monaural/isochronic PLV ≥ 1.5× binaural PLV (Schwarz & Taylor 2005; Orozco Perez 2020). Behavioral: NO prediction survives the evidence — pre-registered two-sided with SESOI d=0.3; the honest prior is outcome-equivalence.',
    nullRule:
      '"No behavioral difference despite 1.5× ASSR difference" is a POSITIVE result for the endpoint-substitution critique and demotes all modality-superiority marketing. Failure to replicate even the ASSR ordering triggers a pipeline audit.',
    design:
      'Within-subject crossover, 4 arms (binaural, monaural AM, isochronic, active sham from X05) × fixed Δf=10 Hz on 400 Hz carrier, counterbalanced Latin square, one session per arm.',
    controls: [
      'All four arms post-normalized to −20.0 dBFS RMS (equal-energy rule)',
      'TOST equivalence testing pre-registered — "no difference" must be established, not defaulted into',
      'Gatekeeping: behavioral equivalence interpreted only if the ASSR ordering replicates',
    ],
    sham: 'X05 sham construction (100% AM at 7.370 Hz) as fourth arm.',
    nTarget: 60,
    powerNote:
      'Co-primary: (a) ASSR ordering dz≥0.6 expected → >95% power; (b) TOST equivalence at ±d=0.3 bounds → 80% power at dz-bound 0.35.',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'C',
    killPromote: {
      promotes: [
        'Modality choice as engineering tradeoff (signal strength vs binaural percept), hedged.',
      ],
      demotes: [
        'Industry "monaural/isochronic are more potent" outcome marketing (endpoint substitution).',
      ],
    },
    packBlocks: ['x06_'],
    decisionRule:
      'ASSR ordering + behavioral equivalence → keep "monaural/isochronic = stronger measurable phase-locking" (engineering), KILL "more potent effect" (outcome). Any arm superior ≥ d=0.3 → promote as default product modality, hedged.',
    sources: ['R1-E7', 'G10 seed (b)'],
  },
  {
    id: 'X07',
    title: '432-vs-440 powered decomposition / replication',
    classLabel: 'Behavioral, needs music',
    rank: 8,
    hypothesis:
      'The reported relaxation advantage of 432 Hz music is a monotone pitch-height effect (any downward retune helps), not a frequency-specific resonance at 432; a selective dip at exactly 432 Hz vs 436/440/444 would falsify the mundane account.',
    prediction:
      'Monotone or flat ordering across {432, 436, 440, 444} Hz retunings on ΔHR and ΔSTAI; the Calamassi 2019 point estimate (HR −4.79 bpm, p=0.05, n=33) predicted to shrink below 1.5 bpm under adequate power with loudness/brightness equalized. Pure-tone carrier arm: null at 2% pitch spacing.',
    nullRule:
      'Pre-committed: total effect <1 bpm (or TOST equivalence within ±1 bpm) ⇒ "432 Hz music is specially relaxing" CLOSED as a file — evidence of absence at marketing-relevant magnitude, not "needs more research".',
    design:
      '4-arm double-blind crossover (within-subject, 4 sessions); factorial extension: (a) music retuned × (b) pure-tone carriers with 10 Hz beat (absorbed R1-E9) — separates pitch-preference from carrier claims. LUFS loudness + spectral-centroid brightness matched.',
    controls: [
      'Loudness normalized (LUFS); brightness matched via spectral-centroid equalization',
      'Music production out of scope for the pack — licensed multi-stem retune is a procurement requirement',
      'Optional cortisol sub-study (n=60)',
    ],
    sham: 'Not applicable — all four arms are real retunings; the control logic is the monotone-vs-dip contrast.',
    nTarget: 150,
    powerNote:
      'Replication of a d≈0.3 (pilot-inflated) crossover effect needs n=90 paired; n=150 gives 80% power at dz=0.23 AND powers the TOST ±1 bpm equivalence test and monotone-vs-dip model comparison.',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'B',
    gradeMinus: true,
    killPromote: {
      promotes: [
        'At most a hedged pitch-preference statement: "slightly lower-pitched music may bias toward calmness in some listeners."',
      ],
      demotes: ['The entire consumer 432 Hz claim stack — the only numerology member with real pilot data.'],
    },
    packBlocks: ['x07_'],
    decisionRule:
      'Monotone → pitch-height psychoacoustics confirmed, "432" specificity DISCARDED. Dip at 432 → anomaly, independent replication before promotion. Equivalence → file closed.',
    sources: ['R2-E3 (+absorbs R1-E9)', 'G10 seed (e)'],
  },
  {
    id: 'X08',
    title: 'Octave-invariance trap (Cousto fold n=31 vs n=32)',
    classLabel: 'Behavioral, cheap',
    rank: 7,
    hypothesis:
      'If a folded "planetary period" tone carries period-specific efficacy, the effect must be octave-invariant (the theory\'s own axiom: f and 2ⁿf are "the same tone"); a true period effect appears at BOTH 136.10 Hz (n=32, "OM") and 68.05 Hz (n=31), while an effect at only one octave is a pitch/timbre artifact.',
    prediction:
      'No differential response (HRV-RMSSD, PANAS, cortisol) between 136.10 Hz and pitch-matched 137.20 Hz control (predicted d < 0.1). The design is a TRAP: a positive at n=32 that reverses or vanishes at n=31 self-falsifies the theory.',
    nullRule:
      'Pre-committed TOST equivalence bounds ±d=0.2: equivalence confirmed ⇒ Cousto physiological claims DISCARDED (the fold map already carries zero information — this prices the empirical residue). Any positive is quarantined until it survives BOTH the octave check and X09.',
    design:
      'Between-subjects, 3 arms (136.10 Hz, 137.20 Hz control, 68.05 Hz octave fold), double-blind, single 15-min exposure, standardized relaxing context.',
    controls: [
      'Harmonic-softened tones (2nd harmonic −18 dB) to avoid the "harsh pure tone" confound',
      'Identical 1/f noise bed at −25 dB; loudness-matched',
      'Octave-consistency pre-registered as an interaction',
    ],
    sham: 'Pitch-matched control tone 137.20 Hz (≈9 cents above OM — pitch-adjacent, period-free).',
    nTarget: 180,
    powerNote:
      '60/arm: powered for d=0.45 pairwise at 80% (Button-compliant for a claim whose marketing implies large effects) and TOST equivalence at ±d=0.2 on pre/post contrasts.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'D',
    killPromote: {
      promotes: [],
      demotes: [
        'Cousto/Planetware "Earth-year OM tone" efficacy claims.',
        'All tuning-fork therapy claims resting on octave folding.',
      ],
    },
    packBlocks: ['x08_'],
    decisionRule:
      'Equivalence ⇒ DISCARD "planetary frequency" physiology program-wide. Octave-inconsistent positive ⇒ artifact, claim DISCARDED. Octave-consistent positive ⇒ route to X09 before any promotion.',
    sources: ['R2-E1', 'advisor-flagged'],
  },
  {
    id: 'X09',
    title: 'Arbitrary-period fold control',
    classLabel: 'Behavioral, cheap',
    rank: 9,
    hypothesis:
      'A tone folded from a deliberately meaningless period (T = 4,321,098 s; f = 2²⁹/4,321,098 = 124.2441 Hz — the only fold in the OM octave band, ~1.6 semitones below the Earth-year tone, pitch-adjacent but discriminable) produces relaxation responses indistinguishable from the Earth-year tone in blind A/B.',
    prediction:
      'Equivalence within ±d=0.2 (TOST) on ΔRMSSD and PANAS-calm; "planetary attunement" theories predict a difference favoring 136.10 Hz, mundane models (expectancy, timbre) predict none.',
    nullRule:
      'This IS a null-confirming experiment: equivalence = SUCCESS (the fold procedure shown information-free empirically as well as mathematically). A difference favoring the arbitrary tone indicts the protocol; a difference favoring OM routes back to X08 trap logic.',
    design:
      'Within-subject A/B, double-blind, counterbalanced, two sessions; rides on X08 infrastructure as an add-on arm.',
    controls: [
      'Construction identical to X08 (harmonic-softened, noise bed, level)',
      'Rendered full-length — the irrational-ratio fold has no integer-cycle loop point',
      'Exact float64 f = 2²⁹/4321098 Hz; rounding invalidates the control logic',
    ],
    sham: 'The arbitrary-period tone is itself the control — the mission\'s control experiment.',
    nTarget: 90,
    powerNote: 'n=90 paired → 80% power for TOST equivalence at ±dz=0.27. Cheap.',
    status: 'registered',
    advisorDecisive: true,
    claimGrade: 'D',
    killPromote: {
      promotes: [],
      demotes: [
        'Generic "any sacred period folded into audio does something" claim family.',
        'Protects against future numerology relabeling.',
      ],
    },
    packBlocks: ['x09_'],
    decisionRule: 'Equivalence ⇒ fold-based "attunement" claims DISCARDED with empirical (not just mathematical) finality.',
    sources: ['R2-E7', 'advisor-flagged'],
  },
  {
    id: 'X10',
    title: 'Percept-gating study (beat detection ↔ outcome)',
    classLabel: 'Psychophysics',
    rank: 10,
    hypothesis:
      'Any genuine beat-mediated effect must be gated by perception: EEG/behavioral effects of a binaural Δf occur only in participants who reliably perceive the beat at that Δf/carrier; effects in verified non-perceivers falsify percept-mediation (implicating expectancy or peripheral artifacts).',
    prediction:
      'Beat-detection threshold (method of adjustment, carriers 125–1412 Hz, per the 2025 unidistance replication\'s variability finding) correlates r≥0.35 with ASSR PLV at matched parameters; behavioral effects concentrate in the top-tertile perceivers.',
    nullRule:
      'Effects in non-perceivers = falsification of the percept-mediation model, reported as such (directional prediction, not a fishing trip). No perception–outcome correlation at all ⇒ both models weakened; demote to "auditory curiosity".',
    design:
      'Within-subject psychophysics + EEG, single visit; piggybacks on the X01 screening session (threshold block added); inherits X01\'s n=200 sample.',
    controls: [
      'Method-of-adjustment threshold per carrier, pre-registered tertile split',
      'Reuses the X01 verified-hardware screening chain',
      'Holm correction across carrier families',
    ],
    sham: 'Reuses X01 active sham (7.37 Hz AM) for the EEG block.',
    nTarget: 85,
    powerNote: 'n=85 detects r=0.3 at 80% power; X01\'s n=200 exceeds this — X10 inherits the sample.',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'C',
    killPromote: {
      promotes: ['Honest percept-screening UX alongside ASSR screening.'],
      demotes: ['"The beat works whether or not you hear it" (unfalsifiable marketing).'],
    },
    packBlocks: ['x10_'],
    decisionRule:
      'Perception gates effects ⇒ per-user beat-perception screening PROMOTED as product feature. No gating ⇒ beat-percept mediation DEMOTED.',
    sources: ['R1-E1 (H1.1)'],
  },
  {
    id: 'X11',
    title: 'Within-subject dose-response (habituation test)',
    classLabel: 'EEG + behavioral',
    rank: 11,
    hypothesis:
      'Outcome magnitude vs exposure duration {5, 10, 20, 40 min} follows an inverted-U or plateau (habituation — rat ASSR habituates exponentially with ~27 s asymptote, used as a Bayesian prior on sign, not cross-species proof), NOT a monotone increase.',
    prediction:
      'ASSR amplitude declines within-session (time constant < 5 min); behavioral benefit plateaus by ≤20 min; 40 min ≤ 20 min on all outcomes (pre-registered directional contrast).',
    nullRule:
      'Monotone increase would be the first within-subject dose-response evidence in the literature and PROMOTES duration-based design; flat/plateau KILLS "longer is stronger" marketing. Wahbeh-style adverse drift at 40 min is flagged to safety review (feeds X13).',
    design:
      'Within-subject crossover, 4 durations × fixed 10 Hz BB, ≥48 h washout; EEG throughout.',
    controls: [
      'Identical onset/offset fades across durations',
      'Seamless 60 s loop block (integer cycles: 24000×400 Hz, 24600×410 Hz, 600×10 Hz)',
      'Pre-registered contrast 40 ≤ 20 min; exponential-decay fit of ASSR',
    ],
    sham: 'X05/X13 sham loop construction for the control arm of the longitudinal follow-on (X13).',
    nTarget: 52,
    powerNote: 'dz=0.4 for the 20-vs-40 min paired contrast at 80% power (Button-compliant).',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'C',
    killPromote: {
      promotes: ['Honest dose labeling and evidence-based default session lengths.'],
      demotes: ['"More minutes at f = more effect" session-length marketing.'],
    },
    packBlocks: ['x11_'],
    decisionRule:
      'Plateau/inverted-U confirmed ⇒ duration claims capped at evidence; monotone increase ⇒ duration design promoted.',
    sources: ['R1-E5'],
  },
  {
    id: 'X12',
    title: 'Closed-loop sleep stimulation pilot (Portiloop-style)',
    classLabel: 'PILOT, hardware',
    rank: 12,
    hypothesis:
      'Real-time EEG phase-locked auditory stimulation during NREM up-states (phase error < 30°) enhances slow-wave activity (SWA) vs the same stimulation at randomized phase (active control), replicating the Ngo-lineage effect on consumer-adjacent hardware.',
    prediction:
      'SWA increase ≥5% vs random-phase control nights (SmartSleep\'s vendor-published 6.8% as the realistic anchor, not the original lab effects); phase error < 30° on ≥80% of stimuli.',
    nullRule:
      'PILOT STATUS explicitly. Missing phase precision < 30° is an ENGINEERING result (loop latency inadequate), not a scientific null; SWA null at adequate precision is a real non-replication and demotes consumer closed-loop claims. No memory claims at pilot stage.',
    design:
      'Within-subject, 2 nights (phase-locked vs phase-randomized), counterbalanced; pre-registered as pilot with CI-estimation goal, not hypothesis confirmation.',
    controls: [
      'Random-phase stimulation as active control (same stimuli, wrong timing)',
      'Muse S Gen2 acceptable for staging (κ=0.76 vs PSG) but SWA cross-checked on a Cyton subsample',
      'Closed-loop = generated in real time; pack supplies only latency-calibration bursts and a replay reference',
    ],
    sham: 'Phase-randomized delivery of the identical stimulus — the strongest active control in the registry.',
    nTarget: 20,
    powerNote:
      'Stated PILOT: Ngo-lineage within-subject effects are large (dz 0.6–0.9) but the deliverable is the effect-size CI and phase-precision feasibility number; promotion requires the follow-on powered study (n=34 at dz=0.5).',
    status: 'pilot',
    advisorDecisive: false,
    claimGrade: 'B',
    killPromote: {
      promotes: [
        'Conditionally: "phase-locked acoustic stimulation biases toward deeper slow-wave sleep" — the only entrainment-adjacent claim with replicated gold-standard evidence (pilot → powered path).',
      ],
      demotes: ['Open-loop "delta beat for deep sleep" marketing if phase-locked works and open-loop controls do not.'],
    },
    packBlocks: ['x12_'],
    decisionRule:
      'SWA ≥ +5% with CI excluding 0 and phase error < 30° ⇒ PROMOTE to powered trial (G5 flagship pathway). Otherwise engineering iteration or demotion.',
    sources: ['G10 seed (c)', 'bsu_dim06 §3 (Ngo 2013; Portiloop; SmartSleep)'],
  },
  {
    id: 'X13',
    title: 'Longitudinal 30-day safety / dose study',
    classLabel: 'Powered, slow',
    rank: 13,
    hypothesis:
      '30-day daily delta/theta beat self-administration (60 min/day) produces no adverse drift beyond an active-control audio regimen on pre-registered safety endpoints (POMS depression, verbal recall, sleep quality); the Wahbeh 2007 adverse signals (dopamine↓, IGF-1↓, depression↑, recall↓ in n=8 uncontrolled) will not replicate under control.',
    prediction: 'No between-arm difference ≥ d=0.4 on any safety endpoint; TOST equivalence bounds ±d=0.3 pre-registered.',
    nullRule:
      'ANY adverse endpoint crossing d=0.4 with CI excluding 0 triggers immediate DSMB-style review and a program-wide safety advisory. This study\'s primary job is harm detection; its null (equivalence) is the result that licenses "low-risk" copy.',
    design:
      'Parallel RCT, 2 arms (veridical vs X05 active sham), 30 days, weekly labs-lite (EEG, POMS, memory probe), optional biomarker sub-study.',
    controls: [
      'Active sham from X05 (7.37 Hz AM) as the control arm — never silence-only',
      'Loop-safe extended renders with ≤0.1% loop discontinuity',
      'Attrition-inflated n (100 required → 120 enrolled)',
    ],
    sham: '100 s loop block of X05 sham construction (AM 7.370 Hz × 737 cycles per block; loop count 36).',
    nTarget: 120,
    powerNote: '60/arm: powered for d=0.5 between-arm at 80% and TOST equivalence at ±d=0.3 — the safety-relevant test.',
    status: 'registered',
    advisorDecisive: false,
    claimGrade: 'C',
    killPromote: {
      promotes: ['First adequately powered high-dose safety dataset — licenses honest "low-risk" copy if equivalent.'],
      demotes: ['Daily-use marketing ("use every night") if any adverse signal replicates.'],
    },
    packBlocks: ['x13_'],
    decisionRule:
      'Equivalence ⇒ duration/daily-use claims licensed within evidence. Adverse signal ⇒ program-wide safety advisory; no duration claim above 20 min ships without this study (ties to X11).',
    sources: ['R1-E6 (H4.2)'],
  },
  {
    id: 'X14',
    title: 'Deprioritized / out-of-scope bundle',
    classLabel: 'Bundle note, not ranked',
    rank: null,
    hypothesis:
      'Bundle of registered-but-parked items: R3-E2 remote-viewing adversarial replication (OUT OF SCOPE for the audio program — no audio stimulus, separate governance); R3-E3 Bentov ELF null measurement (ballistocardiogram + SQUID/ELF magnetometer at 1 m → 1 km, predicted null by ≥40–60 dB); R2-E5 Schumann–EEG surrogate re-analysis (data-analysis project on existing recordings); R2-E6 Rife blinded equivalence in vitro (parked pending wet-lab partner).',
    prediction:
      'R3-E3: null by ≥40–60 dB against Bentov\'s implied coupling. R2-E5: published-magnitude Schumann–EEG coherence does not survive phase-randomized surrogate testing. R2-E6: no differential kill rate, canonical vs random frequency sets. R3-E2: failure at the pre-registered hit rate closes the claim (evidence of absence).',
    nullRule:
      'Each parked item carries its own pre-committed decision rule; none gates the audio program. R1-E12 (timing moderator) is folded into X06/X11 scheduling as a logged covariate, not a standalone experiment.',
    design: 'See individual item notes in the registry; no shared design.',
    controls: ['R2-E8 DoF-freeze gate rule applies to any frequency claim before data collection.'],
    sham: 'Per item.',
    nTarget: null,
    powerNote: 'Unranked; retained for governance completeness.',
    status: 'parked',
    advisorDecisive: false,
    claimGrade: null,
    killPromote: { promotes: [], demotes: [] },
    packBlocks: [],
    decisionRule: 'Parked; activation requires advisor sign-off and its own pre-registration.',
    sources: ['R3-E2', 'R3-E3', 'R2-E5', 'R2-E6', 'R1-E12 (folded into X06/X11)'],
  },
];

export const EXPERIMENT_STATUS_LABEL: Record<Experiment['status'], string> = {
  registered: 'Registered',
  pilot: 'Pilot',
  parked: 'Parked',
};

/** Global registry rules (apply to every entry) — shown on the Lab screen. */
export const REGISTRY_RULES: readonly string[] = [
  '≥80% power at a pre-committed realistic effect size, α=0.05 two-sided, SESOI stated — or explicitly labeled PILOT (CI estimation only, never confirmation).',
  'Hedged claim language only: "biases toward", "is associated with", "produces a measurable stimulus-locked response". "Induces" is banned for state claims.',
  'Mundane-explanation ledger: every behavioral entry controls for expectancy, generic relaxation-from-resting, attention/masking, measurement tautology, and regression to the mean. An effect that does not beat its mundane controls is recorded as evidence FOR the mundane model.',
  'Active-placebo rule: no behavioral arm without an active comparator (inert w.r.t. the claimed mechanism). Silence/noise arms are additional, never the sole control.',
  'Blinding: files coded by a third party; condition labels hashed; render manifest records the key under embargo.',
  'DoF freeze (R2-E8, registry-wide gate): unit, base, fold n, band and mapping permutation computed and frozen by pre-registration before any frequency claim collects data.',
  'EEG endpoints: 64-ch or OpenBCI-Cyton-grade at Cz/FCz/temporal sites; ASSR detection = F-test / T²-circ / PLV at the exact stimulus rate, ±0.1 Hz tolerance. Muse S for sleep-staging/frontal only; NeuroSky excluded.',
  'All stimuli ≤70 dBA-equivalent at calibrated playback, crest-factor and H.870-style exposure limits enforced by construction.',
];

/** Program-claim kill/promote matrix (registry summary table). */
export const KILL_PROMOTE_MATRIX: readonly {
  claim: string;
  decidedBy: string[];
  ifConfirmed: string;
  ifNull: string;
}[] = [
  {
    claim: '"Beats entrain cortical rhythms" (generic)',
    decidedBy: ['X02', 'X03'],
    ifConfirmed: 'Promote individualized weak form ("biases ongoing rhythms near your eigenfrequency").',
    ifNull: 'DEMOTE to "stimulus-locked evoked response"; purge "sync your brainwaves" copy.',
  },
  {
    claim: '"Fixed 10 Hz = relaxation for everyone"',
    decidedBy: ['X03', 'X05'],
    ifConfirmed: '— (only the individualized form is promotable).',
    ifNull: 'KILL; re-label as relaxation audio.',
  },
  {
    claim: '"Monaural/isochronic are more potent"',
    decidedBy: ['X06'],
    ifConfirmed: 'Keep engineering statement only.',
    ifNull: 'KILL outcome-superiority marketing.',
  },
  {
    claim: '"Everyone responds to beat audio"',
    decidedBy: ['X01', 'X10'],
    ifConfirmed: 'Kill via quantified responder rate.',
    ifNull: 'Ceiling null would instead kill the folklore non-responder figure.',
  },
  {
    claim: '"432 Hz carrier / tuning is special"',
    decidedBy: ['X04', 'X07'],
    ifConfirmed: 'Anomaly → replication gate.',
    ifNull: 'KILL (X04 falsifies the carrier claim; X07 confines to pitch-height).',
  },
  {
    claim: '"Planetary/Cousto tones attune the body"',
    decidedBy: ['X08', 'X09'],
    ifConfirmed: 'Requires octave-consistent positive surviving the arbitrary-period control (predicted: impossible).',
    ifNull: 'KILL with empirical finality.',
  },
  {
    claim: '"Longer / more frequent sessions = stronger effects"',
    decidedBy: ['X11', 'X13'],
    ifConfirmed: 'Promote honest dose labeling.',
    ifNull: 'KILL dose marketing; safety cap on session length.',
  },
  {
    claim: '"Delta beats for deep sleep" (open-loop)',
    decidedBy: ['X12'],
    ifConfirmed: '—',
    ifNull: 'KILL in favor of phase-locked closed-loop framing (if X12 positive).',
  },
  {
    claim: '"Phase-locked sleep stimulation deepens SWS"',
    decidedBy: ['X12'],
    ifConfirmed: 'Promote (hedged, pilot → powered path).',
    ifNull: 'Demote consumer closed-loop claims.',
  },
  {
    claim: 'Expectancy-priced behavioral benefits (g≈0.45)',
    decidedBy: ['X05'],
    ifConfirmed: 'Promote beat-specific residue if ≥ d=0.3.',
    ifNull: 'Re-price all behavioral copy as expectancy/relaxation.',
  },
];
