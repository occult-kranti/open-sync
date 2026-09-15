import { describe, expect, it } from 'vitest';
import { renderNodalLines, renderSandFrame, createSandState } from '../render';
import { SQUARE_PLATE_MODES } from '../chladni';

describe('renderNodalLines', () => {
  it('returns an ImageData-sized Uint8ClampedArray for the requested grid', () => {
    const mode = SQUARE_PLATE_MODES[0];
    const { pixels, size } = renderNodalLines(mode, 64);
    expect(size).toBe(64);
    expect(pixels.length).toBe(64 * 64 * 4);
  });

  it('marks nodal pixels brighter than anti-nodal pixels', () => {
    const mode = SQUARE_PLATE_MODES.find((m) => m.m === 1 && m.n === 2)!;
    const { pixels, size } = renderNodalLines(mode, 32);
    const at = (x: number, y: number) => pixels[(y * size + x) * 4];
    // Diagonal (nodal) center pixel vs off-diagonal corner-ish pixel.
    const nodal = at(16, 16);
    const antinodal = at(2, 30);
    expect(nodal).toBeGreaterThan(antinodal);
  });

  it('is deterministic across calls', () => {
    const mode = SQUARE_PLATE_MODES[2];
    const a = renderNodalLines(mode, 16).pixels;
    const b = renderNodalLines(mode, 16).pixels;
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe('sand simulation', () => {
  it('createSandState seeds the requested grain count', () => {
    const s = createSandState(500, 32);
    expect(s.grains.length).toBe(500);
    expect(s.gridSize).toBe(32);
  });

  it('grains migrate toward nodal regions over many steps', () => {
    const mode = SQUARE_PLATE_MODES.find((m) => m.m === 1 && m.n === 2)!;
    const state = createSandState(400, 48);
    const before = renderSandFrame(state, mode, 0).nodalOccupancy;
    let s = state;
    for (let i = 0; i < 60; i++) s = renderSandFrame(s, mode, 0.9).state;
    const after = renderSandFrame(s, mode, 0).nodalOccupancy;
    expect(after).toBeGreaterThan(before);
  });

  it('zero drive leaves grains essentially in place', () => {
    const mode = SQUARE_PLATE_MODES[1];
    const s0 = createSandState(200, 24);
    const s1 = renderSandFrame(s0, mode, 0).state;
    // No drive → no agitation → positions unchanged within float tolerance.
    for (let i = 0; i < 50; i++) {
      expect(s1.grains[i].x).toBeCloseTo(s0.grains[i].x, 6);
      expect(s1.grains[i].y).toBeCloseTo(s0.grains[i].y, 6);
    }
  });
});
