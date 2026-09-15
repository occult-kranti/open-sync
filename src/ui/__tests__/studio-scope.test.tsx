/**
 * Swarm F3 — StudioScope live-strip tests (happy-dom):
 *  - Transport state machine on the canvas: idle → live → paused → resumed →
 *    stopped, with the rAF loop ONLY spinning while live (a paused session
 *    must not keep redrawing a frozen trace labeled "LIVE" — the fixed
 *    defect) and a single held frame painted while paused.
 *  - Trace content follows the mock analysers: known L/R byte data lands on
 *    the expected canvas y positions with the L=teal / R=amber legend colors,
 *    and changing analyser data changes the next frame (no frozen trace
 *    while playing).
 *  - Backing store is sized to INTEGER device pixels at fractional DPR
 *    (the DPR-blur fix).
 *
 * happy-dom has no canvas 2D implementation, so getContext is stubbed with a
 * call recorder; rAF is a manual queue stepped by the test.
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { LiveEngine } from '../audio/liveEngine';
import { SessionProvider, useSession } from '../session/SessionContext';
import { StudioScope } from '../components/StudioScope';
import { AMBER, TEAL } from '../theme';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Canvas 2D call recorder
// ---------------------------------------------------------------------------

interface CtxRec {
  fillTexts: string[];
  strokes: { style: unknown; path: { x: number; y: number }[] }[];
  currentPath: { x: number; y: number }[];
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
    beginPath() {
      rec.currentPath = [];
    },
    moveTo(x: number, y: number) {
      rec.currentPath.push({ x, y });
    },
    lineTo(x: number, y: number) {
      rec.currentPath.push({ x, y });
    },
    stroke() {
      rec.strokes.push({ style: stub.strokeStyle, path: rec.currentPath });
    },
    fill() {},
    setLineDash() {},
    fillText(t: unknown) {
      rec.fillTexts.push(String(t));
    },
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData() {},
    drawImage() {},
  };
  return stub;
}

// ---------------------------------------------------------------------------
// Manual rAF queue
// ---------------------------------------------------------------------------

let rafQueue = new Map<number, FrameRequestCallback>();
let rafSeq = 0;

function pendingFrames(): number {
  return rafQueue.size;
}

function stepFrame(now = 1000) {
  const cbs = [...rafQueue.values()];
  rafQueue.clear();
  for (const cb of cbs) cb(now);
}

// ---------------------------------------------------------------------------
// Mock analysers with mutable channel data
// ---------------------------------------------------------------------------

const channelData = { l: 255, r: 0 };

function mkChannel(get: () => number) {
  return {
    fftSize: 256,
    frequencyBinCount: 128,
    getByteTimeDomainData: (a: Uint8Array) => a.fill(get()),
    getFloatTimeDomainData: (a: Float32Array) => a.fill(0),
    getByteFrequencyData: (a: Uint8Array) => a.fill(0),
  };
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

let roots: Root[] = [];
let containers: HTMLElement[] = [];
let session: ReturnType<typeof useSession>;

function Probe() {
  session = useSession();
  return null;
}

async function mountScope(): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () =>
    root.render(
      <MemoryRouter>
        <SessionProvider>
          <Probe />
          <StudioScope height={220} />
        </SessionProvider>
      </MemoryRouter>,
    ),
  );
  return container;
}

function scopeEl(c: HTMLElement): HTMLElement {
  return c.querySelector('[data-testid="studio-scope"]')!;
}

function scopeCanvas(c: HTMLElement): HTMLCanvasElement {
  return scopeEl(c).querySelector('canvas')!;
}

/** Latest stroke with the given color (grid strokes are filtered out). */
function lastStroke(c: HTMLCanvasElement, color: string) {
  const rec = recs.get(c)!;
  const matches = rec.strokes.filter((s) => s.style === color);
  return matches[matches.length - 1];
}

const H = 200; // stubbed clientHeight

beforeEach(() => {
  roots = [];
  containers = [];
  rafQueue = new Map();
  rafSeq = 0;
  channelData.l = 255;
  channelData.r = 0;
  window.localStorage.clear();
  // No canvas 2D in happy-dom — record calls instead.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!recs.has(this)) recs.set(this, { fillTexts: [], strokes: [], currentPath: [] });
    return makeCtxStub(recs.get(this)!) as unknown as CanvasRenderingContext2D;
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => H });
  // Manual rAF.
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = ++rafSeq;
    rafQueue.set(id, cb);
    return id;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => {
    rafQueue.delete(id);
  }) as typeof window.cancelAnimationFrame;
  // Deterministic visibility: the component treats a missing IO as visible.
  (globalThis as Record<string, unknown>).IntersectionObserver = undefined;
  // Transport edge: no AudioContext in happy-dom.
  vi.spyOn(LiveEngine.prototype, 'start').mockReturnValue(true);
  vi.spyOn(LiveEngine.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(LiveEngine.prototype, 'resume').mockImplementation(() => {});
  vi.spyOn(LiveEngine.prototype, 'analysers').mockImplementation(
    () =>
      ({
        spectrum: mkChannel(() => 0),
        left: mkChannel(() => channelData.l),
        right: mkChannel(() => channelData.r),
      }) as unknown as ReturnType<LiveEngine['analysers']>,
  );
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

// ---------------------------------------------------------------------------

describe('StudioScope — transport state transitions', () => {
  it('idle: NO SIGNAL watermark painted once, no rAF scheduled', async () => {
    const c = await mountScope();
    expect(scopeEl(c).getAttribute('data-state')).toBe('idle');
    expect(recs.get(scopeCanvas(c))!.fillTexts).toContain('NO SIGNAL — START SESSION');
    expect(pendingFrames()).toBe(0);
    expect(c.textContent).toContain('NO SIGNAL');
  });

  it('live: loop spins and traces track the mock analyser data (L teal bottom, R amber top)', async () => {
    const c = await mountScope();
    await act(async () => session.start());
    expect(scopeEl(c).getAttribute('data-state')).toBe('live');
    expect(pendingFrames()).toBe(1);

    await act(async () => stepFrame());
    const l1 = lastStroke(scopeCanvas(c), TEAL);
    const r1 = lastStroke(scopeCanvas(c), AMBER);
    expect(l1).toBeTruthy();
    expect(r1).toBeTruthy();
    // Byte 255 → y ≈ h/2 + (127/128)·0.45h (lower half); byte 0 → upper half.
    expect(l1.path[0].y).toBeGreaterThan(H / 2 + 0.4 * H);
    expect(r1.path[0].y).toBeLessThan(H / 2 - 0.4 * H);

    // New analyser data must show on the NEXT frame (no frozen live trace).
    channelData.l = 0;
    channelData.r = 255;
    await act(async () => stepFrame(1016));
    const l2 = lastStroke(scopeCanvas(c), TEAL);
    const r2 = lastStroke(scopeCanvas(c), AMBER);
    expect(l2.path[0].y).toBeLessThan(H / 2 - 0.4 * H);
    expect(r2.path[0].y).toBeGreaterThan(H / 2 + 0.4 * H);
    expect(pendingFrames()).toBe(1); // loop still alive
  });

  it('paused: rAF loop halts, one held frame with PAUSED watermark + frozen traces', async () => {
    const c = await mountScope();
    await act(async () => session.start());
    await act(async () => stepFrame());
    const before = recs.get(scopeCanvas(c))!.strokes.length;

    await act(async () => session.togglePause());
    expect(session.paused).toBe(true);
    expect(scopeEl(c).getAttribute('data-state')).toBe('paused');
    expect(c.textContent).toContain('PAUSED — HELD');
    // Loop cancelled — nothing pending, stepping is a no-op.
    expect(pendingFrames()).toBe(0);
    // Held frame painted: frozen traces + watermark.
    const rec = recs.get(scopeCanvas(c))!;
    expect(rec.fillTexts).toContain('PAUSED — TRACE HELD');
    expect(rec.strokes.length).toBeGreaterThan(before);
    expect(lastStroke(scopeCanvas(c), TEAL)).toBeTruthy();

    // New analyser data must NOT appear while paused (frame is frozen).
    channelData.l = 0;
    await act(async () => stepFrame(1032));
    const frozen = lastStroke(scopeCanvas(c), TEAL);
    expect(frozen.path[0].y).toBeGreaterThan(H / 2); // still the paused block (255)
    expect(pendingFrames()).toBe(0);
  });

  it('resumed: loop restarts and fresh analyser data is traced again', async () => {
    const c = await mountScope();
    await act(async () => session.start());
    await act(async () => session.togglePause());
    expect(pendingFrames()).toBe(0);
    channelData.l = 0; // changed while held

    await act(async () => session.togglePause()); // resume
    expect(session.paused).toBe(false);
    expect(scopeEl(c).getAttribute('data-state')).toBe('live');
    expect(pendingFrames()).toBe(1);
    await act(async () => stepFrame(1048));
    expect(lastStroke(scopeCanvas(c), TEAL).path[0].y).toBeLessThan(H / 2);
  });

  it('stopped (from paused): idle watermark returns, no rAF, no stale trace', async () => {
    const c = await mountScope();
    await act(async () => session.start());
    await act(async () => stepFrame());
    await act(async () => session.togglePause());
    await act(async () => session.stop());
    expect(scopeEl(c).getAttribute('data-state')).toBe('idle');
    expect(pendingFrames()).toBe(0);
    const rec = recs.get(scopeCanvas(c))!;
    // The last painted frame is the idle frame (watermark re-painted after stop).
    expect(rec.fillTexts[rec.fillTexts.length - 1]).toBe('NO SIGNAL — START SESSION');
  });
});

describe('StudioScope — pixel grid', () => {
  it('sizes the backing store to integer device pixels at fractional DPR', async () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1.25 });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 641 });
    const c = await mountScope();
    const canvas = scopeCanvas(c);
    // 641 × 1.25 = 801.25 → integer 801 backing store (was a fractional,
    // IDL-truncated assignment that misaligned the drawing coordinates).
    expect(canvas.width).toBe(801);
    expect(canvas.height).toBe(Math.round(H * 1.25));
    expect(Number.isInteger(canvas.width)).toBe(true);
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
  });
});
