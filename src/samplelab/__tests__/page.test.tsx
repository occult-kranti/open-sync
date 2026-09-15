/**
 * Sample Lab page tests (SSR, node env):
 *  - renders in both desktop and mobile useIsMobile branches without throwing
 *  - local-only disclosure and the analysis-≠-claim note are present
 *  - every wired InfoPopover feature id is referenced (entries land in
 *    src/docs/features.ts via the lead merge — see swarm F2 report)
 *  - banned-claim lint on the new UI copy (claims-lint parity)
 *
 * Run: `npm test`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '@/ui/session/SessionContext';
import SampleLab from '@/pages/SampleLab';
// vite `?raw` sources for the banned-claim lint on new UI copy.
import pageSrc from '@/pages/SampleLab.tsx?raw';
import analysisSrc from '../analysis.ts?raw';

const mobileState = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobileState.mobile }));

function ssr() {
  return renderToString(
    <MemoryRouter>
      <SessionProvider>
        <SampleLab />
      </SessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mobileState.mobile = false;
});

describe('SampleLab page shell', () => {
  it('server-renders the desktop branch with local-only disclosure', () => {
    const html = ssr();
    expect(html).toContain('data-testid="sample-lab"');
    expect(html).toContain('Sample Lab');
    expect(html).toContain('nothing is uploaded');
    expect(html).toContain('data-testid="sample-lab-dropzone"');
  });

  it('server-renders the mobile branch', () => {
    mobileState.mobile = true;
    const html = ssr();
    expect(html).toContain('data-testid="sample-lab"');
    expect(html).toContain('DROP AN AUDIO FILE');
  });

  it('states that pattern detection says nothing about effects', () => {
    const html = ssr();
    expect(html).toContain('analysis is not a claim');
  });
});

describe('InfoPopover wiring', () => {
  it('every plot references its features.ts doc id', () => {
    for (const id of [
      'samplelab-upload',
      'samplelab-overview',
      'samplelab-spectrogram',
      'samplelab-spectral-stats',
      'samplelab-band-energy',
      'samplelab-stereo-ms',
      'samplelab-loudness-history',
      'samplelab-pitch-track',
      'samplelab-loop-detect',
    ]) {
      expect(pageSrc.includes(`featureId="${id}"`), `page wires InfoPopover "${id}"`).toBe(true);
    }
  });
});

describe('no banned overclaim phrases in new UI copy', () => {
  const BANNED = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
  const files: [string, string][] = [
    ['SampleLab.tsx', pageSrc as string],
    ['analysis.ts', analysisSrc as string],
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
