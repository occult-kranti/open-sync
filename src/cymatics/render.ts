/**
 * Cymatics renderer (C3.2/C3.5): CPU nodal-line renderer + sand-grain
 * simulation. Kept framework-free so it runs under happy-dom tests and can
 * be moved to a Worker without API changes.
 */

import type { PlateMode } from './chladni';
import { chladniAmplitude, circularPlateAmplitude } from './chladni';

export interface NodalRender {
  pixels: Uint8ClampedArray; // RGBA
  size: number;
}

/** Renders |amplitude| as a brightness field: bright = nodal (sand rests). */
export function renderNodalLines(mode: PlateMode, size: number): NodalRender {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const amp = (x: number, y: number): number =>
    mode.plate === 'square'
      ? chladniAmplitude(mode.m, mode.n, x, y)
      : circularPlateAmplitude(mode.m, mode.n, Math.hypot(x - 0.5, y - 0.5) * 2, Math.atan2(y - 0.5, x - 0.5));
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const x = (gx + 0.5) / size;
      const y = (gy + 0.5) / size;
      if (mode.plate === 'circle' && Math.hypot(x - 0.5, y - 0.5) > 0.5) continue;
      const a = amp(x, y);
      // Inverse square-law falloff: nodal → 255, antinodal → 0.
      const v = Math.max(0, Math.min(255, Math.round(255 * Math.exp(-8 * a * a))));
      const i = (gy * size + gx) * 4;
      pixels[i] = v;
      pixels[i + 1] = v;
      pixels[i + 2] = v;
      pixels[i + 3] = 255;
    }
  }
  return { pixels, size };
}

export interface Grain {
  x: number; // 0..1 plate coords
  y: number;
}

export interface SandState {
  grains: Grain[];
  gridSize: number;
  /** Deterministic PRNG state (mulberry32) — tests must be reproducible. */
  rngState: number;
}

export function createSandState(count: number, gridSize: number, seed = 0xc41a7): SandState {
  let rngState = seed >>> 0;
  const grains: Grain[] = [];
  for (let i = 0; i < count; i++) {
    rngState = nextRng(rngState);
    const x = (rngState / 0xffffffff) * 0.96 + 0.02;
    rngState = nextRng(rngState);
    const y = (rngState / 0xffffffff) * 0.96 + 0.02;
    grains.push({ x, y });
  }
  return { grains, gridSize, rngState };
}

function nextRng(state: number): number {
  // mulberry32 step
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  return ((r ^ (r >>> 14)) >>> 0);
}

function rng01(state: number): { value: number; state: number } {
  const s = nextRng(state);
  return { value: s / 0xffffffff, state: s };
}

export interface SandFrame {
  state: SandState;
  /** Fraction of grains currently in nodal (low-|a|) cells, 0..1. */
  nodalOccupancy: number;
}

/**
 * One simulation tick: each grain is agitated proportionally to drive and to
 * the LOCAL |amplitude| — grains on antinodes get kicked, grains on nodes
 * stay. This is the standard Chladni mechanism (faraday-heaping is NOT
 * simulated; we model the net statistical migration only — see physicalNote).
 */
export function renderSandFrame(state: SandState, mode: PlateMode, drive: number): SandFrame {
  const amp = (x: number, y: number): number =>
    mode.plate === 'square'
      ? chladniAmplitude(mode.m, mode.n, x, y)
      : circularPlateAmplitude(mode.m, mode.n, Math.hypot(x - 0.5, y - 0.5) * 2, Math.atan2(y - 0.5, x - 0.5));
  let rngState = state.rngState;
  const grains: Grain[] = new Array(state.grains.length);
  let nodal = 0;
  for (let i = 0; i < state.grains.length; i++) {
    const g = state.grains[i];
    const a = amp(g.x, g.y);
    const kick = drive * Math.min(1, Math.abs(a)) * 0.05;
    if (kick > 0) {
      const r1 = rng01(rngState);
      rngState = r1.state;
      const r2 = rng01(rngState);
      rngState = r2.state;
      g.x = clamp01(g.x + (r1.value - 0.5) * 2 * kick);
      g.y = clamp01(g.y + (r2.value - 0.5) * 2 * kick);
    }
    grains[i] = { x: g.x, y: g.y };
    if (Math.abs(amp(g.x, g.y)) < 0.1) nodal++;
  }
  return {
    state: { grains, gridSize: state.gridSize, rngState },
    nodalOccupancy: state.grains.length === 0 ? 0 : nodal / state.grains.length,
  };
}

function clamp01(v: number): number {
  return v < 0.02 ? 0.02 : v > 0.98 ? 0.98 : v;
}
