/**
 * W-A user-preset store tests (SAVE AS PRESET persistence):
 *  - persistence round-trip through injected storage
 *  - duplicate-name handling: same name (case-insensitive) replaces in place
 *  - corrupt-storage salvage: bad JSON → [], malformed entries dropped
 *  - delete removes only the target
 *  - SessionContext wiring: saveCurrentAsPreset snapshots the front panel and
 *    updates state + storage; deleteUserPreset action; userPresetAsPreset
 *    adapts to the data-layer Preset shape (grade D, no citations)
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  USER_PRESETS_STORAGE_KEY,
  deleteUserPreset,
  loadUserPresets,
  saveUserPreset,
  userPresetAsPreset,
} from '../session/userPresets';
import { SessionProvider, useSession } from '../session/SessionContext';
import { LiveEngine } from '../audio/liveEngine';
import type { SessionSpec } from '@/data/presets';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function memStorage(initial?: string): StorageLike & { dump: () => string | null } {
  let value = initial ?? null;
  return {
    getItem: (k: string) => (k === USER_PRESETS_STORAGE_KEY ? value : null),
    setItem: (k: string, v: string) => {
      if (k === USER_PRESETS_STORAGE_KEY) value = v;
    },
    dump: () => value,
  };
}

const SPEC_A: SessionSpec = {
  autoShutoff: true,
  phases: [{ name: 'p1', durationSec: 600, carrierHz: 200, beatHz: 10, gainDbFs: -6 }],
};
const SPEC_B: SessionSpec = {
  autoShutoff: true,
  phases: [
    { name: 'in', durationSec: 120, carrierHz: 180, beatHz: 6, gainDbFs: -8 },
    { name: 'hold', durationSec: 900, carrierHz: 180, beatHz: 4, gainDbFs: -8 },
  ],
};

describe('userPresets store — persistence round-trip', () => {
  it('save then load returns the same name + spec', () => {
    const st = memStorage();
    const { preset } = saveUserPreset('Evening wind-down', SPEC_A, st);
    expect(preset.id).toMatch(/^user-/);
    expect(preset.createdAt).toBeTruthy();
    const loaded = loadUserPresets(st);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Evening wind-down');
    expect(loaded[0].spec).toEqual(SPEC_A);
  });

  it('persists as a versioned JSON payload', () => {
    const st = memStorage();
    saveUserPreset('A', SPEC_A, st);
    const parsed = JSON.parse(st.dump()!);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.presets)).toBe(true);
  });

  it('empty/blank names fall back to "Untitled session"', () => {
    const st = memStorage();
    const { preset } = saveUserPreset('   ', SPEC_A, st);
    expect(preset.name).toBe('Untitled session');
  });
});

describe('userPresets store — duplicate-name handling', () => {
  it('same name replaces in place (no stacking, spec updated)', () => {
    const st = memStorage();
    const first = saveUserPreset('Focus block', SPEC_A, st);
    const second = saveUserPreset('Focus block', SPEC_B, st);
    expect(first.replaced).toBe(false);
    expect(second.replaced).toBe(true);
    expect(second.preset.id).toBe(first.preset.id); // stable id
    const loaded = loadUserPresets(st);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].spec).toEqual(SPEC_B);
  });

  it('name match is case-insensitive and trims whitespace', () => {
    const st = memStorage();
    saveUserPreset('Deep Work', SPEC_A, st);
    const again = saveUserPreset('  deep work ', SPEC_B, st);
    expect(again.replaced).toBe(true);
    expect(loadUserPresets(st)).toHaveLength(1);
    expect(loadUserPresets(st)[0].name).toBe('Deep Work'); // original casing kept
  });

  it('different names coexist', () => {
    const st = memStorage();
    saveUserPreset('One', SPEC_A, st);
    saveUserPreset('Two', SPEC_B, st);
    expect(loadUserPresets(st).map((p) => p.name)).toEqual(['One', 'Two']);
  });
});

describe('userPresets store — corrupt-storage salvage', () => {
  it('unparseable JSON degrades to an empty list (never throws)', () => {
    const st = memStorage('{not json at all');
    expect(loadUserPresets(st)).toEqual([]);
  });

  it('wrong version degrades to an empty list', () => {
    const st = memStorage(JSON.stringify({ version: 99, presets: [] }));
    expect(loadUserPresets(st)).toEqual([]);
  });

  it('malformed entries are dropped, valid ones survive', () => {
    const good = {
      id: 'user-x',
      name: 'Good',
      spec: SPEC_A,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const payload = {
      version: 1,
      presets: [
        good,
        null,
        { id: 'user-y', name: 'no spec' },
        { id: 'user-z', name: 'bad phases', spec: { phases: [{ durationSec: -5 }] } },
        { id: '', name: 'no id', spec: SPEC_A },
      ],
    };
    const st = memStorage(JSON.stringify(payload));
    const loaded = loadUserPresets(st);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('user-x');
  });

  it('save after corruption starts fresh instead of crashing', () => {
    const st = memStorage('###');
    const { presets } = saveUserPreset('Recovered', SPEC_A, st);
    expect(presets.map((p) => p.name)).toEqual(['Recovered']);
    expect(loadUserPresets(st)).toHaveLength(1);
  });
});

describe('userPresets store — delete', () => {
  it('removes only the target and persists the remainder', () => {
    const st = memStorage();
    const a = saveUserPreset('A', SPEC_A, st).preset;
    const b = saveUserPreset('B', SPEC_B, st).preset;
    const next = deleteUserPreset(a.id, st);
    expect(next.map((p) => p.id)).toEqual([b.id]);
    expect(loadUserPresets(st).map((p) => p.id)).toEqual([b.id]);
  });

  it('deleting an unknown id is a no-op', () => {
    const st = memStorage();
    saveUserPreset('A', SPEC_A, st);
    expect(deleteUserPreset('user-nope', st)).toHaveLength(1);
  });
});

describe('userPresetAsPreset — data-layer adapter', () => {
  it('maps to a Preset with namespaced id, grade D, no citations', () => {
    const st = memStorage();
    const u = saveUserPreset('Mine', SPEC_B, st).preset;
    const p = userPresetAsPreset(u);
    expect(p.id).toBe(`user:${u.id}`);
    expect(p.title).toBe('Mine');
    expect(p.spec).toEqual(SPEC_B);
    expect(p.grade).toBe('D');
    expect(p.citations).toEqual([]);
    expect(p.rationale).not.toMatch(/proven|clinically/i);
  });
});

// ------------------------------------------------------- SessionContext wiring

describe('SessionContext user-preset wiring', () => {
  let roots: Root[] = [];
  let containers: HTMLElement[] = [];
  let session: ReturnType<typeof useSession>;

  function Probe() {
    session = useSession();
    return null;
  }

  beforeEach(() => {
    roots = [];
    containers = [];
    window.localStorage.clear();
    // No AudioContext in happy-dom — transport edge stubbed.
    vi.spyOn(LiveEngine.prototype, 'start').mockReturnValue(true);
  });

  afterEach(async () => {
    for (const root of roots) await act(async () => root.unmount());
    for (const c of containers) c.remove();
    document.body.innerHTML = '';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saveCurrentAsPreset snapshots the panel, updates state + storage; deleteUserPreset removes it', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    containers.push(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () =>
      root.render(
        <SessionProvider>
          <Probe />
        </SessionProvider>,
      ),
    );
    expect(session.userPresets).toEqual([]);

    let saved!: ReturnType<typeof session.saveCurrentAsPreset>;
    await act(async () => {
      saved = session.saveCurrentAsPreset('My evening session');
    });
    expect(session.userPresets).toHaveLength(1);
    expect(session.userPresets[0].id).toBe(saved.id);
    // Snapshot carries the current panel: default phases, carrier, mode.
    expect(saved.spec.phases.length).toBe(session.phases.length);
    expect(saved.spec.phases[0].carrierHz).toBe(session.carrierHz);
    expect(saved.spec.phases[0].beatHz).toBe(session.phases[0].beatHz);
    expect(saved.spec.phases[0].mode).toBe(session.mode);
    // Persisted.
    expect(window.localStorage.getItem(USER_PRESETS_STORAGE_KEY)).toContain('My evening session');
    // Saving counts as a clean load of that named preset.
    expect(session.presetName).toBe('My evening session');
    expect(session.dirty).toBe(false);

    await act(async () => session.deleteUserPreset(saved.id));
    expect(session.userPresets).toEqual([]);
    expect(loadUserPresets()).toEqual([]);
  });
});
