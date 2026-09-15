/**
 * Application shell (design.md §4.1): fixed 240px Module Rail, 48px Status
 * Bar, workspace with routed module pages, global panic affordance.
 *
 * Mobile shell (mobile_adaptation_spec.md §3.2, W10): below 768px the rail
 * is replaced by a fixed bottom bar — HOME / STUDIO / LIBRARY / SAFETY /
 * MORE (bottom-sheet drawer with every remaining route) — plus a persistent
 * ≥56px PANIC segment pinned at the trailing end. The status bar shrinks to
 * session label + engine LED; the long session readout and UTC clock move
 * into the MORE drawer header. Breakpoint comes from the canonical
 * `useIsMobile()` hook (matchMedia `(max-width: 767px)`), matching Tailwind
 * `md`.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Archive,
  AudioWaveform,
  BookMarked,
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  Compass,
  FlaskConical,
  Gauge,
  FileAudio,
  GitFork,
  Home,
  Info,
  Layers,
  ListChecks,
  OctagonX,
  Orbit,
  Pause,
  Play,
  Zap,
  MessageSquareWarning,
  Moon,
  MoreHorizontal,
  Repeat2,
  ShieldAlert,
  Stethoscope,
  Waves,
  X,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { fmtClock, useSession } from '../session/SessionContext';
import { DensityToggle, Led } from '../components/primitives';
import { useModalA11y } from '../hooks';
import { MobilePanicButton, PanicButton, PanicOverlay } from '../components/Panic';
import { CommandPalette, PaletteHint } from '../components/CommandPalette';

const MODULES = [
  { path: '/', label: 'HOME', icon: Home },
  { path: '/studio', label: 'STUDIO', icon: AudioWaveform },
  { path: '/library', label: 'LIBRARY', icon: BookOpen },
  { path: '/presets', label: 'PRESETS', icon: Layers },
  { path: '/levels', label: 'LEVELS', icon: Gauge },
  { path: '/analyzer', label: 'ANALYZER', icon: Activity },
  { path: '/cymatics', label: 'CYMATICS', icon: Waves },
  { path: '/dream', label: 'SLEEP & DREAM', icon: Moon },
  { path: '/replication', label: 'REPLICATION BAY', icon: Repeat2 },
  { path: '/safety', label: 'SAFETY', icon: ShieldAlert },
  { path: '/medical', label: 'MED FREQ', icon: Stethoscope },
  { path: '/knowledge', label: 'KNOWLEDGE', icon: BookMarked },
  { path: '/about', label: 'ABOUT', icon: Info },
  { path: '/guide', label: 'GUIDE', icon: Compass },
] as const;

/** Research modules — all live (the · SOON section suffix is retired). */
const RESEARCH_MODULES = [
  { path: '/lab', label: 'EXPERIMENT LAB', icon: FlaskConical },
  { path: '/critique', label: 'CRITIQUE LIBRARY', icon: MessageSquareWarning },
  { path: '/hypotheses', label: 'HYPOTHESIS TRACKER', icon: ListChecks },
  { path: '/programs', label: 'PROGRAMS ARCHIVE', icon: Archive },
  { path: '/quicklab', label: 'QUICK LAB', icon: Zap },
  { path: '/theory', label: 'THEORY EXPLORER', icon: GitFork },
  { path: '/sonic-lab', label: 'SONIC LAB', icon: Orbit },
  { path: '/sample-lab', label: 'SAMPLE LAB', icon: FileAudio },
] as const;

const ALL_ROUTES = [...MODULES, ...RESEARCH_MODULES];

/** Primary bottom-bar destinations (phone shell); everything else via MORE. */
const BOTTOM_TABS = [
  { path: '/', label: 'HOME', icon: Home },
  { path: '/studio', label: 'STUDIO', icon: AudioWaveform },
  { path: '/library', label: 'LIBRARY', icon: BookOpen },
  { path: '/safety', label: 'SAFETY', icon: ShieldAlert },
] as const;

/** Bottom bar height (excluding safe-area inset) — also the content padding. */
const BOTTOM_BAR_H = 56;
/** Bottom bar must clear .grain (z-60) and PanicOverlay (z-90): panic stays reachable. */
const BOTTOM_BAR_Z = 100;

/** Collapsible sidebar states (desktop ≥768px only): full labels → icon strip → hidden. */
export type SidebarState = 'full' | 'icon' | 'hidden';

const SIDEBAR_W: Record<SidebarState, number> = { full: 240, icon: 64, hidden: 0 };
const SIDEBAR_STATES: SidebarState[] = ['full', 'icon', 'hidden'];
const SIDEBAR_STORAGE_KEY = 'open-sync:sidebar';

function readSidebarState(): SidebarState {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return raw === 'icon' || raw === 'hidden' ? raw : 'full';
  } catch {
    return 'full';
  }
}

function nextSidebarState(state: SidebarState): SidebarState {
  return SIDEBAR_STATES[(SIDEBAR_STATES.indexOf(state) + 1) % SIDEBAR_STATES.length];
}

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className="flex items-center gap-2"
      style={collapsed ? { padding: '16px 0 12px', justifyContent: 'center' } : { padding: '16px 16px 12px' }}
    >
      <svg width={28} height={28} viewBox="0 0 48 48" aria-label="Open Sync">
        {/* two interlocking sine halves forming an O ring broken on the right */}
        <path
          d="M 24 6 A 18 18 0 0 0 24 42"
          fill="none"
          stroke="var(--teal)"
          strokeWidth={1.5}
        />
        <path
          d="M 24 6 A 18 18 0 0 1 36 15 M 36 33 A 18 18 0 0 1 24 42"
          fill="none"
          stroke="var(--amber)"
          strokeWidth={1.5}
        />
        <rect x={41} y={22} width={2} height={8} fill="var(--amber)" />
      </svg>
      {!collapsed && (
        <div>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', lineHeight: '18px' }}>
            Open Sync
          </div>
          <div className="t-caption text-3" style={{ lineHeight: '14px' }}>
            evidence-honest audio lab
          </div>
        </div>
      )}
    </div>
  );
}

function RailItem({
  path,
  label,
  icon: Icon,
  ledState,
  collapsed,
}: {
  path: string;
  label: string;
  icon: typeof Info;
  ledState?: 'off' | 'amber' | 'teal' | 'danger';
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      style={{ textDecoration: 'none', position: 'relative', display: 'block' }}
      className={({ isActive }) => (isActive ? 'rail-active' : '')}
    >
      {({ isActive }) => (
        <div
          className="flex items-center gap-3"
          style={{
            height: 56,
            padding: collapsed ? 0 : '0 16px',
            justifyContent: collapsed ? 'center' : undefined,
            background: isActive ? 'var(--ink-2)' : 'transparent',
            color: isActive ? 'var(--amber)' : 'var(--text-2)',
          }}
        >
          {isActive && (
            <motion.span
              layoutId="rail-bar"
              transition={{ duration: 0.24 }}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--amber)' }}
            />
          )}
          <Icon size={20} strokeWidth={1.5} style={{ color: isActive ? 'var(--amber)' : 'var(--text-2)', flexShrink: 0 }} />
          {!collapsed && (
            <span className="t-label" style={{ color: isActive ? 'var(--amber)' : 'var(--text-2)', flex: 1 }}>
              {label}
            </span>
          )}
          {!collapsed && ledState && <Led state={ledState} />}
        </div>
      )}
    </NavLink>
  );
}

/** Icon-only panic for the 64px icon strip (full PanicButton label won't fit). */
function IconPanicButton() {
  const { panic, running } = useSession();
  return (
    <button
      type="button"
      onClick={panic}
      aria-label="Panic — stop everything (P). Single press, no confirm."
      title="Panic — stop everything (P)"
      className={running ? 'panic-breathe' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 32,
        border: '1px solid var(--danger)',
        borderRadius: 2,
        color: 'var(--danger)',
        background: 'rgba(196,99,79,0.1)',
        cursor: 'pointer',
      }}
    >
      <OctagonX size={15} />
    </button>
  );
}

/**
 * Collapse control at the rail bottom (full + icon states). Cycles
 * full → icon → hidden; the hidden state's reopen path is the left-edge
 * handle, the `[` shortcut, or the palette command.
 */
function CollapseToggle({ state, onCycle }: { state: SidebarState; onCycle: () => void }) {
  const label = state === 'full' ? 'Collapse sidebar to icons ([)' : 'Hide sidebar ([)';
  return (
    <button
      type="button"
      data-testid="rail-collapse-toggle"
      aria-label={label}
      aria-expanded={state !== 'hidden'}
      aria-controls="module-rail"
      onClick={onCycle}
      title={label}
      className="flex items-center justify-center"
      style={{
        width: 32,
        height: 24,
        background: 'none',
        border: '1px solid var(--line-1)',
        borderRadius: 2,
        color: 'var(--text-2)',
        cursor: 'pointer',
      }}
    >
      <ChevronsLeft size={14} strokeWidth={1.5} />
    </button>
  );
}

function ModuleRail({ state, onCycle }: { state: SidebarState; onCycle: () => void }) {
  const { running, paused, governor } = useSession();
  const collapsed = state === 'icon';
  return (
    <nav
      id="module-rail"
      data-testid="module-rail"
      data-state={state}
      aria-label="Module rail"
      className="flex flex-col"
      style={{
        width: SIDEBAR_W[state],
        flexShrink: 0,
        background: 'var(--ink-0)',
        borderRight: state === 'hidden' ? 'none' : '1px solid var(--line-1)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        transition: 'width var(--motion-2)',
      }}
    >
      {state !== 'hidden' && (
        <>
          <Logo collapsed={collapsed} />
          <div className="flex-1 overflow-y-auto">
            {MODULES.map((m) => (
              <RailItem
                key={m.path}
                {...m}
                collapsed={collapsed}
                ledState={
                  m.path === '/studio'
                    ? engineLedState(running, paused)
                    : m.path === '/safety'
                      ? governor.infantMode
                        ? 'teal'
                        : 'off'
                      : undefined
                }
              />
            ))}
            {!collapsed && (
              <div className="t-label text-3" style={{ padding: '16px 16px 4px' }}>
                RESEARCH
              </div>
            )}
            {RESEARCH_MODULES.map((m) => (
              <RailItem key={m.path} {...m} collapsed={collapsed} />
            ))}
          </div>
          <div
            data-testid="rail-footer"
            className="flex flex-col"
            style={{
              padding: collapsed ? 12 : 16,
              borderTop: '1px solid var(--line-1)',
              gap: 10,
              alignItems: collapsed ? 'center' : 'stretch',
            }}
          >
            {collapsed ? <IconPanicButton /> : <PanicButton />}
            <div
              className="flex items-center"
              style={{
                gap: 8,
                flexDirection: collapsed ? 'column' : 'row',
                justifyContent: collapsed ? 'center' : 'space-between',
              }}
            >
              <DensityToggle />
              <CollapseToggle state={state} onCycle={onCycle} />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

/**
 * Reopen affordance for the hidden rail: a 16px-wide handle pinned to the
 * left viewport edge with an amber edge line; dimmed until hover/focus
 * (styles in index.css, additive). Click restores the full rail.
 */
function SidebarReopenHandle({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      data-testid="rail-reopen-handle"
      className="rail-reopen-handle"
      aria-label="Open sidebar ([)"
      aria-expanded={false}
      aria-controls="module-rail"
      onClick={onOpen}
      title="Open sidebar ([)"
    >
      <ChevronRight size={12} strokeWidth={1.5} />
    </button>
  );
}

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const iso = now.toISOString();
  return (
    <span className="t-readout-sm text-3" title="Master clock (UTC)">
      {iso.slice(11, 19)} UTC
    </span>
  );
}

/** Engine LED states, consistent everywhere: off = idle, amber = playing, teal = paused. */
export function engineLedState(running: boolean, paused: boolean): 'off' | 'amber' | 'teal' {
  return running ? (paused ? 'teal' : 'amber') : 'off';
}

/**
 * Global pause/resume chip (status bar; Space hotkey). Phase-coherent: the
 * engine freezes its phase accumulators and continues on resume — no click,
 * no jump. Disabled (not hidden) while idle so the control's location is
 * stable; a no-op until a session starts.
 */
function PauseChip() {
  const { running, paused, togglePause } = useSession();
  return (
    <button
      type="button"
      data-testid="pause-toggle"
      className="chip"
      aria-label={paused ? 'Resume session (Space)' : 'Pause session (Space)'}
      aria-pressed={paused}
      disabled={!running}
      onClick={togglePause}
      title={
        running
          ? paused
            ? 'Resume — continues the frozen phase, no click (Space)'
            : 'Pause — freezes audio in place, no click (Space)'
          : 'Pause (Space) — start a session first'
      }
      style={{
        height: 24,
        padding: '0 8px',
        fontSize: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        opacity: running ? 1 : 0.45,
        cursor: running ? 'pointer' : 'default',
      }}
    >
      {paused ? <Play size={11} strokeWidth={1.5} /> : <Pause size={11} strokeWidth={1.5} />}
      {paused ? 'RESUME' : 'PAUSE'}
    </button>
  );
}

/** Compact engine readout (`BIN · 4.00 Hz · 12:00 · DOSE 3%` / `PAUSED · …` / ENGINE OFF). */
function SessionReadout() {
  const { running, paused, mode, beatHz, elapsedSec, dosePercent } = useSession();
  return (
    <span className="t-readout-sm" style={{ color: running && !paused ? 'var(--text-1)' : 'var(--text-3)' }}>
      {running
        ? `${paused ? 'PAUSED · ' : ''}${mode.slice(0, 3).toUpperCase()} · ${beatHz.toFixed(2)} Hz · ${fmtClock(elapsedSec)} · DOSE ${dosePercent.toFixed(0)}%`
        : 'ENGINE OFF'}
    </span>
  );
}

function useModuleLabel() {
  const location = useLocation();
  const mod = ALL_ROUTES.find((m) =>
    m.path === '/' ? location.pathname === '/' : location.pathname.startsWith(m.path),
  );
  return mod ? `OPEN SYNC / ${mod.label}` : 'OPEN SYNC';
}

function StatusBar({ onPalette }: { onPalette: () => void }) {
  const { governor, running, paused } = useSession();
  const label = useModuleLabel();
  return (
    <header
      data-testid="status-bar"
      className="flex items-center gap-4"
      style={{
        height: 48,
        padding: '0 20px',
        background: 'var(--ink-1)',
        borderBottom: '1px solid var(--line-1)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <span className="t-label">{label}</span>
      <div style={{ margin: '0 auto' }}>
        <SessionReadout />
      </div>
      {governor.infantMode && (
        <span
          className="t-label"
          style={{
            color: 'var(--amber)',
            border: '1px solid var(--amber)',
            borderRadius: 2,
            padding: '2px 8px',
          }}
        >
          INFANT
        </span>
      )}
      <PaletteHint onOpen={onPalette} />
      <span title={running ? (paused ? 'Session paused' : 'Engine running') : 'Engine off'}>
        <Led state={engineLedState(running, paused)} />
      </span>
      <PauseChip />
      <UtcClock />
      <PanicButton />
    </header>
  );
}

/** Phone status bar (§3.2): session label + compact engine LED only. */
function MobileStatusBar({ onPalette }: { onPalette: () => void }) {
  const { running, paused } = useSession();
  const label = useModuleLabel();
  return (
    <header
      data-testid="status-bar-mobile"
      className="flex items-center gap-3"
      style={{
        height: 48,
        padding: '0 16px',
        background: 'var(--ink-1)',
        borderBottom: '1px solid var(--line-1)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <span className="t-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
        <PaletteHint onOpen={onPalette} />
        <span title={running ? (paused ? 'Session paused' : 'Engine running') : 'Engine off'}>
          <Led state={engineLedState(running, paused)} />
        </span>
      </div>
    </header>
  );
}

/** Single bottom-bar tab (≥56px tall column, icon + micro label). */
function BottomTab({ path, label, icon: Icon }: { path: string; label: string; icon: typeof Info }) {
  return (
    <NavLink
      to={path}
      data-testid={`bottom-tab-${label.toLowerCase()}`}
      style={{ textDecoration: 'none', flex: 1, minWidth: 0, display: 'flex' }}
    >
      {({ isActive }) => (
        <span
          className="flex flex-col items-center justify-center"
          style={{
            flex: 1,
            minHeight: BOTTOM_BAR_H,
            gap: 3,
            color: isActive ? 'var(--amber)' : 'var(--text-2)',
            background: isActive ? 'var(--ink-2)' : 'transparent',
            borderTop: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
            paddingTop: isActive ? 0 : 2,
          }}
        >
          <Icon size={20} strokeWidth={1.5} />
          <span
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9,
              letterSpacing: '0.1em',
              lineHeight: '12px',
            }}
          >
            {label}
          </span>
        </span>
      )}
    </NavLink>
  );
}

/**
 * Compact pause chip for the phone bottom bar: icon + micro label, pinned as
 * its own segment immediately before PANIC (panic keeps its fixed 72px
 * trailing slot — the chip never overlaps or obscures it). Disabled while
 * idle; the global Space hotkey is the desktop equivalent.
 */
function MobilePauseChip() {
  const { running, paused, togglePause } = useSession();
  return (
    <button
      type="button"
      data-testid="mobile-pause"
      aria-label={paused ? 'Resume session' : 'Pause session'}
      aria-pressed={paused}
      disabled={!running}
      onClick={togglePause}
      className="flex flex-col items-center justify-center"
      style={{
        width: '100%',
        minHeight: BOTTOM_BAR_H,
        gap: 3,
        border: 'none',
        borderLeft: '1px solid var(--line-1)',
        color: paused ? 'var(--teal)' : 'var(--text-2)',
        background: paused ? 'var(--ink-2)' : 'transparent',
        opacity: running ? 1 : 0.4,
        cursor: running ? 'pointer' : 'default',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9,
        letterSpacing: '0.1em',
        touchAction: 'manipulation',
      }}
    >
      {paused ? <Play size={18} strokeWidth={1.5} /> : <Pause size={18} strokeWidth={1.5} />}
      {paused ? 'RESUME' : 'PAUSE'}
    </button>
  );
}

/**
 * Phone bottom bar (§3.2): 4 primary tabs + MORE + persistent PANIC segment.
 * Fixed, ≥56px + safe-area inset, z-index 100 (above .grain z-60 and the
 * z-90 PanicOverlay, so panic is never covered).
 */
function BottomBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  return (
    <nav
      data-testid="mobile-bottom-bar"
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: BOTTOM_BAR_Z,
        display: 'flex',
        alignItems: 'stretch',
        height: `calc(${BOTTOM_BAR_H}px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--ink-0)',
        borderTop: '1px solid var(--line-1)',
      }}
    >
      {BOTTOM_TABS.map((t) => (
        <BottomTab key={t.path} {...t} />
      ))}
      <button
        type="button"
        data-testid="bottom-tab-more"
        aria-label="More modules"
        aria-expanded={moreOpen}
        onClick={onMore}
        className="flex flex-col items-center justify-center"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: BOTTOM_BAR_H,
          gap: 3,
          color: moreOpen ? 'var(--amber)' : 'var(--text-2)',
          background: moreOpen ? 'var(--ink-2)' : 'transparent',
          border: 'none',
          borderTop: `2px solid ${moreOpen ? 'var(--amber)' : 'transparent'}`,
          paddingTop: moreOpen ? 0 : 2,
          cursor: 'pointer',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.1em',
        }}
      >
        <MoreHorizontal size={20} strokeWidth={1.5} />
        MORE
      </button>
      {/* Pause: compact segment next to panic (separate slot — never covers it). */}
      <div style={{ width: 52, flexShrink: 0, display: 'flex' }}>
        <MobilePauseChip />
      </div>
      {/* Panic: fixed-width trailing segment, ≥56px target, always on top. */}
      <div style={{ width: 72, flexShrink: 0, display: 'flex' }}>
        <MobilePanicButton />
      </div>
    </nav>
  );
}

/** One large-target (≥48px) drawer row linking to a module. */
function DrawerLink({
  path,
  label,
  icon: Icon,
  onNavigate,
}: {
  path: string;
  label: string;
  icon: typeof Info;
  onNavigate: () => void;
}) {
  return (
    <NavLink to={path} onClick={onNavigate} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <div
          className="flex items-center gap-3"
          style={{
            minHeight: 48,
            padding: '0 16px',
            background: isActive ? 'var(--ink-2)' : 'transparent',
            color: isActive ? 'var(--amber)' : 'var(--text-2)',
            borderLeft: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
          }}
        >
          <Icon size={20} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <span className="t-label" style={{ color: isActive ? 'var(--amber)' : 'var(--text-2)' }}>
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

/**
 * MORE drawer (§3.2): bottom sheet listing every route (primary tabs repeated
 * for completeness + all remaining modules + research), plus the session
 * readout and UTC clock that the compact status bar no longer shows. The
 * sheet stops above the bottom bar so PANIC stays reachable while it is open.
 */
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // P0-4: Esc closes, focus moves to the close button, returns to MORE tab.
  useModalA11y(open, onClose, closeRef);
  const core = ALL_ROUTES.filter((r) => BOTTOM_TABS.some((t) => t.path === r.path));
  const modules = MODULES.filter((m) => !BOTTOM_TABS.some((t) => t.path === m.path));
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="more-backdrop"
            data-testid="more-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(11,12,13,0.6)' }}
          />
          <motion.div
            key="more-sheet"
            data-testid="more-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="More modules"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: `calc(${BOTTOM_BAR_H}px + env(safe-area-inset-bottom, 0px))`,
              zIndex: 81,
              maxHeight: 'min(70vh, 560px)',
              overflowY: 'auto',
              background: 'var(--ink-0)',
              borderTop: '1px solid var(--line-1)',
            }}
          >
            <div
              className="flex items-center gap-3"
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--line-1)',
                position: 'sticky',
                top: 0,
                background: 'var(--ink-0)',
              }}
            >
              <SessionReadout />
              <div style={{ marginLeft: 'auto' }} className="flex items-center gap-3">
                <DensityToggle />
                <UtcClock />
                <button
                  type="button"
                  ref={closeRef}
                  aria-label="Close"
                  onClick={onClose}
                  className="flex items-center justify-center"
                  style={{
                    width: 44,
                    height: 44,
                    background: 'none',
                    border: '1px solid var(--line-1)',
                    borderRadius: 2,
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="t-label text-3" style={{ padding: '12px 16px 4px' }}>
              CORE
            </div>
            {core.map((m) => (
              <DrawerLink key={m.path} {...m} onNavigate={onClose} />
            ))}
            <div className="t-label text-3" style={{ padding: '12px 16px 4px' }}>
              MODULES
            </div>
            {modules.map((m) => (
              <DrawerLink key={m.path} {...m} onNavigate={onClose} />
            ))}
            <div className="t-label text-3" style={{ padding: '12px 16px 4px' }}>
              RESEARCH
            </div>
            {RESEARCH_MODULES.map((m) => (
              <DrawerLink key={m.path} {...m} onNavigate={onClose} />
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { panic, rehearsePanic, running, togglePause } = useSession();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Collapsible sidebar (desktop only): full → icon → hidden, persisted.
  const [sidebar, setSidebar] = useState<SidebarState>(readSidebarState);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebar);
    } catch {
      /* storage unavailable — layout state stays session-local */
    }
  }, [sidebar]);

  const cycleSidebar = () => setSidebar((s) => nextSidebarState(s));

  // P1-1: ⌘K / Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the MORE drawer whenever the route changes (state-adjust-during-
  // render pattern; drawer links also close it on tap directly).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setMoreOpen(false);
  }

  // Sidebar hotkey: [ cycles full → icon → hidden (desktop only; the rail
  // and its layout state don't exist on the mobile shell).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '[') cycleSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Global panic hotkey: P (Shift+P = test/rehearse). Desktop path; on touch
  // devices the bottom-bar panic segment is the equivalent.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'p' || e.key === 'P') {
        if (e.shiftKey) rehearsePanic();
        else panic();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panic, rehearsePanic]);

  // Global pause hotkey: Space toggles pause/resume while a session is live.
  // Guarded — never fires from form fields, contenteditable, or focused
  // buttons/links (Space is their activation key), and stays fully inert
  // when idle so Space keeps its default scroll behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        tag === 'A' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (!running) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, togglePause]);

  return (
    <div className="flex grain" style={{ minHeight: '100vh', background: 'var(--ink-0)' }}>
      {!isMobile && <ModuleRail state={sidebar} onCycle={cycleSidebar} />}
      {!isMobile && sidebar === 'hidden' && <SidebarReopenHandle onOpen={() => setSidebar('full')} />}
      <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
        {isMobile ? (
          <MobileStatusBar onPalette={() => setPaletteOpen(true)} />
        ) : (
          <StatusBar onPalette={() => setPaletteOpen(true)} />
        )}
        <main
          style={{
            flex: 1,
            background: 'var(--ink-1)',
            // Keep content clear of the fixed bottom bar (§3.2 / AC8).
            paddingBottom: isMobile ? `calc(${BOTTOM_BAR_H}px + env(safe-area-inset-bottom, 0px))` : 0,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {isMobile && (
        <>
          <BottomBar onMore={() => setMoreOpen((v) => !v)} moreOpen={moreOpen} />
          <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
      <PanicOverlay />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onToggleSidebar={isMobile ? undefined : cycleSidebar}
      />
    </div>
  );
}
