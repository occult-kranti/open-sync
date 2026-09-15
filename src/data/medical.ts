/**
 * Medical frequency healing — evidence-graded registry (Stage 13).
 *
 * The domain splits into four tiers, and honest labeling is the entire point:
 *   - Real acoustic medicine (A): focused/shock-wave ultrasound at clinical
 *     energies — lithotripsy, HIFU, histotripsy. Works; nothing to do with
 *     consumer "healing frequency" audio.
 *   - Vibroacoustic therapy (B/C): 30–120 Hz sinusoid delivered through
 *     transducers in furniture (Skille VAT; Lehikoinen physioacoustics).
 *     Modest pain/sleep/motor evidence; 40 Hz most-studied.
 *   - 40 Hz GENUS sensory stimulation (C): robust in mice, UNPROVEN in humans
 *     (Cognito OVERTURE missed its primary endpoint, Hajós 2024).
 *   - Folklore lists & devices (D): Rife/CAFL, Clark zapper, Cyma commutation
 *     codes. Shipped as history and texture, never as therapy.
 *
 * Regulatory canon quoted throughout: FDA product code ISA ("massager,
 * therapeutic, electric", 21 CFR 890.5660, Class I, 510(k)-exempt).
 * Registration ≠ approval. Disease claims make any of these an unapproved
 * medical device — see the enforcement record below.
 */

import type { Grade } from './frequencies';

// ---------------------------------------------------------------- types

export type DeviceKind = 'acoustic-medicine' | 'vibroacoustic' | 'experimental' | 'folklore';

export interface MedDevice {
  id: string;
  name: string;
  era: string;
  kind: DeviceKind;
  grade: Grade;
  /** One-line regulatory/evidence status. */
  status: string;
  summary: string;
  citation: string;
}

export interface MedPaper {
  id: string;
  year: string;
  venue: string;
  title: string;
  grade: Grade;
  finding: string;
  limitation: string;
  citation: string;
}

export interface MedTimelineEvent {
  year: string;
  label: string;
  grade: Grade;
  note: string;
}

export interface MedEnforcement {
  year: string;
  caseName: string;
  outcome: string;
  citation: string;
}

export interface MedCommunitySource {
  name: string;
  kind: 'vendor-research' | 'list-culture' | 'practitioner' | 'skeptic';
  url: string;
  note: string;
}

// ---------------------------------------------------------------- devices

export const MED_DEVICES: readonly MedDevice[] = [
  {
    id: 'histotripsy-edison',
    name: 'Histotripsy (HistoSonics Edison)',
    era: '2023 FDA clearance',
    kind: 'acoustic-medicine',
    grade: 'A',
    status: 'FDA-cleared for non-invasive liver-tumor destruction',
    summary:
      'Focused ultrasound cavitation mechanically liquifies targeted liver tissue. Cleared on #HOPE4LIVER trial data (44 patients, 14 sites, primary safety+efficacy endpoints met). The ninth focused-ultrasound indication cleared in the US — real acoustic medicine at clinical energies, >20 kHz.',
    citation: 'U-M Rogel Cancer Center (2023-10-11); FUS Foundation (2023-10-09); PMC10990312',
  },
  {
    id: 'lithotripsy',
    name: 'Lithotripsy (shock-wave stone fragmentation)',
    era: '1980s → standard of care',
    kind: 'acoustic-medicine',
    grade: 'A',
    status: 'Standard-of-care kidney-stone treatment',
    summary:
      'Acoustic shock waves fragment kidney stones non-invasively. Part of the FDA medical-acoustics spectrum alongside physiotherapy ultrasound, HIFU thermal ablation, and transcranial blood-brain-barrier opening. High-energy, focused, image-guided — the opposite of ambient “healing tones”.',
    citation: 'FDA OSEL Medical Acoustics Program (fda.gov, 2024)',
  },
  {
    id: 'vat-chair',
    name: 'VAT transducer furniture (Skille lineage)',
    era: '1968 → 1980s → today',
    kind: 'vibroacoustic',
    grade: 'B',
    status: 'FDA: substantially equivalent to therapeutic vibrators; 510(k)-exempt',
    summary:
      'Single sinusoidal 30–120 Hz tone delivered to the body through transducers in beds/chairs — Skille’s “low sound, deep tissue inner body massage”. Lehikoinen’s physioacoustic variant scans frequency with slow power pulsation. Evidence: modest pain/fibromyalgia/sleep/Parkinson’s-motor pilots, 40 Hz most-studied. Intended use is relaxation and minor aches — not disease treatment.',
    citation: 'Kantor et al., BMJ Open (2022) scoping review; Multivib/Vibrac method descriptions; FDA determination via Wikipedia VAT',
  },
  {
    id: 'genus-cognito',
    name: 'GENUS 40 Hz sensory stimulation (Cognito)',
    era: '2016 mouse → 2020s human trials',
    kind: 'experimental',
    grade: 'C',
    status: 'Investigational; pivotal trial missed primary endpoint',
    summary:
      'One hour daily of 40 Hz light + sound. Mouse data robust (Iaccarino Nature 2016; Martorell Cell 2019); human pilots show safety, entrainment, and hints of benefit (Chan 2025 2-year open-label: pTau217 −47%/−19.4% in two late-onset donors). But the Cognito OVERTURE pivotal trial MISSED its primary endpoint (Hajós 2024) and replications failed (Soula 2023; Yang & Lai 2023). Experimental — full stop.',
    citation: 'MIT News (2025-11-14); Chan et al., Alzheimer’s & Dementia (2025); Hajós et al. 2024; ClinicalTrials NCT04055376',
  },
  {
    id: 'cyma-1000',
    name: 'Cyma 1000 / AMI “Cymatherapy” devices',
    era: '1980s Manners → 2001+ Cyma Technologies',
    kind: 'folklore',
    grade: 'D',
    status: 'FDA Class I “electric acoustic massager” — registered, NOT approved for any disease',
    summary:
      'Peter Guy Manners’ 600+ five-frequency “commutations” delivered by bone conduction; evolved by Mandara Cromwell into the AMI 500/750/1000. The vendor’s own document: devices are “Class I devices noted for the relief of pain and stress” that “do not diagnose, treat, cure or prevent disease”. The commutation codes are unpublished and proprietary; no peer-reviewed clinical trial supports carcinoma or any disease claim.',
    citation: 'Cyma Technologies Ordering Information (2025-04); cymatechnologies.com history page; vesica.org Cymatherapy overview',
  },
  {
    id: 'rife-generator',
    name: 'Rife frequency generators (“Rife machines”)',
    era: '1930s origin; 1987 revival; today online',
    kind: 'folklore',
    grade: 'D',
    status: 'FDA has not approved any Rife machine for any use; sellers prosecuted',
    summary:
      'Royal Raymond Rife’s “mortal oscillatory rate” concept descends from Albert Abrams’ radionics. The AMA condemned the experiments; the American Cancer Society (1994) notes Rife-generator radio waves are too weak to destroy bacteria. Revived by Lynes’ 1987 “The Cancer Cure That Worked”. Choosing it over oncology care has killed people — see the enforcement record.',
    citation: 'WebMD Rife explainer; ACS “Questionable Methods of Cancer Management” (1994) via PolitiFact (2022-07-29)',
  },
  {
    id: 'clark-zapper',
    name: 'Hulda Clark “Zapper” (30 kHz)',
    era: '1993 “The Cure for All Cancers”',
    kind: 'folklore',
    grade: 'D',
    status: 'No validated evidence; patent citations by followers are misreads',
    summary:
      'A 30 kHz positive-offset square wave across copper handles. Followers cite US Patent 5,188,738 (Kaali) — an in-vitro blood-electrification patent that does not demonstrate curing AIDS or cancer in humans. No clinical validation exists for any zapper protocol.',
    citation: 'huldaclark.com “The Frequency Generation”; QuackWatch Device Watch',
  },
  {
    id: 'otto-forks',
    name: 'Weighted tuning forks (Otto 32/48/64/128 Hz)',
    era: 'modern sound-healing practice',
    kind: 'folklore',
    grade: 'D',
    status: 'Wellness practice; “nitric oxide release” claim vendor-traced and weak',
    summary:
      'Weighted osteophonic forks pressed to joints/sacrum — felt more than heard. As localized vibrotactile stimulation the sensation is real (grade C as touch); the named “healing frequency” claims are practitioner folklore (grade D as therapy). Contraindications practitioners themselves list: bone weakness, pacemakers, metal implants.',
    citation: 'Biosonics ecosystem; rehabilitation practitioner blogs (68/72/128 Hz); puresmusic.com Otto guide',
  },
];

// ---------------------------------------------------------------- papers

export const MED_PAPERS: readonly MedPaper[] = [
  {
    id: 'kantor-2022',
    year: '2022',
    venue: 'BMJ Open',
    title: 'Vibroacoustic Therapy for Chronic Pain: A Scoping Review',
    grade: 'B',
    finding:
      '430 records screened, 20 studies included. Pain reduction consistent across chronic-pain populations; 40 Hz the predominantly used frequency; sessions 20–45 min.',
    limitation: 'Heterogeneous methods, small samples, sham control is hard when the stimulus is felt.',
    citation: 'Kantor et al., BMJ Open (2022)',
  },
  {
    id: 'naghdi-2015',
    year: '2015',
    venue: 'Pain Research & Management',
    title: 'Low-Frequency Sound Stimulation for Fibromyalgia (40 Hz)',
    grade: 'B',
    finding:
      'n=19; 40 Hz LFSS, 23 min, 2×/week for 5 weeks. Significant symptom and sleep improvement; 25% discontinued pain medication; no adverse effects.',
    limitation: 'Pilot without a comparison group; self-report heavy.',
    citation: 'Naghdi et al., Pain Res Manag (2015); PMC4325896',
  },
  {
    id: 'fm-rct-2019',
    year: '2019',
    venue: 'parallel RCT',
    title: 'Rhythmic Sensory Stimulation for Fibromyalgia',
    grade: 'B',
    finding:
      'n=50 randomized; 40 Hz, 30 min, 5×/week for 5 weeks eased fibromyalgia symptoms vs standard-care control; medium-to-large effect sizes; depression severity fell in both arms.',
    limitation: 'Two active-style arms; expectancy not fully separable.',
    citation: 'PMC6396935 (2019)',
  },
  {
    id: 'king-2009',
    year: '2009',
    venue: 'physioacoustic study',
    title: 'Vibroacoustic stimulation in Parkinson’s disease',
    grade: 'C',
    finding: 'Short-term physioacoustic sessions decreased rigidity/tremor and improved step length and speed.',
    limitation: 'Small, short-term; motor endpoints only.',
    citation: 'King et al. (2009)',
  },
  {
    id: 'mosabbir-2020',
    year: '2020',
    venue: 'double-blind RCT',
    title: '40 Hz physioacoustic stimulation for Parkinson’s motor symptoms',
    grade: 'B',
    finding: 'Double-blind RCT evidence on motor impairments with 40 Hz physioacoustic stimulation.',
    limitation: 'Single trial; replication needed.',
    citation: 'Mosabbir et al. (2020)',
  },
  {
    id: 'clements-cortes-2016',
    year: '2016',
    venue: 'AD pilot',
    title: '40 Hz rhythmic sensory stimulation in Alzheimer’s disease',
    grade: 'C',
    finding:
      'n=18 AD (6 mild/6 moderate/6 severe); 40 Hz RSS twice weekly ×6 weeks; incremental SLUMS cognitive gains in mild-moderate participants.',
    limitation: 'Small, short; visual-stimulation control only.',
    citation: 'Clements-Cortés et al. (2016); PMID 27031491',
  },
  {
    id: 'iaccarino-2016',
    year: '2016',
    venue: 'Nature',
    title: 'Gamma entrainment reduces amyloid in 5XFAD mice (40 Hz flicker)',
    grade: 'B',
    finding: '40 Hz light flicker drove gamma oscillations and cut amyloid-β ~50% in hippocampal CA1 of 5XFAD mice; 20/80 Hz did not.',
    limitation: 'Mouse model. The translation gap is the whole story of Tier C.',
    citation: 'Iaccarino et al., Nature (2016)',
  },
  {
    id: 'martorell-2019',
    year: '2019',
    venue: 'Cell',
    title: 'Auditory + combined 40 Hz GENUS in AD mouse models',
    grade: 'B',
    finding:
      '40 Hz auditory stimulation reduced amyloid in mouse auditory cortex and hippocampus; combined audiovisual GENUS outperformed either modality; microglia clustered around plaques.',
    limitation: 'Mouse model; auditory-only human efficacy unproven.',
    citation: 'Martorell et al., Cell (2019)',
  },
  {
    id: 'cimenser-2021',
    year: '2021',
    venue: 'AD RCT pilot',
    title: '6-month 40 Hz audiovisual stimulation in mild-moderate AD',
    grade: 'C',
    finding: 'n=22; safe; active arm maintained ADCS-ADL and showed improved nighttime sleep vs sham.',
    limitation: 'Small, short; biomarker endpoints negative in parallel work.',
    citation: 'Cimenser et al. (2021)',
  },
  {
    id: 'chan-2025',
    year: '2025',
    venue: 'Alzheimer’s & Dementia',
    title: 'GENUS 2-year open-label extension (n=5)',
    grade: 'C',
    finding:
      'Daily 1 h 40 Hz AV stimulation for ~2 years: safe; late-onset participants retained entrainment; plasma pTau217 fell 47% and 19.4% in the two late-onset donors; two early-onset males showed no benefit.',
    limitation: 'Five participants, open label, no parallel control — hypothesis-generating only.',
    citation: 'Chan et al., Alzheimer’s & Dementia (2025); NCT04055376; MIT News (2025-11-14)',
  },
  {
    id: 'goldsby-2017',
    year: '2017',
    venue: 'J Evid Based Complementary Altern Med',
    title: 'Singing Bowl Sound Meditation: mood, tension, well-being',
    grade: 'C',
    finding:
      'n=62 observational: significant reductions in tension, anger, fatigue, depressed mood (P<.001); pain ratings fell (age 40–59: 2.00→0.79); meditation-naïve benefited most.',
    limitation: 'No control group — this measures the relaxation response, not a frequency effect.',
    citation: 'Goldsby et al. (2017); PMC5871151',
  },
  {
    id: 'acs-1994',
    year: '1994',
    venue: 'American Cancer Society',
    title: 'Questionable Methods of Cancer Management (Rife)',
    grade: 'A',
    finding:
      'Rife’s device rests on unsubstantiated radionics; radio waves at Rife-generator power levels cannot destroy bacteria, let alone tumors.',
    limitation: 'A position document, not a trial — but no Rife trial has ever contradicted it.',
    citation: 'ACS (1994), via PolitiFact (2022-07-29)',
  },
];

// ---------------------------------------------------------------- timeline

export const MED_TIMELINE: readonly MedTimelineEvent[] = [
  { year: '1632', label: 'Galileo’s scrape-tones', grade: 'A', note: 'Brass-plate scraping produces whistles + parallel particle streaks — first written notice of vibration patterns.' },
  { year: '1680', label: 'Hooke’s flour figures', grade: 'A', note: 'Nodal patterns on glass plates excited by a violin bow.' },
  { year: '1787', label: 'Chladni plates', grade: 'A', note: 'Ernst Chladni systematizes sand figures — the physics later named cymatics.' },
  { year: '1920s–30s', label: 'Rife’s Frequency Generator', grade: 'D', note: 'Radionics lineage (Abrams); “mortal oscillatory rate”; AMA condemns the experiments.' },
  { year: '1967', label: 'Hans Jenny, “Cymatics” vol. 1', grade: 'A', note: 'Tonoscope, sand on a 60 cm membrane; gorgeous physics — not a therapy.' },
  { year: '1968–80s', label: 'Skille founds VAT', grade: 'B', note: 'Norway; single 30–120 Hz sinusoids through furniture. Lehikoinen adds physioacoustic scanning.' },
  { year: '1980s', label: 'Lithotripsy standard', grade: 'A', note: 'Shock-wave stone fragmentation becomes urology standard of care — sound as actual medicine.' },
  { year: '1987', label: '“The Cancer Cure That Worked”', grade: 'D', note: 'Barry Lynes’ book revives Rife and seeds the modern “suppressed cure” narrative.' },
  { year: '1993', label: 'Clark’s Zapper', grade: 'D', note: '“The Cure for All Cancers” publishes the 30 kHz zapper schematic.' },
  { year: '1994', label: 'ACS questionable-methods report', grade: 'A', note: 'American Cancer Society: Rife radio waves too weak to destroy bacteria.' },
  { year: '2001–05', label: 'Cymatherapy crosses the Atlantic', grade: 'D', note: 'Cromwell studies with Manners, brings Cyma devices to the US; Manners closes Bretforton 2005, dies 2009.' },
  { year: '2009', label: 'Folsom conviction', grade: 'A', note: '26 felony counts for Rife-type biofrequency devices; 59 months; the enforcement record starts printing.' },
  { year: '2015', label: 'Naghdi fibromyalgia pilot', grade: 'B', note: '40 Hz LFSS, 23 min ×10 sessions; symptom + sleep gains; 25% off pain meds.' },
  { year: '2016', label: 'Iaccarino Nature mouse study', grade: 'B', note: '40 Hz flicker halves amyloid in 5XFAD mice — GENUS is born.' },
  { year: '2019', label: 'Martorell Cell + FM RCT', grade: 'B', note: 'Auditory 40 Hz works in mice; n=50 RCT eases fibromyalgia with 40 Hz VAT.' },
  { year: '2023', label: 'Histotripsy FDA-cleared', grade: 'A', note: 'HistoSonics Edison cleared for liver tumors (#HOPE4LIVER, n=44).' },
  { year: '2024', label: 'OVERTURE misses endpoint', grade: 'C', note: 'Cognito’s pivotal 40 Hz trial misses its primary endpoint (Hajós 2024); replications had already failed.' },
  { year: '2025', label: '2-year GENUS extension', grade: 'C', note: 'n=5 open-label: safe, entrainment retained, pTau217 down in two late-onset donors. Signal, not proof.' },
];

// ---------------------------------------------------------------- enforcement

export const MED_ENFORCEMENT: readonly MedEnforcement[] = [
  {
    year: '2009',
    caseName: 'US v. James Folsom (Rife-type “biofrequency” devices)',
    outcome:
      '26 felony counts; 9,000+ devices, $8M in sales; $250k fine; 59 months prison; 450 seized devices destroyed. Sold “for investigational purposes” — the jury was not moved.',
    citation: 'QuackWatch Device Watch; US Attorney’s release (2009)',
  },
  {
    year: '2011',
    caseName: 'Randy Frager / CNGI — “The Detox Box”',
    outcome:
      'Guilty plea to introducing an adulterated device; manual mapped digital settings to Alzheimer’s and cancer; $130,000 assessment; probation.',
    citation: 'QuackWatch, “A Skeptical Look at the Spooky2 Rife System” (2019)',
  },
  {
    year: '2002',
    caseName: 'Bailey / Krueger (“Royal Rife Research Society”)',
    outcome:
      'Kimberly Bailey: life sentence for the kidnapping-murder plot. John Bryon Krueger: 12 years, plus a concurrent 30-month sentence for illegal device sales.',
    citation: 'QuackWatch Device Watch (2009 archive)',
  },
  {
    year: '2020',
    caseName: 'FTC v. Spooky2Scalar',
    outcome: 'Ordered to stop claiming its frequency device was effective against COVID-19.',
    citation: 'FTC action (2020), via QuackWatch',
  },
];

// ---------------------------------------------------------------- community

export const MED_COMMUNITY: readonly MedCommunitySource[] = [
  { name: 'Zenthesia research index', kind: 'vendor-research', url: 'zenthesia.com/pages/vibroacoustic-therapy-research', note: 'Equipment builder’s 38-study VAT list — unusually source-linked for a vendor; still a vendor.' },
  { name: 'VibroAcousticSolutions 40 Hz briefs', kind: 'vendor-research', url: 'vibroacousticsolutions.com', note: 'Plain-language summaries of the Naghdi/RCT/Parkinson’s VAT studies.' },
  { name: 'Multivib (Skille’s company)', kind: 'vendor-research', url: 'multivib.com', note: 'Origin-point of VAT; method history and definitions from the source.' },
  { name: 'Electroherbalism CAFL', kind: 'list-culture', url: 'electroherbalism.com/Bioelectronics/.../CAFL.htm', note: 'The Consolidated Annotated Frequency List, v2023_05_25 — thousands of condition→Hz mappings compiled from Rife notes, Clark, and anecdotes. Read as folklore anthropology.' },
  { name: 'RifeCore guides', kind: 'list-culture', url: 'rifecore.com/guides/frequency-list', note: 'Modern CAFL explainer; itself concedes the list “is not a medical resource”.' },
  { name: 'Cymatones', kind: 'practitioner', url: 'cymatones.com', note: 'Streams “digitized Cyma 1000 commutations” for $11/mo — the reel’s native habitat.' },
  { name: 'Cyma Technologies', kind: 'practitioner', url: 'cymatechnologies.com', note: 'AMI devices; horse-tendon case studies; admirably literal “do not diagnose, treat, cure or prevent” disclaimers.' },
  { name: 'QuackWatch Device Watch', kind: 'skeptic', url: 'quackwatch.org/device/reports/rife/', note: 'Jay Frost’s Spooky2 review + the enforcement archive. The baseline challenge set.' },
  { name: 'PolitiFact (2022)', kind: 'skeptic', url: 'politifact.com/factchecks/2022/jul/29/...', note: '“No evidence that vibrational frequencies can cure cancer” — with the ACS 1994 lineage.' },
  { name: 'WebMD / Healthline / MNT explainers', kind: 'skeptic', url: 'webmd.com/cancer/cancer-rife-machine-evidence', note: 'Mainstream medical explainers; all land on: unproven, delay-of-care danger.' },
];

/** One-line regulatory canon shown on the page. */
export const ISA_FACT =
  'FDA product code ISA — “massager, therapeutic, electric”, 21 CFR 890.5660, Class I, 510(k)-exempt, Physical Medicine panel. Registration ≠ approval: it certifies a low-risk massage device, not a disease treatment.';

export const WELLNESS_FACT =
  'FDA general-wellness policy: low-risk products may claim relaxation and stress management; the moment a product claims to diagnose, treat, cure, or prevent a disease it is an unapproved medical device.';
