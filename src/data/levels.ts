/**
 * Deep Focus levels — discrete signposts inspired by the Monroe Institute's
 * Focus-level map. These are UI/navigation labels, NOT validated states of
 * consciousness; descriptions are kept neutral.
 */

export interface FocusLevel {
  level: number;
  name: string;
  /** Neutral, non-metaphysical description of the intended experience. */
  description: string;
}

/** The exact discrete level set (non-contiguous — do not treat as 1..N). */
export const FOCUS_LEVEL_NUMBERS: readonly number[] = [
  1, 10, 11, 12, 15, 18, 21, 22, 23, 24, 25, 26, 27, 34, 35, 42, 49,
];

export const FOCUS_LEVELS: readonly FocusLevel[] = [
  {
    level: 1,
    name: 'Physical Waking',
    description: 'Ordinary waking awareness; the baseline signpost from which all deeper levels are referenced.',
  },
  {
    level: 10,
    name: 'Mind Awake, Body Asleep',
    description: 'Deep physical relaxation with sustained mental alertness; the entry state of the classic Gateway program.',
  },
  {
    level: 11,
    name: 'Inner Listening',
    description: 'A light contemplative level between waking baseline and deep relaxation; framed as attentive inner awareness.',
  },
  {
    level: 12,
    name: 'Expanded Awareness',
    description: 'Relaxed state with broadened attention and heightened sensory imagery.',
  },
  {
    level: 15,
    name: 'No Time',
    description: 'Deeply quiet, internally focused state with a reduced sense of time passing.',
  },
  {
    level: 18,
    name: 'Awake & Expanded',
    description: 'A later-program signpost pairing full alertness with broadened awareness; treated here as an advanced integration level.',
  },
  {
    level: 21,
    name: 'The Bridge',
    description: 'The classic program\'s deepest standard level; framed by Monroe as the edge of ordinary time-space awareness.',
  },
  {
    level: 22,
    name: 'The Edge',
    description: 'First signpost of the Lifeline band; a label for the transition into the belief-system territories.',
  },
  {
    level: 23,
    name: 'Threshold Territory',
    description: 'Part of the later "belief system territories" band (Lifeline program); a signpost for very deep inward focus.',
  },
  {
    level: 24,
    name: 'Belief Territory I',
    description: 'Belief-system territory signpost from the Lifeline program; interpreted here as contemplative self-inquiry.',
  },
  {
    level: 25,
    name: 'Belief Territory II',
    description: 'Belief-system territory signpost; a label for exploring held assumptions in deep relaxation.',
  },
  {
    level: 26,
    name: 'Belief Territory III',
    description: 'Belief-system territory signpost; deepest of the Lifeline band.',
  },
  {
    level: 27,
    name: 'The Park',
    description: 'Monroe\'s "way-station" imagery; presented here as a metaphor for rest, integration, and reflection.',
  },
  {
    level: 34,
    name: 'The Gathering I',
    description: 'From the later Starlines mapping; a visualization signpost, no metaphysical claim implied.',
  },
  {
    level: 35,
    name: 'The Gathering II',
    description: 'Starlines signpost; continuation of the Focus 34 visualization theme.',
  },
  {
    level: 42,
    name: 'Cluster Consciousness',
    description: 'Starlines signpost ("I-There cluster" in Monroe\'s terms); used here as an advanced guided-imagery marker.',
  },
  {
    level: 49,
    name: 'Sea of Clusters',
    description: 'The furthest Starlines signpost; purely a narrative marker for long-form contemplative sessions.',
  },
];

/**
 * Provenance note shown wherever levels are displayed.
 *
 * The 1983 CIA report "Analysis and Assessment of Gateway Process"
 * (CIA-RDP96-00788R001700210016-5) was written by Lt. Col. Wayne M. McDonnell,
 * US Army Intelligence and Security Command (INSCOM), Fort Meade, dated
 * 9 June 1983, during MG Albert N. Stubblebine III's command. It is a
 * THEORETICAL, literature-based assessment of the Monroe Institute's Gateway
 * Experience (Hemi-Sync) for a commanding officer — it contains NO experiments
 * and no data. The Army did hold classified contracts with the Monroe Institute
 * (Emerson, Secret Warriors, 1988), and Army personnel attended Gateway Voyage.
 * The report was declassified under FOIA in September 2003 (the CIA copy
 * famously lacked page 25, which surfaced via the Monroe Institute's own
 * archives and Vice in April 2021). It entered CIA custody only because it was
 * swept into the STAR GATE FOIA release; the remote-viewing programs
 * (GRILL FLAME / CENTER LANE / SUN STREAK / STAR GATE) were a separate lineage
 * that the 1995 AIR evaluation judged never produced actionable intelligence.
 */
export const gatewayHistory: string =
  "In 1983, Lt. Col. Wayne M. McDonnell (US Army INSCOM, Fort Meade) wrote 'Analysis and Assessment of Gateway Process' " +
  '(CIA-RDP96-00788R001700210016-5), a 29-page theoretical assessment of the Monroe Institute\'s Gateway Experience for ' +
  'his commanding officer. The report reviews biomedical and physics models (hypnosis, biofeedback, Bentov, Bohm, Pribram) ' +
  'and concludes the technique is "plausible" — but it contains no experiments and no original data. It was declassified ' +
  'under FOIA in September 2003 (the CIA copy famously lacked page 25, which surfaced via the Monroe Institute\'s archives ' +
  'and Vice in April 2021). The Focus-level labels above come from the Monroe Institute\'s own published program map ' +
  '(Gateway Experience, Lifeline, and Starlines). They are cultural/historical signposts — not validated brain states, ' +
  'and the CIA never validated them.';
