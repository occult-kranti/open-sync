/**
 * src/docs/features.ts — SINGLE SOURCE OF TRUTH for feature documentation.
 *
 * Every feature, graph, and meter in Open Sync gets exactly one entry here.
 * Home renders its module cards from this data; Guide renders both registers
 * from this data; the vitest suite audits this data for coverage and claim
 * discipline. No hand-written divergent copy anywhere else.
 *
 * Claim discipline: effects "bias toward" states — never stronger verbs.
 * Banned strings in user-facing fields (enforced by test):
 *   'induces', 'synchronizes', 'attunes', 'CIA-validated', 'digital drug'.
 */

import type { GradeLetter } from '@/ui/theme';

export interface PlotExplainer {
  /** What the axes and controls mean. */
  axes: string;
  /** What a healthy/good reading looks like. */
  good: string;
  /** What a warning/bad reading looks like and what to do. */
  bad: string;
}

export interface FeatureEntry {
  /** Stable unique id. */
  id: string;
  /** Grouping module name (Guide groups on this). */
  module: string;
  /** App route where the feature lives. */
  route: string;
  name: string;
  /** Plain language: what it does + how to use it. 2–3 sentences, no jargon. */
  simple: string;
  /** Technical register: DSP / physics / stats. 3–5 sentences. */
  deep: string;
  /** Evidence grade where the feature makes or embodies a claim. */
  grade?: GradeLetter;
  /** What the grade applies to (grade scope discipline). */
  gradeScope?: string;
  /** Step-by-step usage. */
  howTo: string[];
  /** Present when the feature contains a plot/graph/scope widget. */
  plot?: PlotExplainer;
  /** 'in-verification' = module announced, build in progress by another team. */
  status?: 'live' | 'in-verification';
}

/** Every routed screen in the app (test coverage target). */
export const APP_SCREENS: readonly { route: string; label: string }[] = [
  { route: '/', label: 'Home' },
  { route: '/guide', label: 'Guide' },
  { route: '/studio', label: 'Studio' },
  { route: '/library', label: 'Library' },
  { route: '/presets', label: 'Presets' },
  { route: '/levels', label: 'Levels' },
  { route: '/analyzer', label: 'Analyzer' },
  { route: '/safety', label: 'Safety' },
  { route: '/knowledge', label: 'Knowledge' },
  { route: '/about', label: 'About' },
  { route: '/lab', label: 'Experiment Lab' },
  { route: '/critique', label: 'Critique Library' },
  { route: '/hypotheses', label: 'Hypothesis Tracker' },
  { route: '/programs', label: 'Programs Archive' },
  { route: '/cymatics', label: 'Cymatic Studio' },
  { route: '/dream', label: 'Sleep & Dream' },
  { route: '/replication', label: 'Replication Bay' },
  { route: '/quicklab', label: 'Quick Lab' },
  { route: '/theory', label: 'Theory Explorer' },
  { route: '/sonic-lab', label: 'Sonic Lab' },
  { route: '/sample-lab', label: 'Sample Lab' },
] as const;

const FEATURES_CORE: readonly FeatureEntry[] = [
  // ------------------------------------------------------------- Home / Guide
  {
    id: 'home-landing',
    module: 'Home',
    route: '/',
    name: 'Home landing',
    simple:
      'The front door of the instrument. It explains what Open Sync is, shows every module as a card, and offers a 60-second first session. Open any card to start working.',
    deep:
      'The hero is procedural: a canvas renders a teal/amber carrier pair and their difference-frequency envelope, mirroring the Studio signal path at display rate. Module cards are generated from this same features dataset, so card copy, grade chips, and mini-steps can never drift from the Guide. Grade summary chips report the weakest relevant grade in each module, not the most flattering one.',
    howTo: [
      'Read the two-sentence honesty statement under the hero.',
      'Pick a module card, or follow the 60-second quick-start strip.',
      'Open the Guide any time you meet a meter you do not understand.',
    ],
  },
  {
    id: 'guide-itself',
    module: 'Guide',
    route: '/guide',
    name: 'This guide',
    simple:
      'A plain-language and a technical explanation of every screen and meter in the app. Flip the Simple / Deep Technical switch to change registers. Search to jump straight to a feature.',
    deep:
      'The Guide renders the same FeatureEntry records consumed by Home and by the test suite — one data source, two registers. Every plot widget entry carries an axes explainer plus explicit good/bad pattern notes. User-facing strings in this dataset are continuously tested for banned overclaim phrases and for readable sentence length.',
    howTo: [
      'Type a feature name (e.g. "LUFS" or "panic") into search.',
      'Read the Simple card first; switch to Deep Technical for the math.',
      'Follow the how-to steps on the card inside the live module.',
    ],
  },

  // ------------------------------------------------------------------- Studio
  {
    id: 'engine-binaural',
    module: 'Studio',
    route: '/studio',
    name: 'Binaural engine',
    grade: 'C',
    gradeScope: 'Beat percept is Grade A psychoacoustics; the cortical-entrainment claim is Grade C.',
    simple:
      'Plays one tone in your left ear and a slightly different tone in your right ear, so you hear a slow pulsing beat. Headphones are required. Set the carrier and beat knobs, then press Start Session.',
    deep:
      'The engine synthesizes fL and fR = fL + Δf; the perceived beat equals |fL − fR| and is constructed centrally where the two auditory pathways converge in the superior olivary complex — it does not exist in the air. The percept is robust for carriers at or below ~1 kHz and beats at or below ~30 Hz (Oster 1973), which is why the UI warns outside that domain. The stronger claim that the beat biases cortical oscillations toward the beat rate is contradicted by 8 of 14 controlled EEG studies (Ingendoh 2023) and behavioral effects, where found, are modest (g ≈ 0.4). Phase-lock mode restarts both oscillators at shared zero-crossings so interaural phase stays exact instead of drifting.',
    howTo: [
      'Put on headphones — the effect needs one tone per ear.',
      'Choose a beat: 4–7 Hz for winding down, 10 Hz relaxed, 14–20 Hz alert.',
      'Keep the carrier between 100 and 400 Hz, set a comfortable volume, press Start Session.',
    ],
  },
  {
    id: 'engine-monaural',
    module: 'Studio',
    route: '/studio',
    name: 'Monaural engine',
    grade: 'B',
    gradeScope: 'Stronger physiological marker than binaural; behavioral benefit still modest.',
    simple:
      'Both tones are mixed together before they reach your ears, so the pulsing beat is physically present in the sound. It works on speakers, though headphones still help. Pick the Monaural tab in the Engine panel.',
    deep:
      'Monaural beats sum acoustically: cos(2πfLt) + cos(2πfRt) = 2·cos(πΔf·t)·cos(2πf̄t) — a carrier at the mean frequency amplitude-modulated at Δf. Because the modulation exists in the cochlear input, monaural beats evoke a stronger auditory steady-state response than binaural beats at matched settings (Orozco Perez 2020). No interaural comparison is needed, so speakers are sufficient. Entrainment-to-cognition claims inherit the same caution as binaural mode.',
    howTo: [
      'Select the MONAURAL tab in the Engine panel.',
      'Set carrier and beat exactly as you would for binaural.',
      'Use speakers or headphones; verify the beat on the Visualizer scope.',
    ],
  },
  {
    id: 'engine-isochronic',
    module: 'Studio',
    route: '/studio',
    name: 'Isochronic engine',
    grade: 'C',
    gradeScope: 'Strongest amplitude-modulation stimulus of the three modes; entrainment claim unproven.',
    simple:
      'A single tone that switches on and off at the beat rate, like a soft sonic metronome. It works on speakers and needs no headphones. Set the pulse speed with Beat and the on/off ratio with Gate.',
    deep:
      'An isochronic tone is a carrier multiplied by a periodic gate at the beat frequency; the Gate control sets duty cycle (5–95%) and the envelope is either raised-cosine (click-free) or hard (maximum modulation depth). Hard gating spreads sidebands at f ± n·Δf, while raised-cosine shaping confines the spectrum — watch both on the Analyzer spectrum. The stimulus carries true amplitude modulation, so it elicits the largest cortical AM response of the three modes. People with photosensitive or seizure conditions should avoid pulsed modes (see Safety advisories).',
    howTo: [
      'Select the ISOCHRONIC tab in the Engine panel.',
      'Set Beat to the pulse rate and Gate to about 50% for a balanced pulse.',
      'Prefer the COS gate shape; use HARD only if you want maximum modulation.',
    ],
  },
  {
    id: 'noise-mixer',
    module: 'Studio',
    route: '/studio',
    name: 'Noise mixer (6 colors)',
    grade: 'A',
    gradeScope: 'Signal generation correctness; offered as masking/comfort, no entrainment claim.',
    simple:
      'Six colors of background noise you can blend like faders on a mixing desk. Each color has a different bass-to-treble balance. They mask distractions and aid relaxation — they carry no brainwave claim.',
    deep:
      'Spectral slopes per octave: white 0 dB (flat energy per Hz), pink −3 dB (equal energy per octave), brown −6 dB (random-walk, bass-weighted), blue +3 dB, violet +6 dB (differentiated white), grey psychoacoustic equal-loudness shaped so each band sounds equally loud. The engine synthesizes each color by filtering white noise and sums them through independent −60…0 dB gain stages. Double-clicking a fader returns it to off. All noise layers pass through the master gain and the dose meter like everything else.',
    howTo: [
      'Raise one fader at a time; pink or brown are the usual starting points.',
      'Blend small amounts of white or blue if the mix feels too dull.',
      'Double-click a fader to mute that color.',
    ],
  },
  {
    id: 'layer-nature',
    module: 'Studio',
    route: '/studio',
    name: 'Nature layer',
    grade: 'B',
    gradeScope: 'Small human relaxation studies; framed as relaxation, not entrainment.',
    simple:
      'Adds rain, ocean, stream, fire, or thunder underneath your session. Small human studies find natural soundscapes relaxing. Toggle Nature in the Layers panel and set its level.',
    deep:
      'Each nature voice is procedurally synthesized from shaped, slowly modulated filtered noise — no loops and no samples — so spectra evolve without audible repetition. Relaxation evidence for natural soundscapes is real but small, which is why the layer wears a B badge and is framed as comfort rather than entrainment. The layer runs through the same master gain, limiter expectations, and dose accounting as the tonal engine.',
    howTo: [
      'Click the Nature LED in the Layers panel to enable it.',
      'Pick a scene (rain is the most spectrally neutral).',
      'Set the level low enough that the beat stays audible.',
    ],
  },
  {
    id: 'layer-bowls',
    module: 'Studio',
    route: '/studio',
    name: 'Singing bowls layer',
    grade: 'D',
    gradeScope: 'Traditional/cultural use documented; no controlled physiological evidence.',
    simple:
      'A singing-bowl-like drone you can add for texture. It is included because people enjoy the sound, not because it does anything proven. Healing claims about bowls are folklore, and the badge says so.',
    deep:
      'The bowl voice models a struck metal bowl as a sum of inharmonic partials with independent exponential decays, producing the slow internal beating of real bowls. LOCK detunes the base partial onto the session carrier so the texture stays consonant with the engine. Traditional meditative use is well documented; controlled physiological evidence is absent, so the layer ships with a D badge and is labeled texture. Nothing is hidden — the honesty is the feature.',
    howTo: [
      'Click the Singing Bowls LED in the Layers panel.',
      'Set a base frequency, or press LOCK to tie it to the carrier.',
      'Keep the level modest; the drone is a texture, not a floor.',
    ],
  },
  {
    id: 'phase-timeline',
    module: 'Studio',
    route: '/studio',
    name: 'Phase timeline / sequencer',
    simple:
      'Lets a session change its beat frequency over time — for example starting alert and slowing down. The timeline shows each segment with a moving playhead. Edit segments to build your own arc.',
    deep:
      'Phases form a piecewise schedule of target beat frequencies with linear ramps; beatAtTime() maps elapsed seconds to the active segment and its interpolated beat. The oscillator bank retunes continuously without discontinuity clicks, and the playhead shares the clock used by the dose accumulator. Presets load into exactly this structure, so anything a preset does can be inspected and edited here.',
    plot: {
      axes:
        'Horizontal axis is elapsed session time; each row or block is one phase with its beat frequency labeled. The playhead marker shows the current position in the schedule.',
      good:
        'Segments tile the timeline edge to edge with no gaps, and the playhead advances smoothly across ramp boundaries.',
      bad:
        'A gap, an overlap, or a zero-length segment means the schedule is malformed — edit the phase durations until the blocks tile cleanly.',
    },
    howTo: [
      'Open the Session Phases panel in the Studio.',
      'Add a segment, set its duration and target beat frequency.',
      'Press Start Session and watch the playhead cross the segments.',
    ],
  },
  {
    id: 'visualizer',
    module: 'Studio',
    route: '/studio',
    name: 'Visualizer (scope / spectrum / correlation)',
    simple:
      'A live oscilloscope for your session: the waveform, the pitches present, and how alike the two ears are. It is a measuring instrument, not a screensaver. When the engine is stopped it shows a NO SIGNAL watermark.',
    deep:
      'Three canvas views render from the engine analyser taps at 60 fps: the scope plots sample amplitude against time (teal = L, amber = R); the spectrum plots FFT magnitude in dB against Hz with 0.6 attack / 0.12 release smoothing and peak-hold dots decaying 20 dB per 3 s; the correlation meter shows normalized zero-lag L/R cross-correlation. A binaural pair intentionally reads near zero correlation — the ears differ by design. All scopes draw an instrument grid and a NO SIGNAL watermark when stopped.',
    plot: {
      axes:
        'Scope: x = time, y = amplitude. Spectrum: x = frequency (Hz), y = level (dB). Correlation: −1 (ears opposite) to +1 (ears identical).',
      good:
        'Binaural session: two clean spectrum peaks separated by the beat frequency, and correlation near zero.',
      bad:
        'Flat-topped waveforms or peaks glued to 0 dB mean clipping — lower the output level.',
    },
    howTo: [
      'Start a session, then switch the Visualizer between Scope, Spectrum, and Correlation.',
      'On Spectrum, confirm the two carrier peaks sit beat-Hz apart.',
      'If the scope waveform flattens at its peaks, reduce the output level.',
    ],
  },
  {
    id: 'wav-export',
    module: 'Studio',
    route: '/studio',
    name: 'WAV export',
    simple:
      'Renders your entire session — phases, noise, layers — into a standard WAV file you can keep or share. Press the WAV button in the Studio transport. The render runs offline at full quality.',
    deep:
      'exportWav() runs the same synthesis graph through an offline render at the session sample rate and encodes 16-bit PCM WAV (engine/wav.ts, unit-tested for header layout and round-trip fidelity). Offline rendering decouples export quality from real-time CPU load. The safety governor gain cap still applies to the render. The file carries no metadata claims — what you heard is exactly what is in the file.',
    howTo: [
      'Build or load the session you want in the Studio.',
      'Press the WAV button in the transport bar.',
      'Wait for the offline render, then save the downloaded file.',
    ],
  },
];

const FEATURES_MODULES: readonly FeatureEntry[] = [
  // ------------------------------------------------------------------ Library
  {
    id: 'frequency-library',
    module: 'Library',
    route: '/library',
    name: 'Frequency Library & grades',
    simple:
      'An audited catalog of famous frequencies — brainwave bands, Schumann resonances, Solfeggio, planetary tones, and more. Every row wears an evidence grade, and clicking the badge shows its citation. Filtered-out rows dim but never disappear.',
    deep:
      'Each entry stores a documented origin, a best-available citation, and one or two grades — planetary tones, for instance, grade A for the octave arithmetic and D for the healing claim. Schumann entries use the measured Earth-ionosphere cavity modes (7.83 Hz fundamental), not vendor numerology; Solfeggio Hz values trace to 1970s digit-reduction numerology rather than medieval practice, and are labeled as such. The rubric: A = replicated physics, B = small human studies, C = plausible but weak, D = folklore. Preview tones render through the same engine as the Studio.',
    howTo: [
      'Filter by category or grade; dimmed rows are still readable.',
      'Click any grade badge to open its citation popover.',
      'Use the preview button to hear a tone, or send it to the Studio.',
    ],
  },
  // ------------------------------------------------------------------ Presets
  {
    id: 'presets',
    module: 'Presets',
    route: '/presets',
    name: 'Protocol presets',
    simple:
      'Ready-made sessions for sleep, focus, relaxation, meditation, and experimentation that load straight into the Studio. Each card shows its evidence grade and duration. Press load, then Start Session.',
    deep:
      'A preset is a typed SessionSpec: mode, carrier, a phase schedule, noise and layer mix, plus an auto-computed grade equal to the weakest grade among its constituent claims — the grade cannot be edited upward. More than 24 protocols ship built in, and any Studio setup can be saved as a preset with the same auto-grading. Declared durations feed the Safety Center time cap and dose accounting.',
    howTo: [
      'Filter by goal (Sleep, Focus, Relax, Meditate, Experimental) or by grade.',
      'Open a card to read its phase schedule and evidence drawer.',
      'Load it, adjust in the Studio if you like, then Start Session.',
    ],
  },
  // ------------------------------------------------------------------- Levels
  {
    id: 'focus-levels',
    module: 'Levels',
    route: '/levels',
    name: 'Deep Focus levels (F1–F49)',
    grade: 'C',
    gradeScope: 'Historical construct with plausible relaxation use; consciousness claims unproven.',
    simple:
      'A ladder of "deep focus" levels inspired by the 1983 Gateway program, from F1 to F49. It is presented as history you can try, not as a proven map of consciousness. Tap a level to load its settings and read its honest description.',
    deep:
      'Each level maps a discrete carrier/beat configuration onto a Gateway Focus label; the depth gauge sweeps teal to amber with depth. Levels are documentation of a specific historical program, not measured brain states — no continuous 1–49 scale is claimed beyond what the sources describe. Higher levels carry inline psychiatric caution where relaxation intensity warrants it. Loading a level just configures the Studio engine; the same C-grade entrainment caveat applies.',
    howTo: [
      'Pick a level on the ladder — F10 and F12 are the documented starting points.',
      'Read the level card and its grade before loading.',
      'Load into Studio and keep early sessions under 30 minutes.',
    ],
  },
  {
    id: 'gateway-exhibit',
    module: 'Levels',
    route: '/levels',
    name: 'CIA Gateway report exhibit',
    simple:
      'A faithful exhibit of the 1983 Gateway report: what the document says, who wrote it, and what it does not show. Government interest is history, not proof. The banner says it plainly: documented does not mean validated.',
    deep:
      'The exhibit anchors the 1983 CIA Gateway Process report (CIA-RDP96-00788) in context: an Army assessment of the Monroe Institute program, built on a biomedical model of its era, declassified decades later. Every claim quoted from the report is graded with the same A–D rubric as commercial folklore. The DOCUMENTED ≠ VALIDATED framing is mandatory here and across the Programs Archive. Treat the document as a primary historical source, not as evidence.',
    howTo: [
      'Open the Levels module and scroll to the exhibit panel.',
      'Read the framing banner first, then the document summary.',
      'Chase any claim into the Knowledge Base for its graded verdict.',
    ],
  },
  // ----------------------------------------------------------------- Analyzer
  {
    id: 'lufs-meter',
    module: 'Analyzer',
    route: '/analyzer',
    name: 'LUFS loudness meter',
    grade: 'A',
    gradeScope: 'ITU-R BS.1770 standardized measurement, unit-tested implementation.',
    simple:
      'Tells you how loud your audio actually sounds to human ears, in LUFS, rather than how tall the waveform looks. Watch Integrated for the whole measurement and Momentary for right now. Keep sessions quiet and comfortable.',
    deep:
      'Loudness follows ITU-R BS.1770: K-weighting (a high-shelf pre-filter plus an RLB high-pass), then mean-square energy, converted to LUFS. Gating removes a −70 LUFS absolute floor and a −10 LU relative gate so silence cannot bias the Integrated value. Momentary uses a 400 ms window and Short-term 3 s. K-weighted loudness approximates perception far better than peak level, which is why the dose meter consumes loudness rather than raw amplitude.',
    plot: {
      axes: 'Readouts: Integrated (whole measurement), Short-term (3 s), Momentary (400 ms), all in LUFS. History trace: x = time, y = LUFS.',
      good: 'A stable Integrated well below 0 LUFS; for sleep content, quieter is the design goal.',
      bad: 'Momentary pinned near 0 LUFS or a steadily climbing Integrated at high level — turn the output down.',
    },
    howTo: [
      'Open the Analyzer and choose a source: engine, file, or mic.',
      'Start audio and let Integrated settle for a few seconds.',
      'Compare against your comfort target; lower the Studio output if high.',
    ],
  },
  {
    id: 'true-peak',
    module: 'Analyzer',
    route: '/analyzer',
    name: 'True peak & clip detection',
    grade: 'A',
    gradeScope: 'BS.1770 inter-sample peak method.',
    simple:
      'Catches brief overloads that normal meters miss, including peaks hiding between digital samples. If the clip light turns red, lower the output level. Even one red flash counts.',
    deep:
      'True peak is estimated by 4× oversampling the signal per BS.1770 Annex and comparing the maximum absolute value against 0 dBFS. A waveform can pass a sample-peak meter and still clip a DAC reconstruction filter, which is what inter-sample detection catches. The clip indicator latches, so a single transient cannot flicker past unnoticed. Sustained true peaks at or above the ceiling mean real distortion downstream.',
    plot: {
      axes: 'Readout in dBTP (decibels relative to full scale, true peak). 0 dBTP is the digital ceiling.',
      good: 'Peaks holding comfortably below −1 dBTP with a dark clip LED.',
      bad: 'Any latched red clip LED, or peaks touching 0 dBTP — reduce output level.',
    },
    howTo: [
      'Watch the true-peak readout while your session plays.',
      'If the clip LED latches, lower the Studio output and reset the latch.',
      'Re-check after every level change.',
    ],
  },
  {
    id: 'thd-sinad',
    module: 'Analyzer',
    route: '/analyzer',
    name: 'THD / SINAD utilities',
    grade: 'A',
    gradeScope: 'Standard audio metrology, validated against known-clean generated tones.',
    simple:
      'Measures how pure a tone is — how much unwanted harmonic grit the signal contains. Lower THD means a cleaner tone. Pair it with the built-in calibration tones to check your own playback chain.',
    deep:
      'THD is the ratio of harmonic power to the fundamental — the root-sum-square of harmonics n ≥ 2 divided by the fundamental — reported in percent and dB. THD+N includes noise and everything else in the residual; its reciprocal is SINAD. The Analyzer synthesizes a known-clean reference tone, notches the fundamental, and integrates the residual above the FFT noise floor. It is the honest way to verify that headphones, dongles, or the export path add no audible distortion.',
    plot: {
      axes: 'Readouts: THD (% and dB), THD+N, SINAD (dB). The spectrum view shows the fundamental and any harmonic peaks above the floor.',
      good: 'Sine source: THD below 0.1%, harmonic peaks barely above the noise floor.',
      bad: 'Comb-like harmonic peaks rising well above the floor, or THD above 1% — something in the chain is distorting.',
    },
    howTo: [
      'Enable a calibration tone in the Analyzer.',
      'Run the THD measurement and note THD and SINAD.',
      'Repeat through your full playback chain to audit your own hardware.',
    ],
  },
  {
    id: 'spectrum-analyzer',
    module: 'Analyzer',
    route: '/analyzer',
    name: 'Spectrum analyzer',
    grade: 'A',
    gradeScope: 'Standard FFT measurement; window and smoothing constants shown in the Guide.',
    simple:
      'Shows which frequencies are present in your sound and how strong each one is, as a moving graph. Use it to confirm your session really contains the tones the Studio says it is generating. You can also load a WAV file or use the microphone.',
    deep:
      'Magnitude spectra come from a radix-2 FFT over windowed frames, plotted in dB against Hz with frame smoothing (attack 0.6, release 0.12 per frame) and peak-hold dots. Sources are the live engine, an uploaded file, or the measurement tone generator; everything is computed locally. Window choice trades time resolution against frequency resolution, and the visible floor is the analysis noise floor, not true silence. Treat it as the source of truth for "what is actually playing."',
    plot: {
      axes: 'x = frequency (Hz), y = magnitude (dB). Peak-hold dots mark recent maxima and decay over about 3 s.',
      good: 'Binaural session: two narrow peaks separated by exactly the beat frequency, low floor elsewhere.',
      bad: 'A raised forest of harmonics or a floor sitting near 0 dB indicates clipping or distortion — lower levels.',
    },
    howTo: [
      'Pick a source chip: ENGINE, FILE, or a calibration tone.',
      'Start audio and read peak positions against the Hz scale.',
      'Use Freeze to hold a frame for close inspection.',
    ],
  },
  // ------------------------------------------------------------------- Safety
  {
    id: 'dose-gauge',
    module: 'Safety',
    route: '/safety',
    name: 'Sound dose gauge (H.870)',
    grade: 'A',
    gradeScope: 'WHO-ITU H.870 method; dBA conversion from digital level is a stated approximation.',
    simple:
      'Tracks how much sound your ears have absorbed, like a fuel gauge for listening. It fills faster when you listen louder. Green is fine, amber means ease off, red means stop for today.',
    deep:
      'Dose follows WHO-ITU H.870 safe-listening practice: 80 dBA for 40 hours per 7 days for adults (75 dBA for children and sensitive listeners), accumulated with the 3 dB equal-energy exchange rate — every +3 dB doubles the dose rate and halves the allowed time. Digital dBFS is mapped to an estimated dBA with a fixed calibration offset, an approximation that cannot replace measuring your own headphones. The default 90-minute session cap is conservative relative to the NIOSH 85 dBA / 8 h criterion.',
    plot: {
      axes: 'Radial gauge: 0–100% of the weekly reference dose; the status bar mirrors the same percentage live.',
      good: 'Green zone with slow growth during moderate sessions.',
      bad: 'Amber means shorten or quieten sessions; red means the weekly budget is spent — stop.',
    },
    howTo: [
      'Open the Safety Center and read the dose gauge before long sessions.',
      'Prefer lower levels: at −3 dB the same listening time costs half the dose.',
      'Respect red: give your ears quiet days to reset the weekly budget.',
    ],
  },
  {
    id: 'panic-button',
    module: 'Safety',
    route: '/safety',
    name: 'Panic button',
    simple:
      'One button — or the P key — that instantly silences everything, from anywhere in the app. Use it the moment sound feels wrong or overwhelming. Shift+P rehearses the flow without a real session.',
    deep:
      'Panic executes an immediate engine mute (0 ms target), dims the screen, and requires a deliberate resume so an accidental keypress cannot restart audio. It is bound globally in the app shell and duplicated in the rail and status bar, with no fades and no network calls in the path. Rehearsal mode (Shift+P) walks the identical flow without audio so the motor memory exists before it is needed. Safety UX is treated as a feature, not a settings page.',
    howTo: [
      'Press P, or click the red PANIC control, any time audio must stop now.',
      'Read the overlay, then resume deliberately or leave the session stopped.',
      'Run Shift+P once to rehearse before your first real session.',
    ],
  },
  {
    id: 'infant-mode',
    module: 'Safety',
    route: '/safety',
    name: 'Infant mode',
    grade: 'B',
    gradeScope: 'Limits anchored to AAP guidance and measured NICU levels; pediatric evidence is thin by nature.',
    simple:
      'A locked-down mode for use around babies: very quiet, bass-only sound with hard limits you cannot override. Turn it on in the Safety Center. The status bar shows INFANT whenever it is active.',
    deep:
      'The safety governor enforces a mandatory lowpass at or below 1000 Hz (approximating intrauterine acoustics) and a gain path targeting no more than 50 dBA at the crib, aligned with AAP guidance and measured NICU Leq recommendations. Consumer white-noise machines have been measured exceeding occupational limits at crib distance (Hugh 2014), which is why these limits are hard constraints, not advisories. Infant mode also restricts the preset list to the gentlest entries. It is a set of guardrails, not a claim of benefit.',
    howTo: [
      'Open the Safety Center and enable Infant Mode.',
      'Place the speaker away from the crib and keep sessions short.',
      'Watch for the INFANT chip in the status bar to confirm it is active.',
    ],
  },
  // ---------------------------------------------------------------- Knowledge
  {
    id: 'knowledge-archive',
    module: 'Knowledge',
    route: '/knowledge',
    name: 'Knowledge Base (1839–2026)',
    simple:
      'A searchable archive of everything we know: papers, patents, government files, and myth-busts, from 1839 to today. Every card shows its verdict and grade up front. Government documents always carry DOCUMENTED ≠ VALIDATED.',
    deep:
      'Entries are typed records — myth-bust, evidence, safety, history — each with a graded citation, and the timeline view scrubs 1839 to 2026 with era markers. The archive is the citation target for every badge popover in the app, so any claim can be chased to a source in one click. Debunking claims are graded with the same rubric as the claims they attack. If a grade here is wrong, the receipt to prove it is part of the entry.',
    howTo: [
      'Search a term (e.g. "Oster" or "Schumann") or scrub the timeline.',
      'Filter by category or grade to compare evidence tiers.',
      'Open a card to read the verdict, summary, and citation.',
    ],
  },
  // -------------------------------------------------------------------- About
  {
    id: 'honesty-manifesto',
    module: 'About',
    route: '/about',
    name: 'Honesty manifesto & method',
    simple:
      'The honest-claims policy in the open: we never show a naked number, we dim rather than delete, and we grade our own safety claims. It is the contract every module is held to. Read it in full on the About page.',
    deep:
      'The policy is enforced structurally, not rhetorically: preset grades compute from their weakest constituent claim, filtered Library rows dim instead of vanishing, and government programs carry mandatory DOCUMENTED ≠ VALIDATED framing. The About module hosts the A–D rubric, the expired-patent ledger, and the replication story. Claim discipline is mechanical as well — user-facing documentation strings are tested in CI against a list of overclaim phrases.',
    howTo: [
      'Open About and read the five policy commitments.',
      'Check the rubric table to learn what each grade requires.',
      'Use any badge popover to audit us against our own policy.',
    ],
  },
  {
    id: 'evidence-badges',
    module: 'About',
    route: '/about',
    name: 'Evidence badges (A–D)',
    simple:
      'The little A/B/C/D chips that travel with every claim. A means replicated science, B means small human studies, C means plausible but weak, D means folklore. Click any badge to see its evidence and citation.',
    deep:
      'The badge is a first-class component with a fixed rubric: A = solid physics or multiple independent replications, B = direct human evidence with small samples, C = plausible mechanism with inconsistent evidence, D = numerology or folklore. Dual grades split math from therapy claims (planetary tones: A/D) and the dashed B− variant marks borderline pilots such as 432 Hz. Every badge opens a citation popover one click from the Knowledge Base — the receipt is part of the component, so a claim without a badge is a bug.',
    howTo: [
      'Find any claim in the app; its badge sits beside it.',
      'Click the badge to open the citation popover.',
      'Follow the popover link into the Knowledge Base for the full entry.',
    ],
  },
  // ----------------------------------------------------------------- Research
  {
    id: 'experiment-registry',
    module: 'Experiment Lab',
    route: '/lab',
    name: 'Experiment registry (X01–X14)',
    simple:
      'Fourteen pre-registered experiments we intend to run, with the analysis plan written before any data exists. Nothing here is a result yet. Each card states exactly how a null outcome will be handled.',
    deep:
      'Every protocol card carries its grade, its linked hypothesis, and a null-handling statement; the honesty bar keeps all metrics in n-and-confidence-interval placeholder form because no data has been collected. Pre-registration means success criteria cannot be rewritten after results arrive. The registry is the antidote to the file-drawer effect that afflicts vendor entrainment research. Cards are readable now; execution status updates as runs complete.',
    howTo: [
      'Open the Experiment Lab and browse the X01–X14 cards.',
      'Read a card’s hypothesis, protocol, and null-handling statement.',
      'Check the honesty bar: placeholder metrics mean no data yet.',
    ],
  },
  {
    id: 'critique-library',
    module: 'Critique Library',
    route: '/critique',
    name: 'Critique Library (13 theories)',
    simple:
      'Thirteen popular theories taken apart with a fixed flaw checklist, each given its strongest possible defense first. Every entry ends in a verdict and the key numbers. Even skeptics get audited when they overclaim.',
    deep:
      'Each critique runs a six-pass flaw taxonomy — mechanism, math, history, evidence, overreach, steelman — so every theory faces identical scrutiny, and the fifth review applies the same instrument to the debunkers. Verdict chips, flaw tables, and citations are structured data, not prose. Grading only the claims you dislike is marketing; grading all of them with one rubric is method. Entries link back into the Knowledge Base for primary sources.',
    howTo: [
      'Open the Critique Library and pick a theory.',
      'Read the steelman first, then the flaw table, then the verdict.',
      'Follow citations into the Knowledge Base to check the work.',
    ],
  },
  {
    id: 'hypothesis-tracker',
    module: 'Hypothesis Tracker',
    route: '/hypotheses',
    name: 'Hypothesis Tracker (11 claims)',
    simple:
      'A public scoreboard of eleven claims we are tracking. Each one lists exactly what evidence would raise its grade and what would lower it. Grades can move in both directions, in public.',
    deep:
      'Every tracked hypothesis stores its current grade, a grade-change audit trail, and pre-written promotion and demotion criteria, so belief updates are procedural rather than vibes. Entries start pre-registered and awaiting data, and each claim links to the experiment that could move it. The rubric is the same A–D scale the Library uses, turned on ourselves. Watching a grade drop is a feature of the system, not a failure of it.',
    plot: {
      axes:
        'The grade-audit timeline runs left to right by date; each step mark is one grade event on the A–D scale, and hovering it shows the evidence that triggered the change.',
      good:
        'Every step links to a cited piece of evidence and matches the pre-written promotion or demotion criteria for that claim.',
      bad:
        'A step with no linked citation or no matching criterion is a process bug — report it rather than trusting the new grade.',
    },
    howTo: [
      'Open the Hypothesis Tracker and pick a claim.',
      'Read the current grade and the promotion and demotion criteria.',
      'Check the audit trail to see whether the grade has ever moved.',
    ],
  },
  {
    id: 'programs-archive',
    module: 'Programs Archive',
    route: '/programs',
    name: 'Programs Archive (42 programs)',
    simple:
      'Forty-two real government programs that touched entrainment, auditory stimulation, or so-called psychotronics. Each is graded twice: is the program documented, and is the claimed effect validated. Funding is history, not proof.',
    deep:
      'Programs carry two independent grading axes — DOCUMENTED PROGRAM (archive-grade evidence that the effort existed) and VALIDATED EFFECT (whether the claimed phenomenon survived controlled testing). Most programs score high on the first axis and D on the second, which is the central lesson of the archive. Official negative findings are documented alongside the programs rather than omitted. The mandatory banner frames everything as history and funding records, never endorsement.',
    howTo: [
      'Open the Programs Archive and read the framing banner first.',
      'Compare the two grades on any card — documentation versus validation.',
      'Use era and agency filters to trace how the programs cluster.',
    ],
  },
  // ------------------------------------------------- Incoming (verification)
  {
    id: 'cymatic-patterns',
    module: 'Cymatic Studio',
    route: '/cymatics',
    name: 'Chladni cymatic patterns',
    status: 'in-verification',
    grade: 'A',
    gradeScope: 'Grade A plate physics; any therapeutic reading of the geometry is Grade D and is not made here.',
    simple:
      'Turns sound into the standing-wave patterns you would see if sand sat on a vibrating plate. Different frequencies draw different figures, from simple lines to intricate webs. This module is in verification and opens soon.',
    deep:
      'The renderer evaluates the classic square-plate modal superposition cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy), or the generalized sine-mix family, and draws nodal lines as the zero-amplitude level set — the curves where sand physically collects. Mode integers n and m and the mix coefficients are driven from the audio, so frequency maps to pattern complexity. The model is the idealized center-driven free plate of the classic Chladni demonstration, not a claim that sound heals through geometry. Pattern physics is replicated textbook material; therapeutic interpretations are not made anywhere in the module.',
    plot: {
      axes: 'The plate view is spatial: x and y are position on the plate; brightness is vibration amplitude. Dark lines are nodal curves of zero motion.',
      good: 'Sharp, stable nodal lines while a tone holds; pattern complexity grows with mode numbers.',
      bad: 'A washed-out or flickering figure means the driving signal is unsteady — check the engine first.',
    },
    howTo: [
      'Wait for the module to leave verification, then open Cymatic Studio.',
      'Drive it from a Studio tone and watch the nodal lines form.',
      'Sweep the frequency slowly and compare figures across modes.',
    ],
  },
  {
    id: 'lucid-dream-cues',
    module: 'Sleep & Dream',
    route: '/dream',
    name: 'Lucid-dream cue engine',
    status: 'in-verification',
    grade: 'B',
    gradeScope: 'Best-validated audio protocol (TLR) plus MILD/WBTB behavioral core; success rates quoted, never promised.',
    simple:
      'A sleep mode built on the best-tested lucid-dream techniques: pair a sound with the intention to notice you are dreaming, then hear it softly during REM sleep. It biases the odds toward lucidity — it does not guarantee lucid dreams. This module is in verification and opens soon.',
    deep:
      'The audio core is Targeted Lucidity Reactivation: a cue sound trained with intention practice while awake, replayed during REM — 50% signal-verified lucid dreams in cued lab naps versus 17% uncued (Carr 2023), with a successful smartphone translation (Mallett/Paller 2024). The behavioral backbone is MILD plus wake-back-to-bed, about 46% per attempt in motivated volunteers (Aspy 2017). The 40 Hz stimulation claims in this space failed replication and used an invalid lucidity criterion, so they are excluded by design. Out-of-body experiences are framed through their replicated neuroscience — temporoparietal and vestibular origins — never as soul travel, for which no controlled evidence exists.',
    plot: {
      axes:
        'The night-plan strip runs left to right across clock time; rows mark the scheduled sleep blocks, and the small flags mark when cue sounds are set to play inside the late-night windows.',
      good:
        'Cue flags land inside the late-night windows, volumes sit at the low end, and an auto-shutoff ends the plan on its own.',
      bad:
        'Cue flags stacked early in the night, at high level, or with no shutoff mean a badly formed plan — re-run the planner before sleeping.',
    },
    howTo: [
      'Wait for the module to leave verification, then open Sleep & Dream.',
      'Do the short awake training so the cue sound is linked to the intention.',
      'Let the cue play during late-night REM windows and journal in the morning.',
    ],
  },
  {
    id: 'replication-protocols',
    module: 'Replication Bay',
    route: '/replication',
    name: 'Replication protocols',
    status: 'in-verification',
    simple:
      'A workspace for re-running published experiments with the exact same settings, so claims get checked instead of trusted. Protocols and result templates will live here. This module is in verification and opens soon.',
    deep:
      'Each protocol will capture stimulus parameters — carrier, beat, mode, dose — plus procedure and a pre-registered analysis plan, so an independent run is a measurement rather than an anecdote. Designs are being cross-checked against the published parameter lists before release; until then every card is marked in verification. Null results will be published with the same prominence as positive ones. The Replication Bay is where the Experiment Lab’s X-series protocols meet the public.',
    howTo: [
      'Wait for the module to leave verification, then open Replication Bay.',
      'Pick a protocol and mirror its parameters in the Studio.',
      'Log outcomes against the pre-registered template, including nulls.',
    ],
  },
  {
    id: 'quicklab-selftest',
    module: 'Quick Lab',
    route: '/quicklab',
    name: 'Blinded self-experiments',
    grade: 'B',
    gradeScope: 'Design follows pre-registration practice; your own results are n-of-1 evidence, graded by the honesty bar, never over-claimed.',
    simple:
      'Run a real blinded experiment on yourself. The app secretly picks real or control sessions, you rate how you feel after each, and after enough sessions it tells you the difference with an honest confidence range — and says "inconclusive" when the data is inconclusive.',
    deep:
      'Quick Lab enrolls you into block-randomized, fully blinded n-of-1 protocols (seeded RNG, arm identity sealed until completion). Each arm is an engine-rendered session (including active-placebo and 0 Hz control arms drawn from the H1–H12 hypothesis set). Outcomes are session ratings and an optional simple-reaction tap test; results render only as n + estimate + 95% CI, a verdict string appears only at ≥10 sessions, and a CI spanning zero returns "inconclusive" by construction. Every session debits your WHO-ITU H.870 weekly dose budget and the scheduler refuses over-dose runs.',
    plot: {
      axes:
        'Results panel: the point mark is the estimated difference between arms, and the horizontal bar is its 95% confidence interval; the vertical zero line means no measured difference. The session counter n sits beside the estimate.',
      good:
        'n at or above 10 with a confidence interval narrow enough to read clearly, every session logged, and arms still blinded until completion.',
      bad:
        'A very wide interval or one crossing the zero line is reported as inconclusive — that is a correct result, so keep logging sessions rather than re-reading the chart.',
    },
    howTo: [
      'Open Quick Lab and pick a protocol — ear-swap and the 0 Hz-floor test are fastest.',
      'Run your scheduled blinded sessions and rate each one honestly.',
      'After ten sessions, read your estimate and confidence range — including if it is inconclusive.',
    ],
  },
  {
    id: 'theory-explorer',
    module: 'Theory Explorer',
    route: '/theory',
    name: 'Theory chain auditor',
    grade: 'A',
    gradeScope: 'Audit content is the program\u2019s gated critical-review record; verdicts carry flaw tables and citations.',
    simple:
      'See exactly why each big claim about sound and the brain holds up or falls apart. Follow the argument step by step, see the weakest link highlighted, and read the verdict — from solid physics to discarded folklore.',
    deep:
      'Each theory is rendered as its audited inference chain: numbered derivation steps with inline flaw flags (logical, mathematical, empirical, scope, statistical, semantic), the weakest arrow highlighted, the domain of validity, at least two mundane alternative explanations, a steelman, and the final verdict (REPAIRABLE / DEMOTE / DISCARD / OPEN) with links into the experiment registry. Discarded claims render as audited records with their flaw tables — never as selectable session options. All content renders from the program\u2019s gated research data, not hand-written copy.',
    howTo: [
      'Open Theory Explorer and pick a claim — try "432 Hz" or the Gateway chain.',
      'Walk the numbered steps; the amber arrow marks where the argument breaks.',
      'Follow the registry link to see which experiment could settle it.',
    ],
  },
  {
    id: 'soniclab-shepard',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Shepard glissando',
    grade: 'A',
    gradeScope: 'Auditory illusion — replicated psychoacoustics (Shepard 1964).',
    simple:
      'A tone that seems to rise forever without ever getting higher, like a barber pole for sound. Pick a center frequency and speed, then press play.',
    deep:
      'Eight to ten octave-spaced sine partials sweep upward while a Gaussian-in-log-frequency envelope fades partials in at the bottom and out at the top. The spectrum returns to itself every octave cycle, so perceived pitch height circulates without any real ascent. Loop mode snaps the base frequency so every partial completes whole cycles, making the loop sample-seamless.',
    howTo: [
      'Open Sonic Lab and find the Illusions group.',
      'Set a center frequency (300–500 Hz works best) and press play.',
      'Try the loop mode and listen for the seam — there is none.',
    ],
  },
  {
    id: 'soniclab-risset-rhythm',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Risset rhythm',
    grade: 'A',
    gradeScope: 'Temporal analog of the Shepard illusion; perceptual, not therapeutic.',
    simple:
      'A beat that seems to speed up forever without getting faster. Watch the tempo readout — it always comes back to where it started.',
    deep:
      'Click trains at multiple tempo ratios are crossfaded as the base tempo accelerates. Analytic scheduling keeps each pulse stream phase-coherent across the cycle boundary. The percept is the rhythm-domain version of the Shepard circulation.',
    howTo: ['Open the Illusions group.', 'Choose a tempo ratio and press play.', 'Watch the meta-bar indicator to see the cycle restart.'],
  },
  {
    id: 'soniclab-barber-pole',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Barber-pole AM',
    grade: 'A',
    gradeScope: 'Constant-direction amplitude-modulation illusion; perceptual demo.',
    simple:
      'A pulsing sound whose pulse rate seems to climb endlessly. The loop is snapped to whole beat cycles so it never clicks.',
    deep:
      'Several amplitude modulators at integer-related rates are crossfaded like Shepard octaves in the time domain. The sweep start frequency is snapped within ~0.1% so each loop contains an integer number of beat cycles. The result is a direction-locked pulse percept with a click-free loop.',
    howTo: ['Open Illusions.', 'Press play on Barber-pole AM.', 'Compare with the Risset rhythm to hear the same trick two ways.'],
  },
  {
    id: 'soniclab-euclidean',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Euclidean rhythm gates',
    grade: 'B',
    gradeScope: 'Bjorklund maximally-even patterns — real math, wide use in music; any neural claim is experimental.',
    simple:
      'Spreads any number of beats as evenly as possible over a cycle — the pattern behind many world rhythms. Pick beats and cycle length, then play it as a tone gate.',
    deep:
      'The Bjorklund algorithm constructs the maximally-even distribution of k onsets over n slots (E(3,8) = x..x..x.). All n rotations of the necklace are available. The pattern is used here as an amplitude gate, so the modulation itself carries the Euclidean structure.',
    howTo: ['Open Math Rhythms.', 'Set beats and cycle length.', 'Press play and read the pattern strip.'],
  },
  {
    id: 'soniclab-phi-beatty',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Golden-ratio pulses',
    grade: 'B',
    gradeScope: 'Beatty/Sturmian sequence with irrational slope — deterministic structure; aesthetic only.',
    simple:
      'Pulses placed by the golden ratio — never repeating, never random. It sounds like structured drift.',
    deep:
      'A Beatty/Sturmian sequence with slope 1/φ generates the gate times. Irrational rotation guarantees no exact period, which is why the texture never locks into a loop. No physiological claim attaches.',
    howTo: ['Open Math Rhythms.', 'Play the golden-ratio card.', 'Compare its drift with the prime-pulse card next to it.'],
  },
  {
    id: 'soniclab-prime-pulse',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Prime pulse train',
    grade: 'B',
    gradeScope: 'Prime-indexed onsets; mathematical pattern, aesthetic listening object.',
    simple: 'Clicks only at prime-numbered steps — a sparse, never-settling rhythm. Pick a step rate and press play.',
    deep: 'Onsets occupy indices 2, 3, 5, 7, 11… of a fixed grid. Gaps grow slowly because prime density thins logarithmically. The result is a sparse, aperiodic texture that never settles into a groove.',
    howTo: ['Open Math Rhythms.', 'Play Prime pulses.', 'Try tapping along — the pattern never lets you settle.'],
  },
  {
    id: 'soniclab-fibonacci-word',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Fibonacci-word rhythm',
    grade: 'C',
    gradeScope: 'Real combinatorial structure; note that fold-mapped Fibonacci frequencies carry zero information (audited in the Critique Library).',
    simple:
      'A rhythm generated by the Fibonacci word — a self-similar pattern of long and short steps. This is honest structure, not magic numbers.',
    deep:
      'The Fibonacci word (0→01, 1→0 substitution) yields a Sturmian rhythm with provable combinatorial properties. We deliberately do not octave-fold Fibonacci numbers into Hz. That mapping is information-free, as the Critique Library audit shows.',
    howTo: ['Open Math Rhythms.', 'Play the Fibonacci-word card.', 'Read the note explaining why we avoid Fibonacci Hz claims.'],
  },
  {
    id: 'soniclab-fractal-noise',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Fractal 1/f noise',
    grade: 'B',
    gradeScope: '1/f^α spectra are real signal science; pleasantness claims are aesthetic.',
    simple:
      'Noise with a tunable texture between white hiss and deep rumble. The alpha slider walks you through pink, Brownian, and beyond.',
    deep:
      'Spectral shaping multiplies noise amplitudes by f^(−α/2) so power falls as f^−α (about −3α dB per octave). α=1 is pink, α=2 is Brownian, and α=0 is white. A Voss–McCartney time-domain approximation is included for comparison.',
    howTo: ['Open Fractal & Chaos.', 'Sweep the alpha slider while playing.', 'Match the slope readout against the Analyzer.'],
  },
  {
    id: 'soniclab-logistic',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Logistic chaos modulator',
    grade: 'A',
    gradeScope: 'The logistic map is textbook nonlinear dynamics (Feigenbaum); used here as a control signal.',
    simple:
      'Chaos theory driving a tone: one slider walks from a steady hum, through wobbles, into full unpredictability. Stop anywhere and it holds that texture.',
    deep:
      'x_{n+1} = r·x_n(1−x_n) at control rate modulates pitch or amplitude. Below r≈3 it settles to a fixed point, past 3.449 it period-doubles, and at r=4 it is fully chaotic. The page warns you at each bifurcation edge.',
    howTo: ['Open Fractal & Chaos.', 'Drag the r slider slowly from 3.4 to 4.0.', 'Listen for the period-doubling cascade.'],
  },
  {
    id: 'soniclab-custom-wave',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Custom waveform designer',
    grade: 'A',
    gradeScope: 'Classic synthesis engineering (additive, FM, Chebyshev, phase distortion).',
    simple:
      'Build your own waveform from harmonics or FM and hear it live. Export it as a studio-grade WAV file when it sounds right.',
    deep:
      'Additive stacks up to 8 harmonics, Chowning FM with bandwidth following Carson\u2019s rule, and Chebyshev T_n waveshaping (T_n(cos θ) = cos nθ, verified by FFT in tests) are available. Casio-style phase distortion adds a second family of timbres. Export uses the engine\u2019s bit-exact WAV encoder.',
    howTo: ['Open Custom Waveforms.', 'Move harmonic sliders or set an FM index.', 'Press play, then export WAV if you like it.'],
  },
  {
    id: 'soniclab-tuning',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Tuning systems explorer',
    grade: 'B',
    gradeScope: 'Tuning mathematics is exact; consonance follows Plomp–Levelt roughness; healing-tuning claims are grade D and excluded.',
    simple:
      'Hear how just intonation, equal temperament, and the Bohlen–Pierce scale actually differ — in cents and in sound. Play any interval in two systems back to back.',
    deep:
      'The JI table lists exact cent deviations from 12-TET (major third +13.69¢, syntonic comma 21.51¢). Bohlen–Pierce divides the 3:1 tritave into 13 steps of 146.304¢. Consonance is framed by Plomp–Levelt roughness curves, the honest psychoacoustic basis.',
    howTo: ['Open Tuning Systems.', 'Play the same interval in JI and 12-TET.', 'Read the cent column while you listen.'],
  },
  {
    id: 'soniclab-astro',
    module: 'Sonic Lab',
    route: '/sonic-lab',
    name: 'Astronomically derived tunings',
    grade: 'D',
    gradeScope: 'Orbital arithmetic is grade A; any special meaning or effect is grade D — labeled inline, per program rule.',
    simple:
      'Tones computed from real astronomy — planet orbits, the TRAPPIST-1 system, the Earth year. The math is exact; there is no evidence they do anything special.',
    deep:
      'Orbital period ratios become pitch intervals (TRAPPIST-1 ladder anchored to h = C3 = 130.81 Hz; Earth-year tone 136.10 Hz with the sidereal/tropical convention explicitly selected — the two differ by 0.067¢, a 189-second slow beat). Every entry carries the split grade: arithmetic A, meaning D. NASA-style sonification practice is the reference frame; mystical claims are excluded by design.',
    howTo: ['Open Astro-Tuned.', 'Toggle sidereal/tropical to hear the tiny difference.', 'Read the honesty label before playing anything.'],
  },
// ------------------------------------------------------------- Sample Lab
{
  id: 'samplelab-upload',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Local file upload',
  simple:
    'Drop or pick any audio file and the Lab dissects it: tones, tempo, loudness, stereo construction, tuning, and loops. Everything is decoded and analyzed on your device. The file is never uploaded or stored anywhere else.',
  deep:
    'Files are decoded with AudioContext.decodeAudioData (WAV, MP3, OGG, M4A) into per-channel Float32 arrays at the native sample rate. All DSP runs in chunked, cancellable passes that yield between chunks so the page stays responsive, and long files are analyzed on a widened frame grid so memory and time stay bounded. No network call exists anywhere in the path; closing the tab discards everything.',
  howTo: [
    'Drop an audio file anywhere on the page, or click to pick one.',
    'Watch the progress bar; cancel any time.',
    'Read the report top to bottom — each plot has an ⓘ explainer.',
  ],
},
{
  id: 'samplelab-overview',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Analysis overview',
  simple:
    'The headline numbers of the loaded file in one row: how long, how loud, how hot the peaks are, and whether a tempo or a stereo carrier offset was found. Start here, then dig into the plot that matches your question.',
  deep:
    'Duration, sample rate, and channel count come from the decoded buffer. Loudness is ITU-R BS.1770-4 gated integrated (K-weighted); true peak is 4× oversampled per Annex 2. Tempo comes from the onset-envelope autocorrelation; Δf appears only when the stereo module flags an isolated, decorrelated carrier pair with a matching L·R product-spectrum peak. Every value is a measurement of the file — none of them, alone or together, say anything about effects on a listener.',
  plot: {
    axes: 'Readouts: duration (m:ss), sample rate (kHz), channels, LUFS-I, true peak (dBTP), tempo (BPM), beat offset Δf (Hz).',
    good: 'Values consistent with what the file claims to be — e.g. a quiet, steady, long-form session file.',
    bad: 'True peak at 0 dBTP, or a loudness reading closer to a loudness-war master than a relaxation file.',
  },
  howTo: ['Load a file.', 'Compare the readouts against whatever the source claimed about the file.'],
},
{
  id: 'samplelab-spectrogram',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Spectrogram',
  simple:
    'A map of the whole file: time runs left to right, pitch runs bottom to top, brightness means loudness. Steady tones draw flat lines; drum hits draw vertical smears. Two close lines that drift apart or together reveal a detuned stereo pair.',
  deep:
    'Short-time Fourier transform with a 2048-sample Hann window at 75% overlap (hop widens for very long files). Power per bin is shown in dB with a 90 dB display floor on a warm perceptual ramp. The frequency axis is logarithmic (30 Hz – 16 kHz) because low-frequency detail is where carrier pairs and slow modulations live. A genuine two-carrier construction shows up as two constant-Q ridges whose spacing equals the claimed beat frequency.',
  plot: {
    axes: 'x = time, y = frequency (log, Hz), color = power (dB, warm ramp, −90…0 dB).',
    good: 'Crisp horizontal ridges for steady tones; smooth band shapes for music; quiet floor elsewhere.',
    bad: 'Broadband vertical stripes (clicks or clipping), a hard energy shelf at 15–20 kHz (lossy re-encode), or nothing near a frequency the product label claims.',
  },
  howTo: [
    'Load a file and look for horizontal lines near any claimed carrier frequency.',
    'Check for vertical smears that indicate clicks or clipping.',
    'Compare the top of the energy band against the file\u2019s claimed format quality.',
  ],
},
{
  id: 'samplelab-spectral-stats',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Spectral statistics',
  simple:
    'Four small graphs that track the file\u2019s brightness, width, high-end reach, and noisiness over time. They answer "is this a tone or a hiss?" and "did the character change halfway through?" at a glance.',
  deep:
    'Per STFT frame: centroid C = Σf·p (brightness), spread S = √Σ(f−C)²·p, rolloff = smallest frequency holding 85% of power, flatness = geometric/arithmetic mean ratio of a lightly time-smoothed spectrum (0 = pure tone, →1 = noise), plus positive-only spectral flux F = Σ max(0, P − P_prev) which feeds onset detection. Rolloff is the lossy-encoder detector: mp3 re-encodes show a hard shelf at 15–20 kHz. All five are O(N) per frame on top of the shared STFT.',
  plot: {
    axes: 'Four time series: centroid (Hz, log), spread (Hz, log), rolloff-85 (Hz, log), flatness (0–1).',
    good: 'Flatness near 0 with stable centroid = clean tones; flatness near 1 with low centroid = a noise bed — both fine if labeled honestly.',
    bad: 'A flatness or rolloff step midway = spliced or re-encoded material; rolloff glued below 16 kHz in a "lossless" file = mp3 in disguise.',
  },
  howTo: ['Load a file.', 'Scan flatness to classify tone vs noise.', 'Scan rolloff for codec shelves and splices.'],
},
{
  id: 'samplelab-band-energy',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Octave band energy',
  simple:
    'Bars showing where the file\u2019s energy lives, from sub-bass to the top octave. A calm sleep file should concentrate below 1 kHz. Surprise energy in the top bands means hiss — or content some listeners cannot hear at all.',
  deep:
    'STFT power is integrated over ANSI octave bands (centers 31.25 Hz – 16 kHz, edges at fc/√2 … fc·√2) and averaged across the file; bars show dB and the percentage of total spectral energy. Dominance of the 250/500 Hz bands with an empty top end is the classic profile of a clean carrier-pair file. Energy above 8 kHz in content marketed for sleep is a red flag: inaudible to many adults, potentially uncomfortable for young listeners.',
  plot: {
    axes: 'Bars: one per octave band (31.25 Hz – 16 kHz); length = mean band power (dB), label = share of total energy.',
    good: 'Most energy below 1 kHz for relaxation or carrier content; a smooth musical slope for songs.',
    bad: 'A tall 8 kHz or 16 kHz bar in a "sleep" file, or an empty low end where a product claims deep carriers.',
  },
  howTo: ['Load a file.', 'Check which bands dominate.', 'Question any band the label doesn\u2019t mention.'],
},
{
  id: 'samplelab-stereo-ms',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Stereo field & carrier-offset check',
  grade: 'B',
  gradeScope: 'The measurement itself (M/S decomposition, correlation, Δf detection) is standard DSP. Grade B covers only the percept: binaural beats are a real, well-replicated auditory illusion — what they do beyond that is not claimed here.',
  simple:
    'Splits the file into what both ears share (mid) and what differs between them (side), and measures how similar the two channels are. If the file hides one steady tone per ear, slightly detuned, this panel finds it and reports the offset. Finding that pattern says how the file was built — not what it does to you.',
  deep:
    'M = (L+R)/2, S = (L−R)/2; windowed Pearson correlation ρ over 100 ms frames. The construction check requires three independent agreements: low inter-channel correlation (ρ < 0.4), an isolated prominent carrier peak in each channel (30–1500 Hz) whose spacing sits in the 0.5–35 Hz beat range, and a corroborating peak at that exact offset in the spectrum of the product signal L·R (which contains a real component at |fL − fR| by the sum-and-difference identity). ρ ≈ +1 is mono-compatible; ρ < 0 disappears in mono mixdown.',
  plot: {
    axes: 'M/S level bars (dB), correlation meter (−1…+1) with ρ-over-time trace, and a verdict chip with Δf, carrier pair, and reason.',
    good: 'Verdict chip matches the file\u2019s own description; ρ near +1 for normal music; a clean low-ρ carrier pair for a labeled dichotic file.',
    bad: 'A "binaural" product with ρ ≈ 1 (no dichotic pair present), ρ < 0 (anti-phase; vanishes in mono), or a Δf that contradicts the label.',
  },
  howTo: [
    'Load a stereo file.',
    'Read the verdict chip: detected pair, Δf, and carrier frequencies.',
    'Cross-check the claimed beat frequency against the measured Δf.',
  ],
},
{
  id: 'samplelab-loudness-history',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Loudness history',
  grade: 'A',
  gradeScope: 'ITU-R BS.1770-4 standardized measurement, unit-tested implementation (shared dsp/loudness.ts).',
  simple:
    'How loud the file actually feels over its whole length, in LUFS, not how tall the waveform looks. A flat, quiet line is what a calm session should look like. Sawteeth and jumps mean aggressive mastering.',
  deep:
    'K-weighted loudness per ITU-R BS.1770-4: momentary (400 ms) and short-term (3 s) traces, gated integrated value, loudness range LRA (10th–95th percentile of gated short-term), and 4×-oversampled true peak. Reference lines include −23 LUFS (broadcast) and 0 dBTP (digital ceiling). As a sanity rule of thumb, sleep-class content should read LRA under ~3 LU and integrated well under −30 LUFS; a "relaxation" track at −8 LUFS is a loudness-war master in disguise.',
  plot: {
    axes: 'x = time, y = LUFS (−60…0); teal = momentary 400 ms, amber = short-term 3 s. Summary: LRA and true peak (dBTP).',
    good: 'A calm, flat trace in a quiet range with true peak below −1 dBTP.',
    bad: 'A hot trace near 0 LUFS, audible jumps, or any true peak touching 0 dBTP.',
  },
  howTo: ['Load a file.', 'Compare integrated LUFS and LRA against the calm-file rule of thumb.', 'Check true peak before playing loud.'],
},
{
  id: 'samplelab-pitch-track',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Pitch track & tuning',
  simple:
    'Follows the musical note through the file and tells you what the whole file is tuned to, within a fraction of a cent. This is the fact-check for tuning claims: a file labeled 432 Hz should measure at 432 Hz, not 440.',
  deep:
    'YIN (de Cheveigné & Kawahara 2002), browser subset: FFT-based difference function, cumulative-mean normalization, 0.1 absolute threshold with deepest-dip selection, and a float64 direct recomputation of the dip for sub-sample, sub-cent refinement. The whole-file tuning readout is the median f₀ over voiced frames, mapped to the nearest equal-tempered note with signed cents (n = 12·log₂(f/440) + 69). Every estimate carries a clarity score; unvoiced or noisy frames are excluded rather than guessed.',
  plot: {
    axes: 'Amber dots: f₀ contour (log Hz, 40–1200) over time; dot opacity = clarity. Table: median f₀, nearest note, cents, voiced percentage.',
    good: 'A stable plateau with high clarity and a cents value matching the file\u2019s tuning claim (±1¢ for synthetic tones).',
    bad: 'A jittery, low-clarity contour (no real pitch), or a measured plateau that contradicts the label — e.g. 440 Hz in a "432 Hz" product.',
  },
  howTo: ['Load a tonal file.', 'Read the median f₀ and cents in the tuning table.', 'Compare with any tuning the product claims.'],
},
{
  id: 'samplelab-loop-detect',
  module: 'Sample Lab',
  route: '/sample-lab',
  name: 'Loop detection',
  simple:
    'Answers the uncomfortable question: is this hour-long session actually an hour of content, or a five-minute loop repeated twelve times? If the material repeats exactly, this panel finds the period and shows you the evidence.',
  deep:
    'The STFT is folded into 1-second, 16-band log-frequency energy fingerprints; every pair of fingerprints at every whole-second lag is compared by cosine similarity. An exact loop produces an off-diagonal ridge at the loop period (and its multiples); the smallest lag above 0.92 is reported as the period. Spectrally stationary content (flat noise, a single held tone) is genuinely ambiguous — any segment matches any other — so the detector abstains rather than inventing a period.',
  plot: {
    axes: 'x = lag (seconds), y = self-similarity (0–1); dashed amber line = 0.92 detection threshold; amber marker = reported period.',
    good: 'A single dominant ridge at one lag = a loop with that period; a flat low curve = genuinely evolving content.',
    bad: 'Not applicable — abstains ("not evaluated") on silence, constant spectra, or files under 6 s instead of guessing.',
  },
  howTo: ['Load a long session file.', 'Read the verdict: loop period or "no exact loop".', 'Check the ridge on the curve for yourself.'],
},
];

/** Full feature list — the single import surface for Home, Guide, and tests. */
export const FEATURES: readonly FeatureEntry[] = [...FEATURES_CORE, ...FEATURES_MODULES];

/** Features grouped by module, preserving data order. */
export function featuresByModule(features: readonly FeatureEntry[] = FEATURES): Map<string, FeatureEntry[]> {
  const map = new Map<string, FeatureEntry[]>();
  for (const f of features) {
    const list = map.get(f.module);
    if (list) list.push(f);
    else map.set(f.module, [f]);
  }
  return map;
}
