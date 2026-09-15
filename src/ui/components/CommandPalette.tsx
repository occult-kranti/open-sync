/**
 * ⌘K command palette (ux_improvement_spec §3.1, P1-1). One keystroke to every
 * module plus the transport/session actions. Built on cmdk (already a dep)
 * inside a hand-rolled dialog shell that honors the P0-4 contract via
 * useModalA11y: Esc closes, focus returns to the invoking element.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Archive,
  AudioWaveform,
  BookMarked,
  BookOpen,
  Compass,
  Download,
  FlaskConical,
  Gauge,
  Home,
  Info,
  Layers,
  ListChecks,
  MessageSquareWarning,
  Moon,
  OctagonX,
  PanelLeft,
  Pause,
  Play,
  Repeat2,
  ShieldAlert,
  Baby,
  Square,
  Stethoscope,
  Waves,
} from 'lucide-react';
import { useSession } from '../session/SessionContext';
import { useModalA11y } from '../hooks';

const MODULE_ENTRIES = [
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
  { path: '/lab', label: 'EXPERIMENT LAB', icon: FlaskConical },
  { path: '/critique', label: 'CRITIQUE LIBRARY', icon: MessageSquareWarning },
  { path: '/hypotheses', label: 'HYPOTHESIS TRACKER', icon: ListChecks },
  { path: '/programs', label: 'PROGRAMS ARCHIVE', icon: Archive },
] as const;

/** Hint chip for the status bar: visible, focusable, opens the palette. */
export function PaletteHint({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      data-testid="palette-hint"
      aria-label="Open command palette (Ctrl+K)"
      onClick={onOpen}
      className="chip"
      style={{ height: 24, padding: '0 8px', fontSize: 10 }}
      title="Command palette — jump anywhere, run actions"
    >
      ⌘K
    </button>
  );
}

export function CommandPalette({
  open,
  onClose,
  onToggleSidebar,
}: {
  open: boolean;
  onClose: () => void;
  /** Desktop shell only: cycles the collapsible module rail (full → icon → hidden). */
  onToggleSidebar?: () => void;
}) {
  const s = useSession();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  // P0-4 contract: Esc closes; input focused on open; focus returns to trigger.
  useModalA11y(open, onClose, inputRef);

  const actions = useMemo(
    () =>
      [
        ...(onToggleSidebar
          ? [
              {
                id: 'sidebar',
                label: 'TOGGLE SIDEBAR',
                icon: PanelLeft,
                hint: '[',
                run: onToggleSidebar,
              } as const,
            ]
          : []),
        {
          id: 'transport',
          label: s.running ? 'STOP SESSION' : 'START SESSION',
          icon: s.running ? Square : Play,
          hint: 'transport',
          run: () => (s.running ? s.stop() : s.start()),
        },
        {
          id: 'pause',
          label: s.paused ? 'RESUME SESSION' : 'PAUSE SESSION',
          icon: s.paused ? Play : Pause,
          hint: 'Space · no-op while idle',
          run: () => s.togglePause(),
        },
        {
          id: 'panic',
          label: 'PANIC — STOP ALL AUDIO',
          icon: OctagonX,
          hint: 'P',
          run: () => s.panic(),
        },
        {
          id: 'export',
          label: 'EXPORT SESSION AS WAV',
          icon: Download,
          hint: 'offline render',
          run: () => s.exportWav(),
        },
        {
          id: 'infant',
          label: s.governor.infantMode ? 'INFANT MODE: OFF' : 'INFANT MODE: ON',
          icon: Baby,
          hint: 'safety governor',
          run: () => s.setGovernor({ infantMode: !s.governor.infantMode }),
        },
        {
          id: 'guide-entry',
          label: 'READ THE GUIDE — HOW EVERY FEATURE WORKS',
          icon: Compass,
          hint: 'docs',
          run: () => navigate('/guide'),
        },
      ],
    [s, navigate, onToggleSidebar],
  );

  const runAndClose = (run: () => void) => {
    run();
    setQuery('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          data-testid="command-palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(11,12,13,0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 'min(18vh, 160px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, calc(100vw - 32px))',
              background: 'var(--ink-2)',
              border: '1px solid var(--line-2)',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            <Command label="Command palette" loop>
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Jump to a module or run an action…"
                className="font-mono2"
                style={{
                  width: '100%',
                  background: 'var(--ink-1)',
                  border: 'none',
                  borderBottom: '1px solid var(--line-1)',
                  color: 'var(--text-1)',
                  padding: '12px 14px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <Command.List style={{ maxHeight: 320, overflowY: 'auto', padding: 6 }}>
                <Command.Empty className="t-body-sm text-3" style={{ padding: '12px 14px' }}>
                  No matches — try a module name or "panic".
                </Command.Empty>
                <Command.Group
                  heading="ACTIONS"
                  style={{ ['--cmdk-group-heading-color' as string]: 'var(--text-3)' } as React.CSSProperties}
                >
                  {actions.map((a) => (
                    <PaletteItem key={a.id} onSelect={() => runAndClose(a.run)} hint={a.hint}>
                      <a.icon size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      {a.label}
                    </PaletteItem>
                  ))}
                </Command.Group>
                <Command.Group heading="GO TO MODULE">
                  {MODULE_ENTRIES.map((m) => (
                    <PaletteItem
                      key={m.path}
                      onSelect={() =>
                        runAndClose(() => {
                          navigate(m.path);
                        })
                      }
                    >
                      <m.icon size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      {m.label}
                    </PaletteItem>
                  ))}
                </Command.Group>
              </Command.List>
              <div
                className="t-caption text-3 flex items-center gap-4"
                style={{ padding: '8px 14px', borderTop: '1px solid var(--line-1)' }}
              >
                <span>↑↓ navigate</span>
                <span>↵ run</span>
                <span>esc close</span>
                <span style={{ marginLeft: 'auto' }}>⌘K / Ctrl+K anywhere</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  children,
  hint,
  onSelect,
}: {
  children: React.ReactNode;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="t-label"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 2,
        cursor: 'pointer',
        color: 'var(--text-2)',
      }}
      data-hint={hint}
    >
      {children}
      {hint && (
        <span className="t-caption text-3" style={{ marginLeft: 'auto' }}>
          {hint}
        </span>
      )}
    </Command.Item>
  );
}
