/**
 * Quick Lab page — SSR smoke test: renders without throwing, shows the
 * protocol picker in priority order, and leaks no arm identity pre-completion.
 */

import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import QuickLab from '@/pages/QuickLab';
import { SessionProvider } from '@/ui/session/SessionContext';
import { PROTOCOLS } from '../protocols';

function render() {
  return renderToString(
    <MemoryRouter>
      <SessionProvider>
        <QuickLab />
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('QuickLab page', () => {
  it('renders the picker with all protocols and the ratified priority order', () => {
    const html = render();
    expect(html).toContain('Quick Lab');
    for (const p of PROTOCOLS) expect(html).toContain(p.title);
    // H9 ear-swap card appears before the H4 0 Hz floor card (Advisor gate #12).
    expect(html.indexOf('Ear-swap invariance')).toBeLessThan(html.indexOf('The 0 Hz floor'));
  });

  it('never renders sealed arm reveal content before completion', () => {
    const html = render();
    // The arm SET is public (the user opts into a known design); the sealed
    // material is the per-session assignment and the reveal strings
    // (descriptions / construction notes). None may render pre-completion.
    for (const p of PROTOCOLS) {
      for (const a of p.arms) {
        expect(html).not.toContain(a.description);
        expect(html).not.toContain(a.constructionNote);
      }
    }
    // No schedule codes or assignment tables before enrollment.
    expect(html).not.toMatch(/QL-[0-9A-F]{4}-\d+/);
    expect(html).not.toContain('REVEALED');
  });

  it('shows screening opt-in and honesty framing', () => {
    const html = render();
    expect(html).toContain('SCREENING');
    expect(html).toContain('no health benefit is promised');
    expect(html).toContain('never proof of cause');
  });
});
