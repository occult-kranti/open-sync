/** Small shared primitives (design.md §5). */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { TEXT } from '../theme';
import { useDensity } from '../hooks';

// The modal-a11y hook (useModalA11y) lives in ../hooks so this component-only
// file stays fast-refresh clean.

/** Density toggle chip (status bar / drawer). */
export function DensityToggle() {
  const [density, toggle] = useDensity();
  return (
    <button
      type="button"
      data-testid="density-toggle"
      aria-pressed={density === 'compact'}
      onClick={toggle}
      className={`chip ${density === 'compact' ? 'chip-active' : ''}`}
      style={{ height: 24, padding: '0 8px', fontSize: 10 }}
      title="Toggle comfortable/compact density (persisted)"
    >
      {density === 'compact' ? 'COMPACT' : 'COMFORT'}
    </button>
  );
}

/** Panel / card (§5.7) with a label-style header row. */
export function Panel({
  title,
  right,
  children,
  className,
  style,
  pad = true,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  pad?: boolean;
}) {
  return (
    <section className={`panel ${className ?? ''}`} style={{ padding: pad ? 24 : 0, ...style }}>
      {(title || right) && (
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          {title && <h3 className="t-label">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** LED indicator (§5.5). */
export function Led({
  state,
  alarm,
  title,
}: {
  state: 'off' | 'amber' | 'teal' | 'danger';
  alarm?: boolean;
  title?: string;
}) {
  const color =
    state === 'amber'
      ? 'var(--amber)'
      : state === 'teal'
        ? 'var(--teal)'
        : state === 'danger'
          ? 'var(--danger)'
          : 'var(--ink-4)';
  return (
    <span
      title={title}
      aria-label={title}
      className={alarm && state === 'danger' ? 'led-alarm' : undefined}
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        boxShadow: state === 'off' ? 'none' : `0 0 6px ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

/** Warning chip — domain-limit flags (carrier >1 kHz, beat >30 Hz, etc.). */
export function WarningChip({
  children,
  tone = 'amber',
  icon = true,
}: {
  children: ReactNode;
  tone?: 'amber' | 'danger' | 'teal';
  icon?: boolean;
}) {
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'danger' ? 'var(--danger)' : 'var(--teal)';
  return (
    <span
      className="font-mono2"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        letterSpacing: '0.04em',
        color,
        border: `1px solid ${tone === 'teal' ? 'rgba(79,140,130,0.5)' : tone === 'danger' ? 'rgba(196,99,79,0.6)' : 'rgba(217,164,65,0.5)'}`,
        borderRadius: 2,
        padding: '3px 8px',
        background: tone === 'danger' ? 'rgba(196,99,79,0.08)' : tone === 'teal' ? 'rgba(79,140,130,0.08)' : 'rgba(217,164,65,0.08)',
      }}
    >
      {icon && (tone === 'teal' ? <Info size={11} /> : <AlertTriangle size={11} />)}
      {children}
    </span>
  );
}

/** Filter chip (§5.8). */
export function Chip({
  active,
  danger,
  color,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  danger?: boolean;
  /** Grade-colored chip override. */
  color?: string;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`chip ${active ? 'chip-active' : ''} ${danger ? 'chip-danger' : ''}`}
      style={
        color
          ? {
              borderColor: active ? color : undefined,
              color: active ? color : undefined,
              background: active ? `${color}14` : undefined,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/**
 * Mono readout (§5.3). Editable variant is click-to-type: Enter commits
 * (amber value-flash), Esc cancels, invalid input shakes and rejects.
 */
export function Readout({
  value,
  unit,
  size = 'md',
  color = 'var(--text-1)',
  editable,
  onCommit,
  validate,
  className,
}: {
  value: string;
  unit?: string;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  color?: string;
  editable?: boolean;
  onCommit?: (raw: string) => boolean;
  validate?: (raw: string) => boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const sizeClass = { xl: 't-readout-xl', lg: 't-readout-lg', md: 't-readout-md', sm: 't-readout-sm' }[size];

  const commit = () => {
    const ok = (validate ? validate(draft) : true) && (onCommit ? onCommit(draft) : true);
    if (ok) {
      setEditing(false);
      setFlash((f) => f + 1);
    } else {
      setShake((s) => s + 1);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={`${sizeClass} bg-ink-4 ${shake ? 'invalid-shake' : ''}`}
        key={shake}
        style={{
          color,
          border: '1px solid var(--amber)',
          borderRadius: 2,
          padding: '0 6px',
          width: `${Math.max(6, draft.length + 2)}ch`,
          outline: 'none',
        }}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} ${flash ? 'value-flash' : ''} ${className ?? ''}`}
      key={flash}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={() => {
        if (!editable) return;
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (!editable || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        setDraft(value);
        setEditing(true);
      }}
      style={{
        color,
        cursor: editable ? 'text' : 'default',
        borderBottom: editable ? '1px solid var(--line-1)' : 'none',
        whiteSpace: 'nowrap',
        padding: '0 2px',
      }}
      title={editable ? 'Click to type a value' : undefined}
    >
      {value}
      {unit && (
        <span style={{ color: TEXT[3], fontSize: '0.85em' }}>
          {'\u2009'}
          {unit}
        </span>
      )}
    </span>
  );
}
