/**
 * InfoPopover — a small circular 'i' button that opens a tap/click popover
 * explaining a graph/plot: what the axes mean, what a good reading looks
 * like, what a bad one looks like, plus the grade scope when the feature
 * carries one.
 *
 * Content comes exclusively from FEATURES (src/docs/features.ts) looked up by
 * feature id — single source of truth, no duplicated strings. Mobile-first:
 * tap to open, tap-outside/Esc to close, focus moves to the close button and
 * returns to the trigger (useModalA11y). Below md the popover is a bottom
 * sheet; above md it is an anchored panel clamped to a 360 px viewport. The
 * z-order stays below the panic surfaces (overlay z-90, bottom bar z-100) so
 * panic is never covered.
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FEATURES, type FeatureEntry } from '@/docs/features';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModalA11y } from '../hooks';
import { GradeBadge } from './GradeBadge';

/** Popover z-index: below PanicOverlay (z-90) and the mobile bottom bar (z-100). */
const POPOVER_Z = 75;
/** Max panel width — never overflows a 360 px viewport. */
const PANEL_MAX_W = 360;

export function featureById(id: string): FeatureEntry | undefined {
  return FEATURES.find((f) => f.id === id);
}

function ExplainerBody({ entry }: { entry: FeatureEntry }) {
  return (
    <div className="t-body-sm flex flex-col gap-3" style={{ color: 'var(--text-2)' }}>
      {entry.plot ? (
        <>
          <div>
            <div className="t-label" style={{ color: 'var(--text-3)', marginBottom: 2 }}>
              AXES / READOUTS
            </div>
            <p data-testid="info-axes">{entry.plot.axes}</p>
          </div>
          <div>
            <div className="t-label" style={{ color: 'var(--teal-hi)', marginBottom: 2 }}>
              GOOD LOOKS LIKE
            </div>
            <p data-testid="info-good">{entry.plot.good}</p>
          </div>
          <div>
            <div className="t-label" style={{ color: 'var(--amber)', marginBottom: 2 }}>
              WARNING SIGNS
            </div>
            <p data-testid="info-bad">{entry.plot.bad}</p>
          </div>
        </>
      ) : (
        <>
          {/* Fallback for features without a plot explainer: the same entry's
              plain-language summary + usage steps (still single-source). */}
          <p data-testid="info-simple">{entry.simple}</p>
          {entry.howTo.length > 0 && (
            <ol className="flex flex-col gap-1" style={{ paddingLeft: 18 }}>
              {entry.howTo.map((s, i) => (
                <li key={i} style={{ listStyle: 'decimal' }}>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {entry.gradeScope && (
        <p className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
          ▸ GRADE SCOPE · {entry.gradeScope}
        </p>
      )}
    </div>
  );
}

export function InfoPopover({ featureId, label }: { featureId: string; label?: string }) {
  const entry = featureById(featureId);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = entry?.name ?? 'About this view';

  // Esc closes, focus moves inside on open, returns to the trigger on close.
  useModalA11y(open, () => setOpen(false), closeRef);

  // Tap-outside closes (mobile-first); the bottom-sheet backdrop also closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Desktop anchored position with viewport clamps + open-upward fallback.
  useEffect(() => {
    if (!open || isMobile) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(PANEL_MAX_W, vw - 24);
    const left = Math.max(12, Math.min(rect.left, vw - w - 12));
    const estH = 320;
    const above = rect.bottom + 8 + estH > vh && rect.top - 8 - estH > 12;
    setPos({ left, top: above ? Math.max(12, rect.top - 8 - estH) : rect.bottom + 8, above });
  }, [open, isMobile]);

  if (!entry) return null;

  return (
    <span ref={rootRef} style={{ display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        data-testid="info-popover-trigger"
        aria-expanded={open}
        aria-label={label ?? `About: ${title}`}
        title={label ?? `About: ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="font-mono2"
        style={{
          // ≥40px touch target; the visible glyph circle stays small.
          minWidth: 40,
          minHeight: 40,
          margin: -9,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            fontStyle: 'italic',
            border: `1px solid ${open ? 'var(--amber)' : 'var(--line-2)'}`,
            color: open ? 'var(--amber)' : 'var(--text-2)',
            background: open ? 'rgba(217,164,65,0.08)' : 'transparent',
          }}
        >
          i
        </span>
      </button>

      {open && isMobile && (
        // Bottom-sheet backdrop (<md): below panic surfaces, tap to dismiss.
        <div
          data-testid="info-popover-backdrop"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: POPOVER_Z - 1, background: 'rgba(11,12,13,0.55)' }}
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label={title}
          data-testid="info-popover-panel"
          className="max-w-[360px]"
          style={
            isMobile
              ? {
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: POPOVER_Z,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  background: 'var(--ink-3)',
                  borderTop: '1px solid var(--line-2)',
                  borderRadius: '8px 8px 0 0',
                  boxShadow: '0 -12px 32px rgba(0,0,0,0.5)',
                  padding: '16px 16px 24px',
                }
              : {
                  position: 'fixed',
                  left: pos?.left ?? 12,
                  top: pos?.top ?? 96,
                  zIndex: POPOVER_Z,
                  width: `min(${PANEL_MAX_W}px, calc(100vw - 24px))`,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  background: 'var(--ink-3)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 2,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  padding: 16,
                  visibility: pos ? 'visible' : 'hidden',
                }
          }
        >
          <div className="flex items-center justify-between gap-3" style={{ marginBottom: 10 }}>
            <span className="t-label" style={{ color: 'var(--text-1)' }}>
              {title.toUpperCase()}
            </span>
            <span className="flex items-center gap-2">
              {entry.grade && <GradeBadge grade={entry.grade} compact />}
              <button
                ref={closeRef}
                type="button"
                aria-label="Close explainer"
                onClick={() => setOpen(false)}
                style={{
                  minWidth: 40,
                  minHeight: 40,
                  margin: -10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </span>
          </div>
          <ExplainerBody entry={entry} />
        </div>
      )}
    </span>
  );
}
