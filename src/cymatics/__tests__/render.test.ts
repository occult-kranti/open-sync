import { describe, expect, it } from 'vitest';

import { createSand, plateField, stepParticles } from '../chladni';
import { COLORMAPS, MAX_DRAW_PARTICLES, renderToBuffer, sampleColormap } from '../render';
import { driveFromFeatures, sampleAudioFeatures, smoothDriveHz, SILENT_FEATURES } from '../audioLink';
import { virtualPlateById } from '../chladni';

const field = plateField({
  shape: 'square',
  n: 1,
  m: 2,
  sign: 1,
  mixA: 1,
  mixB: -1,
  useMix: false,
  circM: 0,
  circS: 1,
  boundary: 'clamped',
});

const baseParams = {
  field,
  circular: false,
  mode: 'lines' as const,
  colormap: 'amber-grain' as const,
};

function expectBufferSane(buf: Uint8ClampedArray, w: number, h: number) {
  expect(buf.length).toBe(w * h * 4);
  for (let i = 0; i < buf.length; i++) {
    expect(Number.isFinite(buf[i])).toBe(true);
  }
}

describe('colormaps', () => {
  it('exposes the five required lab colormaps', () => {
    expect(COLORMAPS.map((c) => c.id)).toEqual([
      'amber-grain',
      'teal-glow',
      'monochrome',
      'inferno-warm',
      'spectrum-lab',
    ]);
  });

  it('clamps out-of-range and non-finite input', () => {
    for (const { id } of COLORMAPS) {
      expect(sampleColormap(id, -1)).toEqual(sampleColormap(id, 0));
      expect(sampleColormap(id, 2)).toEqual(sampleColormap(id, 1));
      expect(sampleColormap(id, NaN)).toEqual(sampleColormap(id, 0));
      expect(sampleColormap(id, Infinity)).toEqual(sampleColormap(id, 1));
      const [r, g, b] = sampleColormap(id, 0.5);
      for (const c of [r, g, b]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('renderToBuffer', () => {
  it('renders a nodal-line frame with bright lines and dark antinodes', () => {
    const buf = renderToBuffer(64, 64, baseParams);
    expectBufferSane(buf, 64, 64);
    // A known nodal point of the (1,2) cos-form: (0.5, 0.5) makes both
    // cosine products vanish. (The origin is nodal too — the difference
    // form cancels at corners — so compare against a real antinode.)
    const nodalIdx = (32 * 64 + 32) * 4;
    const antinodeIdx = (0 * 64 + 16) * 4; // (≈0.25, ≈0): |value| ≈ 0.74
    const lum = (i: number) => buf[i] + buf[i + 1] + buf[i + 2];
    expect(lum(nodalIdx)).toBeGreaterThan(lum(antinodeIdx));
  });

  it('handles zero particles', () => {
    const sand = createSand(0, 1);
    const buf = renderToBuffer(32, 32, { ...baseParams, mode: 'sand', particles: sand });
    expectBufferSane(buf, 32, 32);
  });

  it('handles huge particle counts without NaN or runaway cost', () => {
    const sand = createSand(250000, 3);
    stepParticles(sand, field, 1 / 60);
    const t0 = Date.now();
    const buf = renderToBuffer(48, 48, { ...baseParams, mode: 'sand', particles: sand });
    expectBufferSane(buf, 48, 48);
    expect(Date.now() - t0).toBeLessThan(5000);
    // Stride skipping must keep drawn grains ≤ cap.
    expect(MAX_DRAW_PARTICLES).toBeLessThan(250000);
  });

  it('handles tiny and degenerate canvases', () => {
    expectBufferSane(renderToBuffer(1, 1, baseParams), 1, 1);
    expectBufferSane(renderToBuffer(2, 2, { ...baseParams, mode: 'sand', particles: createSand(10, 1) }), 2, 2);
    expect(renderToBuffer(0, 0, baseParams).length).toBe(0);
    expect(renderToBuffer(0, 10, baseParams).length).toBe(0);
    expect(renderToBuffer(-5, 10, baseParams).length).toBe(0);
  });

  it('survives pathological fields (NaN, flat, exploding)', () => {
    expectBufferSane(renderToBuffer(8, 8, { ...baseParams, field: () => NaN }), 8, 8);
    expectBufferSane(renderToBuffer(8, 8, { ...baseParams, field: () => 0 }), 8, 8);
    expectBufferSane(renderToBuffer(8, 8, { ...baseParams, field: () => Infinity }), 8, 8);
  });

  it('circular masking keeps the corners at deepest ink', () => {
    const circ = plateField({
      shape: 'circular',
      n: 1,
      m: 2,
      sign: 1,
      mixA: 1,
      mixB: -1,
      useMix: false,
      circM: 1,
      circS: 1,
      boundary: 'clamped',
    });
    const buf = renderToBuffer(32, 32, { ...baseParams, field: circ, circular: true });
    expectBufferSane(buf, 32, 32);
    // Corner pixel (0,0) is outside the disk → darkest stop.
    const [r, g, b] = sampleColormap('amber-grain', 0);
    expect(buf[0]).toBe(r);
    expect(buf[1]).toBe(g);
    expect(buf[2]).toBe(b);
  });
});

describe('audioLink', () => {
  it('null analyser → static frame (silent features, no drive)', () => {
    expect(sampleAudioFeatures(null)).toEqual(SILENT_FEATURES);
    const drive = driveFromFeatures(sampleAudioFeatures(null), virtualPlateById('steel-square-30'));
    expect(drive.squareModes).toEqual([]);
    expect(drive.circularModes).toEqual([]);
    expect(drive.artMode).toBeNull();
  });

  it('silent spectrum → inactive even with a live analyser', () => {
    const silent = {
      frequencyBinCount: 1024,
      getByteFrequencyData(d: Uint8Array) {
        d.fill(0);
      },
    };
    expect(sampleAudioFeatures(silent).active).toBe(false);
  });

  it('a tonal peak drives mode selection on the virtual plate ladder', () => {
    // 1024 bins @ 48 kHz → bin 21 ≈ 492 Hz ≈ the 500 Hz rung of a 100 Hz plate.
    const analyser = {
      frequencyBinCount: 1024,
      getByteFrequencyData(d: Uint8Array) {
        d.fill(0);
        d[21] = 220;
      },
    };
    const feats = sampleAudioFeatures(analyser, 48000);
    expect(feats.active).toBe(true);
    expect(feats.peakHz).toBeCloseTo(492.1875, 1);
    const plate = { ...virtualPlateById('steel-square-30'), fundamentalHz: 100 };
    const drive = driveFromFeatures(feats, plate);
    expect(drive.squareModes.length).toBeGreaterThan(0);
    expect(drive.artMode).not.toBeNull();
  });

  it('a throwing analyser degrades gracefully', () => {
    const broken = {
      frequencyBinCount: 512,
      getByteFrequencyData() {
        throw new Error('no audio context');
      },
    };
    expect(sampleAudioFeatures(broken)).toEqual(SILENT_FEATURES);
  });

  it('drive smoother glides and handles edges', () => {
    expect(smoothDriveHz(0, 440)).toBe(440);
    expect(smoothDriveHz(440, 0)).toBe(440);
    const mid = smoothDriveHz(100, 200, 0.5);
    expect(mid).toBeCloseTo(150, 9);
  });
});
