/**
 * Theory Explorer — typed six-pass derivation chains for the program's
 * audited theories. Distilled from crit_r1_psychoacoustics.md (Claims 1–6),
 * crit_r2_numerology.md (§1–§3) and crit_r3_gateway.md (Claims 1–2).
 *
 * Every entry is an AUDIT RECORD, not a selectable session option:
 * discarded claims render with their flaw tables, never as live presets.
 * All user-facing strings live here (single source of truth) and pass the
 * claim lint in src/theory/__tests__/chains.test.ts.
 */

import type { Citation, Flaw, ScopedVerdict } from '@/research/types';

export interface ChainStep {
  /** Step number label, e.g. 'S1'. */
  id: string;
  /** What this link in the derivation asserts (paraphrase of the claim under audit). */
  claim: string;
  /** What the audit found about this link. */
  evidence: string;
  /** Flaw flags attached to this step (empty array when the link holds). */
  flawFlags: Flaw[];
}

export interface TheoryChain {
  id: string;
  title: string;
  /** Which critical-review pass produced the audit. */
  source: 'R1' | 'R2' | 'R3';
  /** The claim as marketed (quoted/paraphrased popular formulation). */
  claim: string;
  /** Numbered derivation chain, in order. */
  steps: ChainStep[];
  /** Index into steps: the link where the chain most decisively breaks. */
  weakestArrow: number;
  /** Why that arrow is the weakest, one line. */
  weakestArrowNote: string;
  /** Where the claim (or its repaired residue) is actually valid. */
  domainOfValidity: string[];
  /** Mundane alternative explanations the claim must beat (the ledger). */
  alternatives: string[];
  verdicts: ScopedVerdict[];
  /** One-line verdict panel text. */
  verdictSummary: string;
  /** Strongest defensible version (stated before the verdict). */
  steelman: string;
  /** Registry experiments (X01–X14) that decide the surviving question. */
  registryLinks: string[];
  citations: Citation[];
}

export const THEORY_CHAINS: readonly TheoryChain[] = [
  {
    id: 'beat-percept',
    title: 'The beat percept — "two detuned tones, the brain follows"',
    source: 'R1',
    claim:
      'Play 400 Hz in one ear and 410 Hz in the other and the brain perceives a 10 Hz beat; the waveforms "mesh in and out of phase within the superior olivary nuclei" and brain activity adjusts to match.',
    steps: [
      {
        id: 'S1',
        claim: 'Two tones at f₁ and f₂ produce an amplitude envelope at |f₂−f₁|.',
        evidence:
          'True only when the tones sum acoustically (monaural beat): y = 2·sin(2π·mean·t)·cos(2π·Δf/2·t). Under headphones the tones never meet in the air — no physical Δf signal exists outside the head.',
        flawFlags: [
          { id: 'F1.1', flaw: 'Monaural superposition equation silently imported as the model for dichotic presentation', type: 'semantic/mathematical', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: 'With dichotic presentation the beat is computed centrally by binaural coincidence detectors.',
        evidence:
          'Solid: shown by Dove 1839, formalized by Licklider, Webster & Hedlun 1950 — interaural phase is compared neurally. The popular text replaces this with a mechanical-interference metaphor; neurons correlate spike trains, they do not superpose pressure waves.',
        flawFlags: [
          { id: 'F1.2', flaw: 'Mechanical-interference metaphor ("waveforms mesh") stands in for neural computation', type: 'semantic', severity: 'medium' },
        ],
      },
      {
        id: 'S3',
        claim: 'Oster 1973 established the phenomenon and its use.',
        evidence:
          'Misread: Oster mapped perceptual limits and proposed a diagnostic instrument — no state-change claim, no mood effect. The state-management language is a post-1974 Monroe-lineage addition attributed back to him.',
        flawFlags: [
          { id: 'F1.3', flaw: 'Appeal-to-authority laundering: Oster cited as evidence for claims he never made', type: 'empirical (misattribution)', severity: 'high' },
        ],
      },
      {
        id: 'S4',
        claim: 'The percept exists for any carrier and any beat rate.',
        evidence:
          'False: the percept needs carrier ≲1 kHz (best 400–500 Hz) and Δf ≲30 Hz; below ~3 Hz it is a rotating lateralization, above ~20–30 Hz it dissolves into roughness. A 2025 replication found the classical detection pattern was not consistently reproduced across participants.',
        flawFlags: [
          { id: 'F1.4', flaw: 'Scope violation: Δf > 30 Hz "gamma beats" are not heard as beats; carriers >1 kHz fail', type: 'scope', severity: 'high' },
          { id: 'F1.6', flaw: 'Interindividual percept unreliability ignored', type: 'empirical', severity: 'medium' },
        ],
      },
      {
        id: 'S5',
        claim: 'Perceiving the beat puts the brain into a state at that frequency.',
        evidence:
          'Category error: a percept is neural activity representing 10 Hz modulation, not a cortical state of 10 Hz. By the same logic, watching a 10 Hz strobe would "make you alpha" — which the evidence refutes.',
        flawFlags: [
          { id: 'F1.5', flaw: 'Percept → brain-state category error', type: 'logical', severity: 'high' },
        ],
      },
    ],
    weakestArrow: 4,
    weakestArrowNote: 'The leap from "representing a frequency" to "possessing a brain state at that frequency" has no mechanism and no evidence.',
    domainOfValidity: [
      'Carrier ≲ 1 kHz, best 400–500 Hz; |Δf| ≲ 30 Hz (Oster/Licklider window).',
      'A genuine, centrally computed auditory illusion — a valid probe of binaural timing.',
      'Clinically informative as perception (Oster\'s actual proposal), not as state control.',
    ],
    alternatives: [
      'A perceptual curiosity whose effects are driven by attention to an unusual sound.',
      'Generic relaxation/expectancy from resting with audio.',
      'Masking: every pink-noise-embedded EEG study in the 2023 review came back null.',
      'Demand characteristics in unblinded studies.',
    ],
    verdicts: [{ verdict: 'REPAIRABLE', scope: 'Perception claim survives; the "the brain follows" tail is deleted pending Claim 2 evidence' }],
    verdictSummary: 'Keep the percept within strict psychoacoustic limits; the "follows" arrow fails at the next chain.',
    steelman:
      'Binaural beats are a genuine, centrally computed auditory illusion with objective neural correlates (binaural interaction components, brainstem FFR, weak cortical ASSR); within Licklider\'s limits they are a valid probe of binaural timing. Nothing here requires the percept to drive cortical state.',
    registryLinks: ['X10', 'X01'],
    citations: [
      { label: 'Oster G (1973), Sci Am 229(4):94–102', url: 'https://pubmed.ncbi.nlm.nih.gov/4727697/' },
      { label: 'Licklider, Webster & Hedlun (1950), JASA 22(4):468–473' },
      { label: 'Unidistance psychophysics replication (2025)', url: 'https://unidistance.ch/en/psychology/research-project/psychophysics-of-binaural-beats' },
    ],
  },
  {
    id: 'assr-to-state',
    title: 'ASSR at the beat rate ⇒ entrained oscillation ⇒ band state',
    source: 'R1',
    claim:
      'The beat evokes a frequency-following response; EEG shows activity at the beat frequency; therefore the beat takes over the brain\'s own rhythm and produces the mental state of that band.',
    steps: [
      {
        id: 'S1',
        claim: 'Beats elicit a measurable brainstem FFR and cortical ASSR at the beat rate.',
        evidence:
          'Empirically sound (Orozco Perez 2020; Schwarz & Taylor 2005) — but the binaural cortical ASSR is weak: smaller than the monaural/acoustic-beat response and gone beyond ~3 kHz carrier.',
        flawFlags: [],
      },
      {
        id: 'S2',
        claim: 'A stimulus-locked ASSR is an entrained endogenous oscillation.',
        evidence:
          'The crux, and the break. The ASSR is a driven evoked response that dies with the stimulus; steady-state responses are generable by ERP superposition with no oscillator involved (Capilla 2011). Scalp ASSR alone cannot decide between superposition and true entrainment.',
        flawFlags: [
          { id: 'F2.1', flaw: 'Equivocation on "entrainment": evoked response relabeled as an endogenous oscillator taken over', type: 'logical/semantic', severity: 'critical' },
          { id: 'F2.5', flaw: 'Measurement tautology: spectral power at the stimulus frequency counts the evoked response itself', type: 'methodological', severity: 'high' },
        ],
      },
      {
        id: 'S3',
        claim: 'Direct tests support the entrainment reading.',
        evidence:
          'The strongest direct tests return negative or coexistence-without-interaction: Duecker 2021 (endogenous gamma and flicker response occupy the same channel without interacting), Soula 2023 (40 Hz flicker does not engage native gamma in two AD mouse models), Keitel 2014.',
        flawFlags: [
          { id: 'F2.2', flaw: 'Direct dissociation counterevidence ignored', type: 'empirical', severity: 'critical' },
        ],
      },
      {
        id: 'S4',
        claim: 'A driven auditory-cortex rhythm produces the global state of that band.',
        evidence:
          'No validated pathway from a driven auditory rhythm to a distributed frontal/parietal regime; Orozco Perez 2020 measured ASSRs with zero mood modulation; Engelbregt 2021 found no convincing role for neural synchronization in beat-related cognitive effects.',
        flawFlags: [
          { id: 'F2.3', flaw: 'Missing middle: local auditory rhythm → global brain state pathway unspecified', type: 'logical', severity: 'high' },
        ],
      },
      {
        id: 'S5',
        claim: 'The EEG literature confirms the arrow.',
        evidence:
          'Ingendoh 2023 systematic review (14 studies): 5 support, 8 contradict, 1 mixed; zero support in beta; positives cluster in one lab with small n and no active auditory control.',
        flawFlags: [
          { id: 'F2.4', flaw: 'Modal result is null; positives single-lab clustered', type: 'empirical/statistical', severity: 'high' },
        ],
      },
    ],
    weakestArrow: 1,
    weakestArrowNote: 'The driven evoked response is relabeled as a taken-over oscillator — the definition swap the whole theory rides on.',
    domainOfValidity: [
      'ASSR/FFR at the beat rate is real and engineerable: carrier, rate, depth, noise and state set its size.',
      'Strict dynamical entrainment remains possible near the individual eigenfrequency (Notbohm 2016; Gulbinaite 2017) — decided by X02/X03.',
      'Never whole-session average the response: it is non-stationary and state-dependent (T-F audit).',
    ],
    alternatives: [
      'ASSR amplitude changes reflect attention/arousal modulation of evoked responses.',
      'Reported "power at f" is the evoked response counted as its own evidence.',
      'Post-stimulation changes are relaxation/eyes-closed drift.',
    ],
    verdicts: [
      { verdict: 'DEMOTE', scope: 'Strong form: generic beat→band entrainment claim' },
      { verdict: 'OPEN', scope: 'Eigenfrequency-matched weak form — decided by offset persistence (X02) and detuning (X03)' },
    ],
    verdictSummary: 'A measurable stimulus-locked response — sometimes, under individualized conditions, possibly more. The generic claim is demoted.',
    steelman:
      'Strict dynamical entrainment (phase-pulling of an endogenous oscillator) occurs in some paradigms, strongest near the individual\'s peak frequency; "rhythmic stimulation can bias ongoing oscillations under narrow conditions" is defensible.',
    registryLinks: ['X02', 'X03', 'X01'],
    citations: [
      { label: 'Ingendoh, Posny & Heine (2023), PLOS ONE 18(5):e0286023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/' },
      { label: 'Duecker et al. (2021), J Neurosci 41(31):6684–6698' },
      { label: 'Soula et al. (2023), Nat Neurosci 26:570–578', url: 'https://pubmed.ncbi.nlm.nih.gov/36879142/' },
      { label: 'Orozco Perez et al. (2020), eNeuro 7(2)', url: 'https://pubmed.ncbi.nlm.nih.gov/32066611/' },
    ],
  },
  {
    id: 'band-maps',
    title: 'Band→state map — "alpha = relax, beta = focus"',
    source: 'R1',
    claim:
      'Alpha waves are associated with relaxation, theta with creativity, beta with focus; therefore producing band f produces its associated state.',
    steps: [
      {
        id: 'S1',
        claim: 'Band power correlates with mental states (alpha at rest, theta in drowsiness, beta in alertness).',
        evidence:
          'Real but two-directional and task-dependent even in Klimesch\'s careful version; alpha also rises with internal attention, working-memory load and inhibition. The map is a one-way correlation table marketed as a two-way causal dial.',
        flawFlags: [
          { id: 'F3.1', flaw: 'Reverse inference: S→f correlation does not license an f→S causal dial', type: 'logical', severity: 'critical' },
          { id: 'F3.5', flaw: 'Mapping is non-unique (alpha = rest AND inhibition AND internal attention)', type: 'empirical', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: 'A fixed band frequency (e.g. 10 Hz) addresses every user\'s alpha.',
        evidence:
          'Individual alpha peak spans ~7.5–12.5 Hz with ±1–2 Hz between people; a fixed "10 Hz alpha beat" misses most individuals\' actual peak, and band edges are arbitrary conventions differing across papers.',
        flawFlags: [
          { id: 'F3.2', flaw: '±2 Hz IAF variability vs fixed-band stimuli', type: 'empirical/measurement', severity: 'high' },
          { id: 'F3.3', flaw: 'No baseline/state-trait term in the model', type: 'logical', severity: 'high' },
        ],
      },
      {
        id: 'S3',
        claim: 'Band power is a causal lever for cognition.',
        evidence:
          'Contested in mainstream neuroscience: oscillations may be readouts of underlying excitability (Doelling & Assaneo 2021). Driving a readout changes nothing downstream — pushing the thermometer needle does not warm the room.',
        flawFlags: [
          { id: 'F3.4', flaw: 'Contested premise treated as settled', type: 'empirical', severity: 'medium' },
        ],
      },
    ],
    weakestArrow: 0,
    weakestArrowNote: 'The correlation table is read backwards: the causal direction the product needs is the one the evidence does not supply.',
    domainOfValidity: [
      'Some band–function links are among the best-replicated EEG findings (posterior alpha suppression with attention; frontal-midline theta in memory load; sleep slow waves).',
      'A probabilistic, individual-calibrated mapping near the user\'s own IAF is scientifically respectable.',
    ],
    alternatives: [
      'Reported state changes after "alpha" tracks are generic relaxation from sitting quietly.',
      'Expectancy from being told the track is relaxing.',
      'Regression to the mean in pre-post designs without active controls — the modal design flaw in this literature.',
    ],
    verdicts: [
      { verdict: 'REPAIRABLE', scope: 'Only in individualized, probabilistic form with per-user IAF calibration' },
      { verdict: 'DISCARD', scope: 'Fixed-frequency universal map ("10 Hz = relax for everyone")' },
    ],
    verdictSummary: 'Audited: repairable only as an individualized, hedged mapping; the universal fixed-band dial is discarded.',
    steelman:
      'A probabilistic, individual-calibrated mapping — "biasing your own alpha near your own IAF is associated with a modest arousal shift in the resting direction" — is scientifically respectable and matches the individualized flicker literature.',
    registryLinks: ['X03'],
    citations: [
      { label: 'Klimesch (1999), Brain Res Rev 29:169–195' },
      { label: 'Haegens 2014; Deng et al. 2019 (IAF ranges 9.32–11.19 Hz)' },
      { label: 'Doelling & Assaneo (2021), PLoS Biol 19:e3001234' },
    ],
  },
  {
    id: 'dose-logic',
    title: 'Dose logic — "more minutes at f = more effect"',
    source: 'R1',
    claim:
      'Longer and repeated exposure to the target frequency produces stronger, more durable effects — the premise behind 30–60 minute daily-session product designs.',
    steps: [
      {
        id: 'S1',
        claim: '"Dose" transfers from pharmacology: effect scales with exposure.',
        evidence:
          'Analogy without mechanism: no receptor, no concentration, and no dose-response curve has ever been measured for beat exposure. "Minutes at f" launders listening duration into a quantity with assumed physiological meaning.',
        flawFlags: [
          { id: 'F4.1', flaw: 'Pharmacological analogy with no measured dose-response (unit laundering)', type: 'logical', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: 'Meta-analysis shows time under exposure predicts effect.',
        evidence:
          'Garcia-Argibay 2019\'s duration moderator is a between-study meta-regression over heterogeneous protocols (3–60 min), confounded with timing and frequency — not an individual dose curve (ecological fallacy).',
        flawFlags: [
          { id: 'F4.2', flaw: 'Between-study regression read as individual dose-response', type: 'statistical (ecological fallacy)', severity: 'high' },
        ],
      },
      {
        id: 'S3',
        claim: 'Physiology supports accumulation over a session.',
        evidence:
          'The base-rate physiology cuts the other way: rat ASSR habituates exponentially to asymptote in ~27 s of sustained AM (used as a cross-species prior on sign, not proof); human habituation at beat rates is a named missing measurement (E-09).',
        flawFlags: [
          { id: 'F4.3', flaw: 'Habituation predicts diminishing returns — sign error against "more = more"', type: 'empirical', severity: 'high' },
        ],
      },
      {
        id: 'S4',
        claim: 'High-dose daily use is benign.',
        evidence:
          'The only long-duration self-administration study (Wahbeh 2007, n=8, uncontrolled) found adverse drift at high cumulative dose: dopamine↓, IGF-1↓, depression↑, recall↓, no measured entrainment. Tiny and uncontrolled — but it is the only data on the exact regimen products recommend.',
        flawFlags: [
          { id: 'F4.4', flaw: 'Only high-dose data point is adverse', type: 'empirical', severity: 'high' },
          { id: 'F4.5', flaw: 'iTBS/rTMS precedent: more dose does not convert non-responders', type: 'empirical generalization', severity: 'medium' },
        ],
      },
    ],
    weakestArrow: 1,
    weakestArrowNote: 'The single citation behind "more is better" is an ecological regression that cannot see individual dose at all.',
    domainOfValidity: [
      'A bounded onset-window claim is honest: effects, if any, may need minutes to recruit.',
      'Behavior at long durations is unknown and possibly adverse — caps and dose tracking are the defensible posture (X11/X13 pending).',
    ],
    alternatives: [
      'Longer sessions = more time resting with eyes closed (confounded with rest itself).',
      'Repeated daily use effects = practice and ritual effects.',
      'Cumulative benefit in uncontrolled series = expectancy reinforcement.',
    ],
    verdicts: [{ verdict: 'OPEN', scope: 'Presumption against linearity; no within-subject dose-response curve exists anywhere in the literature' }],
    verdictSummary: 'Open with a presumption against linearity — habituation and the lone high-dose study both point against "more = more".',
    steelman:
      'Some minimum exposure plausibly matters and the pre-task timing moderator suggests a preparatory window of minutes: "there may be an onset window of several minutes, with unknown and possibly adverse behavior at long durations."',
    registryLinks: ['X11', 'X13'],
    citations: [
      { label: 'Garcia-Argibay et al. (2019), Psychol Res 83:357–372', url: 'https://pubmed.ncbi.nlm.nih.gov/30073406/' },
      { label: 'Prado-Gutierrez et al. (2015) — rat ASSR habituation, ~27 s asymptote', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4627118/' },
      { label: 'Wahbeh et al. (2007), J Altern Complement Med 13(1):25–32', url: 'https://pubmed.ncbi.nlm.nih.gov/17309374/' },
    ],
  },
  {
    id: 'modality-superiority',
    title: 'Modality superiority — "monaural/isochronic are more potent"',
    source: 'R1',
    claim:
      'Monaural and isochronic tones elicit a more potent neurological effect; binaural beats produce a weaker effect and stimulate less of the cortex.',
    steps: [
      {
        id: 'S1',
        claim: 'Physical modulation (monaural/isochronic) produces a larger ASSR than binaural beats.',
        evidence:
          'Established at the evoked-response level: Schwarz & Taylor 2005, Orozco Perez 2020, Pratt 2010 — acoustic-beat ASSR > binaural ASSR at matched rate.',
        flawFlags: [],
      },
      {
        id: 'S2',
        claim: 'A larger evoked response means a more potent effect on mental state.',
        evidence:
          'Endpoint substitution: no outcome trial has established modality superiority for any behavioral endpoint; Orozco Perez 2020 itself found no mood modulation by either stimulus — the "stronger" stimulus produced zero stronger effect on the only psychological measure taken. Counter-signal: isochronic tones worsened executive performance (McLeod 2019).',
        flawFlags: [
          { id: 'F5.1', flaw: 'Endpoint substitution: ASSR amplitude ⇒ therapeutic potency', type: 'logical', severity: 'high' },
          { id: 'F5.2', flaw: 'Downstream efficacy vacuum: 2/17 isochronic RCTs quality-rated; no outcome superiority trial', type: 'empirical', severity: 'high' },
          { id: 'F5.5', flaw: 'Counter-signal (isochronic executive impairment) ignored in marketing', type: 'empirical', severity: 'medium' },
        ],
      },
      {
        id: 'S3',
        claim: '"Stronger" is a property of the modality, valid at any parameter point.',
        evidence:
          'The ASSR hierarchy is parameter-conditional (binaural needs low carriers and in-window Δf), and the modalities are not interchangeable doses of one variable — binaural uniquely elicited cross-frequency connectivity not seen with monaural.',
        flawFlags: [
          { id: 'F5.3', flaw: 'Single-parameter-point data generalized to a modality property', type: 'scope', severity: 'medium' },
          { id: 'F5.4', flaw: 'n=16 single-lab anchor; replication thin', type: 'statistical', severity: 'medium' },
        ],
      },
    ],
    weakestArrow: 1,
    weakestArrowNote: 'The claim silently re-targets from "bigger evoked response" to "stronger effect on you" — the one arrow no trial has ever tested.',
    domainOfValidity: [
      'Engineering statement only: to maximize measurable stimulus-locked phase-locking per unit loudness, physical modulation is the best-evidenced route.',
      'Binaural is the only route to the dichotic beat percept itself — a different design goal, not a weaker one.',
    ],
    alternatives: [
      'Monaural ASSR superiority reflects peripheral cochlear interference — more stimulus energy at Δf, trivially more evoked response, with no implication for state change.',
      'Binaural\'s weak cortical response with a real percept dissociates perception from evoked amplitude; ASSR size may be irrelevant to any psychological effect.',
    ],
    verdicts: [{ verdict: 'REPAIRABLE', scope: 'Keep the ASSR-strength hierarchy as engineering; discard implied outcome superiority pending X06' }],
    verdictSummary: 'Repairable as an engineering tradeoff statement; "more potent effect" is untested and currently meaningless.',
    steelman:
      'If the goal is maximizing measurable stimulus-locked cortical phase-locking per unit loudness, physical modulation is the best-evidenced acoustic route; if the goal is the binaural percept, the cortical signal is intrinsically weak. Not a claim about mental states.',
    registryLinks: ['X06'],
    citations: [
      { label: 'Schwarz & Taylor (2005), Clin Neurophysiol 116:658–668' },
      { label: 'Orozco Perez et al. (2020), eNeuro 7(2)', url: 'https://pubmed.ncbi.nlm.nih.gov/32066611/' },
      { label: 'Kanzler et al. (2021), Rev Mex Neurocienc 22(6) — isochronic RCT count' },
    ],
  },
  {
    id: 'carrier-432',
    title: '432 Hz — "natural tuning aligned with the Earth"',
    source: 'R2',
    claim:
      'A4 = 432 Hz is natural and healthier than the "artificial" 440 Hz standard: 8 Hz × 2⁵ = 256 Hz (C), and a Pythagorean fifth-stack gives A = 432 Hz, "resonating with the Earth\'s heartbeat".',
    steps: [
      {
        id: 'S1',
        claim: '432 Hz is an octave of the Schumann resonance (8 Hz × 2⁵ chain).',
        evidence:
          'Computed false at the first link: the Schumann fundamental is 7.83 Hz, not 8, and drifts 7.8–8.0. Octave-doubling 7.83 gives 250.56 Hz (2⁵) and 501.12 Hz (2⁶) — neither is 256 or 432. Nearest Schumann octave to 432 is off by 943 cents: nine and a half semitones.',
        flawFlags: [
          { id: 'F-432.1', flaw: '"432 = Schumann octave" false by 943 cents (computed)', type: 'mathematical/empirical', severity: 'critical' },
          { id: 'F-432.4', flaw: 'The fundamental\'s own drift (±0.1 Hz → ±3.2 Hz at octave 5) is larger than the claimed effect', type: 'empirical', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: '432 Hz is at least a harmonic of the Schumann fundamental.',
        evidence:
          'Computed false: 432 / 7.83 = 55.17 — non-integer. Nearest harmonics are 430.65 Hz (55×) and 438.48 Hz (56×). 432 Hz is no harmonic of 7.83 Hz.',
        flawFlags: [
          { id: 'F-432.2', flaw: '"432 = Schumann harmonic" false (ratio 55.17, non-integer)', type: 'mathematical', severity: 'critical' },
        ],
      },
      {
        id: 'S3',
        claim: 'The rescue chain (round 7.83→8, then Pythagorean tuning) is principled.',
        evidence:
          'Two stacked arbitrary conventions: rounding 7.83 to 8 is a 2.2% error (~38 cents, musically enormous), and equal temperament from C=256 gives A=430.54 Hz — also not 432. Historical pitch varied 415–465 Hz; Verdi\'s 432 advocacy was about vocal strain, not cosmos; no archaeoacoustic publication supports ancient 432 tuning.',
        flawFlags: [
          { id: 'F-432.3', flaw: 'Chain requires two hidden conventions; the premise drifts more than the effect', type: 'logical', severity: 'critical' },
          { id: 'F-432.5', flaw: 'False history + arbitrariness of the reference pitch itself', type: 'empirical', severity: 'high' },
        ],
      },
      {
        id: 'S4',
        claim: 'Listening studies show 432 Hz music is more relaxing than 440 Hz.',
        evidence:
          'Pilot-grade only: Calamassi & Pomponi 2019 (n=33) reported HR −4.79 bpm at p=0.05 boundary with ~6–8 endpoints tested (family-wise error ~26–34%) and a corrigendum on record. A mundane pitch-height account — ~1/3 semitone lower reads as warmer/calmer — predicts the same result for 437 Hz, erasing frequency specificity.',
        flawFlags: [
          { id: 'F-432.6', flaw: 'Boundary p-values, tiny n, multiple endpoints, corrigendum required', type: 'statistical', severity: 'high' },
          { id: 'F-432.7', flaw: 'Pitch-height confound explains the effect without frequency magic', type: 'logical (alternative explanation)', severity: 'high' },
        ],
      },
    ],
    weakestArrow: 0,
    weakestArrowNote: 'The chain fails numerically at its very first link — 943 cents is not a rounding error, it is nine semitones.',
    domainOfValidity: [
      'Carrier choice genuinely matters as ENGINEERING in the 250–1000 Hz range (perception limits; ~30%/octave ASSR slope) — monotonic, octave-scale, mundane.',
      '"Music retuned ~1/3 semitone down feels slightly calmer to some listeners" is a modest, testable pitch-preference claim with pilot support.',
      'As a binaural carrier at fixed Δf, 432 vs 440 changes only timbre: predicted ASSR difference ≈ 0.8% — undetectable.',
    ],
    alternatives: [
      'Preference for slightly lower pitch = perceived warmth/relaxation (music-psychology confound).',
      'Expectancy in non-naive participants.',
      'Multiple-endpoint fishing at p≈0.05 in small pilots.',
    ],
    verdicts: [
      { verdict: 'DISCARD', scope: 'The cosmological/numerological claim — numerically false' },
      { verdict: 'OPEN', scope: 'The relaxation claim — pilot-grade signal; decided by X04 (carrier sweep) and X07 (powered decomposition)' },
    ],
    verdictSummary: 'Audited: the Earth-alignment claim is numerically false; only a hedged pitch-preference residue remains, under test.',
    steelman:
      'Music retuned ~1/3 semitone down may bias toward calmness in some listeners — a modest psychoacoustic claim that needs no Schumann, no 8 Hz, no cosmos.',
    registryLinks: ['X04', 'X07'],
    citations: [
      { label: 'Calamassi & Pomponi (2019), Explore — n=33, HR −4.79 bpm, p=0.05; corrigendum 2020', url: 'https://pubmed.ncbi.nlm.nih.gov/31031095/' },
      { label: 'Ross, Herdman & Pantev (2003), Hear Res 186:57–68 — ~30%/octave carrier slope', url: 'https://pubmed.ncbi.nlm.nih.gov/14644459/' },
    ],
  },
  {
    id: 'cousto-octave',
    title: 'Cousto "Cosmic Octave" — planetary periods as healing tones',
    source: 'R2',
    claim:
      'Any temporal period T (planet orbit, rotation) can be translated into the audible range by octave doubling, f = (1/T)·2ⁿ, and the resulting tone corresponds to that cosmic cycle (the "Earth-year OM tone" at 136.10 Hz).',
    steps: [
      {
        id: 'S1',
        claim: 'T → 1/T converts a period into a meaningful frequency.',
        evidence:
          'Dimensionally legal (Hz = s⁻¹) but semantically empty: 1/T of an orbit is a cycle count per second, not a vibration of anything. The Earth does not hum at 3.17×10⁻⁸ Hz — nothing oscillates at 1/T at the source.',
        flawFlags: [
          { id: 'FC.1', flaw: 'Unit laundering: the reciprocal of a duration is arithmetic, not a physical field', type: 'semantic', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: 'Multiplying by 2ⁿ lands on THE tone of the period.',
        evidence:
          'n is a free integer chosen post hoc for pleasantness: the Earth year legally folds to 17.01, 34.02, 68.05, 136.10, 272.19 or 544.39 Hz — n=32 ("OM") is one of ~7 equally legal choices, and nothing in the formula selects it.',
        flawFlags: [
          { id: 'FC.2', flaw: 'Unconstrained free parameter (degree of freedom) selected post hoc', type: 'mathematical', severity: 'high' },
        ],
      },
      {
        id: 'S3',
        claim: 'The period T is well-defined.',
        evidence:
          'Ambiguous where it matters: the mean solar day folds to 194.18 Hz while the sidereal day (actual rotation) folds to 194.71 Hz — 4.7 cents apart, near the audible threshold. Which is "the Earth day tone"? The formula cannot say; the choice is aesthetic. (Year ambiguity, ~0.07 cents, is negligible — an asymmetry never disclosed.)',
        flawFlags: [
          { id: 'FC.3', flaw: 'Hidden convention: sidereal vs solar day changes the "Earth day tone" by an audible margin', type: 'logical', severity: 'high' },
        ],
      },
      {
        id: 'S4',
        claim: 'Octaves preserve meaning: f and 2ⁿ·f are "the same tone" for the body.',
        evidence:
          'Octave equivalence is a property of human pitch perception (chroma), not of biophysics — a cell has no octave detector. The theory\'s own axiom is turned against it in X08: any true period effect must appear at BOTH 136.10 and 68.05 Hz.',
        flawFlags: [
          { id: 'FC.4', flaw: 'Category error: perceptual octave equivalence imported as biological equivalence', type: 'logical', severity: 'critical' },
          { id: 'FC.5', flaw: 'No mechanism connecting planetary period to tissue response', type: 'empirical', severity: 'high' },
        ],
      },
    ],
    weakestArrow: 3,
    weakestArrowNote: 'The load-bearing move — treating a perceptual equivalence as a physical one — has no mechanism and no evidence behind it.',
    domainOfValidity: [
      'A self-consistent compositional grammar: the arithmetic is reproducible (136.10 Hz, 194.18 Hz match published tables to 0.01 Hz).',
      'A legitimate 2,400-year intellectual lineage (Pythagoras → Kepler → Kayser → Cousto) — judged as music, it needs no defense.',
    ],
    alternatives: [
      'Any T yields some pleasant pitch — the mapping has zero predictive content, so no observation could falsify it.',
      'Relaxation responses to the tones are generic rest/expectancy effects.',
      'Timbre and low-frequency warmth, not period identity, drive any felt difference (X09 tests a deliberately meaningless period).',
    ],
    verdicts: [
      { verdict: 'DEMOTE', scope: 'To an aesthetic/compositional grammar' },
      { verdict: 'DISCARD', scope: 'Every physiological/"physical frequency of the Earth" claim — nothing physical oscillates at 136.1 Hz' },
    ],
    verdictSummary: 'Audited: keep as composition, discard as physiology — the fold procedure is information-free, mathematically and (per X08/X09 design) empirically.',
    steelman:
      'As a compositional system the Cosmic Octave is exactly self-consistent, generates an elegant finite pitch set, and sits in a legitimate intellectual lineage. Judged as music, it needs no defense.',
    registryLinks: ['X08', 'X09'],
    citations: [
      { label: 'Cousto (1978), The Cosmic Octave; Planetware published fold tables' },
      { label: 'R2 audit: computed fold values match Planetware to 0.01 Hz; sidereal/solar day asymmetry computed' },
    ],
  },
  {
    id: 'solfeggio-numerology',
    title: 'Solfeggio frequencies — the "3-6-9 pattern"',
    source: 'R2',
    claim:
      'The set {174, 285, 396, 417, 528, 639, 741, 852, 963} Hz is special because each number\'s digits reduce to 3, 6 or 9 — presented as mathematics with physical import (provenance: 1970s–99 Bible-verse numerology, not Gregorian chant).',
    steps: [
      {
        id: 'S1',
        claim: 'The 3/6/9 digital-root pattern is a deep structural property.',
        evidence:
          'Computed: the entire pattern is one fact wearing a costume — every number in the set is divisible by 3, and in base 10 multiples of 3 reduce only to 3, 6 or 9. The "pattern" is mod 3 == 0.',
        flawFlags: [
          { id: 'FS.1', flaw: 'Divisibility by 3 disguised as mystical structure', type: 'mathematical', severity: 'high' },
        ],
      },
      {
        id: 'S2',
        claim: 'The pattern is a property of the frequencies themselves.',
        evidence:
          'Representation-dependent: digital roots of the same frequencies in base 8/12/16 break the pattern (computed table). A property that depends on how many fingers humans have cannot be a property of the acoustical wave — and Hz itself is a seconds-based human unit, convention on convention.',
        flawFlags: [
          { id: 'FS.2', flaw: 'Base-10 dependence: the pattern evaporates in base 8/12/16', type: 'mathematical/logical', severity: 'critical' },
        ],
      },
      {
        id: 'S3',
        claim: 'The set is selective — these tones and no others.',
        evidence:
          'Non-injective: in 100–999 Hz exactly one-third of all frequencies (300 of 900) reduce to 3/6/9. A predicate true of a third of all candidate tones selects nothing.',
        flawFlags: [
          { id: 'FS.3', flaw: 'Non-selective criterion: 1/3 of all tones qualify', type: 'mathematical', severity: 'high' },
          { id: 'FS.4', flaw: 'The digit-grid closure under +243/+324 is a decimal artifact (apophenia-grade)', type: 'mathematical', severity: 'medium' },
        ],
      },
      {
        id: 'S4',
        claim: 'The derivation predicted the set in advance.',
        evidence:
          'Post-hoc selection: verses and reduction operations were chosen until 3-digit multiples of 3 emerged; no pre-registered prediction was ever made and tested.',
        flawFlags: [
          { id: 'FS.5', flaw: 'Unconstrained selection procedure; unfalsifiable as posed', type: 'logical', severity: 'critical' },
        ],
      },
    ],
    weakestArrow: 1,
    weakestArrowNote: 'Base-dependence kills any physical reading outright: the wave does not know what numerals we write it in.',
    domainOfValidity: [
      'A meditation scaffold: a rule system for choosing tones that practitioners find meaningful.',
      'Mild musical coherence — divisibility by 3 clusters frequency ratios near simple fractions, which is genuinely pleasant.',
    ],
    alternatives: [
      'Any felt effect is relaxation/ritual — near-neighbor controls (528 vs 522 Hz) are predicted indistinguishable.',
      'Pleasantness from simple-ratio clustering needs no numerology.',
    ],
    verdicts: [
      { verdict: 'DISCARD', scope: 'As mathematics with physical import — provably representation-dependent and non-selective' },
      { verdict: 'DEMOTE', scope: 'To a mnemonic/aesthetic device' },
    ],
    verdictSummary: 'Audited and discarded as physics: the 3-6-9 pattern is mod-3 arithmetic in base 10; it survives only as a mnemonic.',
    steelman:
      'Digit reduction functions as a meditation scaffold and the set has mild musical coherence from simple-ratio clustering. As a mnemonic it works.',
    registryLinks: ['X09'],
    citations: [
      { label: 'R2 audit: computed digital-root tables in bases 8/10/12/16; 300/900 non-injectivity count' },
      { label: 'Provenance audit: Puleo/Horowitz 1970s–99 lineage, not Gregorian chant' },
    ],
  },
  {
    id: 'gateway-core',
    title: 'Gateway core chain — Hemi-Sync → holographic-universe access',
    source: 'R3',
    claim:
      'The Gateway Experience is "a training system designed to bring enhanced strength, focus and coherence to the amplitude and frequency of brainwave output between the left and right hemispheres so as to alter consciousness, moving it outside the physical sphere… to escape even the restrictions of time and space." (CIA-RDP96-00788, §5)',
    steps: [
      {
        id: 'S1',
        claim: 'Binaural beats drive a strong, cortical, brainwide frequency-following response (§7).',
        evidence:
          'Real but weak, variable and local: the 2023 review of 14 controlled EEG studies found 8 null, 5 partially supportive, 1 mixed; effects concentrate near auditory cortex and reflect binaural integration, not global takeover. The arrow cannot bear the load placed on it.',
        flawFlags: [
          { id: 'FG.1', flaw: 'FFR assumed strong/cortical/brainwide against review-level evidence', type: 'empirical', severity: 'critical' },
        ],
      },
      {
        id: 'S2',
        claim: 'FFR produces "hemispheric synchronization" — both hemispheres equal in amplitude and frequency (§5, §7).',
        evidence:
          'Non-operational: homologous EEG channels are never exactly equal; near-equality of two spectra is trivially produced by volume conduction. Both hemispheres already process both ears, and dichotic tones are integrated in the brainstem — nothing about a beat locks the hemispheres in the neuroscientific sense. The one 2024 finding the report would have liked (transient interhemispheric alpha coherence between auditory cortices) is interpreted by its own authors as binaural integration, with no behavioral effect.',
        flawFlags: [
          { id: 'FG.2', flaw: 'Metaphor ("sync") promoted to mechanism; definition non-operational', type: 'logical/semantic', severity: 'critical' },
        ],
      },
      {
        id: 'S3',
        claim: 'Hemispheric coherence turns consciousness into a coherent "energy system" able to resonate with external fields (§6, §10–§11).',
        evidence:
          'Analogy converted to mechanism: §6 admits the laser is a metaphor, then §10–§11 silently treat it as physics. "Energy", "frequency", "coherence", "resonance" and "hologram" are each used in at least two mutually incompatible senses across the document.',
        flawFlags: [
          { id: 'FG.3', flaw: 'Reification of an admitted metaphor; systematic term equivocation', type: 'logical', severity: 'critical' },
        ],
      },
      {
        id: 'S4',
        claim: 'Per Pribram and Bohm, the mind is a hologram that tunes into the universal hologram (§14) — enabling OBE and spacetime transcendence.',
        evidence:
          'Misattribution: neither Pribram nor Bohm made that claim; it is popularization wearing their names. Neither theory entails OBE or remote viewing, and the "consciousness creates the appearance of the brain" line is from a parapsychology advocate, not either scientist. No operational prediction distinguishes the model from "deep relaxation produces unusual subjective experiences" — unfalsifiability check failed.',
        flawFlags: [
          { id: 'FG.4', flaw: 'Affinity-fraud structure: prestige of two heterodox-but-serious scientists borrowed for conclusions they never drew', type: 'empirical (misattribution)', severity: 'critical' },
          { id: 'FG.5', flaw: 'Unfalsifiable: no operational prediction separates the model from deep relaxation', type: 'logical', severity: 'critical' },
        ],
      },
    ],
    weakestArrow: 2,
    weakestArrowNote: 'The metaphor-to-mechanism conversion is where a relaxation protocol becomes cosmology — without a single new measurement.',
    domainOfValidity: [
      'The residual content is a relaxation/suggestion protocol: rest, ritual, expectancy and guided attention — real as experience, mundane as mechanism.',
      'A defensible Gateway-style protocol may claim relaxation-context benefits with hedged wording; nothing more.',
    ],
    alternatives: [
      'Deep relaxation plus suggestion produces unusual subjective experiences without any holographic physics.',
      'Expectancy from an authoritative training frame (priced by X05-style decomposition).',
      'Volume conduction and binaural integration explain every EEG observation offered.',
    ],
    verdicts: [
      { verdict: 'DISCARD', scope: 'As physics/philosophy of consciousness' },
      { verdict: 'DEMOTE', scope: 'As a training-system rationale — the residue is a relaxation/suggestion protocol' },
    ],
    verdictSummary: 'Audited and discarded as physics; what remains is a relaxation protocol with an unusually famous cover sheet.',
    steelman:
      'As a structured relaxation-and-suggestion curriculum with a memorable narrative, Gateway-style audio can bias toward calm and absorption — claims that need no holograms.',
    registryLinks: ['X05', 'X02'],
    citations: [
      { label: 'CIA-RDP96-00788R001700210016-5 (1983), §5/§7/§14/§19 — primary text under audit' },
      { label: 'Ingendoh et al. (2023), PLOS ONE 18(5):e0286023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/' },
    ],
  },
  {
    id: 'bentov-resonance',
    title: 'Bentov\'s body resonance — "~7.5 Hz heart oscillator couples to the planet"',
    source: 'R3',
    claim:
      'The heart\'s aortic reflection sets up a ~7 Hz standing wave in the body; this micro-motion lets the body resonate with the Schumann field, becoming a carrier for planetary coupling (Bentov, quoted in the Gateway report §8–§10).',
    steps: [
      {
        id: 'S1',
        claim: 'Aortic reflection produces a measurable whole-body micro-motion (ballistocardiogram).',
        evidence:
          'Real physiology — ballistocardiography is mainstream hemodynamics. This component survives once the mystical overlay is dropped.',
        flawFlags: [],
      },
      {
        id: 'S2',
        claim: 'The body has a "~7.5 Hz resonance" that matches the Schumann band.',
        evidence:
          'Numerically approximate at best, and dimensionally incoherent as stated: a mechanical micro-motion of the body is not an electromagnetic mode, and no coupling mechanism from body oscillation to the Earth-ionosphere cavity is proposed or measured.',
        flawFlags: [
          { id: 'FB.1', flaw: 'Dimensionally incoherent coupling (mechanical ↔ electromagnetic) with no mechanism', type: 'logical/physical', severity: 'critical' },
          { id: 'FB.2', flaw: 'Frequency match is approximate; the Schumann fundamental itself drifts 7.8–8.0 Hz', type: 'empirical', severity: 'high' },
        ],
      },
      {
        id: 'S3',
        claim: 'The coupling carries information/energy between body and planet.',
        evidence:
          'After 45+ years, no energy transfer has ever been demonstrated — and the decisive measurement (ballistocardiogram + low-noise ELF magnetometer at standoff) is simple enough that its persistent absence is closer to evidence of absence (R3-E3, predicted null by ≥40–60 dB).',
        flawFlags: [
          { id: 'FB.3', flaw: 'No demonstrated energy transfer in 45+ years despite a trivially specifiable decisive measurement', type: 'empirical', severity: 'critical' },
        ],
      },
    ],
    weakestArrow: 1,
    weakestArrowNote: 'The mechanical-to-electromagnetic handoff is asserted, never modeled — dimensionally incoherent as written.',
    domainOfValidity: [
      'Ballistocardiography: a real, useful, mundane measurement of cardiac micro-motion.',
    ],
    alternatives: [
      'Relaxed stillness makes heartbeat-driven micro-motion more noticeable — no planetary coupling required.',
      'Any felt "connection" during practice is expectancy plus interoceptive attention.',
    ],
    verdicts: [
      { verdict: 'REPAIRABLE', scope: 'Component 1: aortic reflection / ballistocardiography (drop the mystical overlay)' },
      { verdict: 'DISCARD', scope: 'Component 2: body→planet coupling — dimensionally incoherent, numerically approximate, undemonstrated' },
    ],
    verdictSummary: 'Audited: keep the ballistocardiogram, discard the planetary coupling — the decisive null measurement was never even attempted.',
    steelman:
      'Heartbeat-driven body micro-motion is real and measurable; attending to it is a legitimate interoceptive practice. That is the entire defensible content.',
    registryLinks: ['X14'],
    citations: [
      { label: 'Bentov, Stalking the Wild Pendulum (1977), as quoted in CIA-RDP96-00788 §8–§10' },
      { label: 'R3-E3: ELF standoff measurement, predicted null ≥40–60 dB (parked, out-of-scope bundle X14)' },
    ],
  },
];

export function getChain(id: string): TheoryChain | undefined {
  return THEORY_CHAINS.find((c) => c.id === id);
}
