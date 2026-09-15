/**
 * PhaseTimeline editing limits — regression tests (node, pure helpers).
 *
 * Covers the move-drag fixes: the 60 s floor must hold in BOTH drag
 * directions (previously a long right-drag could push the dragged block
 * negative), and the FIRST block must be movable (previously a no-op with a
 * grab cursor). Plus the beat-draft clamp at the Studio knob ceiling.
 */

import { describe, expect, it } from 'vitest';
import { MIN_PHASE_SEC, movePhase, parseBeatDraft } from '../components/PhaseTimeline';
import type { UiPhase } from '../session/SessionContext';

const P = (id: string, durationSec: number, beatHz = 10): UiPhase => ({ id, durationSec, beatHz });

describe('movePhase', () => {
  it('moves a middle block by shifting its left boundary', () => {
    const out = movePhase([P('a', 600), P('b', 300), P('c', 900)], 1, 60);
    expect(out.map((p) => p.durationSec)).toEqual([660, 240, 900]);
  });

  it('right-drag cannot shrink the dragged block below the 60 s floor', () => {
    // Previously maxShift watched the FOLLOWING block's spare, so a big drag
    // could drive the dragged block negative.
    const out = movePhase([P('a', 600), P('b', 120), P('c', 3600)], 1, 3600);
    expect(out[1].durationSec).toBe(MIN_PHASE_SEC);
    expect(out[0].durationSec).toBe(600 + (120 - MIN_PHASE_SEC));
    expect(out[2].durationSec).toBe(3600); // untouched neighbour
    for (const p of out) expect(p.durationSec).toBeGreaterThanOrEqual(MIN_PHASE_SEC);
  });

  it('left-drag cannot shrink the previous block below the 60 s floor', () => {
    const out = movePhase([P('a', 120), P('b', 300)], 1, -3600);
    expect(out[0].durationSec).toBe(MIN_PHASE_SEC);
    expect(out[1].durationSec).toBe(300 + (120 - MIN_PHASE_SEC));
  });

  it('moves the first block by steal/lend against the following block', () => {
    const grow = movePhase([P('a', 300), P('b', 600)], 0, 90);
    expect(grow.map((p) => p.durationSec)).toEqual([390, 510]);
    const shrink = movePhase([P('a', 300), P('b', 600)], 0, -120);
    expect(shrink.map((p) => p.durationSec)).toEqual([180, 720]);
  });

  it('first-block move respects the floor on both blocks', () => {
    const out = movePhase([P('a', 300), P('b', 90)], 0, 9999);
    expect(out[1].durationSec).toBe(MIN_PHASE_SEC);
    expect(out[0].durationSec).toBe(300 + (90 - MIN_PHASE_SEC));
  });

  it('single-block timelines are unchanged', () => {
    const out = movePhase([P('a', 600)], 0, 300);
    expect(out[0].durationSec).toBe(600);
  });

  it('out-of-range index is a no-op', () => {
    const src = [P('a', 600), P('b', 300)];
    const out = movePhase(src, 5, 300);
    expect(out.map((p) => p.durationSec)).toEqual([600, 300]);
  });
});

describe('parseBeatDraft', () => {
  it('accepts values inside the 0.1–40 Hz editor range', () => {
    expect(parseBeatDraft('10')).toBe(10);
    expect(parseBeatDraft('0.1')).toBe(0.1);
    expect(parseBeatDraft('40')).toBe(40);
    expect(parseBeatDraft('6.666')).toBe(6.67);
  });

  it('rejects values the Studio knob could never produce', () => {
    expect(parseBeatDraft('80')).toBeNull(); // legacy 80 Hz ceiling
    expect(parseBeatDraft('40.01')).toBeNull();
    expect(parseBeatDraft('0.05')).toBeNull();
    expect(parseBeatDraft('-4')).toBeNull();
    expect(parseBeatDraft('gamma')).toBeNull();
    expect(parseBeatDraft('')).toBeNull();
  });
});
