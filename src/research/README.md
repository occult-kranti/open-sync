# W5 Research Screens — mount points

Four screens, now wired into the W3 shell. W3's `AppShell` rail already
linked `/lab`, `/critique`, `/hypotheses`, `/programs` (RESEARCH_SOON
section); W5's only shell edit was swapping the four `ComingSoon` stubs for
the real screens in `src/App.tsx` (imports + 4 route elements — nothing
else touched). `src/pages/ComingSoon.tsx` is now unused but left in place
(W3's file).

| Route | Component | File |
|---|---|---|
| `/lab` | `ExperimentLab` | `src/pages/research/ExperimentLab.tsx` |
| `/critique` | `CritiqueLibrary` | `src/pages/research/CritiqueLibrary.tsx` |
| `/hypotheses` | `HypothesisTracker` | `src/pages/research/HypothesisTracker.tsx` |
| `/programs` | `ProgramsArchive` | `src/pages/research/ProgramsArchive.tsx` |

Screens use W3's signature `GradeBadge` (`src/ui/components/GradeBadge.tsx`,
grade + B− variant + citation popover) and `src/ui/theme.ts` tokens; the
earlier local badge was removed. All four render their own page chrome
(crumb + title + lede) inside the W3 workspace container (max-width 1440).

## Data modules (`src/research/`)

- `types.ts` — shared types (`Experiment`, `Critique`, `TrackedHypothesis`, `Program`, `PackFile`, `Verdict`, …).
- `experiments.ts` — X01–X14 registry (hypothesis, prediction, null rule, controls, sham, power, kill/promote) + global rules + kill/promote matrix.
- `stimulusPack.ts` — 67-entry pack listing; 20 X10 files rendered into `public/stimulus_pack/` (sha256 pinned in `public/stimulus_pack/manifest.json`), everything else on-demand regeneration (>5 MB masters).
- `critiques.ts` — 13 audited theories with flaw tables, steelman, key numbers.
- `hypotheses.ts` — 11 tracked claims with grade-change audit trails; all `pre-registered, awaiting data`.
- `programs.ts` — 42 government programs (two-axis documented/validated grading, era buckets, official-negative flags) + torsion-field fraud case + banner strings.

## Claim discipline (S12.2)

All screens carry the `ClaimDisciplineNote`. Claim strings use hedged forms
("biases toward", "is associated with", "produces a measurable
stimulus-locked response"). Banned as product claims: "CIA-validated",
"Schumann-aligned 432", "digital drug", "induces", "synchronizes", "attunes"
(these strings appear only inside the discipline note that bans them).
Results UI shows n + CI placeholders only — `HonestyBar` enforces the
"no data collected yet — pre-registered" state.

## Notes for integrator

- W3 files touched: `src/App.tsx` only (the four stub-route swaps above).
- `public/stimulus_pack/` adds ~55 MB (20 × 2.75 MB WAV, 24-bit/48 kHz,
  rendered per stimulus_pack_spec.md §10 X10 reference set; verified FFT peak
  within 0.005 Hz and −23.00 dBFS RMS). The 60 s+ masters stay on-demand.
