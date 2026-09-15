/**
 * W5 smoke test: every research screen server-renders without throwing and
 * emits the required honesty/discipline strings. Run: `npm test`.
 * (Temporary scaffold — the integrator may keep or drop this file.)
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import ExperimentLab from '@/pages/research/ExperimentLab';
import CritiqueLibrary from '@/pages/research/CritiqueLibrary';
import HypothesisTracker from '@/pages/research/HypothesisTracker';
import ProgramsArchive from '@/pages/research/ProgramsArchive';

function render(el: React.ReactElement) {
  return renderToString(<MemoryRouter>{el}</MemoryRouter>);
}

describe('W5 research screens', () => {
  it('Experiment Lab renders with honesty bar and registry entries', () => {
    const html = render(<ExperimentLab />);
    expect(html).toContain('no data collected yet');
    expect(html).toContain('X02');
    expect(html).toContain('X14');
    expect(html).toContain('on-demand');
  });

  it('Critique Library renders verdicts and key numbers', () => {
    const html = render(<CritiqueLibrary />);
    expect(html).toContain('REPAIRABLE');
    expect(html).toContain('DISCARD');
    expect(html).toContain('65.6%');
    expect(html).toContain('943 cents');
    expect(html).toContain('0 bits');
  });

  it('Hypothesis Tracker renders grades and audit trail state', () => {
    const html = render(<HypothesisTracker />);
    expect(html).toContain('pre-registered, awaiting data');
    expect(html).toContain('Promotes if');
    expect(html).toContain('Demotes if');
  });

  it('Programs Archive renders the mandatory banner and 42 rows', () => {
    const html = render(<ProgramsArchive />);
    expect(html).toContain('HISTORY &amp; FUNDING');
    expect(html).toContain('torsion');
    expect(html).toContain('official negative');
    expect(html).toContain('42 of 42');
  });
});
