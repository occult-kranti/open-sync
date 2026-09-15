/**
 * W13 UX-polish tests (happy-dom):
 *  - Knob standard (P0-2): double-click/double-tap/Ctrl-click reset to
 *    defaultValue (fallback midpoint), Shift+drag fine ×0.1, arrow steps
 *  - ⌘K palette (P1-1): Ctrl+K opens it, all 17 modules + session actions
 *    listed, Esc closes
 *  - Focus management (P0-4): MORE drawer + panic overlay close on Esc and
 *    return focus to the triggering control
 *  - Motion tokens + focus ring + reduced-motion presence in index.css (P0-1/P0-8)
 *  - No banned overclaim phrases in the new UI copy (claims-lint parity)
 *
 * Run: `npm test`.
 */
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { Knob } from '../components/Knob';
import { AppShell } from '../layout/AppShell';
import { SessionProvider } from '../session/SessionContext';
// vite `?raw` imports for sources (typed via vite/client). index.css reads
// empty through vitest's CSS pipeline, so it comes from node:fs instead.
import paletteSrc from '../components/CommandPalette.tsx?raw';
import knobSrc from '../components/Knob.tsx?raw';
import guideSrc from '../../pages/Guide.tsx?raw';
// @ts-expect-error -- node types excluded from tsconfig.app on purpose
import { readFileSync } from 'node:fs';

// vitest runs from the project root.
const cssText: string = readFileSync('src/index.css', 'utf8');

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// happy-dom's WAAPI implementation rejects on Animation.cancel during
// framer-motion unmount cleanup; force framer-motion onto its rAF fallback.
if (typeof Element !== 'undefined') {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.animate = undefined;
  // Pointer capture is not implemented in happy-dom.
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
}

const MODULE_LABELS = [
  'HOME',
  'STUDIO',
  'LIBRARY',
  'PRESETS',
  'LEVELS',
  'ANALYZER',
  'CYMATICS',
  'SLEEP & DREAM',
  'REPLICATION BAY',
  'SAFETY',
  'KNOWLEDGE',
  'ABOUT',
  'GUIDE',
  'EXPERIMENT LAB',
  'CRITIQUE LIBRARY',
  'HYPOTHESIS TRACKER',
  'PROGRAMS ARCHIVE',
];

/** Viewport mock shared with the mobile-shell suite. */
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

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(node));
  return container;
}

async function renderShell(width: number) {
  mockViewport(width);
  return mount(
    <MemoryRouter>
      <SessionProvider>
        <AppShell>
          <div>page content</div>
        </AppShell>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function key(target: Window | Element, type: string, init: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }));
}

/** Let framer-motion exit animations finish (rAF fallback in happy-dom). */
async function settle(ms = 900) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

// ---------------------------------------------------------------- Knob (P0-2)

describe('W13 Knob interaction standard', () => {
  async function mountKnob(props: Partial<React.ComponentProps<typeof Knob>> = {}) {
    const onChange = vi.fn();
    const container = await mount(
      <Knob value={7} min={0} max={10} onChange={onChange} label="TEST" {...props} />,
    );
    const svg = container.querySelector('svg')!;
    return { onChange, svg };
  }

  it('double-click resets to defaultValue', async () => {
    const { onChange, svg } = await mountKnob({ defaultValue: 5 });
    await act(async () => {
      svg.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('double-click falls back to the midpoint when no defaultValue is given', async () => {
    const { onChange, svg } = await mountKnob();
    await act(async () => {
      svg.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('log-taper midpoint fallback is the geometric midpoint', async () => {
    const onChange = vi.fn();
    const container = await mount(<Knob value={40} min={0.1} max={40} log onChange={onChange} />);
    const svg = container.querySelector('svg')!;
    await act(async () => {
      svg.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(2, 5)); // sqrt(0.1*40)
  });

  it('Ctrl+click resets to default and does not start a drag', async () => {
    const { onChange, svg } = await mountKnob({ defaultValue: 5 });
    await act(async () => {
      svg.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 100, ctrlKey: true }),
      );
    });
    expect(onChange).toHaveBeenCalledWith(5);
    onChange.mockClear();
    await act(async () => {
      svg.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 40 }),
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drag adjusts coarsely; Shift+drag applies ×0.1 fine adjust', async () => {
    const { onChange, svg } = await mountKnob();
    await act(async () => {
      svg.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 100 }),
      );
      svg.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 84 }),
      );
    });
    // coarse: 16px / 160px = 0.1 norm → 7 + 1.0
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(8, 5));

    const { onChange: onChange2, svg: svg2 } = await mountKnob();
    await act(async () => {
      svg2.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 100 }),
      );
      svg2.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientY: 84, shiftKey: true }),
      );
    });
    // fine: same 16px travel × 0.1 → 7 + 0.1
    expect(onChange2).toHaveBeenLastCalledWith(expect.closeTo(7.1, 5));
  });

  it('double-tap (touch) resets to defaultValue', async () => {
    const { onChange, svg } = await mountKnob({ defaultValue: 5 });
    const tap = () => {
      svg.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', clientY: 100 }),
      );
      svg.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'touch', clientY: 100 }),
      );
    };
    await act(async () => {
      tap();
      tap();
    });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('a single tap changes nothing (no jump-to-cursor)', async () => {
    const { onChange, svg } = await mountKnob();
    await act(async () => {
      svg.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', clientY: 100 }),
      );
      svg.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'touch', clientY: 100 }),
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('arrow keys step the value; Shift+arrows use the fine step', async () => {
    const { onChange, svg } = await mountKnob();
    await act(async () => {
      key(svg, 'keydown', { key: 'ArrowUp' });
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(7.2, 5));
    await act(async () => {
      key(svg, 'keydown', { key: 'ArrowDown', shiftKey: true });
    });
    // fine step = 0.02 × 0.1 = 0.002 norm → 7 − 0.02
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(6.98, 5));
  });
});

// ------------------------------------------------- ⌘K palette (P1-1) + focus

describe('W13 command palette', () => {
  it('opens on Ctrl+K, lists all 17 modules + session actions, closes on Esc', async () => {
    const c = await renderShell(1280);
    expect(document.querySelector('[data-testid="command-palette"]')).toBeNull();
    await act(async () => {
      key(window, 'keydown', { key: 'k', ctrlKey: true });
    });
    const palette = document.querySelector('[data-testid="command-palette"]');
    expect(palette).toBeTruthy();
    const text = palette!.textContent ?? '';
    for (const label of MODULE_LABELS) {
      expect(text, `palette lists ${label}`).toContain(label);
    }
    for (const action of ['START SESSION', 'PANIC', 'EXPORT SESSION AS WAV', 'INFANT MODE', 'GUIDE']) {
      expect(text, `palette action ${action}`).toContain(action);
    }
    // Esc closes (P0-4 contract).
    await act(async () => {
      key(window, 'keydown', { key: 'Escape' });
    });
    await settle();
    expect(document.querySelector('[data-testid="command-palette"]')).toBeNull();
    expect(c.querySelector('[data-testid="palette-hint"]')).toBeTruthy();
  });

  it('also opens on ⌘K (metaKey) and via the status-bar hint chip', async () => {
    const c = await renderShell(1280);
    await act(async () => {
      key(window, 'keydown', { key: 'k', metaKey: true });
    });
    expect(document.querySelector('[data-testid="command-palette"]')).toBeTruthy();
    await act(async () => {
      key(window, 'keydown', { key: 'Escape' });
    });
    await settle();
    const hint = c.querySelector<HTMLElement>('[data-testid="palette-hint"]')!;
    await act(async () => hint.click());
    expect(document.querySelector('[data-testid="command-palette"]')).toBeTruthy();
  });
});

describe('W13 focus management (P0-4)', () => {
  it('MORE drawer: focuses its close button on open, Esc closes, focus returns to the MORE tab', async () => {
    const c = await renderShell(390);
    const more = c.querySelector<HTMLElement>('[data-testid="bottom-tab-more"]')!;
    // happy-dom's .click() does not focus the trigger; keyboard activation
    // does, and focus-return is only meaningful from a focused trigger.
    await act(async () => {
      more.focus();
      more.click();
    });
    expect(more.getAttribute('aria-expanded')).toBe('true');
    // Initial focus moves inside the dialog (close button) after a tick.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const drawer = document.querySelector('[data-testid="more-drawer"]')!;
    expect(drawer.getAttribute('aria-modal')).toBe('true');
    expect(drawer.contains(document.activeElement)).toBe(true);
    await act(async () => {
      key(window, 'keydown', { key: 'Escape' });
    });
    await settle();
    expect(document.querySelector('[data-testid="more-drawer"]')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  it('panic overlay: role=dialog, focuses RESUME SAFELY, Esc dismisses, focus returns to the panic button', async () => {
    const c = await renderShell(1280);
    const panicBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('PANIC'))!;
    await act(async () => {
      panicBtn.focus();
      panicBtn.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const overlay = document.querySelector('[role="dialog"][aria-modal="true"]');
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toContain('RESUME SAFELY');
    expect(overlay!.contains(document.activeElement)).toBe(true);
    await act(async () => {
      key(window, 'keydown', { key: 'Escape' });
    });
    await settle();
    expect(document.querySelector('[aria-label="Session stopped"]')).toBeNull();
    expect(document.activeElement).toBe(panicBtn);
  });
});

// -------------------------------------------- CSS tokens (P0-1, P0-8) + lint

describe('W13 motion + focus tokens in index.css', () => {
  const css = cssText as string;

  it('defines the four motion tokens at the spec durations', () => {
    expect(css).toContain('--motion-1: 100ms');
    expect(css).toContain('--motion-2: 150ms');
    expect(css).toContain('--motion-3: 200ms');
    expect(css).toContain('--motion-4: 300ms');
  });

  it('has a global prefers-reduced-motion rule', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('has a 2px amber :focus-visible ring', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('2px solid var(--amber)');
  });
});

describe('W13 no banned overclaim phrases in new UI copy', () => {
  const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
  const files: [string, string][] = [
    ['CommandPalette.tsx', paletteSrc as string],
    ['Knob.tsx', knobSrc as string],
    ['Guide.tsx', guideSrc as string],
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
