import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { SessionProvider } from './ui/session/SessionContext'
import { AppShell } from './ui/layout/AppShell'
// Landing route stays eager so first paint never waits on a chunk; every
// other page is code-split (S30.2: the single 1.2 MB chunk is retired).
import Home from './pages/Home'

const Guide = lazy(() => import('./pages/Guide'))
const Studio = lazy(() => import('./pages/Studio'))
const SampleLab = lazy(() => import('./pages/SampleLab'))
const Library = lazy(() => import('./pages/Library'))
const Presets = lazy(() => import('./pages/Presets'))
const Levels = lazy(() => import('./pages/Levels'))
const Analyzer = lazy(() => import('./pages/Analyzer'))
const Cymatics = lazy(() => import('./pages/Cymatics'))
const Dream = lazy(() => import('./pages/Dream'))
const QuickLab = lazy(() => import('./pages/QuickLab'))
const TheoryExplorer = lazy(() => import('./pages/TheoryExplorer'))
const SonicLab = lazy(() => import('./pages/SonicLab'))
const Replication = lazy(() => import('./pages/Replication'))
const Safety = lazy(() => import('./pages/Safety'))
const Medical = lazy(() => import('./pages/Medical'))
const Knowledge = lazy(() => import('./pages/Knowledge'))
const About = lazy(() => import('./pages/About'))
const ExperimentLab = lazy(() => import('./pages/research/ExperimentLab'))
const CritiqueLibrary = lazy(() => import('./pages/research/CritiqueLibrary'))
const HypothesisTracker = lazy(() => import('./pages/research/HypothesisTracker'))
const ProgramsArchive = lazy(() => import('./pages/research/ProgramsArchive'))

/** Dim in-shell fallback while a route chunk loads (motion: led-pulse token). */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="route-loading font-mono2"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 240,
        fontSize: 11,
        letterSpacing: '0.2em',
        color: 'var(--amber-dim, var(--text-3))',
      }}
    >
      LOADING…
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/library" element={<Library />} />
            <Route path="/presets" element={<Presets />} />
            <Route path="/levels" element={<Levels />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/cymatics" element={<Cymatics />} />
            <Route path="/dream" element={<Dream />} />
            <Route path="/quicklab" element={<QuickLab />} />
            <Route path="/theory" element={<TheoryExplorer />} />
            <Route path="/sample-lab" element={<SampleLab />} />
          <Route path="/sonic-lab" element={<SonicLab />} />
            <Route path="/replication" element={<Replication />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/medical" element={<Medical />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/about" element={<About />} />
            <Route path="/lab" element={<ExperimentLab />} />
            <Route path="/critique" element={<CritiqueLibrary />} />
            <Route path="/hypotheses" element={<HypothesisTracker />} />
            <Route path="/programs" element={<ProgramsArchive />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </SessionProvider>
  )
}
