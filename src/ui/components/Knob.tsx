/**
 * Rotary knob (§5.4 + ux_improvement_spec §3.2): 56px circle, 270° arc,
 * vertical linear drag (no rotary tracking, no jump-to-cursor).
 *
 * Interaction standard (P0-2):
 *  - drag vertical            → coarse adjust (160px = full range)
 *  - Shift+drag               → fine adjust ×0.1
 *  - two-finger drag (touch)  → fine adjust ×0.1
 *  - double-click / dbl-tap   → reset to `defaultValue` (fallback: midpoint)
 *  - Ctrl/Cmd+click           → reset to default
 *  - scroll wheel             → step; Shift+wheel → fine step
 *  - arrow keys (focused)     → ±step; Shift+arrows → fine step
 * Click-to-type exact entry lives in the paired editable `Readout`
 * (see Studio engine panel) — the knob label itself stays non-editable.
 */

import { useCallback, useRef } from 'react';
import { LINE, INK } from '../theme';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Log taper (e.g. beat knob 0.1–40 Hz). */
  log?: boolean;
  color?: string;
  size?: number;
  /**
   * Fine-adjust multiplier while Shift is held or a second finger touches.
   * Spec default is ×0.1.
   */
  fineStep?: number;
  /** Reset target for double-click / double-tap / Ctrl-click. Defaults to the
   *  (geometric for `log`) midpoint of the range. */
  defaultValue?: number;
  disabled?: boolean;
  label?: string;
}

/** Max gap between the two taps of a double-tap reset (touch). */
const DOUBLE_TAP_MS = 350;
/** Movement below this on pointer-up counts as a tap, not a drag. */
const TAP_SLOP_PX = 6;

export function Knob({
  value,
  min,
  max,
  onChange,
  log,
  color = 'var(--amber)',
  size = 56,
  fineStep = 0.1,
  defaultValue,
  disabled,
  label,
}: KnobProps) {
  const drag = useRef<{ y: number; v: number; moved: number } | null>(null);
  const pointers = useRef(new Set<number>());
  const lastTap = useRef(0);

  const toNorm = useCallback(
    (v: number) => {
      const c = Math.min(max, Math.max(min, v));
      return log ? Math.log(c / min) / Math.log(max / min) : (c - min) / (max - min);
    },
    [min, max, log],
  );
  const fromNorm = useCallback(
    (n: number) => {
      const c = Math.min(1, Math.max(0, n));
      return log ? min * Math.pow(max / min, c) : min + c * (max - min);
    },
    [min, max, log],
  );

  const resetToDefault = useCallback(() => {
    if (disabled) return;
    onChange(defaultValue !== undefined ? Math.min(max, Math.max(min, defaultValue)) : fromNorm(0.5));
  }, [disabled, onChange, defaultValue, min, max, fromNorm]);

  const norm = toNorm(value);
  const angle = -135 + norm * 270;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const arc = (a0: number, a1: number) => {
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(rad(a0));
    const y0 = cx + r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1));
    const y1 = cx + r * Math.sin(rad(a1));
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    // Ctrl/Cmd+click = reset to default (desktop power-user convention).
    if (e.pointerType === 'mouse' && (e.ctrlKey || e.metaKey)) {
      resetToDefault();
      return;
    }
    pointers.current.add(e.pointerId);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, v: value, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const rangePx = 160;
    const dy = drag.current.y - e.clientY;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dy));
    const dv = dy / rangePx;
    // Shift+drag (desktop) or a second finger on the knob (touch) = fine ×0.1.
    const fine = e.shiftKey || pointers.current.size >= 2 ? fineStep : 1;
    onChange(fromNorm(toNorm(drag.current.v) + dv * fine));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const wasTap = drag.current !== null && drag.current.moved < TAP_SLOP_PX;
    drag.current = null;
    // Touch equivalent of double-click: two quick taps reset to default.
    if (wasTap && e.pointerType !== 'mouse') {
      const now = performance.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        resetToDefault();
      } else {
        lastTap.current = now;
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-1" style={{ opacity: disabled ? 0.4 : 1 }}>
      {label && <span className="t-label">{label}</span>}
      <svg
        width={size}
        height={size}
        style={{
          cursor: disabled ? 'default' : 'ns-resize',
          touchAction: 'none',
          // ≥44px hit area even for small knobs: invisible padding ring,
          // negative margin keeps layout spacing unchanged.
          padding: Math.max(0, (44 - size) / 2) + 4,
          margin: -(Math.max(0, (44 - size) / 2) + 4),
          boxSizing: 'content-box',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          drag.current = null;
        }}
        onWheel={(e) => {
          if (disabled) return;
          const step = e.shiftKey ? 0.02 * fineStep : 0.02;
          onChange(fromNorm(toNorm(value) + (e.deltaY < 0 ? step : -step)));
        }}
        onDoubleClick={resetToDefault}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = e.shiftKey ? 0.02 * fineStep : 0.02;
          if (e.key === 'ArrowUp') onChange(fromNorm(toNorm(value) + step));
          if (e.key === 'ArrowDown') onChange(fromNorm(toNorm(value) - step));
        }}
      >
        <circle cx={cx} cy={cx} r={r} fill={INK[4]} stroke={LINE[2]} strokeWidth={1} />
        {/* tick marks at 11 positions */}
        {Array.from({ length: 11 }, (_, i) => {
          const a = (-135 + i * 27 - 90) * (Math.PI / 180);
          const rr = r + 3;
          return (
            <line
              key={i}
              x1={cx + rr * Math.cos(a)}
              y1={cy + rr * Math.sin(a)}
              x2={cx + (rr + 3) * Math.cos(a)}
              y2={cy + (rr + 3) * Math.sin(a)}
              stroke={LINE[2]}
              strokeWidth={1}
            />
          );
        })}
        {/* value arc */}
        {norm > 0.004 && (
          <path d={arc(-135, angle)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="butt" />
        )}
        {/* pointer */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 6) * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={cy + (r - 6) * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke={disabled ? 'var(--text-3)' : color}
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
