/**
 * Open Sync engine — public API barrel.
 *
 * - types:     pure session-description data types
 * - synth:     pure DSP renderers (tones, noise, bowl, nature)
 * - sequencer: multi-phase session renderer + reproducibility manifest
 * - wav:       pure WAV encoder (PCM16/24, float32)
 * - player:    Web Audio playback state machine
 */

export * from './types';
export * from './synth';
export * from './sequencer';
export * from './wav';
export * from './player';
