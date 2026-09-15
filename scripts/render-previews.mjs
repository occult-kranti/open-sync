#!/usr/bin/env node
/**
 * Render pre-rendered preset preview WAVs into public/previews/.
 *
 * For every preset in src/data/presets.ts, renders the FIRST ~12 seconds of
 * its phase plan through the pure engine (renderSession) and encodes a
 * 48 kHz 16-bit stereo WAV (encodeWav) at public/previews/<preset-id>.wav,
 * plus a manifest.json pinning { id, sha256, bytes } per file.
 *
 * Size guard: the total must stay under 60 MB. With 46 presets, 12 s of
 * stereo PCM16 would be ~104 MB, so the per-file duration is auto-reduced to
 * the largest whole second that fits the guard (budget-fit; the chosen value
 * is logged and recorded in the manifest as `seconds`, with `targetSeconds`
 * keeping the 12 s intent).
 *
 * Run: `node scripts/render-previews.mjs` — plain node; the TS engine and
 * preset data are bundled on the fly with esbuild (already in node_modules
 * via vite), so no vite-node/tsx shim is needed.
 */

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'previews');

const SAMPLE_RATE = 48000;
const CHANNELS = 2; // stereo (binaural presets need independent L/R)
const BYTES_PER_SAMPLE = 2; // pcm16
const WAV_HEADER_BYTES = 44;
const TARGET_SEC = 12;
const MAX_TOTAL_BYTES = 60_000_000; // hard guard: total < 60 MB
const XFADE_SEC = 0.5; // mirrors the app's engine preview path
const MASTER_GAIN_DB = -6;

// ---------------------------------------------------------------------------
// Bundle the TS engine + preset data with esbuild, then import the bundle.
// ---------------------------------------------------------------------------
const bundlePath = path.join(os.tmpdir(), `open-sync-render-previews-${process.pid}.mjs`);
await build({
  stdin: {
    contents: [
      `export { renderSession, encodeWav } from ${JSON.stringify(path.join(ROOT, 'src/engine/index.ts'))};`,
      `export { PRESETS } from ${JSON.stringify(path.join(ROOT, 'src/data/presets.ts'))};`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: bundlePath,
  logLevel: 'silent',
});
const { renderSession, encodeWav, PRESETS } = await import(pathToFileURL(bundlePath).href);
rmSync(bundlePath, { force: true });

// ---------------------------------------------------------------------------
// Preset → engine phases (first `maxSec` of the plan). Mirrors the app's
// presetPreviewPhases() but honors each phase's own modality. 'noise'-mode
// presets have no engine modality (and the live engine plays them as the
// steady carrier), so they render as a beat-0 monaural tone — identical to
// what loading the preset in Studio produces.
// ---------------------------------------------------------------------------
function enginePhases(preset, maxSec) {
  const out = [];
  let remaining = maxSec;
  for (const p of preset.spec.phases) {
    if (remaining <= 0) break;
    const d = Math.min(p.durationSec, remaining);
    if (d <= 0) continue;
    const mode = p.mode ?? 'binaural';
    out.push({
      durationSec: d,
      carrierHz: p.carrierHz,
      beatHz: mode === 'noise' ? 0 : p.beatHz,
      mode: mode === 'noise' ? 'monaural' : mode,
      gainDb: Math.min(0, p.gainDbFs),
    });
    remaining -= d;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Budget-fit duration: largest whole second keeping the total < 60 MB.
// ---------------------------------------------------------------------------
const bytesPerSec = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;
const perFileBytes = (sec) => sec * bytesPerSec + WAV_HEADER_BYTES;
let seconds = TARGET_SEC;
while (seconds > 1 && PRESETS.length * perFileBytes(seconds) > MAX_TOTAL_BYTES - 64 * 1024) seconds--;
if (seconds < TARGET_SEC) {
  console.log(
    `size guard: ${PRESETS.length} presets × ${TARGET_SEC}s stereo PCM16 would exceed 60 MB — ` +
      `rendering ${seconds}s per file instead (budget-fit).`,
  );
}

// ---------------------------------------------------------------------------
// Render + encode + hash + write.
// ---------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const files = [];
let totalBytes = 0;
for (const preset of PRESETS) {
  const phases = enginePhases(preset, seconds);
  if (phases.length === 0) {
    console.warn(`SKIP ${preset.id}: no renderable phases`);
    continue;
  }
  const rendered = renderSession({
    name: `preview:${preset.id}`,
    phases,
    crossfadeSec: XFADE_SEC,
    masterGainDb: MASTER_GAIN_DB,
    sampleRate: SAMPLE_RATE,
  });
  const wav = encodeWav(rendered.left, rendered.right, SAMPLE_RATE, 'pcm16');
  const bytes = wav.byteLength;
  const sha256 = createHash('sha256').update(wav).digest('hex');
  writeFileSync(path.join(OUT_DIR, `${preset.id}.wav`), wav);
  files.push({ id: preset.id, sha256, bytes });
  totalBytes += bytes;
  console.log(`${preset.id}.wav  ${(bytes / 1_048_576).toFixed(2)} MiB  sha256:${sha256.slice(0, 12)}…`);
}

// Drop stale previews not produced by this run.
const live = new Set(files.map((f) => `${f.id}.wav`));
for (const f of readdirSync(OUT_DIR)) {
  if (f.endsWith('.wav') && !live.has(f)) {
    rmSync(path.join(OUT_DIR, f));
    console.log(`removed stale ${f}`);
  }
}

const manifest = {
  version: 1,
  sampleRate: SAMPLE_RATE,
  format: 'pcm16-stereo',
  seconds,
  targetSeconds: TARGET_SEC,
  note:
    seconds < TARGET_SEC
      ? `per-file duration auto-reduced ${TARGET_SEC}s → ${seconds}s to keep the total under 60 MB`
      : 'full target duration rendered',
  files,
  totalBytes,
};
const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
writeFileSync(path.join(OUT_DIR, 'manifest.json'), manifestJson);

const grandTotal = totalBytes + Buffer.byteLength(manifestJson);
console.log(
  `\n${files.length}/${PRESETS.length} previews rendered @ ${seconds}s · total ${(grandTotal / 1_000_000).toFixed(1)} MB (guard < 60 MB)`,
);
if (!existsSync(path.join(OUT_DIR, 'manifest.json')) || grandTotal >= MAX_TOTAL_BYTES) {
  console.error(`SIZE GUARD FAILED: total ${grandTotal} bytes >= ${MAX_TOTAL_BYTES}`);
  process.exit(1);
}
