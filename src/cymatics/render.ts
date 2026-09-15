/**
 * Cymatic canvas renderer — nodal-line mode + sand-particle mode.
 *
 * The numeric core (`renderToBuffer`) works on plain typed arrays so it is
 * node-testable without a DOM; `renderFrame` is a thin canvas wrapper.
 * Colormaps are low-saturation per design.md §2 ("no hue above ~60%
 * saturation"); 'spectrum-lab' is the most colorful and still stays muted.
 *
 * Sharpening trick (research §5): render |f|^p with p ≈ 0.25 so antinodes
 * stay fat while nodal lines go razor-thin; line emphasis uses a Gaussian
 * ridge exp(−t²/2σ²) around the zero set.
 */

import type { SandState } from './chladni';

// ---------------------------------------------------------------------------
// Colormaps
// ---------------------------------------------------------------------------

export type ColormapName =
  | 'amber-grain'
  | 'teal-glow'
  | 'monochrome'
  | 'inferno-warm'
  | 'spectrum-lab';

export const COLORMAPS: readonly { id: ColormapName; label: string }[] = [
  { id: 'amber-grain', label: 'AMBER GRAIN' },
  { id: 'teal-glow', label: 'TEAL GLOW' },
  { id: 'monochrome', label: 'MONOCHROME' },
  { id: 'inferno-warm', label: 'INFERNO WARM' },
  { id: 'spectrum-lab', label: 'SPECTRUM LAB' },
];

type Rgb = readonly [number, number, number];

/** Control points, dark → bright, all low-saturation warm-neutral. */
const COLORMAP_STOPS: Record<ColormapName, readonly Rgb[]> = {
  'amber-grain': [
    [11, 12, 13],
    [64, 50, 24],
    [122, 94, 38],
    [217, 164, 65],
    [240, 222, 178],
  ],
  'teal-glow': [
    [11, 12, 13],
    [24, 42, 40],
    [46, 75, 70],
    [79, 140, 130],
    [191, 227, 220],
  ],
  monochrome: [
    [11, 12, 13],
    [58, 56, 51],
    [122, 118, 109],
    [168, 163, 153],
    [233, 229, 220],
  ],
  'inferno-warm': [
    [11, 12, 13],
    [58, 28, 22],
    [131, 62, 40],
    [196, 99, 79],
    [217, 164, 65],
    [240, 224, 192],
  ],
  'spectrum-lab': [
    [11, 12, 13],
    [46, 75, 70],
    [95, 169, 140],
    [169, 179, 104],
    [217, 164, 65],
    [196, 99, 79],
  ],
};

/**
 * Sample a colormap at t. Out-of-range and non-finite t are clamped to
 * [0, 1] (never throws, never returns NaN).
 */
export function sampleColormap(name: ColormapName, t: number): [number, number, number] {
  const stops = COLORMAP_STOPS[name] ?? COLORMAP_STOPS['amber-grain'];
  // NaN → dark stop; ±Infinity clamp to the ends like any out-of-range t.
  const c = Number.isNaN(t) ? 0 : Math.min(1, Math.max(0, t));
  const pos = c * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// ---------------------------------------------------------------------------
// Frame rendering (typed-array core)
// ---------------------------------------------------------------------------

export interface RenderParams {
  /** Plate field (x, y ∈ [0,1]² → value). */
  field: (x: number, y: number) => number;
  /** Mask outside the inscribed disk (circular plate). */
  circular: boolean;
  mode: 'lines' | 'sand';
  colormap: ColormapName;
  /** Nodal line half-width as a fraction of field max (0..0.5, default 0.08). */
  threshold?: number;
  /** Field-shading exponent (default 0.25 — the |f|^p sharpening trick). */
  contrast?: number;
  /** Sand particles (sand mode only). */
  particles?: SandState | null;
  /** Cap on drawn particles (default 40k); extra particles are stride-skipped. */
  maxParticles?: number;
  /** Extra brightness/energy from audio reactivity, 0..1 (default 0). */
  energy?: number;
}

/** Hard cap so degenerate particle counts cannot stall the main thread. */
export const MAX_DRAW_PARTICLES = 40000;

/**
 * Render a frame into a fresh RGBA buffer (width × height × 4).
 * Pure with respect to inputs (particles are only read). Guaranteed free of
 * NaN/undefined bytes for any input, including 0×0 canvases and zero
 * particles.
 */
export function renderToBuffer(width: number, height: number, params: RenderParams): Uint8ClampedArray {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  const out = new Uint8ClampedArray(w * h * 4);
  if (w === 0 || h === 0) return out;

  const threshold = Math.min(0.5, Math.max(0, params.threshold ?? 0.08));
  const contrast = params.contrast ?? 0.25;
  const energy = Math.min(1, Math.max(0, params.energy ?? 0));
  const { field, circular } = params;

  // First pass: normalized |field| per pixel, tracking max for normalization.
  const norm = new Float32Array(w * h);
  let max = 0;
  for (let iy = 0; iy < h; iy++) {
    const y = (iy + 0.5) / h;
    for (let ix = 0; ix < w; ix++) {
      const x = (ix + 0.5) / w;
      if (circular) {
        const dx = x - 0.5;
        const dy = y - 0.5;
        if (dx * dx + dy * dy > 0.25) {
          norm[iy * w + ix] = -1; // outside the plate
          continue;
        }
      }
      let v = Math.abs(field(x, y));
      if (!Number.isFinite(v)) v = 0;
      norm[iy * w + ix] = v;
      if (v > max) max = v;
    }
  }
  if (!(max > 0)) max = 1; // degenerate flat field: avoid div-by-zero

  const invMax = 1 / max;
  const sigma = Math.max(1e-4, threshold * 0.5);
  const inv2s2 = 1 / (2 * sigma * sigma);

  for (let i = 0; i < w * h; i++) {
    const nv = norm[i];
    let shade: number;
    if (nv < 0) {
      shade = 0; // outside circular plate → deepest ink
    } else {
      const t = nv * invMax;
      const fieldShade = Math.pow(t, contrast) * 0.3;
      const line = Math.exp(-t * t * inv2s2);
      shade = params.mode === 'lines' ? Math.max(fieldShade, line) : fieldShade * 0.7;
      shade *= 1 + energy * 0.35;
      if (!Number.isFinite(shade)) shade = 0;
    }
    const [r, g, b] = sampleColormap(params.colormap, shade);
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = 255;
  }

  // Sand pass: bright grains over the dimmed field.
  if (params.mode === 'sand' && params.particles && params.particles.count > 0) {
    const p = params.particles;
    const cap = Math.max(1, params.maxParticles ?? MAX_DRAW_PARTICLES);
    const stride = Math.max(1, Math.ceil(p.count / cap));
    // Grain radius scales down as resolution shrinks; minimum 1 px dot.
    const grain = Math.max(1, Math.round(Math.min(w, h) / 256));
    const [gr, gg, gb] = sampleColormap(params.colormap, 0.92 + energy * 0.08);
    for (let i = 0; i < p.count; i += stride) {
      const px = p.x[i];
      const py = p.y[i];
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      const cx = Math.floor(px * w);
      const cy = Math.floor(py * h);
      for (let dy = 0; dy < grain; dy++) {
        for (let dx = 0; dx < grain; dx++) {
          const xx = cx + dx;
          const yy = cy + dy;
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
          const o = (yy * w + xx) * 4;
          out[o] = gr;
          out[o + 1] = gg;
          out[o + 2] = gb;
          out[o + 3] = 255;
        }
      }
    }
  }

  return out;
}

/**
 * Canvas wrapper: paint `renderToBuffer` output at native buffer resolution
 * via putImageData. The caller owns scaling (drawImage of this canvas onto a
 * display canvas). No-op guard for missing context / zero size.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D | null,
  width: number,
  height: number,
  params: RenderParams,
): void {
  if (!ctx) return;
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w === 0 || h === 0) {
    ctx.clearRect(0, 0, Math.max(0, width), Math.max(0, height));
    return;
  }
  const buf = renderToBuffer(w, h, params);
  const img = ctx.createImageData(w, h);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);
}
