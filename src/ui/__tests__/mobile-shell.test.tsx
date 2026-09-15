/**
 * W10 mobile-shell tests (happy-dom so effects/matchMedia run):
 *  - bottom bar renders only below 768px (mocked viewport + matchMedia)
 *  - all routes reachable through the MORE drawer
 *  - panic present in both layouts; bottom-bar panic ≥56px, bar z-index ≥70
 *  - PhaseTimeline drag handles carry touch-action:none (SSR markup check)
 *  - useIsMobile matchMedia listener wiring (add / change / remove)
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { AppShell } from '../layout/AppShell';
import { PhaseTimeline } from '../components/PhaseTimeline';
import { SessionProvider } from '../session/SessionContext';
import { useIsMobile } from '../../hooks/use-mobile';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// happy-dom's WAAPI implementation rejects on Animation.cancel during
// framer-motion unmount cleanup; force framer-motion onto its rAF fallback.
if (typeof Element !== 'undefined') {
  (Element.prototype as unknown as Record<string, unknown>).animate = undefined;
}

const ALL_ROUTE_PATHS = [
  '/',
  '/studio',
  '/library',
  '/presets',
  '/levels',
  '/analyzer',
  '/cymatics',
  '/dream',
  '/replication',
  '/safety',
  '/medical',
  '/knowledge',
  '/about',
  '/guide',
  '/lab',
  '/critique',
  '/hypotheses',
  '/programs',
  '/quicklab',
  '/theory',
  '/sonic-lab',
  '/sample-lab',
];

type ChangeFn = () => void;

/** Mock a phone/desktop viewport: settable innerWidth + matchMedia spy. */
function mockViewport(width: number) {
  const listeners = new Set<ChangeFn>();
  const addEventListener = vi.fn((type: string, fn: ChangeFn) => {
    if (type === 'change') listeners.add(fn);
  });
  const removeEventListener = vi.fn((type: string, fn: ChangeFn) => {
    if (type === 'change') listeners.delete(fn);
  });
  const mql = {
    matches: width < 768,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: (fn: ChangeFn) => listeners.add(fn),
    removeListener: (fn: ChangeFn) => listeners.delete(fn),
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    addEventListener,
    removeEventListener,
    listenerCount: () => listeners.size,
    setWidth(next: number) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: next });
      mql.matches = next < 768;
      listeners.forEach((fn) => fn());
    },
  };
}

let roots: Root[] = [];
let containers: HTMLElement[] = [];

async function renderShell(width: number) {
  mockViewport(width);
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <SessionProvider>
          <AppShell>
            <div>page content</div>
          </AppShell>
        </SessionProvider>
      </MemoryRouter>,
    );
  });
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
});

describe('W10 mobile shell — layout tiers', () => {
  it('renders bottom bar + compact status bar (no rail) on mobile', async () => {
    const c = await renderShell(390);
    const bar = c.querySelector<HTMLElement>('[data-testid="mobile-bottom-bar"]');
    expect(bar).toBeTruthy();
    expect(c.querySelector('[data-testid="module-rail"]')).toBeNull();
    expect(c.querySelector('[data-testid="status-bar-mobile"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="status-bar"]')).toBeNull();
    // Primary tabs + MORE.
    for (const tab of ['home', 'studio', 'library', 'safety', 'more']) {
      expect(c.querySelector(`[data-testid="bottom-tab-${tab}"]`)).toBeTruthy();
    }
    // Persistent panic: ≥56px target; bar z-index ≥70 (clears grain z-60 and
    // the z-90 PanicOverlay — nothing sits between the user and panic).
    const panic = c.querySelector<HTMLElement>('[data-testid="mobile-panic"]');
    expect(panic).toBeTruthy();
    expect(parseInt(panic!.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
    expect(parseInt(bar!.style.zIndex, 10)).toBeGreaterThanOrEqual(70);
    // Content area keeps clear of the fixed bottom bar.
    expect(c.querySelector('main')!.style.paddingBottom).toContain('calc(56px');
  });

  it('renders rail + full status bar (no bottom bar) on desktop', async () => {
    const c = await renderShell(1280);
    expect(c.querySelector('[data-testid="module-rail"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="status-bar"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="mobile-bottom-bar"]')).toBeNull();
    expect(c.querySelector('[data-testid="status-bar-mobile"]')).toBeNull();
    // Desktop panic affordances: rail + status bar.
    const panicButtons = Array.from(c.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('PANIC'),
    );
    expect(panicButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('MORE drawer lists all 18 routes', async () => {
    const c = await renderShell(390);
    expect(c.querySelector('[data-testid="more-drawer"]')).toBeNull();
    const more = c.querySelector<HTMLElement>('[data-testid="bottom-tab-more"]')!;
    await act(async () => {
      more.click();
    });
    const drawer = document.querySelector('[data-testid="more-drawer"]');
    expect(drawer).toBeTruthy();
    const hrefs = new Set(
      Array.from(drawer!.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
    );
    for (const path of ALL_ROUTE_PATHS) {
      expect(hrefs.has(path), `drawer links to ${path}`).toBe(true);
    }
    expect(hrefs.size).toBe(ALL_ROUTE_PATHS.length);
    // Panic remains outside the drawer, still reachable while it is open.
    expect(c.querySelector('[data-testid="mobile-panic"]')).toBeTruthy();
  });
});

describe('W10 PhaseTimeline touch repair', () => {
  it('editable blocks and resize handles carry touch-action:none', () => {
    const html = renderToString(
      <PhaseTimeline
        phases={[
          { id: 'a', durationSec: 600, beatHz: 10 },
          { id: 'b', durationSec: 600, beatHz: 6 },
        ]}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('touch-action:none');
    expect(html).toContain('data-testid="resize-handle"');
  });

  it('readonly timeline stays free of drag handles', () => {
    const html = renderToString(
      <PhaseTimeline readonly phases={[{ id: 'a', durationSec: 600, beatHz: 10 }]} />,
    );
    expect(html).not.toContain('touch-action:none');
    expect(html).not.toContain('data-testid="resize-handle"');
  });
});

describe('W10 useIsMobile hook (matchMedia wiring)', () => {
  function Probe() {
    const mobile = useIsMobile();
    return <span data-testid="probe">{String(mobile)}</span>;
  }

  it('tracks viewport width and cleans up its change listener', async () => {
    const vp = mockViewport(500);
    const container = document.createElement('div');
    document.body.appendChild(container);
    containers.push(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(<Probe />));
    expect(container.querySelector('[data-testid="probe"]')!.textContent).toBe('true');
    expect(vp.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vp.listenerCount()).toBe(1);

    // Cross the 768px breakpoint → change listener fires → hook updates.
    await act(async () => vp.setWidth(1280));
    expect(container.querySelector('[data-testid="probe"]')!.textContent).toBe('false');

    await act(async () => vp.setWidth(320));
    expect(container.querySelector('[data-testid="probe"]')!.textContent).toBe('true');

    // Unmount removes the listener.
    await act(async () => root.unmount());
    expect(vp.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vp.listenerCount()).toBe(0);
    roots = roots.filter((r) => r !== root);
  });
});
