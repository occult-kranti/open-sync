/**
 * PanicButton (status-bar quick variant + full Safety-Center variant) and the
 * PanicOverlay (safety.md): single-press, no confirm, instant mute, dim
 * overlay with RESUME SAFELY (−12 dB, 2 s ramp).
 */

import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OctagonX } from 'lucide-react';
import { fmtClock, useSession } from '../session/SessionContext';
import { useModalA11y } from '../hooks';

/** Compact status-bar panic button (danger outline). */
export function PanicButton() {
  const { panic, running } = useSession();
  return (
    <button
      type="button"
      onClick={panic}
      title="Panic — stop everything (P). Single press, no confirm."
      className={running ? 'panic-breathe' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 12px',
        border: '1px solid var(--danger)',
        borderRadius: 2,
        color: 'var(--danger)',
        background: 'rgba(196,99,79,0.1)',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.12em',
        cursor: 'pointer',
      }}
    >
      <OctagonX size={13} />
      PANIC
    </button>
  );
}

/**
 * Bottom-bar panic button (mobile shell): ≥56px tall persistent segment pinned
 * at the trailing end of the bottom nav. Single tap, no confirm — the touch
 * replacement for the `P` hotkey. Rendered inside a bar whose z-index (100)
 * clears the grain overlay (z-60) AND the PanicOverlay (z-90), so panic is
 * never behind an overlay.
 */
export function MobilePanicButton() {
  const { panic, running } = useSession();
  return (
    <button
      type="button"
      data-testid="mobile-panic"
      aria-label="Panic — stop everything. Single tap, no confirm."
      onClick={panic}
      className={running ? 'panic-breathe' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        width: '100%',
        minHeight: 56,
        height: '100%',
        padding: '0 8px',
        border: 'none',
        borderLeft: '1px solid var(--danger)',
        color: 'var(--danger)',
        background: 'rgba(196,99,79,0.14)',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      <OctagonX size={16} />
      PANIC
    </button>
  );
}

/** Full-width Safety Center panic button (96px, danger fill). */
export function PanicButtonLarge() {
  const { panic, running } = useSession();
  return (
    <button
      type="button"
      onClick={panic}
      className={running ? 'panic-breathe' : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: 96,
        background: 'var(--danger)',
        color: 'var(--text-inv)',
        border: '2px solid var(--danger-hi)',
        borderRadius: 2,
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 600,
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(196,99,79,0.25)',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          width: 2,
          height: 8,
          background: 'var(--text-inv)',
          opacity: 0.7,
        }}
      />
      PANIC — STOP EVERYTHING
    </button>
  );
}

/** Full-screen dim overlay shown after a panic stop. */
export function PanicOverlay() {
  const { panicked, elapsedSec, resumeSafely, running, dismissPanic } = useSession();
  const open = panicked && !running;
  const resumeRef = useRef<HTMLButtonElement>(null);
  // P0-4: Esc dismisses, focus lands on RESUME SAFELY, returns to trigger.
  useModalA11y(open, dismissPanic, resumeRef);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Session stopped"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(11,12,13,0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div className="t-readout-lg" style={{ color: 'var(--text-1)' }}>
            STOPPED — {fmtClock(elapsedSec)} session ended
          </div>
          <div className="t-body-sm text-2" style={{ maxWidth: 420, textAlign: 'center' }}>
            Resume always comes back quieter than you left it (−12 dB, ramped over 2 s).
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              ref={resumeRef}
              onClick={resumeSafely}
              style={{
                height: 36,
                padding: '0 16px',
                border: '1px solid var(--line-2)',
                borderRadius: 2,
                color: 'var(--text-1)',
                background: 'transparent',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              RESUME SAFELY
            </button>
            <button
              type="button"
              onClick={dismissPanic}
              className="t-label"
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0 8px' }}
            >
              DISMISS
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
