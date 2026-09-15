/**
 * Open Sync engine — Web Audio session player.
 *
 * Thin, deterministic state machine over AudioBufferSourceNode: a rendered
 * StereoBuffer is loaded once, then played / paused / seeked / stopped.
 * The module never touches the DOM and accepts an injected AudioContext, so
 * the full state machine is testable in node with a mock context. All
 * methods are total: calling them in the wrong state is a no-op (or returns
 * false), never a crash.
 */

import { dbToLin } from './synth';
import type { StereoBuffer } from './types';

/** Playback lifecycle states. */
export type PlayerState = 'empty' | 'ready' | 'playing' | 'paused' | 'ended';

export interface PlayerOptions {
  /** Injected AudioContext (e.g. a mock in tests). Lazily created if omitted. */
  audioContext?: AudioContext;
  /** Called after every state transition. */
  onStateChange?: (state: PlayerState) => void;
  /** Called once when playback reaches the end of the buffer naturally. */
  onEnded?: () => void;
}

export interface PlayerSnapshot {
  state: PlayerState;
  positionSec: number;
  durationSec: number;
  gainDb: number;
}

/** Gain is clamped to this range to avoid deafening/inaudible extremes. */
export const MIN_GAIN_DB = -60;
export const MAX_GAIN_DB = 12;

type AudioContextCtor = new () => AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/** True when a Web Audio implementation is available in this environment. */
export function isPlayerSupported(): boolean {
  return resolveAudioContextCtor() !== null;
}

/**
 * Stateful player for one rendered session buffer.
 *
 * Position model: while playing, position = `startOffset + (ctx.currentTime
 * − startedAt)`; while paused/ready/ended it is the stored `positionSec`.
 * Manual `source.stop()` also fires `onended` in real browsers, so an
 * `ignoreEnded` flag distinguishes user stops from natural completion.
 */
export class SessionPlayer {
  private ctx: AudioContext | null;
  private readonly ownsContext: boolean;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private stateValue: PlayerState = 'empty';
  private durationSec = 0;
  private positionSec = 0;
  private startOffset = 0;
  private startedAt = 0;
  private gainDbValue = 0;
  private ignoreEnded = false;
  private readonly onStateChange?: (state: PlayerState) => void;
  private readonly onEnded?: () => void;

  constructor(options: PlayerOptions = {}) {
    if (options.audioContext) {
      this.ctx = options.audioContext;
      this.ownsContext = false;
    } else {
      this.ctx = null;
      this.ownsContext = true;
    }
    this.onStateChange = options.onStateChange;
    this.onEnded = options.onEnded;
  }

  get state(): PlayerState {
    return this.stateValue;
  }

  get duration(): number {
    return this.durationSec;
  }

  get gainDb(): number {
    return this.gainDbValue;
  }

  /** Current playback position in seconds, clamped to [0, duration]. */
  get position(): number {
    if (this.stateValue === 'playing' && this.ctx) {
      const elapsed = this.ctx.currentTime - this.startedAt;
      return Math.min(this.durationSec, Math.max(0, this.startOffset + elapsed));
    }
    return this.positionSec;
  }

  snapshot(): PlayerSnapshot {
    return {
      state: this.stateValue,
      positionSec: this.position,
      durationSec: this.durationSec,
      gainDb: this.gainDbValue,
    };
  }

  private setState(next: PlayerState): void {
    if (next === this.stateValue) return;
    this.stateValue = next;
    this.onStateChange?.(next);
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  /**
   * Load a rendered stereo buffer. Channel lengths may differ; the longer is
   * truncated (same convention as encodeWav). Stops any current playback and
   * resets position. Returns the loaded duration in seconds, or 0 when the
   * buffer is empty / Web Audio is unavailable.
   */
  load(buffer: StereoBuffer, sampleRate: number): number {
    this.stopSource();
    this.buffer = null;
    this.durationSec = 0;
    this.positionSec = 0;

    const ctx = this.ensureContext();
    const frames = Math.min(buffer.left.length, buffer.right.length);
    if (!ctx || frames === 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
      this.setState('empty');
      return 0;
    }
    const audioBuffer = ctx.createBuffer(2, frames, sampleRate);
    audioBuffer.getChannelData(0).set(buffer.left.subarray(0, frames));
    audioBuffer.getChannelData(1).set(buffer.right.subarray(0, frames));
    this.buffer = audioBuffer;
    this.durationSec = frames / sampleRate;
    this.setState('ready');
    return this.durationSec;
  }

  /**
   * Start (or resume) playback. Idempotent while playing. After natural end,
   * replays from the beginning. Returns false when nothing is loaded or the
   * environment lacks Web Audio.
   */
  play(): boolean {
    if (this.stateValue === 'playing') return true;
    const ctx = this.ensureContext();
    if (!ctx || !this.buffer || this.durationSec === 0) return false;
    if (this.stateValue === 'ended' || this.positionSec >= this.durationSec) {
      this.positionSec = 0;
    }
    // Browsers may start the context suspended until a user gesture.
    if (ctx.state === 'suspended') void ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = dbToLin(this.gainDbValue);
      this.gainNode.connect(ctx.destination);
    }
    source.connect(this.gainNode);
    this.ignoreEnded = false;
    source.onended = () => {
      if (this.ignoreEnded) return;
      this.source = null;
      this.positionSec = this.durationSec;
      this.setState('ended');
      this.onEnded?.();
    };
    this.startOffset = this.positionSec;
    this.startedAt = ctx.currentTime;
    source.start(0, this.startOffset);
    this.source = source;
    this.setState('playing');
    return true;
  }

  /** Pause playback, retaining position. Returns the position in seconds. */
  pause(): number {
    if (this.stateValue !== 'playing') return this.positionSec;
    this.positionSec = this.position;
    this.stopSource();
    this.setState('paused');
    return this.positionSec;
  }

  /** Stop playback and rewind to the beginning. */
  stop(): void {
    this.stopSource();
    this.positionSec = 0;
    this.setState(this.buffer ? 'ready' : 'empty');
  }

  /**
   * Move the playhead, clamped to [0, duration]. Works in any state; when
   * playing, the source is restarted at the new offset.
   */
  seek(positionSec: number): void {
    if (!this.buffer || this.durationSec === 0) return;
    const target = Number.isFinite(positionSec)
      ? Math.min(this.durationSec, Math.max(0, positionSec))
      : 0;
    if (this.stateValue === 'playing') {
      this.stopSource();
      this.positionSec = target;
      // stopSource leaves the state untouched; drop to paused so play() re-arms.
      this.setState('paused');
      this.play();
      return;
    }
    this.positionSec = target;
    if (this.stateValue === 'ended' && target < this.durationSec) {
      this.setState('paused');
    }
  }

  /** Set output gain in dB, clamped to [MIN_GAIN_DB, MAX_GAIN_DB]. */
  setGainDb(gainDb: number): void {
    const clamped = Number.isFinite(gainDb)
      ? Math.min(MAX_GAIN_DB, Math.max(MIN_GAIN_DB, gainDb))
      : 0;
    this.gainDbValue = clamped;
    if (this.gainNode) this.gainNode.gain.value = dbToLin(clamped);
  }

  /** Stop playback and release the AudioContext if we created it. */
  dispose(): void {
    this.stopSource();
    this.gainNode?.disconnect();
    this.gainNode = null;
    this.buffer = null;
    this.durationSec = 0;
    this.positionSec = 0;
    if (this.ctx && this.ownsContext) void this.ctx.close();
    this.ctx = this.ownsContext ? null : this.ctx;
    this.setState('empty');
  }

  private stopSource(): void {
    if (this.source) {
      this.ignoreEnded = true;
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        // Already stopped — harmless in every implementation.
      }
      this.source.disconnect();
      this.source = null;
    }
  }
}
