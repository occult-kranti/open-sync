import { describe, expect, it } from 'vitest';

import {
  assertWavSizeWithinRiff,
  encodeWav,
  wavDataBytes,
  wavFormatInfo,
} from '../wav';

const SR = 48000;

function sine(frames: number, freq = 440, sampleRate = SR): Float32Array {
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

function ascii(view: DataView, from: number, to: number): string {
  let s = '';
  for (let i = from; i < to; i++) s += String.fromCharCode(view.getUint8(i));
  return s;
}

describe('wavFormatInfo / wavDataBytes', () => {
  it('reports the canonical format parameters', () => {
    expect(wavFormatInfo('pcm16')).toEqual({ audioFormatTag: 1, bytesPerSample: 2, bitsPerSample: 16 });
    expect(wavFormatInfo('pcm24')).toEqual({ audioFormatTag: 1, bytesPerSample: 3, bitsPerSample: 24 });
    expect(wavFormatInfo('float32')).toEqual({ audioFormatTag: 3, bytesPerSample: 4, bitsPerSample: 32 });
  });

  it('computes stereo data byte counts', () => {
    expect(wavDataBytes(100, 'pcm16')).toBe(400);
    expect(wavDataBytes(100, 'pcm24')).toBe(600);
    expect(wavDataBytes(100, 'float32')).toBe(800);
  });
});

describe('encodeWav header', () => {
  it('writes a canonical 44-byte RIFF/WAVE header', () => {
    const frames = 1000;
    const bytes = encodeWav(sine(frames), sine(frames), SR, 'pcm16');
    expect(bytes.length).toBe(44 + frames * 4);
    const view = new DataView(bytes.buffer);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + frames * 4);
    expect(ascii(view, 8, 12)).toBe('WAVE');
    expect(ascii(view, 12, 16)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(2); // stereo
    expect(view.getUint32(24, true)).toBe(SR);
    expect(view.getUint32(28, true)).toBe(SR * 2 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(4); // block align
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(view, 36, 40)).toBe('data');
    expect(view.getUint32(40, true)).toBe(frames * 4);
  });

  it('writes format tag 3 for float32 with correct byte rate', () => {
    const bytes = encodeWav(sine(10), sine(10), 44100, 'float32');
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(20, true)).toBe(3);
    expect(view.getUint32(28, true)).toBe(44100 * 8);
    expect(view.getUint16(32, true)).toBe(8);
    expect(view.getUint16(34, true)).toBe(32);
  });
});

describe('encodeWav sample conversion', () => {
  it('pcm16 round-trips within quantization error', () => {
    const left = sine(4800);
    const right = sine(4800, 220);
    const bytes = encodeWav(left, right, SR, 'pcm16');
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < 4800; i += 13) {
      const l = view.getInt16(44 + i * 4, true) / 32768;
      const r = view.getInt16(44 + i * 4 + 2, true) / 32768;
      expect(Math.abs(l - left[i])).toBeLessThan(1 / 32768 + 1e-9);
      expect(Math.abs(r - right[i])).toBeLessThan(1 / 32768 + 1e-9);
    }
  });

  it('pcm16 maps ±full scale to the asymmetric integer extremes', () => {
    const left = new Float32Array([1, -1, 0.5, -0.5]);
    const bytes = encodeWav(left, left, SR, 'pcm16');
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(52, true)).toBe(Math.round(0.5 * 32767));
    expect(view.getInt16(56, true)).toBe(Math.round(-0.5 * 32768));
  });

  it('pcm24 round-trips with finer resolution than pcm16', () => {
    const x = 0.123456;
    const left = new Float32Array([x]);
    const b24 = encodeWav(left, left, SR, 'pcm24');
    const o = 44;
    const s = b24[o] | (b24[o + 1] << 8) | (b24[o + 2] << 16);
    const signed = s & 0x800000 ? s - 0x1000000 : s;
    expect(Math.abs(signed / 8388608 - x)).toBeLessThan(1 / 8388608 + 1e-9);
    const b16 = encodeWav(left, left, SR, 'pcm16');
    const view = new DataView(b16.buffer);
    expect(Math.abs(view.getInt16(44, true) / 32768 - x)).toBeGreaterThan(
      Math.abs(signed / 8388608 - x),
    );
  });

  it('float32 preserves values exactly', () => {
    const left = sine(512, 330);
    const bytes = encodeWav(left, left, SR, 'float32');
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < 512; i++) {
      expect(view.getFloat32(44 + i * 8, true)).toBe(left[i]);
    }
  });

  it('clips out-of-range samples instead of wrapping', () => {
    const left = new Float32Array([1.7, -2.4]);
    const bytes = encodeWav(left, left, SR, 'pcm16');
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
  });

  it('encodes NaN as digital silence', () => {
    const left = new Float32Array([Number.NaN]);
    const bytes = encodeWav(left, left, SR, 'pcm16');
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(0);
  });

  it('truncates to the shorter channel', () => {
    const left = sine(100);
    const right = sine(60);
    const bytes = encodeWav(left, right, SR, 'pcm16');
    expect(bytes.length).toBe(44 + 60 * 4);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(40, true)).toBe(60 * 4);
  });

  it('encodes empty input as a header-only file', () => {
    const bytes = encodeWav(new Float32Array(0), new Float32Array(0), SR, 'pcm24');
    expect(bytes.length).toBe(44);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(40, true)).toBe(0);
  });
});

describe('assertWavSizeWithinRiff', () => {
  it('throws RangeError beyond the 4 GiB RIFF limit', () => {
    // float32 stereo: 8 bytes/frame → (2^32 - 44) / 8 frames is the ceiling.
    const tooMany = Math.ceil((0xffffffff - 44 + 1) / 8);
    expect(() => assertWavSizeWithinRiff(tooMany, 'float32')).toThrow(RangeError);
    expect(() => assertWavSizeWithinRiff(tooMany - 1, 'float32')).not.toThrow();
  });

  it('error message suggests remediation', () => {
    const tooMany = Math.ceil((0xffffffff - 44 + 1) / 8);
    expect(() => assertWavSizeWithinRiff(tooMany, 'float32')).toThrow(/split the session/);
  });
});
