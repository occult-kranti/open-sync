/**
 * GradeBadge + CitationPopover — the signature component (design.md §5.1/5.2).
 * Every frequency/claim in the app travels with one of these; clicking opens
 * its citation popover. Supports the B− dashed variant and dual-grade pairs.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { GRADE_COLOR, GRADE_MEANING, GRADE_WORD, type GradeLetter } from '../theme';

export interface Citation {
  /** Verdict sentence shown in the popover header. */
  verdict: string;
  /** 1–3 sentence evidence summary. */
  summary?: string;
  /** Source line (journal, year, DOI/URL). */
  source?: string;
  /** Optional Knowledge Base entry id for the footer link. */
  knowledgeId?: string;
}

interface BadgeProps {
  grade: GradeLetter;
  /** B− dashed-border variant (432 Hz rows). */
  minus?: boolean;
  compact?: boolean;
  /** Hide the label word even in default size. */
  letterOnly?: boolean;
  citation?: Citation;
  className?: string;
}

export function GradeBadge({ grade, minus, compact, letterOnly, citation, className }: BadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();
  const color = GRADE_COLOR[grade];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const body = (
    <>
      <span
        aria-hidden
        style={{
          width: 2,
          alignSelf: 'stretch',
          background: color,
          margin: '3px 0',
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono2"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          letterSpacing: '0.06em',
          lineHeight: 1,
        }}
      >
        {grade}
        {minus ? '−' : ''}
      </span>
      {!compact && !letterOnly && (
        <span className="t-label" style={{ color, fontSize: 10 }}>
          {GRADE_WORD[grade]}
        </span>
      )}
    </>
  );

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: compact ? 18 : 22,
    padding: compact ? '0 5px' : '0 8px',
    borderRadius: 2,
    background: `${color}1f`, // 12% over ink-3
    border: `1px ${minus ? 'dashed' : 'solid'} ${color}99`,
    cursor: citation ? 'pointer' : 'default',
    transition: 'border-color 140ms ease-out, box-shadow 140ms ease-out, transform 140ms ease-out',
    verticalAlign: 'middle',
  };

  const inner = (
    <span
      style={style}
      className={className}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 2px 10px ${color}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}99`;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
      role={citation ? 'button' : undefined}
      tabIndex={citation ? 0 : undefined}
      onClick={(e) => {
        if (!citation) return;
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (citation && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      title={citation ? `${grade} — ${GRADE_MEANING[grade]}` : GRADE_MEANING[grade]}
    >
      {body}
    </span>
  );

  if (!citation) return inner;

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {inner}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              zIndex: 70,
              top: 'calc(100% + 8px)',
              left: 0,
              width: 320,
              maxWidth: '80vw',
              background: 'var(--ink-3)',
              border: '1px solid var(--line-2)',
              borderRadius: 4,
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              padding: 16,
              display: 'block',
              textAlign: 'left',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <GradeBadge grade={grade} minus={minus} compact />
              <span className="t-body-sm" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                {citation.verdict}
              </span>
            </span>
            {citation.summary && (
              <span className="t-body-sm" style={{ display: 'block', color: 'var(--text-2)', marginBottom: 10 }}>
                {citation.summary}
              </span>
            )}
            {citation.source && (
              <span
                className="t-caption font-mono2"
                style={{
                  display: 'block',
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--line-1)',
                  paddingTop: 8,
                }}
              >
                {citation.source}
              </span>
            )}
            <a
              href="/knowledge"
              onClick={(e) => {
                e.preventDefault();
                navigate('/knowledge');
                setOpen(false);
              }}
              className="t-caption"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--teal-hi)',
                marginTop: 10,
              }}
            >
              Read in Knowledge Base <ExternalLink size={11} />
            </a>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Two badges side by side (dual-grade cards, e.g. Oster: percept A / claim C). */
export function DualGrade({
  a,
  b,
  citationA,
  citationB,
}: {
  a: GradeLetter;
  b: GradeLetter;
  citationA?: Citation;
  citationB?: Citation;
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <GradeBadge grade={a} compact citation={citationA} />
      <GradeBadge grade={b} compact citation={citationB} />
    </span>
  );
}

export function GradeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {(Object.keys(GRADE_COLOR) as GradeLetter[]).map((g) => (
        <span key={g} className="flex items-center gap-2">
          <GradeBadge grade={g} />
          <span className="t-caption text-3">{GRADE_MEANING[g]}</span>
        </span>
      ))}
    </div>
  );
}

export type { GradeLetter };
export type BadgeNode = ReactNode;
