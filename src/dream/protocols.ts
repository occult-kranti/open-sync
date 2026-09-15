/**
 * Sleep & Dream Lab — typed protocol data (Swarm W7).
 *
 * Content is distilled from research/sota_lucid_dreaming.md and governed by
 * skills/lucid-dreaming-evidence-grading/SKILL.md. Rules enforced here:
 *  - Language: techniques "support the practice of" lucid dreaming; nothing
 *    "induces" lucid dreams.
 *  - 40 Hz tACS, binaural-beat lucidity, supplements, and electrical/ultrasound
 *    stimulation are never shipped as capabilities (Tier 3, grade D).
 *  - OBE/"astral" material is cultural/historical + phenomenology education
 *    only, never a validated capability.
 *  - Every card carries grade + citation + safety class + safety notes.
 */

import type { GradeLetter } from '@/ui/theme';

export type DreamTier = 1 | 2 | 3;

/** Safety class per skills/audio-protocol-design (infant never applies here). */
export type DreamSafetyClass = 'adult' | 'experimental';

export interface DreamCitation {
  /** One-line verdict for the popover header. */
  verdict: string;
  /** Evidence summary. */
  summary: string;
  /** Source line (authors, journal, year, DOI/PMID/PMC). */
  source: string;
}

export interface DreamProtocol {
  id: string;
  name: string;
  tier: DreamTier;
  grade: GradeLetter;
  /** Dashed B−/A− badge variant. */
  gradeMinus?: boolean;
  /** Short evidence-honest tagline (claim-disciplined wording). */
  tagline: string;
  /** What the technique is and why it works (or honestly doesn't). */
  description: string;
  /** Ordered practice steps (empty for education/excluded cards). */
  steps: string[];
  /** Honest expected-outcome line, where the literature gives numbers. */
  expected?: string;
  citations: DreamCitation[];
  safetyClass: DreamSafetyClass;
  safetyNotes: string[];
  /** Tier 3 only: why we do not ship this as a capability. */
  whyWeDont?: string;
  /** True for the astral/cultural card: cultural-historical content only. */
  culturalOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Tier 1 — validated core
// ---------------------------------------------------------------------------

const MILD: DreamProtocol = {
  id: 'dream-mild',
  name: 'MILD — Mnemonic Induction of Lucid Dreams',
  tier: 1,
  grade: 'A',
  gradeMinus: true,
  tagline: 'The best-validated behavioral protocol; supports the practice of lucid dreaming.',
  description:
    'LaBerge’s prospective-memory technique, validated at scale by Aspy’s NALDIS/ILDIS trials. ' +
    'Done at bedtime it costs no sleep; combined with WBTB it is the strongest evidence-based ' +
    'practice in the field. No device or frequency is involved — the work is done by intention.',
  steps: [
    'Recall a recent dream — or this morning’s journal entry.',
    'Identify a dream sign: something impossible or odd in that dream.',
    'Visualize re-entering the dream and recognizing the sign as a dream.',
    'Repeat the intention: “Next time I’m dreaming, I will remember I’m dreaming.”',
    'Fall asleep holding that intention. Aim to drift off within ~5–10 minutes of practice.',
  ],
  expected:
    'Honest rates: ~17% per night at bedtime alone; ~46% per attempt and 54% within one week ' +
    'when combined with WBTB (Aspy 2017, motivated self-selected samples — real-world rates are lower).',
  citations: [
    {
      verdict: 'Strongest RCT-grade evidence in lucid-dream induction.',
      summary:
        'NALDIS (Aspy 2017, N=169): MILD+WBTB reached 46% of attempts. ILDIS (Aspy 2020, N=355) ' +
        'replicated the effect; Tan & Fan 2023 systematic review (19 studies) ranks MILD most effective.',
      source: 'Aspy et al. 2017 Consciousness & Cognition; Aspy 2020 Front Psychol 11:1746 (PMID 32765385); Tan & Fan 2023 J Sleep Res, DOI 10.1111/jsr.13786',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'Bedtime MILD is the low-cost default — it does not fragment sleep.',
    'Deliberate reality-blurring practice: if you have a psychosis-spectrum or dissociative condition, consult a clinician first.',
  ],
};

const WBTB: DreamProtocol = {
  id: 'dream-wbtb',
  name: 'WBTB — Wake Back To Bed',
  tier: 1,
  grade: 'B',
  tagline: 'A timing amplifier for MILD, not a standalone technique.',
  description:
    'Wake after 4.5–6 h of sleep — when REM periods are longest and densest — stay awake ' +
    '20–40 minutes with dream recall and intention-setting, then return to sleep with MILD. ' +
    'Roughly a 3× multiplier on MILD success, at the cost of a broken night.',
  steps: [
    'Set an alarm 4.5–6 h after sleep onset (the scheduler on this page computes it).',
    'Get out of bed for 20–40 min: review your dream journal, read about lucid dreaming, set intention.',
    'Avoid bright screens during the wake window.',
    'Return to bed and run the MILD script as you fall asleep.',
    'Cap usage at 2–3 nights per week — never before a high-stakes morning.',
  ],
  expected: '~46% of attempts when combined with MILD (Aspy 2017).',
  citations: [
    {
      verdict: 'Validated as an amplifier; deliberately fragments sleep — guardrails apply.',
      summary:
        'Timing per LaBerge protocols and Aspy 2017; the galantamine trial used the 4.5 h wake point. ' +
        'ILDIS 2020 found no adverse sleep-quality effect from successful induction, but waking protocols ' +
        'reduce total sleep when overused.',
      source: 'Aspy et al. 2017 Consciousness & Cognition; LaBerge, LaMarca & Baird 2018 PLOS ONE 13(8):e0201246',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'Sleep fragmentation is the primary real cost: cap 2–3 nights/week (enforced by the scheduler).',
    'Avoid if you have insomnia — scheduled waking can entrench conditioned arousal.',
    'WBTB raises the odds of sleep-paralysis episodes: read the sleep-paralysis card first.',
  ],
};

const TLR: DreamProtocol = {
  id: 'dream-tlr',
  name: 'TLR — Targeted Lucidity Reactivation',
  tier: 1,
  grade: 'A',
  gradeMinus: true,
  tagline: 'The best-validated audio protocol: a pre-sleep-paired cue replayed in REM.',
  description:
    'An ascending pure-tone cue (400/600/800 Hz, ~650 ms, ~40–45 dB at the ear) is paired before ' +
    'sleep with a critical-awareness exercise, then replayed during predicted REM (~6 h after sleep ' +
    'onset, or after the WBTB alarm). The cue→mindset association is the active ingredient — ' +
    'cues without pre-sleep pairing are much weaker. Supports the practice of lucid dreaming; ' +
    'it is reactivation, not suggestion.',
  steps: [
    'Pre-sleep pairing (15–25 min): play the cue at ~1-min intervals (up to ~15 presentations) while practicing critical self-awareness: “As you notice the signal, observe your thoughts, body, breathing — notice how this differs from ordinary waking experience.”',
    'Sleep normally. Cues replay from ~6 h after sleep onset (or after the WBTB alarm) with jittered 1–5 min gaps.',
    'Cue level stays ~40–45 dB SPL equivalent: loud enough to be incorporated, quiet enough not to wake.',
    'On noticing the cue in a dream, run a reality check and stabilize.',
  ],
  expected:
    '50% signal-verified lucid dreams in cued morning naps vs 17% uncued (Carr 2023, N=38); ' +
    'home smartphone TLR increased lucid dreaming vs baseline and vs blinded control nights (Mallett/Paller 2024).',
  citations: [
    {
      verdict: 'Best-validated audio-cue protocol; pairing is the active ingredient.',
      summary:
        'Carr, Konkoly, Mallett et al. 2023: 50% vs 17% signal-verified. Konkoly et al. 2021 used TLR ' +
        'across 4 labs; Mallett/Paller 2024 translated it to a smartphone app with a blinded control.',
      source: 'Carr et al. 2023 Psychology of Consciousness 10(4):413; Konkoly et al. 2021 Curr Biol, DOI 10.1016/j.cub.2021.01.026; Mallett/Paller 2024, PMC11542932',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'Cues stay ≤45 dB SPL equivalent; no cues in deep NREM (pointless and disruptive).',
    'Never market or use cues as subliminal reprogramming — the mechanism is cue-linked reactivation.',
    'Without EEG, REM targeting is the last-third-of-night heuristic, not closed-loop detection.',
  ],
};

const REALITY_TESTING: DreamProtocol = {
  id: 'dream-reality-testing',
  name: 'Reality Testing — daytime critical reflection',
  tier: 1,
  grade: 'B',
  tagline: 'A daytime habit that transfers into dreams; supports the practice of lucid dreaming.',
  description:
    'Genuinely question your state ≥5 times a day with a physical check. The habit, not the ' +
    'reminder, does the work: checks must be performed with real doubt, not on autopilot.',
  steps: [
    'Nose-pinch: close your nose and try to breathe through it. In a dream, you can.',
    'Text-reread: read a line of text, look away, read again. In dreams it mutates.',
    'Finger-count: count your fingers slowly, expecting the count to be wrong.',
    'Each time, ask honestly: “How do I know I’m awake right now?” Recall how you got here.',
  ],
  expected:
    'Modest effect alone (Stumbrys 2012 review); no additive benefit over MILD in ILDIS 2020 — ' +
    'use it as the habit layer under MILD/TLR, not as a replacement.',
  citations: [
    {
      verdict: 'Works as habit-transfer; weaker than MILD alone.',
      summary:
        'ILDIS 2020 (N=355): reality testing alone was weaker than MILD with no additive benefit. ' +
        'Peters et al. 2024 combined reality testing with audio cues.',
      source: 'Stumbrys et al. 2012 Consciousness & Cognition 21:1456, DOI 10.1016/j.concog.2012.07.003; Aspy 2020 Front Psychol 11:1746',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'If you have a dissociative or derealization-prone condition, repeated reality questioning may be uncomfortable — consult a clinician first.',
  ],
};

const JOURNAL: DreamProtocol = {
  id: 'dream-journal',
  name: 'Dream Journal — recall training',
  tier: 1,
  grade: 'B',
  tagline: 'The foundation layer: recall is the strongest predictor of induction success.',
  description:
    'Write the dream before anything else each morning — even one fragment. Dream recall ' +
    'correlates with lucid-dream frequency at r ≈ .57 and predicts success of every other ' +
    'technique on this page. The journal on this page stores locally in your browser only.',
  steps: [
    'On waking, stay still and let the dream come back before moving.',
    'Log whatever you have — a scene, an emotion, a single image.',
    'Tag recurring dream signs; they feed the MILD script.',
    'Flag lucid entries to track your base rate honestly.',
  ],
  expected: 'Recall ↔ lucid-dream frequency r ≈ .57 (Schredl & Erlacher 2011).',
  citations: [
    {
      verdict: 'Recall is the strongest predictor of induction success.',
      summary:
        'ILDIS 2020 identified dream recall as the key moderating variable. Aspy 2018 found vitamin ' +
        'B6 (240 mg pre-bed) increased dream-content recall ~64% — mentioned educationally; we do not dose supplements in-app.',
      source: 'Schredl & Erlacher 2011; Aspy et al. 2018 Percept Motor Skills; Aspy 2020 Front Psychol 11:1746',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: ['Entries never leave this device (localStorage only); export/delete freely.'],
};

const SLEEP_PARALYSIS: DreamProtocol = {
  id: 'dream-sleep-paralysis',
  name: 'Sleep Paralysis & False Awakenings — read first',
  tier: 1,
  grade: 'A',
  tagline: 'Mandatory pre-education for any deep-sleep protocol.',
  description:
    'WBTB, SSILD and WILD raise the odds of sleep-paralysis episodes and false awakenings. ' +
    'The experience is harmless, brief, and self-resolving: the “presence”, chest pressure and ' +
    'vibration sensations are REM-atonia intrusion hallucinations (the intruder/incubus/' +
    'vestibular-motor triad, Cheyne). Knowing this in advance converts the scariest side effect ' +
    'of border-state practice into a non-event.',
  steps: [
    'If it happens: recognize “this is sleep paralysis — REM atonia plus a waking brain.”',
    'Do not fight the paralysis; relax into it and focus on slow breathing.',
    'Expect it to end within seconds to a couple of minutes, on its own.',
    'Floating/vibration sensations at the sleep border are your TPJ self-model shifting — normal neurophysiology, not a presence.',
  ],
  citations: [
    {
      verdict: 'Mechanism is established neuroscience; expectancy-setting is protective.',
      summary:
        'Sleep paralysis = REM atonia intruding into wakefulness, with hallucination triad documented ' +
        'by Cheyne. OBE-like phenomenology at the sleep border matches the TPJ/vestibular model ' +
        '(Blanke 2002; Ehrsson 2007).',
      source: 'Cheyne, sleep-paralysis phenomenology literature; Blanke et al. 2002 Nature 419:269; Ehrsson 2007 Science 317:1048',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: ['Frequent distressing episodes: talk to a sleep clinician.'],
};

// ---------------------------------------------------------------------------
// Tier 2 — honest labels
// ---------------------------------------------------------------------------

const SSILD: DreamProtocol = {
  id: 'dream-ssild',
  name: 'SSILD — Senses Initiated Lucid Dream',
  tier: 2,
  grade: 'B',
  gradeMinus: true,
  tagline: 'A community technique that passed one controlled test; an option for non-visualizers.',
  description:
    'Cycle attention through sight, sound and body sensations after a WBTB-style wake. Born as a ' +
    '2011 forum post (CosmicIron), it reached 16.9% week-2 rate in ILDIS 2020 — comparable to ' +
    'MILD, with a single controlled study behind it. Supports the practice of lucid dreaming.',
  steps: [
    'After a brief wake (WBTB-style), lie still and cycle attention: eyes (behind closed lids) → hearing → body sensations.',
    'Spend a few seconds per sense per cycle; run several relaxed cycles.',
    'Let the cycles get lazy and drift — do not chase sensations.',
    'Fall asleep normally; run a reality check on any odd awakening.',
  ],
  expected: '16.9% in week 2 of ILDIS 2020 (N=355) — one controlled study; treat as promising, not proven.',
  citations: [
    {
      verdict: 'Single controlled study; community origin.',
      summary:
        'ILDIS 2020 found SSILD ≈ MILD at week 2 with a large effect size, but it remains one study ' +
        'of a 2011 forum technique.',
      source: 'Aspy 2020 Front Psychol 11:1746 (ILDIS, N=355); origin: CosmicIron 2011 (community post)',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'Raises sleep-paralysis odds — read the sleep-paralysis card first.',
    'Same weekly cap logic as WBTB when combined with a wake window.',
  ],
};

const INCUBATION: DreamProtocol = {
  id: 'dream-incubation',
  name: 'Dream Incubation — Dormio-style N1 audio',
  tier: 2,
  grade: 'B',
  tagline: 'Steers dream content at sleep onset; framed for creativity, not lucidity.',
  description:
    'A short thematic audio cue played at sleep onset (N1 hypnagogia) biases early dream content ' +
    'toward the theme; serial repetition with brief dream reports is Targeted Dream Incubation. ' +
    'Post-sleep creative performance on the incubated topic improved in controlled studies.',
  steps: [
    'Choose one concrete theme or problem before bed.',
    'Play a short thematic cue as you cross into N1 (fixed early-sleep timer is the no-sensor proxy).',
    'Optionally wake briefly for a spoken/written dream report, then repeat.',
  ],
  expected:
    'Steered dream content (Haar Horowitz 2020) and a significant post-sleep creativity composite gain (2023).',
  citations: [
    {
      verdict: 'Controlled evidence for content steering + creativity.',
      summary:
        'Dormio (MIT Media Lab, open-source): audio cues at sleep onset steered dream content; TDI on ' +
        'a topic boosted post-sleep creative performance.',
      source: 'Haar Horowitz et al. 2020 Consciousness & Cognition 83 (PMID 32480292); Haar Horowitz et al. 2023 Scientific Reports',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: ['Keep cues quiet (≤45 dB equivalent) and early in the night only.'],
};

const NIGHTMARE: DreamProtocol = {
  id: 'dream-nightmare-rescripting',
  name: 'Nightmare Support — IRT-informed rescripting',
  tier: 2,
  grade: 'B',
  gradeMinus: true,
  tagline: 'Rewrite the nightmare while awake; imagery rehearsal remains the standard of care.',
  description:
    'Pick a recurring nightmare, rewrite it with a non-threatening ending, and rehearse the new ' +
    'version in imagery while awake. Lucidity-based mastery is an optional add-on — the sense of ' +
    'mastery, not lucidity itself, drives the effect. Severe PTSD belongs with a clinician, not an app.',
  steps: [
    'Choose a recurring nightmare that is not your worst trauma memory.',
    'Write it down, then change the ending any way you like — it does not need to be realistic.',
    'Rehearse the rescripted version in waking imagery, a few minutes per day.',
    'Optionally set the MILD intention to recognize the dream sign if the nightmare recurs.',
  ],
  citations: [
    {
      verdict: 'Small RCTs, consistent direction; refer severe PTSD out.',
      summary:
        'Spoormaker & van den Bout 2006 (N=23) reduced nightmare frequency; Holzinger 2015/2020 tested ' +
        'lucid-dreaming therapy as a PTSD add-on. 2024 data: lucid dreams co-occurring with frequent ' +
        'nightmares associate with worse mood — the nightmares, not the lucidity, are the driver.',
      source: 'Spoormaker & van den Bout 2006 Psychother Psychosom 75:389 (PMID 17053341); Holzinger 2015/2020',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [
    'Nightmare disorder or severe PTSD: seek clinical care; this card is an adjunct, not treatment.',
    'Do not do exposure-style rescripting on acute trauma memories without professional support.',
  ],
};

const WILD: DreamProtocol = {
  id: 'dream-wild',
  name: 'WILD — Wake-Initiated Lucid Dream (advanced, optional)',
  tier: 2,
  grade: 'C',
  tagline: 'Direct entry from wakefulness; high failure rate, no large controlled trials.',
  description:
    'Carrying awareness directly across the sleep border into a dream. Case and lab literature only; ' +
    'the failure rate is high and the gateway runs straight through sleep-paralysis phenomenology. ' +
    'Offered as an optional advanced track, honestly graded.',
  steps: [
    'Attempt only after WBTB, when REM pressure is high.',
    'Keep the body perfectly still while watching hypnagogic imagery form.',
    'Read the sleep-paralysis card first — vibrations, presence and chest pressure are expected waypoints, not threats.',
  ],
  citations: [
    {
      verdict: 'Real but unreliable; case/lab literature only.',
      summary: 'No large controlled trials; documented mostly through LaBerge lab work and case series.',
      source: 'LaBerge lab literature; graded C per sota_lucid_dreaming.md §2 row 6',
    },
  ],
  safetyClass: 'experimental',
  safetyNotes: [
    'Sleep-paralysis pre-education is mandatory before attempting WILD.',
    'Not recommended with dissociative conditions or nightmare disorder.',
  ],
};

// ---------------------------------------------------------------------------
// Tier 3 — why we don't do this
// ---------------------------------------------------------------------------

const TACS_40HZ: DreamProtocol = {
  id: 'dream-tacs-40hz',
  name: '40 Hz tACS “lucidity” (Voss 2014)',
  tier: 3,
  grade: 'D',
  tagline: 'Null-replicated, invalid lucidity criterion — we do not ship stimulation claims.',
  description:
    'Voss et al. 2014 claimed 77% “lucidity” under 40 Hz frontal tACS. The lucidity criterion was ' +
    'invalid (elevated insight OR dissociation scores — dissociation is not a defining feature of ' +
    'lucid dreaming), there was no eye-signal verification, and the same-frequency replication ' +
    '(Blanchette-Carrière 2020) was null. The frontal-gamma EEG signature itself does not survive ' +
    'microsaccade artifact removal.',
  steps: [],
  whyWeDont:
    'Electrical stimulation is excluded from this app regardless of evidence; 40 Hz “gamma” ' +
    'lucidity claims are additionally contradicted by direct replication. Any product marketing ' +
    '40 Hz stimulation for lucidity is selling a null-replicated claim.',
  citations: [
    {
      verdict: 'Contradicted: null replication + invalid criterion.',
      summary:
        'Critique by LaBerge, LaMarca & Baird 2018; null replication Blanchette-Carrière et al. 2020; ' +
        'gamma-artifact discussion in Baird, Mota-Rolim & Dresler 2019.',
      source: 'Voss et al. 2014 Nat Neurosci 17:810 (DOI 10.1038/nn.3719); Blanchette-Carrière et al. 2020; Baird 2019 Neurosci Biobehav Rev (PMID 30880167)',
    },
  ],
  safetyClass: 'experimental',
  safetyNotes: ['Excluded regardless of evidence: no electrical or ultrasound stimulation features.'],
};

const BB_LUCIDITY: DreamProtocol = {
  id: 'dream-bb-lucidity',
  name: 'Binaural-beat lucid-dream tracks',
  tier: 3,
  grade: 'D',
  tagline: 'No evidence any beat frequency produces lucid dreams.',
  description:
    'Commercial apps sell “lucid dreaming binaural beats” subscriptions. No controlled study ' +
    'supports a beat-frequency route to lucidity. The validated audio route is TLR: a distinctive ' +
    'cue paired with a practiced mindset — association, not entrainment.',
  steps: [],
  whyWeDont:
    'Shipping a “lucidity beat” would be a Grade-D claim. Our audio engine is used where the ' +
    'evidence actually points: cue reactivation (TLR) and sleep-onset incubation.',
  citations: [
    {
      verdict: 'No evidence base; graded folklore-tier for lucidity claims.',
      summary: 'Graded D in sota_lucid_dreaming.md §7; contrast with TLR (Grade A−/B+).',
      source: 'sota_lucid_dreaming.md (Swarm S2 synthesis, 2026)',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: [],
};

const GALANTAMINE: DreamProtocol = {
  id: 'dream-galantamine',
  name: 'Galantamine & supplements',
  tier: 3,
  grade: 'D',
  tagline: 'A prescription drug — real efficacy, excluded from this app.',
  description:
    'Galantamine at WBTB genuinely works in trials (42% at 8 mg vs 14% placebo; LaBerge 2018, ' +
    'double-blind crossover, N=121) — but it is a prescription acetylcholinesterase inhibitor ' +
    'with nausea, bradycardia and interaction risks. Grade A for efficacy, Grade D for our product: ' +
    'we will never dose drugs. Mentioned for education only.',
  steps: [],
  whyWeDont:
    'Rx-only pharmacology with real side effects is outside what an audio app may touch. ' +
    'If you are curious, that conversation belongs with a physician.',
  citations: [
    {
      verdict: 'Efficacy A (OR 4.46 at 8 mg); product decision D.',
      summary: 'Dose-dependent response 14% placebo / 27% 4 mg / 42% 8 mg; Sparrow replication ~34–40%.',
      source: 'LaBerge, LaMarca & Baird 2018 PLOS ONE 13(8):e0201246',
    },
  ],
  safetyClass: 'experimental',
  safetyNotes: ['Excluded: no supplement or drug dosing in-app.'],
};

const ASTRAL: DreamProtocol = {
  id: 'dream-astral-cultural',
  name: '“Astral projection” — cultural & historical exhibit',
  tier: 3,
  grade: 'D',
  tagline: 'Rich cultural history; zero replicated evidence of veridical perception.',
  description:
    'Out-of-body experiences are real, reproducible experiences generated by the brain’s bodily-self ' +
    'model — right-TPJ stimulation evokes them on demand (Blanke 2002), and VR visuotactile conflict ' +
    'produces full-body OBE illusions in healthy volunteers (Ehrsson 2007; Lenggenhager 2007). What ' +
    'has never replicated is veridical perception: Tart’s 1968 “Miss Z” case was uncontrolled and ' +
    'inconclusive by Tart’s own account, Monroe’s lab sessions missed their targets, and ~50 years ' +
    'of parapsychology produced no blinded hit (AWARE shelf targets: none verified).',
  steps: [],
  whyWeDont:
    'The “astral plane”, “silver cord” and veridical soul-travel claims are folklore — presented ' +
    'here strictly as cultural and historical material (Tibetan dream yoga, the Egyptian ka, ' +
    'Theosophy, the Monroe era) alongside the validated neuroscience of why the experience feels real. ' +
    'This framing is also protective: it de-fangs sleep-paralysis fear, the main real hazard of ' +
    'border-state practice.',
  culturalOnly: true,
  citations: [
    {
      verdict: 'Mechanism Grade A (internally generated); veridical claims Grade D (folklore).',
      summary:
        'Every OBE component is inducible by brain stimulation or sensory manipulation; the parsimonious ' +
        'model needs no extracorporeal entity. No controlled replication of veridical OBE perception ' +
        'exists in ~50 years.',
      source: 'Blanke et al. 2002 Nature 419:269; Ehrsson 2007 Science 317:1048; Tart 1968 J Am Soc Psych Res (+ Alcock/Gardner/Blackmore critiques)',
    },
  ],
  safetyClass: 'adult',
  safetyNotes: ['Cultural/historical content only — never presented as a validated capability.'],
};

export const DREAM_PROTOCOLS: readonly DreamProtocol[] = [
  MILD,
  WBTB,
  TLR,
  REALITY_TESTING,
  JOURNAL,
  SLEEP_PARALYSIS,
  SSILD,
  INCUBATION,
  NIGHTMARE,
  WILD,
  TACS_40HZ,
  BB_LUCIDITY,
  GALANTAMINE,
  ASTRAL,
];

export function dreamProtocolsByTier(tier: DreamTier): DreamProtocol[] {
  return DREAM_PROTOCOLS.filter((p) => p.tier === tier);
}

// ---------------------------------------------------------------------------
// TLR cue canon (skills/lucid-dreaming-evidence-grading: cue parameter canon)
// ---------------------------------------------------------------------------

export const TLR_CUE = {
  /** Ascending pure-tone frequencies (Konkoly 2021). */
  freqsHz: [400, 600, 800] as const,
  /** Total cue length, ms. */
  durationMs: 650,
  /** Level discipline at the ear, dB SPL equivalent. */
  levelSplDb: { min: 40, max: 45 } as const,
  /** Pre-sleep pairing presentations (up to ~15). */
  pairingPresentations: 15,
  /** Home no-EEG replay start, minutes after sleep onset (Mallett 2024 assumption). */
  replayAfterOnsetMin: 360,
  /** Jittered inter-cue gap range during REM replay (Wolk 2024), seconds. */
  interCueGapSec: { min: 60, max: 300 } as const,
} as const;

// ---------------------------------------------------------------------------
// Reality-check canon (≥5 genuine checks/day)
// ---------------------------------------------------------------------------

export const REALITY_CHECK = {
  minChecksPerDay: 5,
  checks: [
    { id: 'nose-pinch', name: 'Nose pinch', how: 'Close your nose and try to breathe through it. In a dream, air passes.' },
    { id: 'text-reread', name: 'Text reread', how: 'Read text, look away, read again. In dreams it mutates.' },
    { id: 'finger-count', name: 'Finger count', how: 'Count your fingers slowly, expecting the count to be wrong.' },
  ] as const,
} as const;

/** Screening questions → scheduler warnings (skills: screen-and-advise). */
export interface ScreeningAnswers {
  insomnia: boolean;
  psychosisSpectrum: boolean;
  dissociative: boolean;
  nightmareDisorder: boolean;
}
