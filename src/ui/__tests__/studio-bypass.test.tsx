/**
 * Swarm F3 — Studio noise-mixer / layers master bypass tests:
 *  - Export exclusion (pure): buildExportPhases OMITS noise/bowl/nature keys
 *    for bypassed sections; renderSession output for a bypassed spec is
 *    bit-identical to the bare tone render and differs from the layered one.
 *  - Click-free bypass (Advisor AC): LiveEngine section buses ramp via
 *    setTargetAtTime(…, 0.05) — no gain.value step, no source stop() —
 *    and a pre-start bypass is honored at graph build time.
 *  - Session state: toggles persist in the snapshot, keep fader positions,
 *    and fan out to the engine; UI: LED + label, dimmed sections.
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { renderSession, type NoiseColor } from '@/engine';
import {
  SessionProvider,
  buildExportPhases,
  useSession,
  type UiPhase,
} from '../session/SessionContext';
import { LiveEngine } from '../audio/liveEngine';
import Studio from '@/pages/Studio';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof Element !== 'undefined') {
  (Element.prototype as unknown as Record<string, unknown>).animate = undefined;
}

const mobileState = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobileState.mobile }));

// ---------------------------------------------------------------------------
// Pure export exclusion
// ---------------------------------------------------------------------------

/** Typed-array equality without node Buffer (tests compile under the DOM tsconfig). */
function arrEq(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const PHASES: UiPhase[] = [{ id: 'ph-1', durationSec: 0.5, beatHz: 10 }];
const NOISE: Record<NoiseColor, number> = {
  white: -Infinity,
  pink: -20,
  brown: -Infinity,
  blue: -Infinity,
  violet: -Infinity,
  grey: -Infinity,
};
const LAYERS_ON = {
  noiseDb: NOISE,
  noiseOn: true,
  nature: { on: true, kind: 'rain' as const, db: -30 },
  bowl: { on: true, baseHz: 136.1, db: -30, lock: false },
  layersOn: true,
};

describe('buildExportPhases — bypassed sections are omitted from the export', () => {
  it('all enabled: noise/bowl/nature present on every phase', () => {
    const phases = buildExportPhases(PHASES, 200, 'binaural', LAYERS_ON);
    expect(phases).toHaveLength(1);
    expect(phases[0].noise?.color).toBe('pink'); // loudest color wins, as before
    expect(phases[0].bowl?.baseHz).toBe(136.1);
    expect(phases[0].nature?.kind).toBe('rain');
  });

  it('noise bypassed: no noise key, layers still present', () => {
    const phases = buildExportPhases(PHASES, 200, 'binaural', { ...LAYERS_ON, noiseOn: false });
    expect('noise' in phases[0]).toBe(false);
    expect(phases[0].bowl).toBeTruthy();
    expect(phases[0].nature).toBeTruthy();
  });

  it('layers bypassed: no bowl/nature keys, noise still present', () => {
    const phases = buildExportPhases(PHASES, 200, 'binaural', { ...LAYERS_ON, layersOn: false });
    expect('bowl' in phases[0]).toBe(false);
    expect('nature' in phases[0]).toBe(false);
    expect(phases[0].noise).toBeTruthy();
  });

  it('both bypassed: phases carry tones only — export equals the bare render bit-for-bit', () => {
    const bare = buildExportPhases(PHASES, 200, 'binaural', {
      noiseDb: { ...NOISE, pink: -Infinity },
      noiseOn: true,
      nature: { on: false, kind: 'rain', db: -30 },
      bowl: { on: false, baseHz: 136.1, db: -30, lock: false },
      layersOn: true,
    });
    const bypassed = buildExportPhases(PHASES, 200, 'binaural', { ...LAYERS_ON, noiseOn: false, layersOn: false });
    const layered = buildExportPhases(PHASES, 200, 'binaural', LAYERS_ON);

    const rBare = renderSession({ name: 't', phases: bare, masterGainDb: -6 });
    const rBypassed = renderSession({ name: 't', phases: bypassed, masterGainDb: -6 });
    const rLayered = renderSession({ name: 't', phases: layered, masterGainDb: -6 });

    // Bypassed render == bare tone render (deterministic engine, same seed).
    expect(arrEq(rBypassed.left, rBare.left)).toBe(true);
    expect(arrEq(rBypassed.right, rBare.right)).toBe(true);
    // Layered render genuinely differs (the bypass is what removes content).
    expect(arrEq(rLayered.left, rBypassed.left)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click-free bypass ramps (Advisor AC) — LiveEngine with a fake AudioContext
// ---------------------------------------------------------------------------

class FakeParam {
  value = 1;
  log: [string, ...unknown[]][] = [];
  setTargetAtTime(...args: unknown[]) {
    this.log.push(['setTargetAtTime', ...args]);
  }
  cancelScheduledValues(...args: unknown[]) {
    this.log.push(['cancelScheduledValues', ...args]);
  }
  setValueAtTime(...args: unknown[]) {
    this.log.push(['setValueAtTime', ...args]);
  }
  linearRampToValueAtTime(...args: unknown[]) {
    this.log.push(['linearRampToValueAtTime', ...args]);
  }
}

class FakeNode {
  connect() {}
  disconnect() {}
}

const fakeGains: { gain: FakeParam }[] = [];
const fakeSources: { stop: ReturnType<typeof vi.fn> }[] = [];

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode();
  createGain() {
    const g = Object.assign(new FakeNode(), { gain: new FakeParam() });
    fakeGains.push(g);
    return g;
  }
  createAnalyser() {
    return Object.assign(new FakeNode(), {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0,
      getByteTimeDomainData() {},
      getFloatTimeDomainData() {},
      getByteFrequencyData() {},
    });
  }
  createChannelSplitter() {
    return new FakeNode();
  }
  createChannelMerger() {
    return new FakeNode();
  }
  createOscillator() {
    return Object.assign(new FakeNode(), { type: 'sine', frequency: new FakeParam(), start() {}, stop() {} });
  }
  createBufferSource() {
    const src = Object.assign(new FakeNode(), {
      buffer: null as unknown,
      loop: false,
      start() {},
      stop: vi.fn(),
      onended: null,
    });
    fakeSources.push(src);
    return src;
  }
  createBuffer(_ch: number, len: number, _sr: number) {
    return { getChannelData: () => new Float32Array(len) };
  }
  resume() {}
  suspend() {}
}

describe('LiveEngine section bypass — click-free ramps', () => {
  beforeEach(() => {
    fakeGains.length = 0;
    fakeSources.length = 0;
    (globalThis as Record<string, unknown>).AudioContext = FakeAudioContext;
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).AudioContext;
  });

  it('bypass ramps the section bus to 0 (50 ms TC); no gain.value step, no source stop', () => {
    const eng = new LiveEngine();
    eng.start(); // ensureGraph gain order: 0 bus, 1 master, 2 noiseBus, 3 layerBus
    const noiseBus = fakeGains[2];
    const layerBus = fakeGains[3];
    eng.setNoiseLevel('pink', -20); // live noise source running through noiseBus
    const srcCount = fakeSources.length;
    expect(srcCount).toBeGreaterThan(0);

    eng.setNoiseBypass(false);
    expect(noiseBus.gain.log).toContainEqual(['setTargetAtTime', 0, 0, 0.05]);
    expect(noiseBus.gain.value).toBe(1); // ramped, never stepped
    eng.setLayersBypass(false);
    expect(layerBus.gain.log).toContainEqual(['setTargetAtTime', 0, 0, 0.05]);
    expect(layerBus.gain.value).toBe(1);
    // No source was stopped or torn down — phase-continuous re-enable.
    for (const s of fakeSources) expect(s.stop).not.toHaveBeenCalled();

    eng.setNoiseBypass(true);
    expect(noiseBus.gain.log).toContainEqual(['setTargetAtTime', 1, 0, 0.05]);
    eng.setLayersBypass(true);
    expect(layerBus.gain.log).toContainEqual(['setTargetAtTime', 1, 0, 0.05]);
  });

  it('bypass before the first start is honored at graph build (bus starts at 0)', () => {
    const eng = new LiveEngine();
    eng.setLayersBypass(false); // no ctx yet — recorded, applied on build
    eng.start();
    const layerBus = fakeGains[3];
    expect(layerBus.gain.value).toBe(0);
    const noiseBus = fakeGains[2];
    expect(noiseBus.gain.value).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Session state + Studio UI
// ---------------------------------------------------------------------------

let roots: Root[] = [];
let containers: HTMLElement[] = [];
let session: ReturnType<typeof useSession>;

function Probe() {
  session = useSession();
  return null;
}

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(node));
  return container;
}

async function mountSession(children?: React.ReactNode) {
  return mount(
    <MemoryRouter>
      <SessionProvider>
        <Probe />
        {children}
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('session bypass state', () => {
  beforeEach(() => {
    roots = [];
    containers = [];
    mobileState.mobile = false;
    window.localStorage.clear();
    vi.spyOn(LiveEngine.prototype, 'setNoiseBypass').mockImplementation(() => {});
    vi.spyOn(LiveEngine.prototype, 'setLayersBypass').mockImplementation(() => {});
    vi.spyOn(LiveEngine.prototype, 'setNoiseLevel').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => root.unmount());
    }
    for (const c of containers) c.remove();
    document.body.innerHTML = '';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults: both sections enabled', async () => {
    await mountSession();
    expect(session.noiseOn).toBe(true);
    expect(session.layersOn).toBe(true);
  });

  it('noise bypass: ramps the engine section, keeps fader state, marks dirty', async () => {
    await mountSession();
    await act(async () => session.setNoiseDb('pink', -20));
    expect(LiveEngine.prototype.setNoiseLevel).toHaveBeenCalledWith('pink', -20);

    await act(async () => session.setNoiseOn(false));
    expect(session.noiseOn).toBe(false);
    expect(LiveEngine.prototype.setNoiseBypass).toHaveBeenCalledWith(false);
    expect(session.dirty).toBe(true);
    // Fader positions are kept while bypassed and still flow to the engine
    // (the section bus is what silences them).
    expect(session.noiseDb.pink).toBe(-20);
    await act(async () => session.setNoiseDb('white', -30));
    expect(LiveEngine.prototype.setNoiseLevel).toHaveBeenCalledWith('white', -30);
    expect(session.noiseDb.white).toBe(-30);

    await act(async () => session.setNoiseOn(true));
    expect(session.noiseOn).toBe(true);
    expect(LiveEngine.prototype.setNoiseBypass).toHaveBeenLastCalledWith(true);
  });

  it('layers bypass: ramps the layer bus, keeps per-layer settings', async () => {
    await mountSession();
    await act(async () => session.setNature({ on: true }));
    await act(async () => session.setBowl({ on: true }));
    await act(async () => session.setLayersOn(false));
    expect(session.layersOn).toBe(false);
    expect(LiveEngine.prototype.setLayersBypass).toHaveBeenCalledWith(false);
    expect(session.nature.on).toBe(true);
    expect(session.bowl.on).toBe(true);
    await act(async () => session.setLayersOn(true));
    expect(LiveEngine.prototype.setLayersBypass).toHaveBeenLastCalledWith(true);
  });

  it('Studio UI: noise mixer toggle — LED + label, dims the section, restores', async () => {
    const c = await mount(
      <MemoryRouter>
        <SessionProvider>
          <Probe />
          <Studio />
        </SessionProvider>
      </MemoryRouter>,
    );
    const toggle = c.querySelector<HTMLButtonElement>('[data-testid="noise-mixer-toggle"]')!;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('MIX ON');
    const body = c.querySelector<HTMLElement>('[data-testid="noise-mixer-body"]')!;
    expect(body.getAttribute('data-dimmed')).toBeNull();

    await act(async () => toggle.click());
    expect(session.noiseOn).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toContain('BYPASSED');
    expect(body.getAttribute('data-dimmed')).toBe('true');
    expect(body.style.opacity).toBe('0.45');
    // LED present in both states (visual state carried by the Led element).
    expect(toggle.querySelector('span')).toBeTruthy();

    await act(async () => toggle.click());
    expect(session.noiseOn).toBe(true);
    expect(body.style.opacity).toBe('1');
  });

  it('Studio UI: layers toggle — LED + label, dims the section', async () => {
    const c = await mount(
      <MemoryRouter>
        <SessionProvider>
          <Probe />
          <Studio />
        </SessionProvider>
      </MemoryRouter>,
    );
    const toggle = c.querySelector<HTMLButtonElement>('[data-testid="layers-toggle"]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('LAYERS ON');
    const body = c.querySelector<HTMLElement>('[data-testid="layers-body"]')!;
    expect(body.style.opacity).toBe('1');

    await act(async () => toggle.click());
    expect(session.layersOn).toBe(false);
    expect(toggle.textContent).toContain('BYPASSED');
    expect(body.getAttribute('data-dimmed')).toBe('true');
    expect(body.style.opacity).toBe('0.45');
    // Per-layer rows still show their own LED state (settings kept).
    expect(c.textContent).toContain('NATURE');
    expect(c.textContent).toContain('SINGING BOWLS');
  });
});
