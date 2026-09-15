import { describe, expect, it } from 'vitest';
import {
  JOURNAL_STORAGE_KEY,
  addEntry,
  createEntry,
  deserializeJournal,
  loadJournal,
  lucidRate,
  normalizeTags,
  removeEntry,
  saveJournal,
  serializeJournal,
  updateEntry,
  type DreamJournalEntry,
  type StorageLike,
} from '../journal';

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const T0 = new Date('2026-01-05T07:00:00.000Z');
const T1 = new Date('2026-01-06T07:30:00.000Z');

describe('journal CRUD', () => {
  it('creates entries with trimmed text, normalized tags, lucid flag', () => {
    const e = createEntry({ text: '  flying over the sea  ', tags: 'Flying, #Sea, flying', lucid: true }, T0);
    expect(e.text).toBe('flying over the sea');
    expect(e.tags).toEqual(['flying', 'sea']);
    expect(e.lucid).toBe(true);
    expect(e.createdIso).toBe(T0.toISOString());
    expect(e.id).toBeTruthy();
  });

  it('adds newest first without mutating the input', () => {
    const a = createEntry({ text: 'one' }, T0);
    const b = createEntry({ text: 'two' }, T1);
    const list = addEntry([a], b);
    expect(list[0]).toBe(b);
    expect(list.length).toBe(2);
  });

  it('updates text/tags/lucid and bumps updatedIso', () => {
    const a = createEntry({ text: 'one', tags: 'x' }, T0);
    const next = updateEntry([a], a.id, { text: 'edited', lucid: true, tags: ['y'] }, T1);
    expect(next[0].text).toBe('edited');
    expect(next[0].tags).toEqual(['y']);
    expect(next[0].lucid).toBe(true);
    expect(next[0].updatedIso).toBe(T1.toISOString());
    expect(next[0].createdIso).toBe(T0.toISOString());
  });

  it('removes by id and ignores unknown ids', () => {
    const a = createEntry({ text: 'one' }, T0);
    const b = createEntry({ text: 'two' }, T1);
    expect(removeEntry([a, b], a.id)).toEqual([b]);
    expect(removeEntry([a, b], 'nope').length).toBe(2);
  });

  it('computes the honest lucid base rate', () => {
    const a = createEntry({ text: 'a', lucid: true }, T0);
    const b = createEntry({ text: 'b' }, T0);
    expect(lucidRate([a, b])).toBe(0.5);
    expect(lucidRate([])).toBe(0);
  });
});

describe('tag normalization', () => {
  it('dedupes, lowercases, strips #, splits commas/whitespace, caps at 12', () => {
    expect(normalizeTags('Flying, #FLYING  water   #code')).toEqual(['flying', 'water', 'code']);
    expect(normalizeTags(['A', 'a', ' B '])).toEqual(['a', 'b']);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length).toBe(12);
    expect(normalizeTags('')).toEqual([]);
  });
});

describe('persistence serialization', () => {
  it('round-trips through serialize/deserialize', () => {
    const entries = [
      createEntry({ text: 'one', tags: 'a b', lucid: true }, T0),
      createEntry({ text: 'two' }, T1),
    ];
    const back = deserializeJournal(serializeJournal(entries));
    expect(back).toEqual(entries);
  });

  it('persists via StorageLike and reloads identically', () => {
    const s = memStorage();
    const entries = [createEntry({ text: 'persisted', lucid: true }, T0)];
    saveJournal(entries, s);
    expect(s.data.has(JOURNAL_STORAGE_KEY)).toBe(true);
    expect(loadJournal(s)).toEqual(entries);
  });

  it('throws on malformed JSON and wrong file shapes', () => {
    expect(() => deserializeJournal('not json')).toThrow();
    expect(() => deserializeJournal('{"version":2,"entries":[]}')).toThrow();
    expect(() => deserializeJournal('[1,2]')).toThrow();
    expect(() => deserializeJournal('{"version":1}')).toThrow();
  });

  it('salvage-skips invalid entries inside a valid file', () => {
    const good = createEntry({ text: 'ok' }, T0);
    const json = JSON.stringify({ version: 1, entries: [good, { id: 7 }, null, { ...good, tags: 'x' }] });
    const back = deserializeJournal(json);
    expect(back).toEqual([good]);
  });

  it('loadJournal resets to empty on corrupt payloads instead of crashing', () => {
    const s = memStorage();
    s.setItem(JOURNAL_STORAGE_KEY, '{corrupt');
    expect(loadJournal(s)).toEqual([]);
    expect(loadJournal(memStorage())).toEqual([]);
  });

  it('serialization is versioned and stable-shaped', () => {
    const parsed = JSON.parse(serializeJournal([createEntry({ text: 'x' }, T0)])) as {
      version: number;
      entries: DreamJournalEntry[];
    };
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.entries[0]).sort()).toEqual(
      ['createdIso', 'id', 'lucid', 'tags', 'text', 'updatedIso'].sort(),
    );
  });
});
