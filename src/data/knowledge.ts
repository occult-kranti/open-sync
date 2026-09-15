/**
 * Knowledge base — curated myth-bust / evidence / safety / history entries.
 *
 * Each entry pairs a popular CLAIM with the evidence-anchored VERDICT. Grades
 * match the frequency database:
 *   A — solid physics / multiple peer-reviewed replications
 *   B — some human evidence (small pilots / meta-analytic support)
 *   C — plausible mechanism, weak or indirect evidence
 *   D — folklore / numerology, no physiological evidence
 *
 * The grade applies to the CLAIM under examination, not to the entry itself.
 * Everything here is user-education copy: neutral wording, no therapeutic
 * promises, citations to the primary or best-available source.
 */

import type { Grade } from './frequencies';

export type KnowledgeCategory = 'myth-bust' | 'evidence' | 'safety' | 'history';

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  /** The popular claim or question being addressed. */
  claim: string;
  /** What the evidence actually supports. */
  verdict: string;
  /** Grade of the claim's supporting evidence (A-D). */
  grade: Grade;
  citations: string[];
}

export const KNOWLEDGE_BASE: readonly KnowledgeEntry[] = [
  // ------------------------------------------------------------- myth-bust
  {
    id: 'myth-solfeggio-medieval',
    title: '"Solfeggio frequencies are ancient/medieval"',
    category: 'myth-bust',
    claim:
      'The Solfeggio set (174/285/396/417/528/639/741/852/963 Hz) dates back to Guido d\'Arezzo, Gregorian chant, or "ancient" traditions.',
    verdict:
      'False. The Hz set was constructed in the mid-1970s by naturopath Joseph Puleo via digit-reduction numerology of Book of Numbers verses, and expanded by Leonard Horowitz (1999). Guido\'s 11th-century solmization syllables carried no frequency values; no musicological source documents these Hz values before 1974.',
    grade: 'D',
    citations: ['Evidence audit: musickanheal.com/528-hz-frequency (2026); Horowitz, Healing Codes for the Biological Apocalypse (1999)'],
  },
  {
    id: 'myth-528-dna-repair',
    title: '"528 Hz repairs DNA"',
    category: 'myth-bust',
    claim: '528 Hz ("MI") repairs DNA, based on published scientific research.',
    verdict:
      'Unsupported. The claim rests on Babayi & Riazi 2017, an in-vitro astrocyte study in a pay-to-publish journal that measured NO DNA endpoint, and it is unreplicated. A n=9 human pilot (Akimoto 2018) found an acute cortisol difference vs 440 Hz — a weak signal, not DNA repair.',
    grade: 'D',
    citations: ['Babayi & Riazi, J Addict Res Ther 8:335 (2017)', 'Akimoto et al., Health 10 (2018)'],
  },
  {
    id: 'myth-chakra-hz',
    title: '"Chakras have assigned frequencies"',
    category: 'myth-bust',
    claim: 'Each chakra resonates at a specific Hz value (396-963 Hz).',
    verdict:
      'Chakras are a genuine ~1st-millennium Tantric contemplative system, but no traditional text assigns frequencies. The Hz mapping is 1990s-2000s numerology grafted onto chakra doctrine. Fine as meditation soundscape; not physiology.',
    grade: 'D',
    citations: ['soundr.xyz chakra-frequency guide (2024): "claims lack peer-reviewed scientific support"'],
  },
  {
    id: 'myth-schumann-spiking',
    title: '"The Schumann resonance is spiking / rising"',
    category: 'myth-bust',
    claim: 'Earth\'s Schumann resonance is rising from 7.83 Hz toward higher "consciousness" frequencies.',
    verdict:
      'False. The fundamental has been continuously monitored at 7.8-7.9 Hz since 1960, drifting slightly with season, time of day, and lightning activity. Viral "spike" graphs show amplitude excursions and instrument artifacts, not a rising center frequency.',
    grade: 'D',
    citations: ['Balser & Wagner, Nature 188:638-641 (1960); continuous monitoring (Tomsk SOS, Hylaty ELF stations)'],
  },
  {
    id: 'myth-planetary-healing',
    title: '"Planetary octave tones heal"',
    category: 'myth-bust',
    claim: 'Tones derived from planetary orbital periods (OM 136.1 Hz etc.) carry the planet\'s healing vibration.',
    verdict:
      'The arithmetic is exactly reproducible (grade A math: Cousto 1978/1984, octave-doubling an orbital period), but an octave of an orbital period is a representational device — planets emit no sound in space, and there are no controlled therapeutic studies. Therapy claims: grade D.',
    grade: 'D',
    citations: ['Cousto, The Cosmic Octave (LifeRhythm); planetware.de/octave'],
  },
  {
    id: 'myth-mozart-effect',
    title: '"Mozart makes you smarter"',
    category: 'myth-bust',
    claim: 'Listening to Mozart (or "classical frequencies") raises IQ.',
    verdict:
      'The 1993 Rauscher study reported a brief (~10-15 min) spatial-task improvement in college students — never an IQ gain, never tested in children. Meta-analyses attribute the small effect to arousal/mood, not to Mozart specifically. The "Mozart effect" industry vastly outran the data.',
    grade: 'D',
    citations: ['Rauscher et al., Nature 365:611 (1993)', 'Pietschnig et al., Intelligence 38:314-323 (2010) meta-analysis'],
  },
  {
    id: 'myth-epsilon-lambda',
    title: '"Epsilon and lambda bands extend brainwave training"',
    category: 'myth-bust',
    claim: 'Special audio targets "epsilon" (<0.5 Hz) and "lambda" (100-200 Hz) brainwave bands.',
    verdict:
      '"Lambda" is a vendor marketing construct — not a recognized clinical EEG band. Infra-slow oscillations exist in research EEG, but no "epsilon band" entrainment literature exists and sub-0.5 Hz beats are below the practical range of binaural delivery.',
    grade: 'D',
    citations: ['Evidence audit 2026: no peer-reviewed lambda/epsilon entrainment literature'],
  },

  // -------------------------------------------------------------- evidence
  {
    id: 'evidence-entrainment-mixed',
    title: 'Does audio actually entrain brainwaves?',
    category: 'evidence',
    claim: 'Binaural beats reliably drive the brain into the targeted EEG band.',
    verdict:
      'Mixed. Ingendoh et al. (2023) reviewed 14 EEG studies: only 5 support the entrainment hypothesis; several null findings came from beats embedded in noise. Behavioral meta-analyses show modest pooled effects (g ≈ 0.4-0.45) with substantial heterogeneity — real but small and inconsistent.',
    grade: 'B',
    citations: ['Ingendoh et al., PLOS ONE (2023), PMC10198548', 'Garcia-Argibay et al., Psychol Res (2019), g = 0.45'],
  },
  {
    id: 'evidence-anxiety-strongest',
    title: 'Anxiety relief is the strongest use case',
    category: 'evidence',
    claim: 'Audio sessions can reduce situational anxiety.',
    verdict:
      'Best-supported claim in this space. Peri-procedural RCTs (Padmanabhan 2005: 26.3% STAI reduction; replicated 2016-2024) and meta-analyses show small-to-moderate acute anxiety reductions — shown WITHOUT demonstrated EEG entrainment, i.e. relaxation may be the active ingredient.',
    grade: 'B',
    citations: ['Padmanabhan et al., Anaesthesia 60:874-7 (2005), PMID 16115248', 'Garcia-Argibay et al. (2019)'],
  },
  {
    id: 'evidence-reverse-effect',
    title: 'Beats can impair performance',
    category: 'evidence',
    claim: 'Binaural beats are at worst neutral during cognitive work.',
    verdict:
      'Not safe to assume. The largest study to date (Klichowski et al. 2023, n=1000, home-use conditions) found 15 Hz beats WORSENED fluid-intelligence scores during listening. Avoid beats during high-stakes tasks; never while driving.',
    grade: 'B',
    citations: ['Klichowski et al., Scientific Reports (2023), n=1000'],
  },
  {
    id: 'evidence-40hz-unproven',
    title: '40 Hz gamma: robust in mice, unproven in humans',
    category: 'evidence',
    claim: '40 Hz audio/light stimulation treats Alzheimer\'s disease.',
    verdict:
      'Unproven in humans. Mouse data are robust (Iaccarino, Nature 2016; Martorell, Cell 2019), but the Cognito Therapeutics pivotal OVERTURE trial MISSED its primary endpoint (Hajós 2024), and failed replications exist (Soula 2023; Yang & Lai 2023). Disease claims are regulated medical-device territory — this app makes none.',
    grade: 'B',
    citations: [
      'Iaccarino et al., Nature 540:230-235 (2016)',
      'Martorell et al., Cell 177:256-271 (2019)',
      'Hajós et al. 2024 (OVERTURE primary-endpoint miss)',
    ],
  },
  {
    id: 'evidence-assr-40',
    title: 'The 40 Hz steady-state response is real',
    category: 'evidence',
    claim: 'The brain visibly follows a 40 Hz amplitude envelope.',
    verdict:
      'True — the 40 Hz auditory steady-state response (Galambos 1981) is a clinically used evoked response, the strongest evidence that auditory cortex tracks a 40 Hz envelope. It is a diagnostic phenomenon; following a rhythm is not the same as a therapeutic effect.',
    grade: 'A',
    citations: ['Galambos et al., 1981 (40 Hz ASSR)'],
  },
  {
    id: 'evidence-432-pilot',
    title: '432 Hz tuning: preliminary signal only',
    category: 'evidence',
    claim: 'A=432 Hz music is physiologically superior to 440 Hz.',
    verdict:
      'Preliminary. One double-blind crossover (n=33, Calamassi & Pomponi 2019, + 2020 corrigendum) found ~5 BPM lower heart rate with 432 Hz; a small dental-anxiety RCT (Aravena 2020, n=42) found modest benefits. Authors call for larger trials. "Cosmic tuning" and Nazi-conspiracy origin stories are unsupported.',
    grade: 'B',
    citations: ['Calamassi & Pomponi, Explore 15(4):283-290 (2019)', 'Aravena et al., Explore (2020)'],
  },
  {
    id: 'evidence-sleep-mixed',
    title: 'Sleep claims: small trials, mixed results',
    category: 'evidence',
    claim: 'Delta beats cure insomnia.',
    verdict:
      'No. Sleep studies are small and mixed (Bavafa 2023 n=31; Sharma & Dhaka n=15; Dabiri 2022). Closed-loop phase-locked stimulation works in labs (Ngo 2013) but requires EEG triggering. CBT-I remains first-line insomnia treatment; these sessions are relaxation aids.',
    grade: 'C',
    citations: ['Ngo et al., Neuron 78(3):545-553 (2013)', 'chamgap.com/en/verdicts/sleep synthesis (2022-2026)'],
  },

  // ---------------------------------------------------------------- safety
  {
    id: 'safety-infant-machines-loud',
    title: 'Infant sleep machines routinely exceed safe levels',
    category: 'safety',
    claim: 'Consumer infant sleep machines are safe at any volume/distance.',
    verdict:
      'All 14 infant sleep machines tested by Hugh et al. (Pediatrics 2014) exceeded 50 dBA at 30 cm at maximum volume; 3 exceeded 85 dBA. AAP-aligned guidance: keep playback <= 50 dBA at the infant\'s ear, place the device >= 2 m away, use a timer, never put it in the crib.',
    grade: 'A',
    citations: ['Hugh et al., Pediatrics (2014), PMID 24590753', 'AAP 2022 safe-sleep / 2023 noise-exposure policy statements'],
  },
  {
    id: 'safety-weekly-dose',
    title: 'Safe listening is a weekly dose, not a volume',
    category: 'safety',
    claim: 'Staying under a single volume number makes listening safe.',
    verdict:
      'WHO-ITU H.870 treats exposure as a weekly SOUND DOSE: 80 dBA x 40 h (adults) or 75 dBA x 40 h (children), with a 3 dB exchange rate — every +3 dB halves the allowed time. Our dose tracker implements exactly this equal-energy model.',
    grade: 'A',
    citations: ['WHO-ITU H.870 factsheet WHO-NMH-NVI-19.4 (2019)', 'NIOSH REL 85 dBA / 3 dB exchange'],
  },
  {
    id: 'safety-medication-precaution',
    title: 'Medication interactions: zero evidence, precautionary note',
    category: 'safety',
    claim: 'Audio entrainment interacts with SSRIs/MAOIs/stimulants/psychedelics.',
    verdict:
      'No peer-reviewed evidence exists for such interactions and no pharmacological mechanism is known (PubMed search: zero results). We word this strictly as a conservative precaution — "consult your clinician" — never as an established mechanism.',
    grade: 'C',
    citations: ['Evidence audit 2026: PubMed query for audio-entrainment x psychotropic interactions returned no results'],
  },
  {
    id: 'safety-seizure-exclusion',
    title: 'Seizure-disorder exclusion',
    category: 'safety',
    claim: 'Rhythmic audio is safe for people with epilepsy.',
    verdict:
      'Precautionary exclusion. Rhythmic sensory stimulation can trigger seizures in predisposed individuals; users with epilepsy or seizure history should not use this app and should consult their physician. This product is audio-only — no flashing visuals are used.',
    grade: 'C',
    citations: ['Photosensitive/pattern-sensitive epilepsy literature generalized to rhythmic stimulation (precautionary)'],
  },

  // --------------------------------------------------------------- history
  {
    id: 'history-cia-gateway',
    title: 'The CIA Gateway report, accurately',
    category: 'history',
    claim: 'The CIA proved the Gateway Experience works (declassified 2003).',
    verdict:
      'The 1983 report (CIA-RDP96-00788R001700210016-5) was written by Lt. Col. Wayne M. McDonnell (US Army INSCOM) as a THEORETICAL literature review for his commanding officer — it contains no experiments and no data, and entered CIA custody only via the STAR GATE FOIA sweep. The Army did hold classified Monroe Institute contracts, but "CIA validated it" is a myth.',
    grade: 'D',
    citations: ['CIA-RDP96-00788R001700210016-5 (declassified 2003)', 'Emerson, Secret Warriors (1988); Vice (April 2021, page 25)'],
  },
  {
    id: 'history-hemi-sync',
    title: 'Hemi-Sync and the Focus-level map',
    category: 'history',
    claim: 'Focus levels (10, 12, 15, 21...) are measured brain states.',
    verdict:
      'They are the Monroe Institute\'s program signposts — cultural/historical navigation labels from the Gateway Experience, Lifeline, and Starlines programs, not validated neurophysiological states. We keep the labels with neutral descriptions and say so openly.',
    grade: 'D',
    citations: ['Monroe Institute published program maps (Gateway Experience, Lifeline, Starlines)'],
  },
];

/** Lookup helper. */
export function getKnowledgeById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE_BASE.find((k) => k.id === id);
}

/** Entries in one category, preserving declaration order. */
export function knowledgeByCategory(category: KnowledgeCategory): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter((k) => k.category === category);
}
