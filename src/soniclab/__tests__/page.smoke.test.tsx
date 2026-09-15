/**
 * SonicLab page smoke: server-renders without throwing inside the standard
 * providers, and emits its primary labels (grade chips, astro honesty label).
 */

import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '@/ui/session/SessionContext';
import SonicLab from '@/pages/SonicLab';

describe('SonicLab page', () => {
  it('SSR renders the module and all six generator groups', () => {
    const html = renderToString(
      <MemoryRouter>
        <SessionProvider>
          <SonicLab />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(html).toContain('Sonic Lab');
    for (const t of [
      'AUDITORY ILLUSIONS',
      'MATHEMATICAL RHYTHMS',
      'FRACTAL &amp; CHAOS',
      'CUSTOM WAVEFORMS',
      'TUNING SYSTEMS',
      'ASTRO-TUNED',
    ]) {
      expect(html).toContain(t);
    }
    // Mandatory astro honesty label is in the markup.
    expect(html).toContain('no evidence of any special effect');
    // TRAPPIST ladder anchor shown.
    expect(html).toContain('130.81');
    // Sidereal/tropical convention toggle present.
    expect(html).toContain('SIDEREAL');
    expect(html).toContain('TROPICAL');
  });
});
