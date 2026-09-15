/**
 * Swarm F3 — StudioCymatics SAND mode tests:
 *  - Pure determinism: the panel's fixed-seed sand field is bit-identical
 *    across seeds and across full step trajectories on the panel's fixed
 *    plate (steel-square-30, SQUARE domain).
 *  - Convergence: stepped grains collect on the nodal lines of the panel's
 *    resting drive field (mean |field| collapses; grains stay on the plate).
 *  - Component: LINES/SAND toggle in the panel header flips data-render-mode,
 *    keeps the mandated physics/art honesty labels, and the idle SAND frame
 *    is deterministic (two mounts paint identical buffers). A driven panel
 *    steps grains per frame (frame N differs from frame 1).
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import {
  VIRTUAL_PLATES,
  createSand,
  drivenSquareField,
  drivenSquareModes,
  meanParticleAbs,
  stepParticles,
} from '@/cymatics/chladni';
import type { AnalyserLike } from '@/cymatics/audioLink';
import { LiveEngine } from '../audio/liveEngine';
import { SessionProvider } from '../session/SessionContext';
import { StudioCymatics } from '../components/StudioCymatics';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** Byte-buffer equality without node Buffer (tests compile under the DOM tsconfig). */
function u8Eq(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The panel's fixed plate + seed (StudioCymatics keeps these constant). */
const PLATE = VIRTUAL_PLATES[0]; // steel-square-30
const SEED = 0xc1ad;
const REST_FIELD = drivenSquareField(drivenSquareModes(PLATE.fundamentalHz * 3, PLATE));

describe('StudioCymatics sand — determinism + convergence (fixed steel-square-30 plate)', () => {
  it('panel plate is the square steel plate (sand runs on the square domain only)', () => {
    expect(PLATE.id).toBe('steel-square-30');
    expect(PLATE.shape).toBe('square');
  });

  it('seeding is deterministic: same seed → identical grain layout', () => {
    const a = createSand(4000, SEED, false);
    const b = createSand(4000, SEED, false);
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
    // Different seed → different layout (guard against a constant stub).
    const c = createSand(4000, SEED + 1, false);
    expect(Array.from(c.x)).not.toEqual(Array.from(a.x));
  });

  it('stepped trajectories are deterministic for a given field and dt history', () => {
    const a = createSand(2000, SEED, false);
    const b = createSand(2000, SEED, false);
    for (let i = 0; i < 240; i++) {
      stepParticles(a, REST_FIELD, 1 / 60, { jitter: 0.02 });
      stepParticles(b, REST_FIELD, 1 / 60, { jitter: 0.02 });
    }
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
  });

  it('grains converge onto nodal lines of the resting drive field and stay on the plate', () => {
    const sand = createSand(4000, SEED, false);
    const m0 = meanParticleAbs(sand, REST_FIELD);
    expect(m0).toBeGreaterThan(0.05); // scattered grains sit mostly OFF the lines
    for (let i = 0; i < 600; i++) {
      stepParticles(sand, REST_FIELD, 1 / 60, { jitter: 0.012 });
    }
    const m1 = meanParticleAbs(sand, REST_FIELD);
    // Collected on the nodal lines: mean |field| collapses (measured ≈ 0.0013×).
    expect(m1).toBeLessThan(m0 * 0.05);
    for (let i = 0; i < sand.count; i++) {
      expect(sand.x[i]).toBeGreaterThanOrEqual(0);
      expect(sand.x[i]).toBeLessThanOrEqual(1);
      expect(sand.y[i]).toBeGreaterThanOrEqual(0);
      expect(sand.y[i]).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Component-level: canvas 2D stub records putImageData buffers.
// ---------------------------------------------------------------------------

interface CtxRec {
  images: { width: number; height: number; data: Uint8ClampedArray }[];
}

const recs = new WeakMap<HTMLCanvasElement, CtxRec>();

function makeCtxStub(rec: CtxRec) {
  const stub = {
    fillStyle: '' as unknown,
    strokeStyle: '' as unknown,
    lineWidth: 1,
    shadowColor: '' as unknown,
    shadowBlur: 0,
    font: '',
    textAlign: 'left',
    imageSmoothingEnabled: true,
    fillRect() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    setLineDash() {},
    fillText() {},
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData(img: { data: Uint8ClampedArray; width: number; height: number }) {
      // Copy — renderers reuse buffers.
      rec.images.push({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
    },
    drawImage() {},
  };
  return stub;
}

let rafQueue = new Map<number, FrameRequestCallback>();
let rafSeq = 0;
let rafT = 1000;

function stepFrames(n: number) {
  for (let i = 0; i < n; i++) {
    rafT += 16.6667;
    const cbs = [...rafQueue.values()];
    rafQueue.clear();
    for (const cb of cbs) cb(rafT);
  }
}

let roots: Root[] = [];
let containers: HTMLElement[] = [];

async function mountCymatics(analyser: AnalyserLike | null): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () =>
    root.render(
      <MemoryRouter>
        <SessionProvider>
          <StudioCymatics analyser={analyser} />
        </SessionProvider>
      </MemoryRouter>,
    ),
  );
  return container;
}

/** Active fake analyser: spectral peak at bin 3 (≈281 Hz at 48 kHz/256 bins). */
function fakeLiveAnalyser(): AnalyserLike {
  return {
    frequencyBinCount: 256,
    getByteFrequencyData: (a: Uint8Array) => {
      a.fill(0);
      a[3] = 200;
    },
  };
}

beforeEach(() => {
  roots = [];
  containers = [];
  rafQueue = new Map();
  rafSeq = 0;
  rafT = 1000;
  window.localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!recs.has(this)) recs.set(this, { images: [] });
    return makeCtxStub(recs.get(this)!) as unknown as CanvasRenderingContext2D;
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => 160 });
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = ++rafSeq;
    rafQueue.set(id, cb);
    return id;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => {
    rafQueue.delete(id);
  }) as typeof window.cancelAnimationFrame;
  (globalThis as Record<string, unknown>).IntersectionObserver = undefined;
  vi.spyOn(LiveEngine.prototype, 'start').mockReturnValue(true);
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

/** All putImageData buffers recorded for this mount (buffer canvas). */
function allImages(): CtxRec['images'] {
  const out: CtxRec['images'] = [];
  // recs is a WeakMap — track via the containers' canvases + detached buffer.
  return out;
}
void allImages;

/** Spy variant that also mirrors every putImageData buffer into `images`. */
function spyCtxWithImageMirror(images: CtxRec['images']) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!recs.has(this)) recs.set(this, { images: [] });
    const rec = recs.get(this)!;
    const stub = makeCtxStub(rec);
    const orig = stub.putImageData;
    stub.putImageData = (img: { data: Uint8ClampedArray; width: number; height: number }) => {
      orig(img);
      images.push(rec.images[rec.images.length - 1]);
    };
    return stub as unknown as CanvasRenderingContext2D;
  });
}

describe('StudioCymatics — LINES/SAND toggle', () => {
  it('header carries both render-mode chips; LINES is the default', async () => {
    const c = await mountCymatics(null);
    const panel = c.querySelector('[data-testid="studio-cymatics"]')!;
    expect(panel.getAttribute('data-render-mode')).toBe('lines');
    const lines = c.querySelector('[data-testid="cymatics-render-lines"]')!;
    const sand = c.querySelector('[data-testid="cymatics-render-sand"]')!;
    expect(lines.getAttribute('aria-pressed')).toBe('true');
    expect(sand.getAttribute('aria-pressed')).toBe('false');
  });

  it('switching to SAND flips the mode, keeps honesty labels, adds the sand note', async () => {
    const c = await mountCymatics(null);
    await act(async () => {
      c.querySelector<HTMLElement>('[data-testid="cymatics-render-sand"]')!.click();
    });
    const panel = c.querySelector('[data-testid="studio-cymatics"]')!;
    expect(panel.getAttribute('data-render-mode')).toBe('sand');
    expect(c.querySelector('[data-testid="cymatics-render-sand"]')!.getAttribute('aria-pressed')).toBe('true');
    // Physics/art honesty labels survive the render-mode switch.
    expect(c.textContent).toContain('drives a virtual plate');
    expect(c.textContent).toContain('simulated response');
    expect(c.textContent).toContain('settle on the nodal lines');
    expect(c.textContent).toContain('PLATE STEEL PLATE 30×30 CM');
    expect(c.textContent).toContain('SAND 4000 GRAINS');
  });

  it('driven SAND panel steps grains per frame (frame 30 differs from frame 1)', async () => {
    const images: CtxRec['images'] = [];
    vi.restoreAllMocks();
    spyCtxWithImageMirror(images);
    vi.spyOn(LiveEngine.prototype, 'start').mockReturnValue(true);
    const c = await mountCymatics(fakeLiveAnalyser());
    expect(c.querySelector('[data-testid="studio-cymatics"]')!.getAttribute('data-state')).toBe('static');
    await act(async () => {
      c.querySelector<HTMLElement>('[data-testid="cymatics-render-sand"]')!.click();
    });
    await act(async () => stepFrames(1));
    expect(images.length).toBeGreaterThanOrEqual(1);
    const first = images[images.length - 1];
    await act(async () => stepFrames(29));
    const later = images[images.length - 1];
    expect(later.width).toBe(first.width);
    // Grains drifted down-gradient → the frame changed.
    expect(u8Eq(later.data, first.data)).toBe(false);
    // Panel reports live drive.
    expect(c.querySelector('[data-testid="studio-cymatics"]')!.getAttribute('data-state')).toBe('live');
    expect(c.textContent).toMatch(/DRIVE \d+\.\d Hz · MODE/);
  });

  it('idle SAND frame is deterministic: two mounts paint identical buffers', async () => {
    const shots: Uint8ClampedArray[] = [];
    for (let run = 0; run < 2; run++) {
      const images: CtxRec['images'] = [];
      vi.restoreAllMocks();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        if (!recs.has(this)) recs.set(this, { images: [] });
        const rec = recs.get(this)!;
        const stub = makeCtxStub(rec);
        const orig = stub.putImageData;
        stub.putImageData = (img: { data: Uint8ClampedArray; width: number; height: number }) => {
          orig(img);
          images.push(rec.images[rec.images.length - 1]);
        };
        return stub as unknown as CanvasRenderingContext2D;
      });
      const c = await mountCymatics(null);
      await act(async () => {
        c.querySelector<HTMLElement>('[data-testid="cymatics-render-sand"]')!.click();
      });
      expect(images.length).toBeGreaterThanOrEqual(1);
      shots.push(images[images.length - 1].data);
      // unmount between runs
      const root = roots.pop()!;
      const cont = containers.pop()!;
      await act(async () => root.unmount());
      cont.remove();
    }
    expect(u8Eq(shots[0], shots[1])).toBe(true);
  });
});
