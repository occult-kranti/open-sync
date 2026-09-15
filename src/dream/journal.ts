/**
 * Dream journal — localStorage-backed CRUD with versioned serialization.
 * Pure and node-testable: storage is an injectable StorageLike.
 * Entries never leave the device (per dream protocol safety note).
 */

export interface DreamJournalEntry {
  id: string;
  createdIso: string;
  updatedIso: string;
  text: string;
  tags: string[];
  /** Lucidity flag — feeds the honest base-rate stat. */
  lucid: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const JOURNAL_STORAGE_KEY = 'open-sync.dream-journal.v1';

// ---------------------------------------------------------------------------
// CRUD (all functions return new arrays; no mutation of inputs)
// ---------------------------------------------------------------------------

let idSeq = 0;
const newId = (nowIso: string) =>
  `dj-${nowIso.replace(/[^0-9]/g, '')}-${(++idSeq).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Normalize a tag list (or comma-separated raw string) into clean tags. */
export function normalizeTags(raw: string | readonly string[]): string[] {
  const parts = typeof raw === 'string' ? raw.split(/[,\s]+/) : [...raw];
  const seen = new Set<string>();
  for (const p of parts) {
    const t = p.trim().toLowerCase().replace(/^#/, '');
    if (t && !seen.has(t)) seen.add(t);
  }
  return [...seen].slice(0, 12);
}

export function createEntry(
  input: { text: string; tags?: string | readonly string[]; lucid?: boolean },
  now: Date = new Date(),
): DreamJournalEntry {
  const iso = now.toISOString();
  return {
    id: newId(iso),
    createdIso: iso,
    updatedIso: iso,
    text: input.text.trim(),
    tags: normalizeTags(input.tags ?? []),
    lucid: input.lucid ?? false,
  };
}

/** Prepend (newest first). */
export function addEntry(
  entries: readonly DreamJournalEntry[],
  entry: DreamJournalEntry,
): DreamJournalEntry[] {
  return [entry, ...entries];
}

export function updateEntry(
  entries: readonly DreamJournalEntry[],
  id: string,
  patch: Partial<Pick<DreamJournalEntry, 'text' | 'tags' | 'lucid'>>,
  now: Date = new Date(),
): DreamJournalEntry[] {
  return entries.map((e) =>
    e.id === id
      ? {
          ...e,
          ...(patch.text !== undefined ? { text: patch.text } : {}),
          ...(patch.tags !== undefined ? { tags: normalizeTags(patch.tags) } : {}),
          ...(patch.lucid !== undefined ? { lucid: patch.lucid } : {}),
          updatedIso: now.toISOString(),
        }
      : e,
  );
}

export function removeEntry(
  entries: readonly DreamJournalEntry[],
  id: string,
): DreamJournalEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** Honest base-rate stat: lucid fraction of entries. */
export function lucidRate(entries: readonly DreamJournalEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.filter((e) => e.lucid).length / entries.length;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface JournalFile {
  version: 1;
  entries: DreamJournalEntry[];
}

function isValidEntry(x: unknown): x is DreamJournalEntry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.createdIso === 'string' &&
    typeof e.updatedIso === 'string' &&
    typeof e.text === 'string' &&
    Array.isArray(e.tags) &&
    e.tags.every((t) => typeof t === 'string') &&
    typeof e.lucid === 'boolean'
  );
}

export function serializeJournal(entries: readonly DreamJournalEntry[]): string {
  const file: JournalFile = { version: 1, entries: [...entries] };
  return JSON.stringify(file, null, 2);
}

/**
 * Parse a serialized journal. Throws on malformed JSON or wrong shape;
 * salvage-skips individual invalid entries.
 */
export function deserializeJournal(json: string): DreamJournalEntry[] {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('dream journal: not an object');
  }
  const file = parsed as Partial<JournalFile>;
  if (file.version !== 1 || !Array.isArray(file.entries)) {
    throw new Error('dream journal: unsupported file shape');
  }
  return (file.entries as unknown[]).filter(isValidEntry);
}

export function saveJournal(
  entries: readonly DreamJournalEntry[],
  storage: StorageLike,
  key: string = JOURNAL_STORAGE_KEY,
): void {
  storage.setItem(key, serializeJournal(entries));
}

/** Load journal; corrupt payloads reset to empty rather than crashing the page. */
export function loadJournal(storage: StorageLike, key: string = JOURNAL_STORAGE_KEY): DreamJournalEntry[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    return deserializeJournal(raw);
  } catch {
    return [];
  }
}
