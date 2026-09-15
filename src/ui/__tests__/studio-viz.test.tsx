/**
 * Swarm V4 — Studio visualization row tests (SSR / logic, node env):
 *  - StudioScope renders the idle NO SIGNAL watermark state (no session).
 *  - StudioCymatics with a null analyser renders the static frame state, the
 *    mandated virtual-plate honesty labels (physics + ART) and the idle hint.
 *  - The Studio page mounts both new panels without crashing in both the
 *    mobile and desktop useIsMobile branches, with the scope before the
 *    cymatics panel in DOM order.
 *  - Banned-claim lint on all new/changed UI copy (claims-lint parity).
 *
 * Run: `npm test`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '@/ui/session/SessionContext';
import Studio from '@/pages/Studio';
import { StudioScope } from '../components/StudioScope';
import { StudioCymatics } from '../components/StudioCymatics';
// vite `?raw` sources for the banned-claim lint on new UI copy.
import studioSrc from '@/pages/Studio.tsx?raw';
import scopeSrc from '../components/StudioScope.tsx?raw';
import cymaticsSrc from '../components/StudioCymatics.tsx?raw';

const mobileState = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobileState.mobile }));

function ssr(el: React.ReactElement) {
  return renderToString(
    <MemoryRouter>
      <SessionProvider>{el}</SessionProvider>
    </MemoryRouter>,
  );
}

describe('StudioScope', () => {
  it('renders the idle NO SIGNAL watermark state when no session plays', () => {
    const html = ssr(<StudioScope />);
    expect(html).toContain('data-testid="studio-scope"');
    expect(html).toContain('data-state="idle"');
    expect(html).toContain('NO SIGNAL');
  });

  it('carries the visualizer explainer (InfoPopover) for the scope', () => {
    const html = ssr(<StudioScope />);
    expect(html).toContain('About the live scope');
  });
});

describe('StudioCymatics', () => {
  it('with a null analyser renders the static frame state + honesty labels', () => {
    const html = ssr(<StudioCymatics analyser={null} />);
    expect(html).toContain('data-testid="studio-cymatics"');
    expect(html).toContain('data-state="static"');
    // Physics default: virtual-plate simulated-response label is visible.
    expect(html).toContain('drives a virtual plate');
    expect(html).toContain('simulated response');
    // ART toggle copy (tooltip) carries the mandated artistic-rendering label.
    expect(html).toContain('artistic rendering of a virtual plate');
    // Idle hint.
    expect(html).toContain('STATIC — START A SESSION');
    // Plate readout present.
    expect(html).toContain('PLATE');
  });

  it('links to the full Cymatic Studio and carries its explainer', () => {
    const html = ssr(<StudioCymatics analyser={null} />);
    expect(html).toContain('href="/cymatics"');
    expect(html).toContain('About cymatic patterns');
  });

  it('carries the LINES/SAND render-mode toggle (LINES default) on the fixed square plate', () => {
    const html = ssr(<StudioCymatics analyser={null} />);
    expect(html).toContain('data-render-mode="lines"');
    expect(html).toContain('data-testid="cymatics-render-lines"');
    expect(html).toContain('data-testid="cymatics-render-sand"');
    expect(html).toContain('STEEL PLATE 30×30 CM');
  });
});

describe('Studio page — visualization row', () => {
  beforeEach(() => {
    mobileState.mobile = false;
  });

  it('desktop: renders scope + cymatics without crashing, scope before cymatics', () => {
    mobileState.mobile = false;
    const html = ssr(<Studio />);
    expect(html).toContain('data-testid="studio-scope"');
    expect(html).toContain('data-testid="studio-cymatics"');
    const iScope = html.indexOf('data-testid="studio-scope"');
    const iCym = html.indexOf('data-testid="studio-cymatics"');
    expect(iScope).toBeGreaterThanOrEqual(0);
    expect(iCym).toBeGreaterThan(iScope);
  });

  it('mobile: renders scope + cymatics without crashing, scope before cymatics', () => {
    mobileState.mobile = true;
    const html = ssr(<Studio />);
    expect(html).toContain('data-testid="studio-scope"');
    expect(html).toContain('data-testid="studio-cymatics"');
    const iScope = html.indexOf('data-testid="studio-scope"');
    const iCym = html.indexOf('data-testid="studio-cymatics"');
    expect(iScope).toBeGreaterThanOrEqual(0);
    expect(iCym).toBeGreaterThan(iScope);
  });

  it('visualization row sits between engine and mixer sections', () => {
    mobileState.mobile = false;
    const html = ssr(<Studio />);
    const iEngine = html.indexOf('ENGINE');
    const iScope = html.indexOf('data-testid="studio-scope"');
    const iMixer = html.indexOf('NOISE MIXER');
    expect(iEngine).toBeGreaterThanOrEqual(0);
    expect(iScope).toBeGreaterThan(iEngine);
    expect(iMixer).toBeGreaterThan(iScope);
  });

  it('noise mixer + layers sections carry master bypass toggles (LED + label, enabled by default)', () => {
    const html = ssr(<Studio />);
    expect(html).toContain('data-testid="noise-mixer-toggle"');
    expect(html).toContain('data-testid="layers-toggle"');
    expect(html).toContain('MIX ON');
    expect(html).toContain('LAYERS ON');
    // Enabled by default: sections are not dimmed.
    expect(html).not.toContain('data-dimmed');
  });
});

describe('no banned overclaim phrases in new UI copy', () => {
  const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
  const files: [string, string][] = [
    ['Studio.tsx', studioSrc as string],
    ['StudioScope.tsx', scopeSrc as string],
    ['StudioCymatics.tsx', cymaticsSrc as string],
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
