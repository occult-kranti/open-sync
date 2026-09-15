/**
 * W-A pre-rendered preview tests (node — reads public/previews/ built by
 * scripts/render-previews.mjs):
 *  - manifest covers every preset in src/data/presets.ts (valid, unique ids)
 *  - each manifest entry's file exists with matching byte size + sha256
 *  - total stays under the 60 MB guard
 *  - WAV headers are valid (RIFF/WAVE, PCM16, stereo, 48 kHz, sized right)
 *  - preview-URL selection: file path when the manifest covers the id,
 *    engine fallback (null) when it doesn't / manifest missing
 *
 * Run: `npm test`.
 */
// @vitest-environment node

// @ts-expect-error -- node types excluded from tsconfig.app on purpose
import { createHash } from 'node:crypto';
// @ts-expect-error -- node types excluded from tsconfig.app on purpose
import { existsSync, readFileSync, statSync } from 'node:fs';
// @ts-expect-error -- node types excluded from tsconfig.app on purpose
import path from 'node:path';
// @ts-expect-error -- node types excluded from tsconfig.app on purpose
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/data/presets';
import {
  previewUrl,
  previewUrlFor,
  type PreviewManifest,
} from '../session/previewManifest';

const PREVIEWS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/previews');
const SIZE_GUARD_BYTES = 60_000_000;

const manifest = JSON.parse(
  readFileSync(path.join(PREVIEWS_DIR, 'manifest.json'), 'utf8'),
) as PreviewManifest;

describe('previews manifest — coverage + integrity', () => {
  it('covers every preset exactly once, with valid ids', () => {
    expect(manifest.files).toHaveLength(PRESETS.length);
    const seen = new Set<string>();
    for (const f of manifest.files) {
      expect(f.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(seen.has(f.id)).toBe(false);
      seen.add(f.id);
    }
    for (const p of PRESETS) {
      expect(seen.has(p.id), `manifest covers ${p.id}`).toBe(true);
    }
  });

  it('records the render contract (48 kHz pcm16 stereo, budget-fit seconds)', () => {
    expect(manifest.sampleRate).toBe(48000);
    expect(manifest.format).toBe('pcm16-stereo');
    expect(manifest.seconds).toBeGreaterThanOrEqual(1);
    expect(manifest.seconds).toBeLessThanOrEqual(manifest.targetSeconds);
  });

  it('every file exists with matching bytes + sha256', { timeout: 60000 }, () => {
    for (const f of manifest.files) {
      const fp = path.join(PREVIEWS_DIR, `${f.id}.wav`);
      expect(existsSync(fp), `${f.id}.wav exists`).toBe(true);
      expect(statSync(fp).size, `${f.id}.wav size matches manifest`).toBe(f.bytes);
      const sha = createHash('sha256').update(readFileSync(fp)).digest('hex');
      expect(sha, `${f.id}.wav sha256 matches manifest`).toBe(f.sha256);
    }
  });

  it('total stays under the 60 MB guard', () => {
    const total = manifest.files.reduce((a, f) => a + f.bytes, 0);
    expect(total).toBe(manifest.totalBytes);
    expect(total).toBeLessThan(SIZE_GUARD_BYTES);
  });
});

describe('preview WAVs — header validity (sampled presets)', () => {
  const SAMPLED = ['sleep-delta-descent', 'exp-gamma-40', 'focus-pink-noise', 'infant-womb-hush'];
  for (const id of SAMPLED) {
    it(`${id}.wav is a well-formed 48 kHz PCM16 stereo RIFF`, () => {
      const b = readFileSync(path.join(PREVIEWS_DIR, `${id}.wav`));
      expect(b.toString('ascii', 0, 4)).toBe('RIFF');
      expect(b.toString('ascii', 8, 12)).toBe('WAVE');
      expect(b.toString('ascii', 12, 16)).toBe('fmt ');
      expect(b.readUInt16LE(20)).toBe(1); // PCM
      expect(b.readUInt16LE(22)).toBe(2); // stereo
      expect(b.readUInt32LE(24)).toBe(48000); // sample rate
      expect(b.readUInt32LE(28)).toBe(48000 * 2 * 2); // byte rate
      expect(b.readUInt16LE(32)).toBe(4); // block align
      expect(b.readUInt16LE(34)).toBe(16); // bits per sample
      expect(b.toString('ascii', 36, 40)).toBe('data');
      expect(b.readUInt32LE(40)).toBe(b.length - 44); // data chunk fills the file
      expect(b.readUInt32LE(4)).toBe(b.length - 8); // RIFF size field
      // Actually audible (not a silent file).
      let peak = 0;
      for (let i = 44; i < b.length; i += 2) {
        const v = Math.abs(b.readInt16LE(i));
        if (v > peak) peak = v;
      }
      expect(peak).toBeGreaterThan(100);
    });
  }
});

describe('preview URL selection — file vs engine fallback', () => {
  it('returns /previews/<id>.wav when the manifest covers the id', () => {
    const id = PRESETS[0].id;
    expect(previewUrlFor(id, manifest)).toBe(`/previews/${id}.wav`);
    expect(previewUrl(id)).toBe(`/previews/${id}.wav`);
  });

  it('returns null (engine fallback) for ids the manifest does not cover', () => {
    expect(previewUrlFor('no-such-preset', manifest)).toBeNull();
  });

  it('returns null when the manifest is missing or malformed', () => {
    expect(previewUrlFor(PRESETS[0].id, null)).toBeNull();
    expect(previewUrlFor(PRESETS[0].id, { files: [] } as unknown as PreviewManifest)).toBeNull();
  });

  it('user presets are never file-backed (engine render path)', () => {
    expect(previewUrlFor('user:user-abc', manifest)).toBeNull();
  });
});
