/**
 * W8 smoke test: Home and Guide server-render without throwing and emit the
 * required honesty strings. Run: `npm test`.
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import Home from '@/pages/Home';
import Guide from '@/pages/Guide';

function render(el: React.ReactElement) {
  return renderToString(<MemoryRouter>{el}</MemoryRouter>);
}

describe('W8 home & docs screens', () => {
  it('Home renders hero, honesty statement, quick start, and module cards', () => {
    const html = render(<Home />);
    expect(html).toContain('GENERATE. MEASURE. VERIFY.');
    expect(html).toContain('What is this?');
    expect(html).toContain('READ THE HONESTY MANIFESTO');
    expect(html).toContain('First session in 60 seconds');
    expect(html).toContain('STUDIO');
    expect(html).toContain('IN VERIFICATION');
  });

  it('Guide renders both registers control, module groups, and plot explainers', () => {
    const html = render(<Guide />);
    expect(html).toContain('SIMPLE');
    expect(html).toContain('DEEP TECHNICAL');
    expect(html).toContain('HOW TO USE');
    expect(html).toContain('READING THE PLOT');
    expect(html).toContain('Binaural engine');
    expect(html).toContain('Sound dose gauge');
  });
});
