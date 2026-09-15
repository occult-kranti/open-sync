/**
 * Vertical fader (§5.4): 120px track, 24×10 thumb, −60…0 dB range.
 * Double-click resets to −∞ (off). Cap color per noise channel.
 */

import { useRef } from 'react';
import { INK, LINE } from '../theme';

interface FaderProps {
  /** dB value; -Infinity = off. */
  db: number;
  onChange: (db: number) => void;
  color?: string;
  height?: number;
  label?: string;
  disabled?: boolean;
}

export function Fader({ db, onChange, color = 'var(--amber)', height = 120, label, disabled }: FaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const off = !Number.isFinite(db);
  const norm = off ? 0 : Math.min(1, Math.max(0, (db + 60) / 60));

  const fromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const n = 1 - (clientY - rect.top) / rect.height;
    onChange(-60 + Math.min(1, Math.max(0, n)) * 60);
  };

  return (
    <div className="flex flex-col items-center gap-2" style={{ opacity: disabled ? 0.4 : 1 }}>
      {/* ≥44px wide touch hit area via invisible horizontal padding; the
          negative margin keeps the 24px visual track's layout unchanged. */}
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={-60}
        aria-valuemax={0}
        aria-valuenow={off ? -60 : db}
        tabIndex={disabled ? -1 : 0}
        style={{
          padding: '0 10px',
          margin: '0 -10px',
          cursor: disabled ? 'default' : 'ns-resize',
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromClientY(e.clientY);
          const move = (ev: PointerEvent) => fromClientY(ev.clientY);
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        onDoubleClick={() => onChange(-Infinity)}
        onKeyDown={(e) => {
          if (disabled) return;
          const cur = off ? -60 : db;
          if (e.key === 'ArrowUp') onChange(Math.min(0, cur + (e.shiftKey ? 0.5 : 3)));
          if (e.key === 'ArrowDown') onChange(Math.max(-60, cur - (e.shiftKey ? 0.5 : 3)));
        }}
      >
        <div
          ref={trackRef}
          style={{
            width: 24,
            height,
            background: INK[4],
            border: `1px solid ${LINE[1]}`,
            borderRadius: 0,
            position: 'relative',
          }}
        >
          {/* active fill */}
          {norm > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${norm * 100}%`,
                background: `linear-gradient(0deg, ${color}44, ${color}22)`,
                transition: 'height 80ms linear',
              }}
            />
          )}
          {/* thumb */}
          <div
            style={{
              position: 'absolute',
              left: -3,
              right: -3,
              height: 10,
              top: `calc(${(1 - norm) * 100}% - 5px)`,
              background: INK[3],
              border: `1px solid ${LINE[2]}`,
              pointerEvents: 'none',
            }}
          >
            <div style={{ position: 'absolute', left: 2, right: 2, top: 4, height: 2, background: off ? 'var(--text-3)' : color }} />
          </div>
        </div>
      </div>
      <span className="t-readout-sm" style={{ color: off ? 'var(--text-3)' : 'var(--text-1)' }}>
        {off ? '−∞' : db.toFixed(1)}
        <span className="text-3" style={{ fontSize: '0.85em' }}>
          {'\u2009'}dB
        </span>
      </span>
      {label && (
        <span className="t-label" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
