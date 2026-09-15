/**
 * Open Sync engine — pure WAV encoder.
 *
 * Encodes interleaved Float32 stereo to canonical 44-byte-header RIFF/WAVE
 * in PCM16, PCM24, or 32-bit IEEE float. Runs in node and the browser.
 */

export type WavFormat = 'pcm16' | 'pcm24' | 'float32';

const RIFF_HEADER_BYTES = 44;
/** RIFF chunk-size field is uint32; the whole file must stay below 4 GiB. */
const MAX_RIFF_BYTES = 0xffffffff;

export interface WavFormatInfo {
  audioFormatTag: number;
  bytesPerSample: number;
  bitsPerSample: number;
}

export function wavFormatInfo(format: WavFormat): WavFormatInfo {
  switch (format) {
    case 'pcm16':
      return { audioFormatTag: 1, bytesPerSample: 2, bitsPerSample: 16 };
    case 'pcm24':
      return { audioFormatTag: 1, bytesPerSample: 3, bitsPerSample: 24 };
    case 'float32':
      return { audioFormatTag: 3, bytesPerSample: 4, bitsPerSample: 32 };
  }
}

/** Data-chunk byte count for a stereo buffer of `frames` samples per channel. */
export function wavDataBytes(frames: number, format: WavFormat): number {
  return frames * 2 * wavFormatInfo(format).bytesPerSample;
}

/**
 * Guard for the 4 GiB RIFF limit. Exported so callers can pre-check huge
 * sessions without allocating the audio first. Throws RangeError.
 */
export function assertWavSizeWithinRiff(frames: number, format: WavFormat): void {
  const total = RIFF_HEADER_BYTES + wavDataBytes(frames, format);
  if (total > MAX_RIFF_BYTES) {
    throw new RangeError(
      `WAV would be ${total} bytes (> 4 GiB RIFF limit) for ${frames} frames as ${format}; ` +
        'split the session or use a lower bit depth',
    );
  }
}

function clampSample(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x < -1 ? -1 : x > 1 ? 1 : x;
}

/**
 * Encode stereo Float32 audio to WAV bytes.
 * `left` and `right` must be the same length (longer is truncated).
 */
export function encodeWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  format: WavFormat = 'pcm16',
): Uint8Array {
  const frames = Math.min(left.length, right.length);
  assertWavSizeWithinRiff(frames, format);
  const info = wavFormatInfo(format);
  const dataBytes = wavDataBytes(frames, format);
  const out = new Uint8Array(RIFF_HEADER_BYTES + dataBytes);
  const view = new DataView(out.buffer);

  // RIFF header.
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, 36 + dataBytes, true);
  view.setUint8(8, 0x57); // 'W'
  view.setUint8(9, 0x41); // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'
  // fmt chunk.
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6d); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, info.audioFormatTag, true);
  view.setUint16(22, 2, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * info.bytesPerSample, true); // byte rate
  view.setUint16(32, 2 * info.bytesPerSample, true); // block align
  view.setUint16(34, info.bitsPerSample, true);
  // data chunk.
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataBytes, true);

  let o = RIFF_HEADER_BYTES;
  for (let i = 0; i < frames; i++) {
    for (const x of [clampSample(left[i]), clampSample(right[i])]) {
      if (format === 'pcm16') {
        const s = Math.round(x < 0 ? x * 32768 : x * 32767);
        view.setInt16(o, s, true);
        o += 2;
      } else if (format === 'pcm24') {
        const s = Math.round(x < 0 ? x * 8388608 : x * 8388607);
        out[o] = s & 0xff;
        out[o + 1] = (s >> 8) & 0xff;
        out[o + 2] = (s >> 16) & 0xff;
        o += 3;
      } else {
        view.setFloat32(o, x, true);
        o += 4;
      }
    }
  }
  return out;
}
