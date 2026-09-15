/**
 * PhaseTimeline — session phase editor / mini-timeline (studio.md Row C).
 * Editable variant supports drag-move, right-edge resize, double-click beat
 * edit, add/remove (limit 8). Compact variant renders a static mini bar.
 */

import { useRef, useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { BAND_COLOR, bandForBeat, INK, LINE, TEXT } from '../theme';
import { fmtClock, type UiPhase } from '../session/SessionContext';

/** Touch hit zone for the right-edge resize drag (visual grip stays 10px). */
const RESIZE_HIT_PX = 20;
/** Long-press (ms) opens the beat editor — touch equivalent of double-click. */
const LONG_PRESS_MS = 500;

let uid = 100;
const mk = (durationSec: number, beatHz: number): UiPhase => ({ id: `ph-u${++uid}`, durationSec, beatHz });

/** Every phase keeps at least this much time after any edit. */
export const MIN_PHASE_SEC = 60;

/**
 * Pure phase-move transform (node-testable): shift block `idx`'s left edge,
 * lending/stealing against the previous block; the first block instead
 * steals/lends against the FOLLOWING one. Both neighbours keep the 60 s
 * floor, so a move can never push a phase below MIN_PHASE_SEC or negative.
 */
export function movePhase(phases: readonly UiPhase[], idx: number, shiftSec: number): UiPhase[] {
  const next = phases.map((p) => ({ ...p }));
  if (idx < 0 || idx >= next.length) return next;
  if (idx > 0) {
    const maxShift = next[idx].durationSec - MIN_PHASE_SEC;
    const minShift = -(next[idx - 1].durationSec - MIN_PHASE_SEC);
    const clamped = Math.max(minShift, Math.min(maxShift, shiftSec));
    next[idx - 1].durationSec += clamped;
    next[idx].durationSec -= clamped;
  } else if (next.length > 1) {
    const maxShift = next[1].durationSec - MIN_PHASE_SEC;
    const minShift = -(next[0].durationSec - MIN_PHASE_SEC);
    const clamped = Math.max(minShift, Math.min(maxShift, shiftSec));
    next[0].durationSec += clamped;
    next[1].durationSec -= clamped;
  }
  return next;
}

/**
 * Parse a hand-typed beat value. Ceiling is 40 Hz — the Studio BEAT knob's
 * maximum (the ≤30 Hz percept warning is surfaced separately in Studio).
 */
export function parseBeatDraft(raw: string): number | null {
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v < 0.1 || v > 40) return null;
  return Math.round(v * 100) / 100;
}

interface Props {
  phases: UiPhase[];
  onChange?: (phases: UiPhase[]) => void;
  /** Playhead position in seconds (0 = hidden). */
  playheadSec?: number;
  height?: number;
  readonly?: boolean;
  /** Total timeline span in seconds (defaults to sum of phases). */
  spanSec?: number;
}

export function PhaseTimeline({ phases, onChange, playheadSec, height = 120, readonly, spanSec }: Props) {
  const total = spanSec ?? Math.max(60, phases.reduce((a, p) => a + p.durationSec, 0));
  const trackRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; x0: number; orig: UiPhase[] } | null>(null);
  const isMobile = useIsMobile();
  const editable = !readonly && !!onChange;

  const secToPx = (sec: number) => (sec / total) * 100;

  const applyDrag = (clientX: number) => {
    const d = drag.current;
    const el = trackRef.current;
    if (!d || !el || !onChange) return;
    const rect = el.getBoundingClientRect();
    const dSec = ((clientX - d.x0) / rect.width) * total;
    const idx = d.orig.findIndex((p) => p.id === d.id);
    if (idx < 0) return;
    if (d.mode === 'resize') {
      const next = d.orig.map((p) => ({ ...p }));
      next[idx].durationSec = Math.max(MIN_PHASE_SEC, Math.round((d.orig[idx].durationSec + dSec) / 30) * 30);
      onChange(next);
    } else {
      // Move: 30 s-quantized boundary shift (see movePhase for semantics).
      const shift = Math.round(dSec / 30) * 30;
      onChange(movePhase(d.orig, idx, shift));
    }
  };

  const commitBeat = (id: string) => {
    if (!onChange) return;
    const v = parseBeatDraft(draft);
    if (v !== null) {
      onChange(phases.map((p) => (p.id === id ? { ...p, beatHz: v } : p)));
    }
    setEditing(null);
  };

  return (
    <div>
      {/* ruler */}
      <div className="relative" style={{ height: 16, marginBottom: 4 }}>
        {Array.from({ length: Math.floor(total / 600) + 1 }, (_, i) => i * 600).map((sec) => (
          <span
            key={sec}
            className="t-readout-sm text-3 absolute"
            style={{ left: `${secToPx(sec)}%`, transform: 'translateX(-50%)' }}
          >
            {Math.round(sec / 60)}
          </span>
        ))}
        <span className="t-readout-sm text-3 absolute" style={{ right: 0 }}>
          min
        </span>
      </div>
      {/* track */}
      <div
        ref={trackRef}
        className="relative flex"
        style={{ height, background: INK[0], border: `1px solid ${LINE[1]}`, overflow: 'hidden' }}
      >
        {phases.map((p, i) => {
          const band = bandForBeat(p.beatHz);
          const color = band ? BAND_COLOR[band] : TEXT[3];
          const w = (p.durationSec / total) * 100;
          const prev = i > 0 ? phases[i - 1] : null;
          const ramp = prev && prev.beatHz !== p.beatHz;
          return (
            <div
              key={p.id}
              className="relative"
              style={{
                width: `${w}%`,
                borderRight: `1px solid ${LINE[2]}`,
                background: `${color}14`,
                cursor: readonly ? 'default' : 'grab',
                // Blocks are drag handles: never let the browser take the
                // gesture for scrolling (pointer-cancel kills the drag).
                ...(editable ? { touchAction: 'none' as const } : {}),
              }}
              onPointerDown={(e) => {
                if (!editable) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const mode = e.clientX > rect.right - RESIZE_HIT_PX ? 'resize' : 'move';
                drag.current = { id: p.id, mode, x0: e.clientX, orig: phases };
                // Long-press (no movement) opens the beat editor — the touch
                // equivalent of the desktop double-click.
                let moved = 0;
                const lp = window.setTimeout(() => {
                  if (!drag.current || moved >= 8) return;
                  drag.current = null;
                  window.removeEventListener('pointermove', moveEv);
                  window.removeEventListener('pointerup', up);
                  setDraft(String(p.beatHz));
                  setEditing(p.id);
                }, LONG_PRESS_MS);
                const moveEv = (ev: PointerEvent) => {
                  moved = Math.max(moved, Math.abs(ev.clientX - e.clientX));
                  if (moved >= 8) window.clearTimeout(lp);
                  applyDrag(ev.clientX);
                };
                const up = () => {
                  window.clearTimeout(lp);
                  drag.current = null;
                  window.removeEventListener('pointermove', moveEv);
                  window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', moveEv);
                window.addEventListener('pointerup', up);
              }}
              onDoubleClick={() => {
                if (readonly) return;
                setDraft(String(p.beatHz));
                setEditing(p.id);
              }}
              title={readonly ? undefined : 'Drag to move · right edge to resize · double-click or long-press to edit beat'}
            >
              <div className="absolute inset-x-0 top-0" style={{ height: 3, background: color }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                {editing === p.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitBeat(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitBeat(p.id);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    className="t-readout-sm bg-ink-4"
                    style={{ width: 56, border: '1px solid var(--amber)', textAlign: 'center', color: 'var(--text-1)' }}
                  />
                ) : (
                  <span className="t-readout-sm" style={{ color }}>
                    {p.beatHz}
                    <span style={{ color: TEXT[3], fontSize: '0.85em' }}>{'\u2009'}Hz</span>
                  </span>
                )}
                <span className="t-readout-sm text-3">{fmtClock(p.durationSec)}</span>
              </div>
              {ramp && (
                <span
                  className="t-readout-sm absolute bottom-1 left-1"
                  style={{ color: TEXT[3], fontSize: 10 }}
                >
                  RAMP {prev.beatHz}→{p.beatHz}
                </span>
              )}
              {/* Visual resize grip (10px); the actual touch hit zone is the
                  right RESIZE_HIT_PX (20px) handled by the block pointerdown. */}
              {editable && (
                <span
                  data-testid="resize-handle"
                  aria-hidden
                  className="absolute top-0 bottom-0 right-0 flex items-center justify-center"
                  style={{ width: 10, color: TEXT[3], opacity: 0.55, pointerEvents: 'none', touchAction: 'none' }}
                >
                  <GripVertical size={10} />
                </span>
              )}
              {!readonly && onChange && phases.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove phase"
                  className={`absolute top-1 right-1 ${isMobile ? '' : 'opacity-0 hover:opacity-100'}`}
                  style={{
                    color: TEXT[3],
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    // ≥40px secondary touch target on mobile (visual stays small).
                    ...(isMobile
                      ? {
                          minWidth: 40,
                          minHeight: 40,
                          margin: '-8px -2px 0 0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-end',
                        }
                      : {}),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(phases.filter((q) => q.id !== p.id));
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
        {/* playhead */}
        {playheadSec !== undefined && playheadSec > 0 && (
          <div
            className="absolute top-0 bottom-0"
            style={{ left: `${secToPx(Math.min(playheadSec, total))}%`, width: 2, background: 'var(--amber)' }}
          />
        )}
      </div>
      {!readonly && onChange && (
        <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="chip"
            disabled={phases.length >= 8}
            style={{ opacity: phases.length >= 8 ? 0.4 : 1 }}
            onClick={() => onChange([...phases, mk(10 * 60, phases[phases.length - 1]?.beatHz ?? 6)])}
          >
            <Plus size={12} /> ADD PHASE
          </button>
          <span className="t-caption text-3">
            {phases.length}/8 phases · total {fmtClock(phases.reduce((a, p) => a + p.durationSec, 0))}
          </span>
        </div>
      )}
    </div>
  );
}

/** Static mini phase bar for cards (presets.md). */
export function MiniPhaseBar({ beats, durationSec, height = 10 }: { beats: { sec: number; beat: number }[]; durationSec: number; height?: number }) {
  return (
    <div className="flex" style={{ height, borderRadius: 1, overflow: 'hidden', border: `1px solid ${LINE[1]}` }}>
      {beats.map((b, i) => {
        const band = bandForBeat(b.beat);
        return (
          <div
            key={i}
            style={{
              width: `${(b.sec / durationSec) * 100}%`,
              background: band ? `${BAND_COLOR[band]}55` : `${TEXT[3]}55`,
            }}
          />
        );
      })}
    </div>
  );
}
