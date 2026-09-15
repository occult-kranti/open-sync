/**
 * W11 mobile smoke test: every routed page server-renders without throwing in
 * both desktop and mobile (useIsMobile) branches, and emits its primary action
 * label. Library and Programs Archive must switch to their card-list
 * containers when useIsMobile() is true. Run: `npm test`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '@/ui/session/SessionContext';
import Home from '@/pages/Home';
import Guide from '@/pages/Guide';
import Studio from '@/pages/Studio';
import Library from '@/pages/Library';
import Presets from '@/pages/Presets';
import Levels from '@/pages/Levels';
import Analyzer from '@/pages/Analyzer';
import Cymatics from '@/pages/Cymatics';
import Dream from '@/pages/Dream';
import Replication from '@/pages/Replication';
import Safety from '@/pages/Safety';
import Medical from '@/pages/Medical';
import Knowledge from '@/pages/Knowledge';
import About from '@/pages/About';
import ExperimentLab from '@/pages/research/ExperimentLab';
import CritiqueLibrary from '@/pages/research/CritiqueLibrary';
import HypothesisTracker from '@/pages/research/HypothesisTracker';
import ProgramsArchive from '@/pages/research/ProgramsArchive';

const mobileState = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobileState.mobile }));

function render(el: React.ReactElement) {
  return renderToString(
    <MemoryRouter>
      <SessionProvider>{el}</SessionProvider>
    </MemoryRouter>,
  );
}

const PAGES: { name: string; el: () => React.ReactElement; primary: string }[] = [
  { name: 'Home', el: () => <Home />, primary: 'OPEN STUDIO' },
  { name: 'Guide', el: () => <Guide />, primary: 'DEEP TECHNICAL' },
  { name: 'Studio', el: () => <Studio />, primary: 'START SESSION' },
  { name: 'Library', el: () => <Library />, primary: 'LOAD ↗' },
  { name: 'Presets', el: () => <Presets />, primary: 'LOAD INTO STUDIO' },
  { name: 'Levels', el: () => <Levels />, primary: 'LOAD PROTOCOL' },
  { name: 'Analyzer', el: () => <Analyzer />, primary: 'RUN MEASUREMENT' },
  { name: 'Cymatics', el: () => <Cymatics />, primary: 'Cymatic Studio' },
  { name: 'Dream', el: () => <Dream />, primary: 'TEST CUE' },
  { name: 'Replication', el: () => <Replication />, primary: 'Replication Bay' },
  { name: 'Safety', el: () => <Safety />, primary: 'PANIC — STOP EVERYTHING' },
  { name: 'Medical', el: () => <Medical />, primary: 'DEVICE REGISTRY' },
  { name: 'Knowledge', el: () => <Knowledge />, primary: 'Knowledge Base' },
  { name: 'About', el: () => <About />, primary: 'About the Method' },
  { name: 'Experiment Lab', el: () => <ExperimentLab />, primary: 'Experiment Lab' },
  { name: 'Critique Library', el: () => <CritiqueLibrary />, primary: 'Critique Library' },
  { name: 'Hypothesis Tracker', el: () => <HypothesisTracker />, primary: 'Hypothesis Tracker' },
  { name: 'Programs Archive', el: () => <ProgramsArchive />, primary: 'Programs Archive' },
];

describe('W11 mobile pages — desktop branch (useIsMobile=false)', () => {
  beforeEach(() => {
    mobileState.mobile = false;
  });

  for (const p of PAGES) {
    it(`${p.name} renders without crashing and shows its primary action`, () => {
      const html = render(p.el());
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(p.primary);
    });
  }

  it('Library renders the table layout on desktop', () => {
    const html = render(<Library />);
    expect(html).toContain('data-testid="library-table"');
  });

  it('Programs Archive renders the registry table on desktop', () => {
    const html = render(<ProgramsArchive />);
    expect(html).toContain('data-testid="programs-table"');
    expect(html).toContain('42 of 42');
  });
});

describe('W11 mobile pages — mobile branch (useIsMobile=true)', () => {
  beforeEach(() => {
    mobileState.mobile = true;
  });

  for (const p of PAGES) {
    it(`${p.name} renders without crashing and shows its primary action`, () => {
      const html = render(p.el());
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(p.primary);
    });
  }

  it('Library renders the mobile card list', () => {
    const html = render(<Library />);
    expect(html).toContain('data-testid="library-card-list"');
    expect(html).not.toContain('data-testid="library-table"');
    expect(html).toContain('LOAD ↗');
  });

  it('Programs Archive renders the mobile card list', () => {
    const html = render(<ProgramsArchive />);
    expect(html).toContain('data-testid="programs-card-list"');
    expect(html).not.toContain('data-testid="programs-table"');
    expect(html).toContain('official negative');
  });

  it('Experiment Lab renders the kill/promote matrix as cards', () => {
    const html = render(<ExperimentLab />);
    expect(html).toContain('data-testid="killmatrix-card-list"');
  });
});
