/**
 * Critique Library content — six-pass flaw-taxonomy reviews (G9, R1–R5),
 * one entry per audited theory. Distilled from crit_r1/r2/r3/r5; each entry
 * keeps the verdict chips, the flaw table, the steelman, and the key
 * numbers. Verdicts apply to the claim, never to the people making it.
 */

import type { Critique } from './types';

export const CRITIQUES: readonly Critique[] = [
  {
    id: 'beat-percept',
    title: 'Binaural beat percept — "two detuned tones, the brain follows"',
    source: 'R1',
    claim:
      'Play 400 Hz in one ear and 410 Hz in the other and the brain perceives a 10 Hz beat; "the waveforms mesh in and out of phase within the superior olivary nuclei" and brain activity adjusts to match.',
    verdicts: [{ verdict: 'REPAIRABLE', scope: 'Perception claim survives; the "follows" claim fails at the next link' }],
    flaws: [
      { id: 'F1.1', flaw: 'Monaural superposition equation applied to a dichotic stimulus — no physical Δf signal exists anywhere outside the head', type: 'semantic/mathematical', severity: 'high' },
      { id: 'F1.2', flaw: 'Mechanical-interference metaphor ("waveforms mesh") for neural correlation of spike trains', type: 'semantic', severity: 'medium' },
      { id: 'F1.3', flaw: 'Oster 1973 cited as entrainment evidence; he proposed a diagnostic percept only — no entrainment, no mood effect', type: 'empirical (misattribution)', severity: 'high' },
      { id: 'F1.4', flaw: 'Applied outside the domain: Δf > 30 Hz "gamma beats" are not heard as beats; carriers >1 kHz fail', type: 'scope', severity: 'high' },
      { id: 'F1.5', flaw: 'Percept → brain-state category error: representing 10 Hz modulation ≠ possessing a 10 Hz brain state', type: 'logical', severity: 'high' },
      { id: 'F1.6', flaw: 'Interindividual percept unreliability ignored (2025 replication: classical detection pattern not consistently reproduced)', type: 'empirical', severity: 'medium' },
    ],
    steelman:
      'Binaural beats are a genuine, centrally computed auditory illusion with objective neural correlates (binaural interaction components, brainstem FFR, weak cortical ASSR); within Licklider\'s limits (carrier ≲1 kHz, Δf ≲30 Hz) they are a valid probe of binaural timing — Oster was right that they are clinically informative as perception. Nothing here requires the percept to drive cortical state.',
    keyNumbers: [
      { value: '≲1 kHz', label: 'carrier ceiling for the beat percept (best ~400–500 Hz)' },
      { value: '≲30 Hz', label: 'Δf ceiling — above it the percept dissolves into roughness' },
      { value: '1839', label: 'Dove\'s first demonstration; formalized by Licklider, Webster & Hedlun 1950' },
    ],
    citations: [
      { label: 'Oster G (1973), Sci Am 229(4):94–102, doi:10.1038/scientificamerican1073-94', url: 'https://pubmed.ncbi.nlm.nih.gov/4727697/' },
      { label: 'Licklider, Webster & Hedlun (1950), JASA 22(4):468–473' },
      { label: 'Unidistance psychophysics replication (2025), carriers 125–1412 Hz', url: 'https://unidistance.ch/en/psychology/research-project/psychophysics-of-binaural-beats' },
    ],
    linkedExperiments: ['X10'],
  },
  {
    id: 'assr-to-state',
    title: 'ASSR/FFR at beat frequency ⇒ entrained endogenous oscillation ⇒ band state',
    source: 'R1',
    claim:
      'The beat evokes a frequency-following response; EEG shows activity at the beat frequency; therefore the beat entrains the brain\'s oscillation and produces the mental state of that band.',
    verdicts: [
      { verdict: 'DEMOTE', scope: 'Strong form (generic entrainment claim)' },
      { verdict: 'OPEN', scope: 'Eigenfrequency-matched weak form — decided by X02/X03' },
    ],
    flaws: [
      { id: 'F2.1', flaw: 'Equivocation: evoked ASSR (driven, phase-locked, dies with the stimulus) relabeled as entrained endogenous oscillation', type: 'logical/semantic', severity: 'critical' },
      { id: 'F2.2', flaw: 'Direct dissociation evidence ignored: Duecker 2021 (endogenous gamma and flicker response coexist without interacting); Soula 2023 (Buzsáki lab: 40 Hz flicker does not engage native gamma in AD mice); Keitel 2014', type: 'empirical', severity: 'critical' },
      { id: 'F2.3', flaw: 'Missing middle: no validated pathway from a driven auditory-cortex rhythm to a distributed frontal/parietal state', type: 'logical', severity: 'high' },
      { id: 'F2.4', flaw: 'Review-level evidence: 8/14 EEG studies null, 5 support, 1 mixed; all pink-noise-embedded studies null; positives cluster in one lab', type: 'empirical/statistical', severity: 'high' },
      { id: 'F2.5', flaw: 'Measurement tautology: spectral power at the stimulus frequency counts the evoked response itself', type: 'methodological', severity: 'high' },
    ],
    steelman:
      'Strict dynamical entrainment (phase-pulling of an endogenous oscillator) does occur in some paradigms — strongest near the individual\'s own peak frequency (Notbohm 2016; Gulbinaite 2017) — and intracranial data (Becher 2015) show phase-synchronization changes at beat frequencies. "Rhythmic stimulation can bias ongoing oscillations under narrow conditions" is defensible; "any beat at any band frequency entrains that band globally" is not.',
    keyNumbers: [
      { value: '8 / 14', label: 'EEG studies contradicting entrainment (Ingendoh 2023; 5 support, 1 mixed)' },
      { value: '0', label: 'supporting studies in the beta band' },
      { value: 'ms–s', label: 'ASSR decay after stimulus offset — the signature X02 tests' },
    ],
    citations: [
      { label: 'Ingendoh, Posny & Heine (2023), PLOS ONE 18(5):e0286023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/' },
      { label: 'Duecker et al. (2021), J Neurosci 41(31):6684–6698, doi:10.1523/JNEUROSCI.3134-20.2021' },
      { label: 'Soula et al. (2023), Nat Neurosci 26:570–578', url: 'https://pubmed.ncbi.nlm.nih.gov/36879142/' },
      { label: 'Orozco Perez et al. (2020), eNeuro 7(2) — ASSR real but weak; no mood modulation', url: 'https://pubmed.ncbi.nlm.nih.gov/32066611/' },
    ],
    linkedExperiments: ['X02', 'X03', 'X01'],
  },
  {
    id: 'band-maps',
    title: 'Band→state mapping — "alpha = relax, theta = memory, beta = focus"',
    source: 'R1',
    claim:
      'Alpha waves are associated with relaxation, theta with creativity, beta with focus; therefore producing band f produces its associated state.',
    verdicts: [
      { verdict: 'REPAIRABLE', scope: 'Only in individualized, probabilistic form' },
      { verdict: 'DISCARD', scope: 'Fixed-frequency universal map ("10 Hz = relax for everyone")' },
    ],
    flaws: [
      { id: 'F3.1', flaw: 'Reverse inference: observing S→f does not license f→S; a one-way correlation table marketed as a two-way causal dial', type: 'logical', severity: 'critical' },
      { id: 'F3.2', flaw: '±2 Hz individual alpha-peak variability vs fixed-band stimuli; a fixed "10 Hz alpha beat" misses most individuals\' actual peak', type: 'empirical/measurement', severity: 'high' },
      { id: 'F3.3', flaw: 'No baseline/state-trait term; band edges are arbitrary conventions differing across papers', type: 'logical/semantic', severity: 'high' },
      { id: 'F3.4', flaw: 'Causal status of oscillations contested (readout vs mechanism) — pushing the needle is not warming the room', type: 'empirical', severity: 'medium' },
      { id: 'F3.5', flaw: 'Mapping non-unique: alpha = rest AND inhibition AND internal attention', type: 'empirical', severity: 'high' },
    ],
    steelman:
      'Some band–function links are among the best-replicated findings in EEG (posterior alpha suppression with attention, frontal-midline theta in working-memory load, sleep slow waves). A probabilistic, individual-calibrated mapping — "biasing your own alpha near your own IAF modestly shifts arousal in the resting direction" — is scientifically respectable.',
    keyNumbers: [
      { value: '7.5–12.5 Hz', label: 'healthy-adult IAF range (Klimesch 1999); ~10.3 ± 1.0 Hz mean' },
      { value: '±1–2 Hz', label: 'inter-subject IAF spread a fixed beat ignores' },
    ],
    citations: [
      { label: 'Klimesch (1999), Brain Res Rev 29:169–195' },
      { label: 'Haegens 2014; Deng et al. 2019 (IAF ranges 9.32–11.19 Hz)' },
      { label: 'Doelling & Assaneo (2021), PLoS Biol 19:e3001234' },
    ],
    linkedExperiments: ['X03'],
  },
  {
    id: 'dose-logic',
    title: 'Dose logic — "more minutes at f = more effect"',
    source: 'R1',
    claim:
      'Longer and repeated exposure to the target frequency produces stronger, more durable effects (the premise of 30–60 min daily-session product designs).',
    verdicts: [{ verdict: 'OPEN', scope: 'With a presumption against linearity — no within-subject dose-response curve exists anywhere in the literature' }],
    flaws: [
      { id: 'F4.1', flaw: 'Pharmacological dose analogy with no receptor, no concentration, no measured dose-response curve — "minutes at f" is unit laundering', type: 'logical', severity: 'high' },
      { id: 'F4.2', flaw: 'Garcia-Argibay\'s duration moderator is a between-study meta-regression over heterogeneous protocols, not an individual dose curve', type: 'statistical (ecological fallacy)', severity: 'high' },
      { id: 'F4.3', flaw: 'Habituation predicts diminishing returns: rat ASSR habituates exponentially (~27 s asymptote) — base-rate physiology cuts against accumulation (cross-species prior on sign, not proof)', type: 'empirical (sign error)', severity: 'high' },
      { id: 'F4.4', flaw: 'Only high-dose study (Wahbeh 2007, n=8, uncontrolled, 60 days) shows adverse drift: dopamine↓, IGF-1↓, depression↑, recall↓, no entrainment', type: 'empirical', severity: 'high' },
      { id: 'F4.5', flaw: 'iTBS/rTMS precedent: 50–73% non-responders do not convert with more dose', type: 'empirical generalization', severity: 'medium' },
    ],
    steelman:
      'Some minimum exposure plausibly matters (a 30 s exposure recruits little), and the pre-task timing moderator suggests a preparatory window of minutes. Honest bounded claim: "there may be an onset window of several minutes, with unknown and possibly adverse behavior at long durations."',
    keyNumbers: [
      { value: '~27 s', label: 'ASSR habituation asymptote (rat, sustained AM stimulation)' },
      { value: 'n = 8', label: 'size of the only long-duration self-administration study — and its sign pattern is adverse' },
      { value: '0', label: 'within-subject dose-response curves in the binaural-beat literature' },
    ],
    citations: [
      { label: 'Garcia-Argibay et al. (2019), Psychol Res 83:357–372', url: 'https://pubmed.ncbi.nlm.nih.gov/30073406/' },
      { label: 'Prado-Gutierrez et al. (2015) — ASSR habituation', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4627118/' },
      { label: 'Wahbeh et al. (2007), J Altern Complement Med 13(1):25–32', url: 'https://pubmed.ncbi.nlm.nih.gov/17309374/' },
    ],
    linkedExperiments: ['X11', 'X13'],
  },
  {
    id: 'monaural-superiority',
    title: '"Monaural / isochronic tones are stronger than binaural beats"',
    source: 'R1',
    claim:
      'Monaural and isochronic tones elicit a more potent neurological effect; binaural beats produce a weaker entrainment effect and stimulate less of the cortex.',
    verdicts: [
      { verdict: 'REPAIRABLE', scope: 'Stimulus-strength hierarchy at the ASSR level (well-evidenced)' },
      { verdict: 'DISCARD', scope: 'Implied outcome superiority — untested' },
    ],
    flaws: [
      { id: 'F5.1', flaw: 'Endpoint substitution: bigger evoked response silently re-targeted as "more potent therapeutic effect"; Orozco Perez 2020 found no mood modulation by either stimulus', type: 'logical', severity: 'high' },
      { id: 'F5.2', flaw: 'Downstream efficacy vacuum: 2/17 quality-rated isochronic RCTs; zero outcome superiority trials; isochronic marketing traces to unpublished sources', type: 'empirical', severity: 'high' },
      { id: 'F5.3', flaw: 'Single-parameter-point data generalized to a modality-level property; binaural uniquely elicits cross-frequency connectivity monaural lacks', type: 'scope', severity: 'high' },
      { id: 'F5.4', flaw: 'n=16 single-lab anchor; replication thin', type: 'statistical', severity: 'medium' },
      { id: 'F5.5', flaw: 'Counter-signal ignored: isochronic tones produced worse executive performance than control (McLeod 2019)', type: 'empirical', severity: 'medium' },
    ],
    steelman:
      'If your engineering goal is maximizing measurable stimulus-locked cortical phase-locking per unit loudness, physical modulation (monaural/isochronic) is the best-evidenced acoustic route; if your goal is the binaural percept specifically, the cortical signal is intrinsically weak. Correct, useful — and not a claim about mental states.',
    keyNumbers: [
      { value: '≥1.5×', label: 'expected monaural/isochronic vs binaural ASSR PLV ratio (X06 pre-registration)' },
      { value: '2 / 17', label: 'quality-rated isochronic RCTs in the literature' },
      { value: '~3 dB vs ~50 dB', label: 'binaural vs isochronic modulation depth (vendor white-paper figures, MEDIUM confidence)' },
    ],
    citations: [
      { label: 'Orozco Perez et al. (2020), eNeuro 7(2)', url: 'https://pubmed.ncbi.nlm.nih.gov/32066611/' },
      { label: 'Schwarz & Taylor (2005), Clin Neurophysiol 116:658–668' },
      { label: 'Kanzler et al. (2021), Rev Mex Neurocienc 22(6)' },
    ],
    linkedExperiments: ['X06'],
  },
  {
    id: 'carrier-432',
    title: '"Carrier frequency matters" — 432 Hz as carrier / tuning',
    source: 'R1',
    claim:
      'Use a 432 Hz carrier for entrainment; 432 Hz tuning resonates with nature while 440 Hz is harsh (transplanted into entrainment discourse as carrier specificity).',
    verdicts: [
      { verdict: 'DISCARD', scope: '432-carrier-in-entrainment claim (category conflation + quantitative impossibility)' },
      { verdict: 'REPAIRABLE', scope: 'Carrier-dependence engineering claim (octave-scale, mundane mechanism)' },
    ],
    flaws: [
      { id: 'F6.1', flaw: 'Tuning-reference discourse (A4 pitch) conflated with beat-frequency mechanism; at fixed Δf only carrier timbre changes', type: 'semantic/mathematical', severity: 'critical' },
      { id: 'F6.2', flaw: 'Boundary p-values in tiny pilots: Calamassi 2019 HR −4.79 bpm at p=0.05, n=33, multiple endpoints, corrigendum required', type: 'statistical', severity: 'high' },
      { id: 'F6.3', flaw: 'No mechanism linking absolute carrier pitch to physiology at fixed Δf', type: 'logical', severity: 'high' },
      { id: 'F6.4', flaw: 'Real carrier-dependence is octave-scale (~30%/octave, Ross 2003) — the predicted 432-vs-440 ASSR difference is ~0.8%, undetectable', type: 'scope/quantitative', severity: 'high' },
      { id: 'F6.5', flaw: 'Numerology operations (digit sums, Schumann proximity) presented as physics', type: 'mathematical', severity: 'medium' },
    ],
    steelman:
      '"Carrier frequency matters" is TRUE as engineering: choose carriers ~250–500 Hz for binaural work, expect ASSR amplitude to fall with carrier, report carrier and masking as parameters. The 432/440 music literature is legitimate music-perception research that might find small real effects of global pitch lowering — irrelevant to entrainment at fixed Δf.',
    keyNumbers: [
      { value: '2⁵×7.83 = 250.56 Hz', label: 'nearest Schumann octave — the "432 = 8 Hz × 2⁵" chain fails at the first link' },
      { value: '943 cents', label: 'miss between 432 Hz and the nearest real Schumann octave (250.56 Hz) — nine and a half semitones' },
      { value: '55.17', label: '432 / 7.83 — non-integer; 432 Hz is no harmonic of the Schumann fundamental either' },
      { value: '≈0.8%', label: 'predicted 432-vs-440 ASSR difference (Ross 2003 slope) — zero at measurement precision' },
    ],
    citations: [
      { label: 'Ross, Herdman & Pantev (2003), Hear Res 186:57–68', url: 'https://pubmed.ncbi.nlm.nih.gov/14644459/' },
      { label: 'Calamassi & Pomponi (2019), Explore 15(4):283–290, PMID 31031095', url: 'https://pubmed.ncbi.nlm.nih.gov/31031095/' },
      { label: 'Melnichuk, Cooper & Hawk (2025), Sci Rep 15:4308', url: 'https://www.nature.com/articles/s41598-025-88517-z' },
    ],
    linkedExperiments: ['X04', 'X07'],
  },
  {
    id: 'cousto-cosmic-octave',
    title: 'Cousto "Cosmic Octave" — f = (1/T)·2ⁿ planetary tones',
    source: 'R2',
    claim:
      'Any temporal period (planet orbit, rotation) can be translated into the audible range by octave doubling, and the resulting tone "corresponds to" / attunes to that cosmic cycle (Earth-year "OM" = 136.10 Hz).',
    verdicts: [
      { verdict: 'DEMOTE', scope: 'Keep as compositional grammar; discard every physiological claim' },
    ],
    flaws: [
      { id: 'R2.1', flaw: '1/T of a period presented as a "frequency with meaning" — nothing oscillates at 3.17×10⁻⁸ Hz at the source (unit laundering)', type: 'semantic', severity: 'critical' },
      { id: 'R2.2', flaw: 'Free integer n selected post hoc: n=29→34 gives 17.01…544.39 Hz; nothing in the formula selects n=32', type: 'mathematical (unconstrained DoF)', severity: 'high' },
      { id: 'R2.3', flaw: 'Sidereal vs solar day changes the "Earth day tone" by 4.7 cents (audible); the choice is never justified', type: 'logical (hidden convention)', severity: 'high' },
      { id: 'R2.4', flaw: 'Octave equivalence (psychoacoustic pitch chroma) treated as biological equivalence — a cell has no octave detector', type: 'logical (category error)', severity: 'critical' },
      { id: 'R2.5', flaw: 'No mechanism connecting planetary period to tissue response', type: 'empirical', severity: 'high' },
    ],
    steelman:
      'As a compositional system the Cosmic Octave is exactly self-consistent: the arithmetic is reproducible (computed values match Planetware\'s tables to 0.01 Hz), generates an elegant pitch set, and sits in a legitimate Pythagoras→Kepler→Kayser→Cousto lineage. Judged as music, it needs no defense.',
    keyNumbers: [
      { value: '136.10 Hz', label: 'Earth-year fold at n=32 ("OM") — one of ~7 equally legal choices' },
      { value: '4.7 cents', label: 'solar-vs-sidereal day ambiguity in the "Earth day tone" (audible)' },
      { value: '0 bits', label: 'predictive content about biology — any T yields some pitch, so nothing can falsify the mapping' },
    ],
    citations: [
      { label: 'Planetware (Cousto\'s organization), octave-translation tables', url: 'https://www.planetware.de/octave/' },
      { label: 'Industry concession: "limited empirical evidence… Most claims are anecdotal"', url: 'https://www.soundmedicineacademy.com/pages/sound-healing-blog/healing-with-the-planetary-frequencies' },
    ],
    linkedExperiments: ['X08', 'X09'],
  },
  {
    id: 'solfeggio',
    title: 'Solfeggio numerology — the "3-6-9 pattern"',
    source: 'R2',
    claim:
      'The set {174…963} Hz is special because each number\'s digits reduce to 3, 6, or 9 — "God\'s numbers" (Puleo/Horowitz lineage, 1970s–1999 Bible-verse numerology, not Gregorian chant).',
    verdicts: [
      { verdict: 'DISCARD', scope: 'As mathematics with physical import' },
      { verdict: 'DEMOTE', scope: 'To mnemonic / aesthetic device' },
    ],
    flaws: [
      { id: 'R2.6', flaw: 'The entire 3/6/9 pattern is one fact wearing a costume: every number in the set is divisible by 3 (digital root ≡ value mod 9)', type: 'mathematical', severity: 'high' },
      { id: 'R2.7', flaw: 'Base-10 dependence: in base 8/12/16 the pattern evaporates — a property of human finger-count, not of the wave', type: 'mathematical/logical', severity: 'critical' },
      { id: 'R2.8', flaw: 'Non-selective: 300 of 900 frequencies in 100–999 Hz (33.3%) reduce to 3/6/9 — a predicate true of one-third of all tones selects nothing', type: 'mathematical', severity: 'high' },
      { id: 'R2.9', flaw: 'Post-hoc selection with unconstrained researcher degrees of freedom; no falsifiable prediction ever made', type: 'logical (unfalsifiability)', severity: 'critical' },
      { id: 'R2.10', flaw: 'Hz itself is a seconds-based human unit — convention stacked on convention', type: 'semantic', severity: 'high' },
    ],
    steelman:
      'Digit reduction is a meditation scaffold — a rule system for choosing tones practitioners find meaningful. Divisibility by 3 gives mild musical coherence (ratios near simple fractions). As a mnemonic it functions.',
    keyNumbers: [
      { value: '33.3%', label: 'of all tones in 100–999 Hz share the "special" 3/6/9 property' },
      { value: 'base-10 only', label: 'the pattern exists solely because 10 ≡ 1 mod 9' },
    ],
    citations: [
      { label: 'Documented digit-reduction procedure (industry source)', url: 'https://www.soundmedicineacademy.com/pages/sound-healing-blog/solfeggio-frequencies' },
      { label: 'bsu_dim05 provenance: Puleo/Horowitz 1970s–1999' },
    ],
    linkedExperiments: [],
  },
  {
    id: 'fibonacci-chakra',
    title: 'Fibonacci frequencies & chakra–Hz mappings — the unconstrained fold',
    source: 'R2',
    claim:
      'Frequencies derived from Fibonacci numbers or φ "align with nature\'s harmonic patterns"; chakra systems assign specific Hz (396→root … 963→crown).',
    verdicts: [
      { verdict: 'DISCARD', scope: 'As derived healing frequencies' },
      { verdict: 'DEMOTE', scope: 'To compositional / ritual use' },
    ],
    flaws: [
      { id: 'R2.11', flaw: 'Fold map is surjective onto every octave band for every input — exactly one X·2ⁿ lands in each octave, so the procedure carries zero bits of information and can never fail', type: 'mathematical (unfalsifiability)', severity: 'critical' },
      { id: 'R2.12', flaw: 'Fold not injective: 1, 2 and 8 all fold to 128 Hz; F₁₃=34 folds to 136 Hz — the Cousto OM tone; independent numerology systems collide arbitrarily', type: 'mathematical', severity: 'high' },
      { id: 'R2.13', flaw: 'Chakra–Hz assignment has 7! = 5,040 unconstrained orderings; vendor tables mutually disagree; traditional doctrine contains no frequencies', type: 'logical', severity: 'critical' },
      { id: 'R2.14', flaw: 'Three stacked human conventions: Hz unit + base-10 + band choice', type: 'semantic', severity: 'high' },
      { id: 'R2.15', flaw: 'No transduction mechanism; no controlled therapeutic evidence', type: 'empirical', severity: 'high' },
    ],
    steelman:
      'Fibonacci/φ ratios generate genuinely consonant interval sets and pleasing asymmetry — a legitimate compositional resource. Chakra tones function as a meditation ritual grammar.',
    keyNumbers: [
      { value: '0 bits', label: 'information carried by "fold X into the audio range" — true of every number whatsoever' },
      { value: '5,040', label: 'unconstrained ways to sort 7 tones onto 7 chakras' },
      { value: 'π → 100.53 Hz', label: 'even π, e, √2 and 1/137.036 fold into "healing tones" by the same method' },
    ],
    citations: [
      { label: 'Chakra-Hz guides concede "lack of peer-reviewed scientific support"', url: 'https://soundr.xyz/guides/chakra-frequencies' },
    ],
    linkedExperiments: ['X08', 'X09'],
  },
  {
    id: 'schumann-biology',
    title: 'Schumann–biology coupling (Persinger group, Pobachenko, Mitsutake, Cherry, Wever)',
    source: 'R2',
    claim:
      'Human EEG/HRV/blood pressure co-vary with Schumann-band activity, implying entrainment/coupling between brain and the Earth–ionosphere cavity.',
    verdicts: [
      { verdict: 'OPEN', scope: 'The correlation question — genuine evidence gap' },
      { verdict: 'DEMOTE', scope: 'Every marketed therapeutic claim derived from it' },
    ],
    flaws: [
      { id: 'R2.16', flaw: 'No effective-n / surrogate correction on strongly autocorrelated series — Monte Carlo: at ρ=0.95, 65.6% of INDEPENDENT AR(1) pairs yield p<0.05 (81.6% at ρ=0.99); n_eff ≈ 51 for n=1000', type: 'statistical', severity: 'critical' },
      { id: 'R2.17', flaw: 'Headline real-time coherence shown on n=2–3 individuals within a 184-person sample, lasting ~300 ms, "in some but not all participants"', type: 'statistical (selective display)', severity: 'high' },
      { id: 'R2.18', flaw: 'No independent (non-Laurentian) replication located in 20 queries; single-group literature', type: 'empirical', severity: 'high' },
      { id: 'R2.19', flaw: 'Wever bunker used a 10 Hz field in total EMF shielding — marketed as "7.83 Hz heals"; retold versions fabricate precision not in the publications', type: 'empirical/scope', severity: 'high' },
      { id: 'R2.20', flaw: 'Correlation → entrainment → therapeutic benefit chain; both signals share diurnal/seasonal common drivers', type: 'logical (confounding)', severity: 'high' },
    ],
    steelman:
      'Weak ELF fields plausibly can couple to biology (magnetoreception exists in other taxa; Wever\'s desynchronization work is real chronobiology). Diurnally co-varying EEG–Schumann coherence would be interesting physics even as a pure common-cause artifact. A live, low-confidence corner of science.',
    keyNumbers: [
      { value: '65.6%', label: 'false-positive rate for independent AR(1) pairs at ρ=0.95 (Monte Carlo, n=1000)' },
      { value: 'n_eff ≈ 51', label: 'effective sample size at ρ=0.95 from nominal n=1000 (~20× inflation)' },
      { value: '2–3', label: 'individuals shown for the headline "real-time coherence" — inside an n=184 sample' },
    ],
    citations: [
      { label: 'Saroka, Vares & Persinger (2016), PLoS ONE 11(1):e0146595', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4718669/' },
      { label: 'Mitsutake et al. (2005), n=56 ambulatory BP', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2656447/' },
      { label: 'Yule 1926 / Granger & Newbold 1974 / Bartlett 1935 — spurious-correlation canon', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6869015/' },
    ],
    linkedExperiments: ['X14'],
  },
  {
    id: 'rife',
    title: '"Rife frequency" lists — mortal oscillatory rates',
    source: 'R2',
    claim:
      'Every pathogen/condition has a "mortal oscillatory rate"; canonical lists (Rife originals, CAFL) give the killing/healing Hz.',
    verdicts: [{ verdict: 'DISCARD', scope: 'Not a flawed equation but the absence of one — nothing to repair' }],
    flaws: [
      { id: 'R2.21', flaw: 'No derivation exists: asserted measurements from an unverifiable instrument, never independently replicated', type: 'logical/empirical', severity: 'critical' },
      { id: 'R2.22', flaw: 'Lists mutate between editions; "original" values conflict (BX "cancer virus" 21,275 Hz vs ~1.6 MHz RF elsewhere)', type: 'empirical', severity: 'critical' },
      { id: 'R2.23', flaw: 'Six-decade span (0.05 Hz–1.6 MHz) with no delivery-physics consistency; audio-band entries bear no specified relation to the RF originals', type: 'mathematical/empirical', severity: 'critical' },
      { id: 'R2.24', flaw: 'Resonance analogy lacks Q-factor, coupling constant, or energy budget; a bacterium is not a high-Q acoustic resonator at audio frequencies', type: 'mathematical', severity: 'high' },
      { id: 'R2.25', flaw: 'Regulatory history: AMA condemnation, FDA fraud classification, FTC injunctions', type: 'empirical', severity: 'critical' },
    ],
    steelman:
      'Honest version: "an oral tradition of anecdotal frequency–condition associations maintained by a practitioner community" — the CAFL\'s own provenance tags are "provenance, not proof". Even then the 1934 USC clinic story is unverifiable folklore; no records survive.',
    keyNumbers: [
      { value: '6 decades', label: 'frequency span of the lists — no single mechanism couples across it' },
      { value: '0', label: 'checkable claims with units, conditions and error bars anywhere in the corpus' },
    ],
    citations: [
      { label: 'CAFL provenance tags — "provenance, not proof"', url: 'https://myedenlife.com/rife-frequency-list/' },
      { label: 'Proponent source admitting lists contain "later additions or reinterpretations"', url: 'https://rifeglobal.com/library' },
    ],
    linkedExperiments: ['X14'],
  },
  {
    id: 'gateway-physics',
    title: 'CIA Gateway report physics (McDonnell 1983, CIA-RDP96-00788R001700210016-5)',
    source: 'R3',
    claim:
      'Hemi-Sync → hemispheric coherence → "consciousness as an energy system" → holographic-universe access (OBE, time/space transcendence); "a sound and rational basis in terms of physical science parameters."',
    verdicts: [
      { verdict: 'DISCARD', scope: 'As physics / philosophy of consciousness' },
      { verdict: 'DEMOTE', scope: 'To historical artifact — evidence of what 1980s Army intelligence was willing to entertain, not that any of it works' },
    ],
    flaws: [
      { id: 'R3.1', flaw: '"Energy"/"frequency"/"coherence"/"hologram" each used in ≥2 mutually incompatible senses without redefinition', type: 'semantic (equivocation)', severity: 'critical' },
      { id: 'R3.2', flaw: 'Laser/lamp metaphor converted into a coupling mechanism; no coupling constant, medium, or measurable quantity ever specified', type: 'logical (metaphor-as-mechanism)', severity: 'critical' },
      { id: 'R3.3', flaw: 'Unit laundering: µV EEG amplitude → "focused brain energy in watts" → "resonance with the universe" (scalp EEG ≈ nanowatts; brain metabolism ~20 W unchanged)', type: 'mathematical', severity: 'critical' },
      { id: 'R3.4', flaw: 'Planck LENGTH (10⁻³³ cm) treated as a SPEED; SHM turning points treated as quantum events', type: 'mathematical (dimensional incoherence)', severity: 'critical' },
      { id: 'R3.5', flaw: 'Internal contradiction: the mechanism demands consciousness frequency accelerate, while the practice decelerates EEG into theta/delta', type: 'logical (self-contradiction)', severity: 'high' },
      { id: 'R3.6', flaw: 'Zero experiments: the document contains not one measurement, trial, subject count, or controlled comparison', type: 'empirical', severity: 'high' },
      { id: 'R3.7', flaw: 'Misattribution: "the mind is a hologram that attunes to the universal hologram" is Ferguson/Talbot popularization — neither Bohm nor Pribram claimed it', type: 'logical (appeal to authority)', severity: 'high' },
    ],
    steelman:
      'Strongest defensible reading: monotonous binaural audio + guided relaxation + focused suggestion reliably produces deep relaxation, absorption and vivid imagery in susceptible subjects; the subjective experiences are real as experiences and may have training value for attention/stress. That is approximately what the evidence supports — and it is not what the report concludes.',
    keyNumbers: [
      { value: '0', label: 'experiments, measurements or study subjects in the 29-page document' },
      { value: '1983 / 2003', label: 'written / declassified — a staff assessment by one Army officer for his commanding officer' },
      { value: '[L] ≠ [L/T]', label: 'the "clicks out of time-space below 10⁻³³ cm/s" step confuses length with speed' },
    ],
    citations: [
      { label: 'McDonnell (1983), CIA-RDP96-00788R001700210016-5 (official PDF)', url: 'https://www.cia.gov/readingroom/docs/CIA-RDP96-00788R001700210016-5.pdf' },
      { label: 'Black Vault reproduction of the declassified intro memo', url: 'https://www.theblackvault.com/documentarchive/stargate-collection-analysis-and-assessment-of-gateway-process-9-june-1983/' },
    ],
    linkedExperiments: ['X05', 'X14'],
  },
  {
    id: 'bentov-75hz',
    title: 'Bentov\'s ~7.5 Hz body resonance → Schumann "entrainment with the planet"',
    source: 'R3',
    claim:
      'In deep relaxation the body becomes a tuned vibrational system transferring energy at 6.8–7.5 Hz into the earth\'s ionospheric cavity (resonant ≈7.83 Hz) — "the ideal medium for conveying a telepathic signal."',
    verdicts: [
      { verdict: 'REPAIRABLE', scope: 'Aortic pulse-wave reflection + ballistocardiography (mainstream hemodynamics, minus mystical overlay)' },
      { verdict: 'DISCARD', scope: '7 Hz body→planet coupling / telepathic carrier' },
    ],
    flaws: [
      { id: 'R3.8', flaw: '"Transfers energy in a range of Hertz" — Hz is a frequency, not an energy; dimensional incoherence', type: 'mathematical (dimensional)', severity: 'critical' },
      { id: 'R3.9', flaw: 'Mechanical body vibration treated as an ELF electromagnetic radiator — no transducer exists; the body is ~60+ dB too weak to inject a measurable signal into the cavity', type: 'category error', severity: 'critical' },
      { id: 'R3.10', flaw: 'Numerical coincidence as mechanism: 6.8–7.5 Hz vs 7.83 Hz is a 4–13% miss, and the Schumann fundamental wanders ±0.5 Hz diurnally', type: 'logical', severity: 'critical' },
      { id: 'R3.11', flaw: 'Folklore calls 7.83 Hz "identical to alpha" — alpha is 8–12 Hz; 7.83 is high theta', type: 'empirical (factual error)', severity: 'medium' },
      { id: 'R3.12', flaw: 'Resonance invoked to triple amplitude with "minimal energy" — verges on a free-energy claim; 1 Hz heartbeat is a mismatched driver for a 7 Hz resonance', type: 'mathematical (energy conservation)', severity: 'high' },
      { id: 'R3.13', flaw: 'Standing-wave interpretation of ballistocardiograph data never independently confirmed (single-source interpretation)', type: 'empirical', severity: 'high' },
    ],
    steelman:
      'Deep relaxation measurably changes HRV, pulse-wave reflection and whole-body micromotion; the arterial system has genuine resonances in the 3–7 Hz band; ~0.1 Hz HRV/respiration coherence states have documented autonomic benefits. All true — none of it touches the ionosphere or information transfer.',
    keyNumbers: [
      { value: '≥40–60 dB', label: 'predicted null margin of the decisive measurement never run in 45+ years (X14 / R3-E3)' },
      { value: '4–13%', label: 'frequency miss between Bentov\'s 6.8–7.5 Hz and the 7.83 Hz fundamental' },
      { value: '~38,000 km', label: 'Schumann wavelength ≈ Earth circumference — an EM cavity mode, not a mechanical one' },
    ],
    citations: [
      { label: 'Bentov, Stalking the Wild Pendulum (1977) — as quoted in McDonnell 1983 §8–§10' },
      { label: 'Secondary grading: "speculation resting on a numerical coincidence"', url: 'https://codexdivinum.com/worldviews/wild-pendulum/body-oscillator' },
    ],
    linkedExperiments: ['X14'],
  },
];

/** The six-pass review method blurb shown on the Critique Library screen. */
export const CRITIQUE_METHOD_NOTE =
  'Every entry passed the six-pass protocol (statement isolation → derivation audit → domain-of-validity → inference-chain stress test → alternative-explanation sweep → repair/falsify decision). Steelman first: the strongest version is stated before the verdict. The same protocol was applied to skeptics (R5) — overreach is flagged in both directions.';
