import type { Verdict } from '../types';

/** Verdict chip palette for the six-pass review vocabulary. */
export const VERDICT_STYLE: Record<Verdict, { color: string; bg: string }> = {
  REPAIRABLE: { color: '#A9B368', bg: 'rgba(169,179,104,0.10)' },
  DEMOTE: { color: '#D9A441', bg: 'rgba(217,164,65,0.10)' },
  DISCARD: { color: '#C4634F', bg: 'rgba(196,99,79,0.10)' },
  OPEN: { color: '#66A89D', bg: 'rgba(79,140,130,0.12)' },
};
