/**
 * User presets — "SAVE AS PRESET" persistence (Studio modal).
 *
 * Versioned localStorage store: name + data-layer SessionSpec, CRUD, and
 * salvage-on-corrupt reads (a bad payload never crashes the session layer —
 * it degrades to an empty/partially-valid list). Pure functions take an
 * injectable Storage so the whole store is testable in node/happy-dom;
 * SessionContext holds the reactive copy.
 */

import type { Preset, SessionSpec } from '@/data/presets';

export const USER_PRESETS_STORAGE_KEY = 'open-sync:user-presets';
export const USER_PRESETS_VERSION = 1;

export interface UserPreset {
  id: string;
  name: string;
  spec: SessionSpec;
  createdAt: string; // ISO 8601
}

interface UserPresetFile {
  version: number;
  presets: UserPreset[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** True when an entry parsed from storage has the minimum viable shape. */
function isValidUserPreset(v: unknown): v is UserPreset {
  if (!v || typeof v !== 'object') return false;
  const p = v as Partial<UserPreset>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    !!p.spec &&
    Array.isArray(p.spec.phases) &&
    p.spec.phases.length > 0 &&
    p.spec.phases.every(
      (ph) =>
        !!ph &&
        typeof ph === 'object' &&
        Number.isFinite((ph as { durationSec?: unknown }).durationSec) &&
        (ph as { durationSec: number }).durationSec > 0 &&
        Number.isFinite((ph as { carrierHz?: unknown }).carrierHz) &&
        Number.isFinite((ph as { beatHz?: unknown }).beatHz),
    )
  );
}

/**
 * Read all user presets. Corrupt JSON, wrong versions, and malformed entries
 * are salvaged: unparseable payload → [], invalid entries dropped.
 */
export function loadUserPresets(storage: StorageLike | null = defaultStorage()): UserPreset[] {
  if (!storage) return [];
  let raw: string | null = null;
  try {
    raw = storage.getItem(USER_PRESETS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<UserPresetFile>;
    if (!parsed || parsed.version !== USER_PRESETS_VERSION || !Array.isArray(parsed.presets)) return [];
    return parsed.presets.filter(isValidUserPreset);
  } catch {
    return [];
  }
}

function persist(presets: UserPreset[], storage: StorageLike | null): void {
  if (!storage) return;
  try {
    const file: UserPresetFile = { version: USER_PRESETS_VERSION, presets };
    storage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(file));
  } catch {
    /* storage full/blocked — keep the in-memory list, don't crash the modal */
  }
}

let userPresetSeq = 0;

/**
 * Save a preset by name. Duplicate names (case-insensitive, trimmed) replace
 * the existing entry in place — "SAVE AS PRESET" twice with the same name
 * updates rather than stacking duplicates.
 */
export function saveUserPreset(
  name: string,
  spec: SessionSpec,
  storage: StorageLike | null = defaultStorage(),
): { presets: UserPreset[]; preset: UserPreset; replaced: boolean } {
  const clean = name.trim() || 'Untitled session';
  const presets = loadUserPresets(storage);
  const idx = presets.findIndex((p) => p.name.trim().toLowerCase() === clean.toLowerCase());
  const preset: UserPreset =
    idx >= 0
      ? { ...presets[idx], name: presets[idx].name, spec }
      : {
          id: `user-${Date.now().toString(36)}-${++userPresetSeq}`,
          name: clean,
          spec,
          createdAt: new Date().toISOString(),
        };
  const next = idx >= 0 ? presets.map((p, i) => (i === idx ? preset : p)) : [...presets, preset];
  persist(next, storage);
  return { presets: next, preset, replaced: idx >= 0 };
}

/** Delete by id. Returns the remaining list (also persisted). */
export function deleteUserPreset(
  id: string,
  storage: StorageLike | null = defaultStorage(),
): UserPreset[] {
  const next = loadUserPresets(storage).filter((p) => p.id !== id);
  persist(next, storage);
  return next;
}

/**
 * Adapt a user preset to the data-layer Preset shape so the existing
 * load/preview machinery (loadPreset, previewPreset) works unchanged.
 * Evidence-honest: user saves carry grade D and no citations.
 */
export function userPresetAsPreset(u: UserPreset): Preset {
  return {
    id: `user:${u.id}`,
    title: u.name,
    category: 'Experimental',
    spec: u.spec,
    grade: 'D',
    rationale: 'Saved from your own Studio session — personal configuration, no evidence grade.',
    citations: [],
  };
}
