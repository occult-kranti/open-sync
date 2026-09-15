import { describe, expect, it, vi } from 'vitest';

import { dbToLin } from '../synth';
import {
  isPlayerSupported,
  MAX_GAIN_DB,
  MIN_GAIN_DB,
  SessionPlayer,
  type PlayerState,
} from '../player';

const SR = 48000;

/** Minimal structural mock of the Web Audio surface the player uses. */
class MockAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  private readonly channels: Float32Array[];
  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
  get duration(): number {
    return this.length / this.sampleRate;
  }
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  startArgs: { when: number; offset: number } | null = null;
  private readonly connections: unknown[] = [];
  connect(dest: unknown): void {
    this.connections.push(dest);
  }
  disconnect(): void {
    this.connections.length = 0;
  }
  start(when = 0, offset = 0): void {
    this.started = true;
    this.startArgs = { when, offset };
  }
  stop(): void {
    if (!this.started) throw new Error('InvalidStateError');
    this.stopped = true;
    this.onended?.();
  }
  /** Simulate natural completion (what the browser does at buffer end). */
  finish(): void {
    this.onended?.();
  }
}

class MockGainNode {
  readonly gain = { value: 1 };
  connected = false;
  connect(): void {
    this.connected = true;
  }
  disconnect(): void {
    this.connected = false;
  }
}

class MockAudioContext {
  currentTime = 0;
  state: 'suspended' | 'running' = 'running';
  readonly destination = {};
  readonly sources: MockAudioBufferSourceNode[] = [];
  closed = false;
  createBuffer(channels: number, frames: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, frames, sampleRate);
  }
  createBufferSource(): MockAudioBufferSourceNode {
    const s = new MockAudioBufferSourceNode();
    this.sources.push(s);
    return s;
  }
  createGain(): MockGainNode {
    return new MockGainNode();
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

function makeContext(): { ctx: MockAudioContext; asAudioContext: AudioContext } {
  const ctx = new MockAudioContext();
  return { ctx, asAudioContext: ctx as unknown as AudioContext };
}

function makeStereo(seconds: number): { left: Float32Array; right: Float32Array } {
  const n = Math.round(seconds * SR);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    left[i] = Math.sin((2 * Math.PI * 440 * i) / SR);
    right[i] = Math.sin((2 * Math.PI * 450 * i) / SR);
  }
  return { left, right };
}

describe('isPlayerSupported', () => {
  it('is false in node (no AudioContext global)', () => {
    expect(isPlayerSupported()).toBe(false);
  });
});

describe('SessionPlayer.load', () => {
  it('loads a stereo buffer and reports duration', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    const dur = p.load(makeStereo(2), SR);
    expect(dur).toBeCloseTo(2, 10);
    expect(p.state).toBe('ready');
    expect(p.duration).toBeCloseTo(2, 10);
    expect(p.position).toBe(0);
  });

  it('returns 0 and stays empty for empty buffers', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    expect(p.load({ left: new Float32Array(0), right: new Float32Array(0) }, SR)).toBe(0);
    expect(p.state).toBe('empty');
    expect(p.play()).toBe(false);
  });

  it('truncates mismatched channel lengths', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    const dur = p.load({ left: new Float32Array(SR), right: new Float32Array(SR / 2) }, SR);
    expect(dur).toBeCloseTo(0.5, 10);
  });

  it('rejects invalid sample rates', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    expect(p.load(makeStereo(1), 0)).toBe(0);
    expect(p.load(makeStereo(1), Number.NaN)).toBe(0);
    expect(p.state).toBe('empty');
  });

  it('copies channel data into the AudioBuffer', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    const src = makeStereo(0.1);
    p.load(src, SR);
    // Mutating the input afterwards must not affect the loaded buffer.
    src.left.fill(9);
    const buf = (p as unknown as { buffer: MockAudioBuffer }).buffer;
    expect(Math.max(...Array.from(buf.getChannelData(0).slice(0, 100)).map(Math.abs))).toBeLessThanOrEqual(1);
    expect(ctx.sources.length).toBe(0);
  });
});

describe('SessionPlayer.play', () => {
  it('starts a source at offset 0 and transitions to playing', () => {
    const { ctx, asAudioContext } = makeContext();
    const states: PlayerState[] = [];
    const p = new SessionPlayer({ audioContext: asAudioContext, onStateChange: (s) => states.push(s) });
    p.load(makeStereo(1), SR);
    expect(p.play()).toBe(true);
    expect(p.state).toBe('playing');
    expect(ctx.sources.length).toBe(1);
    expect(ctx.sources[0].startArgs).toEqual({ when: 0, offset: 0 });
    expect(states).toEqual(['ready', 'playing']);
  });

  it('is idempotent while playing', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    p.play();
    expect(ctx.sources.length).toBe(1);
  });

  it('returns false with nothing loaded', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    expect(p.play()).toBe(false);
    expect(p.state).toBe('empty');
  });

  it('resumes a suspended context', () => {
    const { ctx, asAudioContext } = makeContext();
    ctx.state = 'suspended';
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    expect(ctx.state).toBe('running');
  });

  it('tracks position from ctx.currentTime while playing', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(2), SR);
    p.play();
    ctx.currentTime = 0.75;
    expect(p.position).toBeCloseTo(0.75, 10);
    // Position is clamped to duration even if the clock overruns.
    ctx.currentTime = 99;
    expect(p.position).toBe(2);
  });

  it('transitions to ended on natural completion and fires onEnded', () => {
    const { ctx, asAudioContext } = makeContext();
    const onEnded = vi.fn();
    const p = new SessionPlayer({ audioContext: asAudioContext, onEnded });
    p.load(makeStereo(1), SR);
    p.play();
    ctx.sources[0].finish();
    expect(p.state).toBe('ended');
    expect(p.position).toBe(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('replays from the start after natural end', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    ctx.sources[0].finish();
    expect(p.play()).toBe(true);
    expect(ctx.sources[1].startArgs?.offset).toBe(0);
    expect(p.state).toBe('playing');
  });
});

describe('SessionPlayer.pause / stop / seek', () => {
  it('pause freezes the position and stops the source without firing onEnded', () => {
    const { ctx, asAudioContext } = makeContext();
    const onEnded = vi.fn();
    const p = new SessionPlayer({ audioContext: asAudioContext, onEnded });
    p.load(makeStereo(2), SR);
    p.play();
    ctx.currentTime = 0.5;
    const pos = p.pause();
    expect(pos).toBeCloseTo(0.5, 10);
    expect(p.state).toBe('paused');
    expect(ctx.sources[0].stopped).toBe(true);
    expect(onEnded).not.toHaveBeenCalled();
    // Position stays frozen after pause.
    ctx.currentTime = 1.5;
    expect(p.position).toBeCloseTo(0.5, 10);
  });

  it('resume after pause starts a new source at the saved offset', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(2), SR);
    p.play();
    ctx.currentTime = 0.5;
    p.pause();
    ctx.currentTime = 10;
    p.play();
    expect(ctx.sources[1].startArgs?.offset).toBeCloseTo(0.5, 10);
    ctx.currentTime = 10.25;
    expect(p.position).toBeCloseTo(0.75, 10);
  });

  it('pause when not playing is a harmless no-op', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    expect(p.pause()).toBe(0);
    p.load(makeStereo(1), SR);
    expect(p.pause()).toBe(0);
    expect(p.state).toBe('ready');
  });

  it('stop rewinds to zero and returns to ready', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(2), SR);
    p.play();
    ctx.currentTime = 1;
    p.stop();
    expect(p.state).toBe('ready');
    expect(p.position).toBe(0);
    p.play();
    expect(ctx.sources.at(-1)?.startArgs?.offset).toBe(0);
  });

  it('seek clamps to [0, duration] and handles NaN', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(2), SR);
    p.seek(1.2);
    expect(p.position).toBeCloseTo(1.2, 10);
    p.seek(-5);
    expect(p.position).toBe(0);
    p.seek(99);
    expect(p.position).toBe(2);
    p.seek(Number.NaN);
    expect(p.position).toBe(0);
    expect(p.state).toBe('ready');
  });

  it('seek while playing restarts at the new offset', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(3), SR);
    p.play();
    ctx.currentTime = 1;
    p.seek(2);
    expect(ctx.sources[1].startArgs?.offset).toBeCloseTo(2, 10);
    expect(p.state).toBe('playing');
    ctx.currentTime = 1.5;
    expect(p.position).toBeCloseTo(2.5, 10);
  });

  it('seek is a no-op when nothing is loaded', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.seek(1);
    expect(p.state).toBe('empty');
    expect(p.position).toBe(0);
  });

  it('seeking back from ended re-arms playback', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    ctx.sources[0].finish();
    expect(p.state).toBe('ended');
    p.seek(0.4);
    expect(p.state).toBe('paused');
    expect(p.position).toBeCloseTo(0.4, 10);
    p.play();
    expect(ctx.sources.at(-1)?.startArgs?.offset).toBeCloseTo(0.4, 10);
  });
});

describe('SessionPlayer gain and lifecycle', () => {
  it('applies gain in dB to the gain node', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.setGainDb(-6);
    p.play();
    const gainNode = (p as unknown as { gainNode: MockGainNode }).gainNode;
    expect(gainNode.gain.value).toBeCloseTo(dbToLin(-6), 10);
  });

  it('clamps gain and maps NaN to unity', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.setGainDb(100);
    expect(p.gainDb).toBe(MAX_GAIN_DB);
    p.setGainDb(-100);
    expect(p.gainDb).toBe(MIN_GAIN_DB);
    p.setGainDb(Number.NaN);
    expect(p.gainDb).toBe(0);
  });

  it('gain set before play is applied when the gain node is created', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.setGainDb(-12);
    p.load(makeStereo(1), SR);
    p.play();
    const gainNode = (p as unknown as { gainNode: MockGainNode }).gainNode;
    expect(gainNode.gain.value).toBeCloseTo(dbToLin(-12), 10);
  });

  it('snapshot reflects the full player state', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(2), SR);
    p.setGainDb(-3);
    p.play();
    ctx.currentTime = 0.25;
    const snap = p.snapshot();
    expect(snap.state).toBe('playing');
    expect(snap.positionSec).toBeCloseTo(0.25, 10);
    expect(snap.durationSec).toBeCloseTo(2, 10);
    expect(snap.gainDb).toBe(-3);
  });

  it('dispose stops playback and returns to empty', () => {
    const { ctx, asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    p.dispose();
    expect(p.state).toBe('empty');
    expect(p.duration).toBe(0);
    expect(p.play()).toBe(false);
    // Injected contexts are not owned: dispose must not close them.
    expect(ctx.closed).toBe(false);
  });

  it('stopping twice never throws (InvalidStateError is swallowed)', () => {
    const { asAudioContext } = makeContext();
    const p = new SessionPlayer({ audioContext: asAudioContext });
    p.load(makeStereo(1), SR);
    p.play();
    p.stop();
    p.stop();
    expect(p.state).toBe('ready');
  });
});
