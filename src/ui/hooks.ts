/**
 * Shared UI-layer hooks (W13 UX polish). Kept component-free so the
 * react-refresh fast-refresh rule stays clean.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Minimal modal a11y contract for the app's custom (non-Radix) overlays
 * (P0-4): Esc closes, focus moves inside on open, and focus returns to the
 * trigger element on close. Radix Dialog/Sheet surfaces get this for free;
 * this hook is for the hand-rolled ones (panic overlay, save-preset modal,
 * evidence sheet, MORE drawer, command palette). Pair with role="dialog" +
 * aria-modal.
 */
export function useModalA11y(
  open: boolean,
  onClose: () => void,
  initialFocus?: React.RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const target = initialFocus?.current;
      if (target) target.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      if (restore && document.contains(restore)) restore.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

const DENSITY_KEY = 'opensync.density.v1';

/**
 * P2 density preference: 'comfortable' (default) | 'compact', persisted in
 * localStorage and applied as `data-density` on <html>. Compact trims panel
 * padding/type only — the 44px hit-slop rules (knobs, faders, chips) are
 * untouched so touch targets stay ≥44px.
 */
export function useDensity(): ['comfortable' | 'compact', () => void] {
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    try {
      return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.density = density;
    try {
      window.localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* private mode */
    }
  }, [density]);
  return [density, () => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))];
}
