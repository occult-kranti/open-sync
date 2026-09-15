/**
 * Swarm V2 — playability + info UI tests (happy-dom):
 *  - InfoPopover opens/closes (tap, Esc, tap-outside), renders the FEATURES
 *    plot explainer by id (single source — text asserted against the dataset),
 *    clamped width class, bottom-sheet below md, z-order below panic surfaces
 *  - Preset preview: engine preview called, first-phase params correct, one
 *    preview at a time, stop on second tap, panic clears previews
 *  - Experiment stimulus button: WAV-file path when shipped, else engine
 *    render derived from the pack filename grammar
 *  - Banned-claim lint on all new/changed UI copy
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { FEATURES } from '@/docs/features';
import { PRESETS } from '@/data/presets';
import { InfoPopover } from '../components/InfoPopover';
import { LiveEngine } from '../audio/liveEngine';
import { SessionProvider, presetPreviewPhases, useSession } from '../session/SessionContext';
import Presets from '../../pages/Presets';
import { stimulusPlan } from '../../pages/research/ExperimentLab';
// vite `?raw` sources for the banned-claim lint on new UI copy.
import popoverSrc from '../components/InfoPopover.tsx?raw';
import presetsSrc from '../../pages/Presets.tsx?raw';
import replicationSrc from '../../pages/Replication.tsx?raw';
import experimentLabSrc from '../../pages/research/ExperimentLab.tsx?raw';
import cymaticsSrc from '../../pages/Cymatics.tsx?raw';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// happy-dom's WAAPI implementation rejects on Animation.cancel during
// framer-motion unmount cleanup; force framer-motion onto its rAF fallback.
if (typeof Element !== 'undefined') {
  (Element.prototype as unknown as Record<string, unknown>).animate = undefined;
}

type ChangeFn = () => void;

/** Same viewport mock as the mobile-shell tests (matchMedia + innerWidth). */
function mockViewport(width: number) {
  const listeners = new Set<ChangeFn>();
  const mql = {
    matches: width < 768,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn((type: string, fn: ChangeFn) => {
      if (type === 'change') listeners.add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: ChangeFn) => {
      if (type === 'change') listeners.delete(fn);
    }),
    addListener: (fn: ChangeFn) => listeners.add(fn),
    removeListener: (fn: ChangeFn) => listeners.delete(fn),
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
}

let roots: Root[] = [];
let containers: HTMLElement[] = [];

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(node));
  return container;
}

beforeEach(() => {
  roots = [];
  containers = [];
});

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount());
  }
  for (const c of containers) c.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------- InfoPopover

describe('InfoPopover', () => {
  // GradeBadge (rendered for graded entries) needs a Router context.
  const pop = (featureId: string) => mount(
    <MemoryRouter>
      <InfoPopover featureId={featureId} />
    </MemoryRouter>,
  );

  it('opens on tap and renders the FEATURES plot explainer by id (single source)', async () => {
    mockViewport(1280);
    const entry = FEATURES.find((f) => f.id === 'spectrum-analyzer')!;
    const c = await pop('spectrum-analyzer');
    const trigger = c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await act(async () => trigger.click());
    const panel = document.querySelector<HTMLElement>('[data-testid="info-popover-panel"]');
    expect(panel).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Text is asserted against the dataset — no duplicated strings.
    expect(document.querySelector('[data-testid="info-axes"]')!.textContent).toBe(entry.plot!.axes);
    expect(document.querySelector('[data-testid="info-good"]')!.textContent).toBe(entry.plot!.good);
    expect(document.querySelector('[data-testid="info-bad"]')!.textContent).toBe(entry.plot!.bad);
    expect(panel!.textContent).toContain(entry.name.toUpperCase());
    // Clamped width class (never overflows a 360px viewport).
    expect(panel!.className).toContain('max-w-[360px]');
    // Z-order below the panic surfaces (overlay z-90, bottom bar z-100).
    expect(parseInt(panel!.style.zIndex, 10)).toBeLessThan(90);
  });

  it('closes on Esc and returns focus to the trigger', async () => {
    mockViewport(1280);
    const c = await pop('dose-gauge');
    const trigger = c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!;
    trigger.focus();
    await act(async () => trigger.click());
    expect(document.querySelector('[data-testid="info-popover-panel"]')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(document.querySelector('[data-testid="info-popover-panel"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on tap-outside', async () => {
    mockViewport(1280);
    const c = await pop('dose-gauge');
    await act(async () => c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!.click());
    expect(document.querySelector('[data-testid="info-popover-panel"]')).toBeTruthy();
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(document.querySelector('[data-testid="info-popover-panel"]')).toBeNull();
  });

  it('renders the simple+howTo fallback for features without a plot explainer', async () => {
    mockViewport(1280);
    const entry = FEATURES.find((f) => f.id === 'presets')!;
    expect(entry.plot).toBeUndefined();
    const c = await pop('presets');
    await act(async () => c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!.click());
    expect(document.querySelector('[data-testid="info-simple"]')!.textContent).toBe(entry.simple);
  });

  it('is a bottom sheet below md (z-order still below panic)', async () => {
    mockViewport(390);
    const c = await mount(<InfoPopover featureId="visualizer" />);
    await act(async () => c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!.click());
    const panel = document.querySelector<HTMLElement>('[data-testid="info-popover-panel"]')!;
    expect(panel.style.position).toBe('fixed');
    expect(panel.style.bottom).toBe('0px');
    expect(panel.style.left).toBe('0px');
    expect(panel.style.borderRadius).toContain('8px');
    expect(parseInt(panel.style.zIndex, 10)).toBeLessThan(90);
    expect(document.querySelector('[data-testid="info-popover-backdrop"]')).toBeTruthy();
  });

  it('trigger hit target is ≥40px', async () => {
    mockViewport(1280);
    const c = await pop('visualizer');
    const trigger = c.querySelector<HTMLElement>('[data-testid="info-popover-trigger"]')!;
    expect(parseInt(trigger.style.minWidth, 10)).toBeGreaterThanOrEqual(40);
    expect(parseInt(trigger.style.minHeight, 10)).toBeGreaterThanOrEqual(40);
  });
});

// ---------------------------------------------------------- preset previews

describe('preset preview (engine preview path)', () => {
  it('presetPreviewPhases keeps first-phase params and truncates to 10 s', () => {
    const p = PRESETS.find((x) => x.id === 'sleep-delta-descent')!;
    const phases = presetPreviewPhases(p);
    expect(phases[0].carrierHz).toBe(p.spec.phases[0].carrierHz);
    expect(phases[0].beatHz).toBe(p.spec.phases[0].beatHz);
    expect(phases[0].mode).toBe('binaural');
    expect(phases[0].gainDb).toBe(Math.min(0, p.spec.phases[0].gainDbFs));
    expect(phases.reduce((a, ph) => a + ph.durationSec, 0)).toBeLessThanOrEqual(10);
    expect(phases.reduce((a, ph) => a + ph.durationSec, 0)).toBeGreaterThan(0);
  });

  it('▶ PREVIEW calls the engine preview once with ~10 s of audio; second tap stops', async () => {
    mockViewport(1280);
    const playSpy = vi.spyOn(LiveEngine.prototype, 'playBuffer').mockReturnValue(true);
    const stopSpy = vi.spyOn(LiveEngine.prototype, 'stopPreviews');
    const c = await mount(
      <MemoryRouter>
        <SessionProvider>
          <Presets />
        </SessionProvider>
      </MemoryRouter>,
    );
    const btn = c.querySelector<HTMLElement>('[data-testid="preset-preview-sleep-delta-descent"]')!;
    expect(btn.textContent).toContain('▶ PREVIEW');

    await act(async () => btn.click());
    expect(playSpy).toHaveBeenCalledTimes(1);
    const [left, right, sr] = playSpy.mock.calls[0] as unknown as [Float32Array, Float32Array, number];
    expect(sr).toBe(48000);
    expect(left.length).toBe(right.length);
    expect(left.length).toBeLessThanOrEqual(10 * 48000 + 4800);
    expect(left.length).toBeGreaterThan(48000);
    expect(btn.textContent).toContain('■ STOP');
    expect(btn.className).toContain('chip-active');

    // Second tap stops.
    await act(async () => btn.click());
    expect(stopSpy).toHaveBeenCalled();
    expect(btn.textContent).toContain('▶ PREVIEW');
  });

  it('only one preview plays at a time', async () => {
    mockViewport(1280);
    vi.spyOn(LiveEngine.prototype, 'playBuffer').mockReturnValue(true);
    const stopSpy = vi.spyOn(LiveEngine.prototype, 'stopPreviews');
    const c = await mount(
      <MemoryRouter>
        <SessionProvider>
          <Presets />
        </SessionProvider>
      </MemoryRouter>,
    );
    const a = c.querySelector<HTMLElement>('[data-testid="preset-preview-sleep-delta-descent"]')!;
    const b = c.querySelector<HTMLElement>('[data-testid="preset-preview-sleep-theta-drift"]')!;
    await act(async () => a.click());
    expect(a.className).toContain('chip-active');
    await act(async () => b.click());
    // Starting B cut A; only B is active.
    expect(stopSpy).toHaveBeenCalled();
    expect(a.className).not.toContain('chip-active');
    expect(b.className).toContain('chip-active');
  });

  it('panic stops and clears previews', async () => {
    mockViewport(1280);
    vi.spyOn(LiveEngine.prototype, 'playBuffer').mockReturnValue(true);
    const panicSpy = vi.spyOn(LiveEngine.prototype, 'panic');
    let api: ReturnType<typeof useSession> | null = null;
    function Probe() {
      api = useSession();
      return null;
    }
    await mount(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await act(async () => {
      api!.previewPreset(PRESETS[0]);
    });
    expect(api!.previewId).toBe('preset:' + PRESETS[0].id);
    await act(async () => {
      api!.panic();
    });
    expect(panicSpy).toHaveBeenCalled();
    expect(api!.previewId).toBeNull();
  });
});

// ------------------------------------------------------ experiment stimulus

describe('experiment stimulus preview plan', () => {
  it('picks the shipped WAV path when a rendered file is listed (X10)', () => {
    const plan = stimulusPlan('X10');
    expect(plan).not.toBeNull();
    expect(plan!.kind).toBe('wav');
    if (plan!.kind === 'wav') {
      expect(plan!.url).toContain('/stimulus_pack/');
      expect(plan!.url.endsWith('.wav')).toBe(true);
    }
  });

  it('falls back to an engine render derived from the pack filename (X03)', () => {
    const plan = stimulusPlan('X03');
    expect(plan).not.toBeNull();
    expect(plan!.kind).toBe('render');
    if (plan!.kind === 'render') {
      // ospx_x03_bb_c400_d08.00_120s.wav → binaural, 400 Hz carrier, Δf 8 Hz.
      expect(plan!.phase.mode).toBe('binaural');
      expect(plan!.phase.carrierHz).toBe(400);
      expect(plan!.phase.beatHz).toBe(8);
      expect(plan!.phase.durationSec).toBeLessThanOrEqual(30);
    }
  });

  it('renders nothing when no pack files serve the experiment (X14)', () => {
    expect(stimulusPlan('X14')).toBeNull();
  });
});

// ------------------------------------------------------------- claims lint

describe('no banned overclaim phrases in new UI copy', () => {
  const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
  const files: [string, string][] = [
    ['InfoPopover.tsx', popoverSrc as string],
    ['Presets.tsx', presetsSrc as string],
    ['Replication.tsx', replicationSrc as string],
    ['ExperimentLab.tsx', experimentLabSrc as string],
    ['Cymatics.tsx', cymaticsSrc as string],
  ];
  for (const [name, raw] of files) {
    it(`${name} is clean`, () => {
      const src = raw.toLowerCase();
      for (const phrase of BANNED) {
        expect(src.includes(phrase), `${name} contains banned phrase "${phrase}"`).toBe(false);
      }
    });
  }
});
