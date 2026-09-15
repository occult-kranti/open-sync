/**
 * Audio → cymatics link (C3.6): an AnalyserNode tap on the master bus drives
 * the plate drive amplitude, so the sand reacts to whatever the engine is
 * currently playing. Gracefully degrades: without a running context the link
 * reports silence and the plate idles (honest "no audio" state).
 */

export interface AudioLinkOptions {
  fftSize?: number;
  /** Smoothing applied to the level estimate (0..1, higher = slower). */
  smoothing?: number;
}

export interface AudioLink {
  /** Current RMS level in [0,1] after smoothing. */
  level: () => number;
  /** Dominant FFT bin frequency in Hz, or null when silent. */
  dominantHz: (sampleRate: number) => number | null;
  connect: (node: AudioNode, ctx: BaseAudioContext) => void;
  disconnect: () => void;
  readonly connected: boolean;
}

export function createAudioLink(opts: AudioLinkOptions = {}): AudioLink {
  const fftSize = opts.fftSize ?? 2048;
  const smoothing = opts.smoothing ?? 0.8;
  let analyser: AnalyserNode | null = null;
  let timeBuf: Float32Array | null = null;
  let freqBuf: Float32Array | null = null;
  let smooth = 0;

  return {
    get connected() {
      return analyser !== null;
    },
    level() {
      if (!analyser || !timeBuf) return 0;
      analyser.getFloatTimeDomainData(timeBuf);
      let sum = 0;
      for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
      const rms = Math.min(1, Math.sqrt(sum / timeBuf.length) * 3); // perceptual boost, capped
      smooth = smoothing * smooth + (1 - smoothing) * rms;
      return smooth;
    },
    dominantHz(sampleRate) {
      if (!analyser || !freqBuf) return null;
      analyser.getFloatFrequencyData(freqBuf);
      let peak = -Infinity;
      let peakBin = -1;
      for (let i = 1; i < freqBuf.length; i++) {
        if (freqBuf[i] > peak) {
          peak = freqBuf[i];
          peakBin = i;
        }
      }
      if (peakBin < 0 || peak < -90) return null; // silence floor
      return (peakBin * sampleRate) / (2 * freqBuf.length);
    },
    connect(node, ctx) {
      this.disconnect();
      analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.5;
      node.connect(analyser);
      timeBuf = new Float32Array(analyser.fftSize);
      freqBuf = new Float32Array(analyser.frequencyBinCount);
    },
    disconnect() {
      if (analyser) {
        try {
          analyser.disconnect();
        } catch {
          // already detached
        }
      }
      analyser = null;
      timeBuf = null;
      freqBuf = null;
      smooth = 0;
    },
  };
}
