/**
 * W-A global pause/resume tests (happy-dom):
 *  - state machine: pause during playing → paused; resume keeps the session
 *    clock position; toggle while idle is a no-op; panic/stop clear paused
 *  - Space hotkey: toggles while playing, guarded against input/button focus
 *    and inert when idle
 *  - Surfaces: status-bar pause chip (enabled state, RESUME label), mobile
 *    bottom-bar pause chip next to panic, palette PAUSE SESSION action
 *  - Rail section label retired: 'RESEARCH' (no '· SOON') in rail + MORE drawer
 *
 * The LiveEngine's Web Audio methods are spied (happy-dom has no
 * AudioContext); the session clock runs on vitest fake timers.
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
import { AppShell } from '../layout/AppShell';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof Element !== 'undefined') {
  (Element.prototype as unknown as Record<string, unknown>).animate = undefined;
}

type Session = ReturnType<typeof useSession>;

/** Same viewport mock as the other shell tests (matchMedia + innerWidth). */
function mockViewport(width: number) {
  const mql = {
    matches: width < 768,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
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

let session: Session;
function Probe() {
  session = useSession();
  return null;
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

beforeEach(() => {
  roots = [];
  containers = [];
  window.localStorage.clear();
  // No AudioContext in happy-dom: stub the transport edge so start() succeeds.
  vi.spyOn(LiveEngine.prototype, 'start').mockReturnValue(true);
  vi.spyOn(LiveEngine.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(LiveEngine.prototype, 'resume').mockImplementation(() => {});
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.useRealTimers();
  for (const root of roots) {
    await act(async () => root.unmount());
  }
  for (const c of containers) c.remove();
  document.body.innerHTML = '';
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ------------------------------------------------------- state machine

describe('global pause/resume — state machine', () => {
  it('toggle while idle is a no-op (engine.pause never called)', async () => {
    await mountSession();
    expect(session.running).toBe(false);
    await act(async () => session.togglePause());
    expect(session.paused).toBe(false);
    expect(LiveEngine.prototype.pause).not.toHaveBeenCalled();
  });

  it('pause during playing → paused; engine.pause called; clock holds', async () => {
    await mountSession();
    await act(async () => session.start());
    expect(session.running).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(session.elapsedSec).toBe(3);

    await act(async () => session.togglePause());
    expect(session.paused).toBe(true);
    expect(session.running).toBe(true); // still a live session, held
    expect(LiveEngine.prototype.pause).toHaveBeenCalledTimes(1);

    // Clock (and dose) freeze while paused.
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(session.elapsedSec).toBe(3);
  });

  it('resume keeps the position — clock continues from the held value', async () => {
    await mountSession();
    await act(async () => session.start());
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await act(async () => session.togglePause());
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await act(async () => session.togglePause());
    expect(session.paused).toBe(false);
    expect(LiveEngine.prototype.resume).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(session.elapsedSec).toBe(5); // 3 held + 2 after resume
  });

  it('stop() and panic() clear the paused state', async () => {
    await mountSession();
    await act(async () => session.start());
    await act(async () => session.togglePause());
    expect(session.paused).toBe(true);
    await act(async () => session.stop());
    expect(session.paused).toBe(false);
    expect(session.running).toBe(false);
    // Idle toggle after stop: no-op.
    await act(async () => session.togglePause());
    expect(session.paused).toBe(false);

    await act(async () => session.start());
    await act(async () => session.togglePause());
    await act(async () => session.panic());
    expect(session.paused).toBe(false);
    expect(session.panicked).toBe(true);
    // Panicked toggle: no-op.
    await act(async () => session.togglePause());
    expect(session.paused).toBe(false);
  });
});

// ------------------------------------------------------- shell surfaces + Space

async function mountShell(width: number) {
  mockViewport(width);
  return mount(
    <MemoryRouter>
      <SessionProvider>
        <Probe />
        <AppShell>
          <div>
            page content
            <input data-testid="probe-input" aria-label="probe input" />
          </div>
        </AppShell>
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function pressKeyOn(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

describe('global pause/resume — surfaces + Space hotkey', () => {
  it('status bar pause chip: disabled while idle, toggles to RESUME when paused', async () => {
    const c = await mountShell(1280);
    const chip = () => c.querySelector<HTMLButtonElement>('[data-testid="pause-toggle"]')!;
    expect(chip()).toBeTruthy();
    expect(chip().disabled).toBe(true);

    await act(async () => session.start());
    expect(chip().disabled).toBe(false);
    expect(chip().textContent).toContain('PAUSE');
    expect(chip().getAttribute('aria-pressed')).toBe('false');

    await act(async () => chip().click());
    expect(session.paused).toBe(true);
    expect(chip().textContent).toContain('RESUME');
    expect(chip().getAttribute('aria-pressed')).toBe('true');
    // Readout carries the PAUSED marker.
    expect(c.textContent).toContain('PAUSED ·');
  });

  it('Space toggles pause while playing; resume works too', async () => {
    const c = await mountShell(1280);
    await act(async () => session.start());
    await pressKeyOn(document.body, ' ');
    expect(session.paused).toBe(true);
    expect(c.querySelector('[data-testid="pause-toggle"]')!.getAttribute('aria-pressed')).toBe('true');
    await pressKeyOn(document.body, ' ');
    expect(session.paused).toBe(false);
  });

  it('Space is guarded: input focus and button focus never toggle pause', async () => {
    const c = await mountShell(1280);
    await act(async () => session.start());
    const input = c.querySelector<HTMLElement>('[data-testid="probe-input"]')!;
    await pressKeyOn(input, ' ');
    expect(session.paused).toBe(false);
    const chip = c.querySelector<HTMLElement>('[data-testid="pause-toggle"]')!;
    await pressKeyOn(chip, ' ');
    expect(session.paused).toBe(false);
    // Modifier chords and key-repeat are also ignored.
    await pressKeyOn(document.body, ' ', { ctrlKey: true });
    await pressKeyOn(document.body, ' ', { repeat: true });
    expect(session.paused).toBe(false);
  });

  it('Space is inert while idle (no preventDefault, no pause)', async () => {
    await mountShell(1280);
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    await act(async () => {
      document.body.dispatchEvent(ev);
    });
    expect(session.paused).toBe(false);
    expect(ev.defaultPrevented).toBe(false);
    expect(LiveEngine.prototype.pause).not.toHaveBeenCalled();
  });

  it('palette exposes PAUSE SESSION (Space hint) and it toggles', async () => {
    const c = await mountShell(1280);
    await act(async () => session.start());
    await act(async () => {
      c.querySelector<HTMLElement>('[data-testid="palette-hint"]')!.click();
    });
    const palette = c.querySelector('[data-testid="command-palette"]')!;
    expect(palette.textContent).toContain('PAUSE SESSION');
    const item = Array.from(palette.querySelectorAll<HTMLElement>('[cmdk-item]')).find((el) =>
      el.textContent?.includes('PAUSE SESSION'),
    )!;
    expect(item).toBeTruthy();
    await act(async () => {
      item.click();
    });
    expect(session.paused).toBe(true);
  });

  it('mobile bottom bar carries a compact pause chip next to (never covering) panic', async () => {
    const c = await mountShell(500);
    const bar = c.querySelector('[data-testid="mobile-bottom-bar"]')!;
    const pauseChip = bar.querySelector<HTMLButtonElement>('[data-testid="mobile-pause"]')!;
    const panic = bar.querySelector<HTMLElement>('[data-testid="mobile-panic"]')!;
    expect(pauseChip).toBeTruthy();
    expect(panic).toBeTruthy();
    // Separate segments: pause sits before panic, panic keeps its own slot.
    expect(bar.contains(pauseChip) && bar.contains(panic)).toBe(true);
    expect(pauseChip.disabled).toBe(true); // idle
    await act(async () => session.start());
    expect(pauseChip.disabled).toBe(false);
    await act(async () => pauseChip.click());
    expect(session.paused).toBe(true);
    expect(pauseChip.textContent).toContain('RESUME');
  });
});

// ------------------------------------------------------- rail label

describe('rail section label — RESEARCH (the · SOON suffix is retired)', () => {
  it('desktop rail shows RESEARCH without SOON markers', async () => {
    const c = await mountShell(1280);
    const rail = c.querySelector('[data-testid="module-rail"]')!;
    expect(rail.textContent).toContain('RESEARCH');
    expect(rail.textContent).not.toContain('RESEARCH · SOON');
    expect(rail.textContent).not.toContain('SOON');
    // Research routes are live links, no longer dimmed.
    const lab = rail.querySelector('a[href="/lab"]')!;
    expect(lab).toBeTruthy();
    expect(lab.querySelector('div')!.style.opacity).not.toBe('0.45');
  });

  it('MORE drawer shows RESEARCH without the SOON suffix', async () => {
    const c = await mountShell(500);
    await act(async () => {
      c.querySelector<HTMLElement>('[data-testid="bottom-tab-more"]')!.click();
    });
    const drawer = c.querySelector('[data-testid="more-drawer"]')!;
    expect(drawer.textContent).toContain('RESEARCH');
    expect(drawer.textContent).not.toContain('RESEARCH · SOON');
  });
});
