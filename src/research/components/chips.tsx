import type { Verdict } from '../types';
import { VERDICT_STYLE } from './verdictStyle';

/** Verdict chip for the six-pass review vocabulary (REPAIRABLE/DEMOTE/DISCARD/OPEN). */

export function VerdictChip({ verdict, label }: { verdict: Verdict; label?: string }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className="font-mono2 inline-flex items-center gap-1.5 px-2"
      style={{
        height: 20,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1em',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}66`,
        borderRadius: 2,
        textTransform: 'uppercase',
      }}
    >
      {verdict}
      {label && (
        <span style={{ color: 'var(--text-3)', letterSpacing: 0, textTransform: 'none' }}>
          {label}
        </span>
      )}
    </span>
  );
}

/** Generic filter chip (design.md §5.8). */
export function FilterChip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? 'chip-active' : ''}`}
      style={
        active && color
          ? { borderColor: color, color, background: `${color}14` }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/** Small LED dot (design.md §5.5). */
export function Led({ tone = 'amber', on = true }: { tone?: 'amber' | 'teal' | 'danger'; on?: boolean }) {
  const color = !on
    ? 'var(--ink-4)'
    : tone === 'amber'
      ? 'var(--amber)'
      : tone === 'teal'
        ? 'var(--teal)'
        : 'var(--danger)';
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        boxShadow: on ? `0 0 6px ${color}` : undefined,
        display: 'inline-block',
      }}
    />
  );
}

/** Two-axis chip used by the Programs Archive (documented? / validated?). */
export function AxisChip({ label, tone }: { label: string; tone: 'yes' | 'partial' | 'no' | 'na' }) {
  const color =
    tone === 'yes'
      ? 'var(--grade-A)'
      : tone === 'partial'
        ? 'var(--grade-C)'
        : tone === 'no'
          ? 'var(--danger)'
          : 'var(--text-3)';
  return (
    <span
      className="font-mono2 inline-flex items-center px-1.5"
      style={{
        height: 18,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        color,
        border: `1px solid ${color}55`,
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
