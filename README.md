# Open Sync

**Generate. Measure. Verify.** — an evidence-honest neural audio laboratory that runs
entirely in your browser.

Open Sync is an open replication — and correction — of classic brainwave-synchronization
audio platforms. It generates binaural, monaural, and isochronic sessions with a full
instrument stack, then measures its own output and **grades every claim it makes from
A to D, each with its citation**. Some of what is here is replicated physics; some is
folklore kept visible on purpose and *labeled as folklore* — so you can see exactly where
the evidence ends.

## The 80-second film

https://github.com/occult-kranti/open-sync/raw/main/assets/ad/open-sync-ad.mp4

<video src="https://raw.githubusercontent.com/occult-kranti/open-sync/main/assets/ad/open-sync-ad.mp4" controls width="720"></video>

*(88 s · 720p · caption-first edit — every claim on screen is real and verified in the
codebase: 22 modules, 52 presets, 730 passing tests, MIT license.)*

## What's inside

- **Studio** — live session generator: binaural/monaural/isochronic oscillators, 6 noise
  colors, nature layers, singing bowls, phase-coherent stereo, WAV export.
- **Frequency Library** — Solfeggio, Schumann (measured values), chakra, planetary,
  Fibonacci sets — every entry graded and cited, never dressed up.
- **Presets** — 52 protocols across Sleep / Focus / Relax / Meditate / **Wellness** /
  Experimental / Infant, each with an evidence badge, dose metadata (WHO-ITU H.870), and
  a one-click load into Studio.
- **MED FREQ** — the medical-frequency-healing module: real acoustic medicine
  (lithotripsy, histotripsy) vs vibroacoustic therapy (40 Hz, grade B) vs folklore devices
  (Rife, Cyma, zapper — grade D), with the FDA/enforcement record attached.
- **Analyzer** — real-time spectrum, K-weighted loudness (ITU-R BS.1770), THD/SINAD.
- **Safety** — panic button, dose budget, session caps, infant-safe mode, driving warning.
- **Research wing** — Experiment Lab, Critique Library, Hypothesis Tracker, Programs
  Archive, Quick Lab (blinded n-of-1 self-experiments), Theory Explorer, Sonic Lab,
  Sample Lab, Cymatic Studio (live Chladni solver), Sleep & Dream.

## Honesty policy

- Grades: **A** replicated physics · **B** some human evidence · **C** plausible mechanism,
  weak evidence · **D** folklore/numerology — shipped as history and texture, never therapy.
- No medical claims, anywhere. The app's own tests reject overclaim phrases.
- Everything free, open-source (MIT), no sign-up, no ads.

## Develop

```bash
npm install        # deps
npm run dev        # local dev server
npm test           # 730 tests (vitest)
npm run build      # production build → dist/
node scripts/render-previews.mjs   # regenerate preset preview WAVs (public/previews)
```

Generated audio artifacts (`public/previews/`, `public/stimulus_pack/`) are gitignored —
rebuild them with the scripts above. `package-lock.json` is not part of the initial
import — `npm install` regenerates it.

## Stack

Vite · React 19 · TypeScript · Tailwind · Web Audio API · Vitest · ffmpeg-free
(everything renders in-browser).

## License

MIT — see [LICENSE](LICENSE).
