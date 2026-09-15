/**
 * Pre-rendered preset previews (public/previews/, built by
 * scripts/render-previews.mjs). The manifest pins each file's sha256 + byte
 * size; the Presets page prefers these files (instant, zero CPU) and falls
 * back to the live engine render path when the manifest is missing or does
 * not cover a preset id.
 */

import { useEffect, useState } from 'react';

export interface PreviewManifestEntry {
  id: string;
  sha256: string;
  bytes: number;
}

export interface PreviewManifest {
  version: number;
  sampleRate: number;
  format: string;
  /** Actual rendered seconds per file (budget-fit may be < targetSeconds). */
  seconds: number;
  targetSeconds: number;
  files: PreviewManifestEntry[];
  totalBytes: number;
}

/** Root-absolute URL convention (same as /stimulus_pack). */
export function previewUrl(id: string): string {
  return `/previews/${id}.wav`;
}

export const PREVIEW_MANIFEST_URL = '/previews/manifest.json';

/** File URL when the manifest covers `id`, else null (→ engine fallback). */
export function previewUrlFor(id: string, manifest: PreviewManifest | null): string | null {
  if (!manifest || !Array.isArray(manifest.files)) return null;
  return manifest.files.some((f) => f.id === id) ? previewUrl(id) : null;
}

function isManifest(v: unknown): v is PreviewManifest {
  if (!v || typeof v !== 'object') return false;
  const m = v as Partial<PreviewManifest>;
  return (
    Array.isArray(m.files) &&
    m.files.every(
      (f) =>
        !!f &&
        typeof f === 'object' &&
        typeof (f as PreviewManifestEntry).id === 'string' &&
        typeof (f as PreviewManifestEntry).sha256 === 'string' &&
        Number.isFinite((f as PreviewManifestEntry).bytes),
    )
  );
}

/**
 * Fetch the previews manifest once. Null while loading, after a network
 * failure, or when the payload is malformed — all of which route preview
 * buttons to the engine fallback.
 */
export function usePreviewManifest(): PreviewManifest | null {
  const [manifest, setManifest] = useState<PreviewManifest | null>(null);
  useEffect(() => {
    if (typeof fetch !== 'function') return;
    let live = true;
    fetch(PREVIEW_MANIFEST_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        if (live) setManifest(isManifest(j) ? j : null);
      })
      .catch(() => {
        /* no manifest shipped — engine fallback stays in effect */
      });
    return () => {
      live = false;
    };
  }, []);
  return manifest;
}
