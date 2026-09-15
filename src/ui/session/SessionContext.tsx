/**
 * Global session state (UI layer): live engine config, transport, session
 * timer with limit enforcement, WHO-ITU H.870 dose tracking (src/safety),
 * governor config (src/safety), panic flow, and preset/frequency loading.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  checkPhaseGuardrails,
  encodeWav,
  renderPhase,
  renderSession,
  type EntrainmentMode,
  type NatureKind,
  type NoiseColor,
  type Phase as EnginePhase,
  type SessionSpec,
} from '@/engine';
import { SoundDoseTracker } from '@/safety/dose';
import { DEFAULT_GOVERNOR_CONFIG, type GovernorConfig } from '@/safety/governor';
import type { Preset, SessionSpec as DataSessionSpec } from '@/data/presets';
import type { Grade } from '@/data/frequencies';
import {
  deleteUserPreset,
  loadUserPresets,
  saveUserPreset,
  type UserPreset,
} from './userPresets';
import { LiveEngine, type GateShape, type Waveform } from '../audio/liveEngine';
import { bandForBeat, type BandName } from '../theme';

export interface UiPhase {
  id: string;
  durationSec: number;
  beatHz: number;
}

export interface SessionSnapshot {
  mode: EntrainmentMode;
  carrierHz: number;
  beatHz: number;
  waveform: Waveform;
  phaseLock: boolean;
  gateDuty: number;
  gateShape: GateShape;
  running: boolean;
  /** True while a running session is paused (audio frozen, clock held). */
  paused: boolean;
  panicked: boolean;
  elapsedSec: number;
  limitMin: number;
  volumeDb: number;
  muted: boolean;
  band: BandName | null;
  warnings: string[];
  noiseDb: Record<NoiseColor, number>;
  /** Master bypass for the noise mixer section (false = all colors silent live, omitted from export). */
  noiseOn: boolean;
  nature: { on: boolean; kind: NatureKind; db: number };
  bowl: { on: boolean; baseHz: number; db: number; lock: boolean };
  /** Master bypass for the nature/bowl layers section (false = layers silent live, omitted from export). */
  layersOn: boolean;
  phases: UiPhase[];
  activePhaseIdx: number;
  dosePercent: number;
  estDbA: number;
  governor: GovernorConfig;
  presetName: string | null;
  presetGrade: Grade | null;
  dirty: boolean;
  /** Saved "MY PRESETS" entries (localStorage-backed, versioned). */
  userPresets: UserPreset[];
}

interface SessionActions {
  /** Id of the currently playing preview (null = none; one at a time). */
  previewId: string | null;
  /** Toggle an arbitrary preview; `start` may return a stop function (e.g. HTMLAudio.pause). */
  togglePreview: (id: string, start: () => (() => void) | void) => void;
  /** Stop any active preview (second tap / new preview / panic). */
  stopPreview: () => void;
  /** Preview the first ~10 s of a preset's phase plan through the engine preview path. */
  previewPreset: (preset: Preset) => void;
  /** Preview the first `maxSec` seconds of an engine phase list (id-keyed, toggle on repeat). */
  previewPhases: (id: string, phases: readonly EnginePhase[], maxSec?: number) => void;
  /** Play a pre-rendered preview file (public/previews/<id>.wav) via HTMLAudio; toggle on repeat. */
  previewUrl: (id: string, url: string) => void;
  /** Play a plain tone at `hz` for up to 30 s (cymatics "hear this pattern"). */
  previewTone: (id: string, hz: number, durSec?: number) => void;
  start: () => void;
  stop: () => void;
  /**
   * Global pause/resume (Space hotkey, status-bar chip, palette). Freezes the
   * live engine phase-coherently (suspend, no click/jump) and holds the
   * session clock. No-op while idle or panicked.
   */
  togglePause: () => void;
  panic: () => void;
  rehearsePanic: () => void;
  resumeSafely: () => void;
  dismissPanic: () => void;
  setMode: (m: EntrainmentMode) => void;
  setCarrierHz: (hz: number) => void;
  setBeatHz: (hz: number) => void;
  setWaveform: (w: Waveform) => void;
  setPhaseLock: (on: boolean) => void;
  setGateDuty: (duty: number) => void;
  setGateShape: (s: GateShape) => void;
  setNoiseDb: (color: NoiseColor, db: number) => void;
  /** Master bypass toggle for the noise mixer (click-free section ramp). */
  setNoiseOn: (on: boolean) => void;
  setNature: (patch: Partial<SessionSnapshot['nature']>) => void;
  setBowl: (patch: Partial<SessionSnapshot['bowl']>) => void;
  /** Master bypass toggle for the nature/bowl layers (click-free section ramp). */
  setLayersOn: (on: boolean) => void;
  setVolumeDb: (db: number) => void;
  setMuted: (m: boolean) => void;
  setLimitMin: (min: number) => void;
  setGovernor: (patch: Partial<GovernorConfig>) => void;
  setPhases: (phases: UiPhase[]) => void;
  /**
   * Persist the current front-panel config as a named user preset
   * (Studio "SAVE AS PRESET"). Duplicate names replace in place.
   * Returns the stored entry.
   */
  saveCurrentAsPreset: (name: string) => UserPreset;
  /** Delete a user preset by id. */
  deleteUserPreset: (id: string) => void;
  loadPreset: (preset: Preset) => void;
  loadFrequency: (hz: number, name?: string) => void;
  previewHz: (hz: number) => void;
  exportWav: () => void;
  engineRef: React.RefObject<LiveEngine>;
}

const SessionCtx = createContext<(SessionSnapshot & SessionActions) | null>(null);

let phaseSeq = 0;
const newPhase = (durationSec: number, beatHz: number): UiPhase => ({
  id: `ph-${++phaseSeq}`,
  durationSec,
  beatHz,
});

const DEFAULT_PHASES: UiPhase[] = [newPhase(8 * 60, 10), newPhase(20 * 60, 6), newPhase(62 * 60, 4)];

const ALL_NOISE_OFF: Record<NoiseColor, number> = {
  white: -Infinity,
  pink: -Infinity,
  brown: -Infinity,
  blue: -Infinity,
  violet: -Infinity,
  grey: -Infinity,
};

/** Headphone estimate: design reference point −18 dBFS ≈ 58 dBA (±6 dB). */
export const DBFS_TO_DBA_OFFSET = 76;

/** Preview renders are capped at 30 s — previews never debit the H.870 dose tracker (sessions do). */
export const PREVIEW_MAX_SEC = 10;

/** Truncate a phase list to a total of `maxSec` seconds (preview renders). */
export function truncatePhases(phases: readonly EnginePhase[], maxSec: number): EnginePhase[] {
  const out: EnginePhase[] = [];
  let remaining = maxSec;
  for (const p of phases) {
    if (remaining <= 0) break;
    const d = Math.min(p.durationSec, remaining);
    if (d > 0) out.push({ ...p, durationSec: d });
    remaining -= d;
  }
  return out;
}

/** Layer/bypass mix state that gates noise/bowl/nature into the WAV export. */
export interface ExportLayers {
  noiseDb: Record<NoiseColor, number>;
  noiseOn: boolean;
  nature: SessionSnapshot['nature'];
  bowl: SessionSnapshot['bowl'];
  layersOn: boolean;
}

/**
 * Build the engine phase list for a WAV export. Bypassed sections are
 * OMITTED from the phases entirely — the exported file contains no noise /
 * bowl / nature content at all (not merely a zero-gain render of it).
 * (Export flattens the mixer to the loudest noise color, as before.)
 */
export function buildExportPhases(
  phases: readonly UiPhase[],
  carrierHz: number,
  mode: EntrainmentMode,
  layers: ExportLayers,
): EnginePhase[] {
  const enginePhases: EnginePhase[] = phases.map((p) => ({
    durationSec: p.durationSec,
    carrierHz,
    beatHz: p.beatHz,
    mode,
    gainDb: 0,
  }));
  const loudestNoise = (Object.entries(layers.noiseDb) as [NoiseColor, number][]).reduce(
    (best, [c, db]) => (db > best[1] ? [c, db] : best),
    ['pink', -Infinity] as [NoiseColor, number],
  );
  if (layers.noiseOn && Number.isFinite(loudestNoise[1])) {
    for (const p of enginePhases) {
      p.noise = { color: loudestNoise[0], level: Math.min(1, Math.pow(10, loudestNoise[1] / 20) * 4) };
    }
  }
  if (layers.layersOn && layers.bowl.on) {
    for (const p of enginePhases) {
      p.bowl = { baseHz: layers.bowl.lock ? carrierHz : layers.bowl.baseHz, level: 0.5 };
    }
  }
  if (layers.layersOn && layers.nature.on) {
    for (const p of enginePhases) p.nature = { kind: layers.nature.kind, level: 0.5 };
  }
  return enginePhases;
}

/** First ~`maxSec` of a data-layer preset as engine phases (binaural, per-phase gain). */
export function presetPreviewPhases(preset: Preset, maxSec: number = PREVIEW_MAX_SEC): EnginePhase[] {
  return truncatePhases(
    preset.spec.phases.map((p) => ({
      durationSec: p.durationSec,
      carrierHz: p.carrierHz,
      beatHz: p.beatHz,
      mode: 'binaural' as const,
      gainDb: Math.min(0, p.gainDbFs),
    })),
    maxSec,
  );
}

/** Beat at time t given the phase plan, with a 60 s linear glide between beats. */
export function beatAtTime(phases: UiPhase[], tSec: number): { beat: number; idx: number } {
  let acc = 0;
  let prevBeat: number | null = null;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (tSec < acc + p.durationSec || i === phases.length - 1) {
      const local = Math.max(0, tSec - acc);
      if (prevBeat !== null && prevBeat !== p.beatHz) {
        const ramp = Math.min(60, p.durationSec * 0.5);
        if (local < ramp) {
          const k = local / ramp;
          return { beat: prevBeat + (p.beatHz - prevBeat) * k, idx: i };
        }
      }
      return { beat: p.beatHz, idx: i };
    }
    acc += p.durationSec;
    prevBeat = p.beatHz;
  }
  return { beat: phases[phases.length - 1]?.beatHz ?? 10, idx: phases.length - 1 };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<LiveEngine>(null as unknown as LiveEngine);
  if (!engineRef.current) engineRef.current = new LiveEngine();
  const doseRef = useRef<SoundDoseTracker>(null as unknown as SoundDoseTracker);
  if (!doseRef.current) doseRef.current = new SoundDoseTracker('adult');

  const [mode, setModeState] = useState<EntrainmentMode>('binaural');
  const [carrierHz, setCarrierState] = useState(200);
  const [beatHz, setBeatState] = useState(10);
  const [waveform, setWaveformState] = useState<Waveform>('sine');
  const [phaseLock, setPhaseLock] = useState(true);
  const [gateDuty, setGateDutyState] = useState(0.5);
  const [gateShape, setGateShapeState] = useState<GateShape>('raised-cosine');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [panicked, setPanicked] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [limitMin, setLimitMinState] = useState(90);
  const [volumeDb, setVolumeDbState] = useState(-12);
  const [muted, setMutedState] = useState(false);
  const [noiseDb, setNoiseDbState] = useState<Record<NoiseColor, number>>(ALL_NOISE_OFF);
  const [noiseOn, setNoiseOnState] = useState(true);
  const [nature, setNatureState] = useState<SessionSnapshot['nature']>({ on: false, kind: 'rain', db: -30 });
  const [bowl, setBowlState] = useState<SessionSnapshot['bowl']>({ on: false, baseHz: 136.1, db: -30, lock: false });
  const [layersOn, setLayersOnState] = useState(true);
  const [phases, setPhasesState] = useState<UiPhase[]>(DEFAULT_PHASES);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [dosePercent, setDosePercent] = useState(0);
  const [governor, setGovernorState] = useState<GovernorConfig>({ ...DEFAULT_GOVERNOR_CONFIG });
  const [presetName, setPresetName] = useState<string | null>(null);
  const [presetGrade, setPresetGrade] = useState<Grade | null>(null);
  const [dirty, setDirty] = useState(false);
  // MY PRESETS: localStorage-backed user saves (salvaged on corrupt reads).
  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => loadUserPresets());
  // One-at-a-time preview playback (preset/experiment/cymatics previews).
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewStopRef = useRef<(() => void) | null>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  const pushConfig = useCallback(
    (patch: Partial<{ mode: EntrainmentMode; carrierHz: number; beatHz: number; waveform: Waveform; gateDuty: number; gateShape: GateShape }>) => {
      engineRef.current.updateConfig(patch);
    },
    [],
  );

  // ---- transport -----------------------------------------------------------
  const start = useCallback(() => {
    const eng = engineRef.current;
    eng.setOutputDb(volumeDb);
    eng.setMuted(muted);
    if (!eng.start()) return;
    setRunning(true);
    setPanicked(false);
  }, [volumeDb, muted]);

  const stop = useCallback(() => {
    engineRef.current.stop(0.3);
    setRunning(false);
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    // Idle/panicked: nothing live to pause — no-op (Space stays inert).
    if (!running || panicked) return;
    if (paused) {
      engineRef.current.resume();
      setPaused(false);
    } else {
      engineRef.current.pause();
      setPaused(true);
    }
  }, [running, panicked, paused]);

  const panic = useCallback(() => {
    // engine.panic() cuts tracked preview sources too; also clear the UI-side
    // preview handle (HTMLAudio stop fn + previewId).
    previewStopRef.current?.();
    previewStopRef.current = null;
    setPreviewId(null);
    engineRef.current.panic();
    setRunning(false);
    setPaused(false);
    setPanicked(true);
  }, []);

  const rehearsePanic = useCallback(() => {
    // Test mode: same visual sequence, no engine bus is touched.
    setPanicked(true);
  }, []);

  const resumeSafely = useCallback(() => {
    const db = engineRef.current.resumeSafely();
    setVolumeDbState(db);
    setRunning(true);
    setPaused(false);
    setPanicked(false);
  }, []);

  const dismissPanic = useCallback(() => setPanicked(false), []);

  // ---- session clock / dose / limit ----------------------------------------
  useEffect(() => {
    // Paused: clock held (elapsed/dose freeze); resumes from `elapsedSec`.
    if (!running || paused) return;
    const t0 = Date.now();
    const iv = window.setInterval(() => {
      const next = elapsedSec + (Date.now() - t0) / 1000;
      // Limit enforcement: 30 s gentle fade then stop (safety.md).
      const limitSec = limitMin * 60;
      if (next >= limitSec) {
        stop();
        setElapsedSec(0);
        return;
      }
      // Phase plan drives the live beat.
      const { beat, idx } = beatAtTime(phases, next);
      setBeatState((cur) => {
        if (Math.abs(cur - beat) > 0.005) {
          pushConfig({ beatHz: beat });
          return Math.round(beat * 100) / 100;
        }
        return cur;
      });
      setActivePhaseIdx(idx);
      // H.870 dose accumulation (1 s tick at the current estimated level).
      const dbA = volumeDb + DBFS_TO_DBA_OFFSET;
      try {
        doseRef.current.addExposure(dbA, 1);
      } catch {
        /* guard: never crash the clock */
      }
      setDosePercent(doseRef.current.weeklyDosePercent());
      setElapsedSec(Math.floor(next));
    }, 1000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused]);

  // ---- config setters -------------------------------------------------------
  const setMode = useCallback(
    (m: EntrainmentMode) => {
      setModeState(m);
      pushConfig({ mode: m });
      markDirty();
    },
    [pushConfig, markDirty],
  );
  const setCarrierHz = useCallback(
    (hz: number) => {
      const clamped = Math.min(1000, Math.max(20, hz));
      setCarrierState(clamped);
      pushConfig({ carrierHz: clamped });
      markDirty();
    },
    [pushConfig, markDirty],
  );
  const setBeatHz = useCallback(
    (hz: number) => {
      const clamped = Math.min(80, Math.max(0.1, hz));
      setBeatState(clamped);
      pushConfig({ beatHz: clamped });
      // Keep the first phase in sync when not running a plan edit.
      markDirty();
    },
    [pushConfig, markDirty],
  );
  const setWaveform = useCallback(
    (w: Waveform) => {
      setWaveformState(w);
      pushConfig({ waveform: w });
      markDirty();
    },
    [pushConfig, markDirty],
  );
  const setGateDuty = useCallback(
    (d: number) => {
      setGateDutyState(d);
      pushConfig({ gateDuty: d });
    },
    [pushConfig],
  );
  const setGateShape = useCallback(
    (s: GateShape) => {
      setGateShapeState(s);
      pushConfig({ gateShape: s });
    },
    [pushConfig],
  );
  const setNoiseDb = useCallback((color: NoiseColor, db: number) => {
    setNoiseDbState((cur) => ({ ...cur, [color]: db }));
    engineRef.current.setNoiseLevel(color, db);
    setDirty(true);
  }, []);
  // Section bypass: a click-free ramp on the engine's section bus — fader
  // positions are kept, so re-enabling restores the exact mix.
  const setNoiseOn = useCallback((on: boolean) => {
    setNoiseOnState(on);
    engineRef.current.setNoiseBypass(on);
    setDirty(true);
  }, []);
  const setNature = useCallback((patch: Partial<SessionSnapshot['nature']>) => {
    setNatureState((cur) => {
      const next = { ...cur, ...patch };
      engineRef.current.setNature(next.on ? next.kind : null, next.db);
      return next;
    });
    setDirty(true);
  }, []);
  const setBowl = useCallback((patch: Partial<SessionSnapshot['bowl']>) => {
    setBowlState((cur) => {
      const next = { ...cur, ...patch };
      engineRef.current.setBowl(next.on, next.lock ? 0 : next.baseHz, next.db);
      return next;
    });
    setDirty(true);
  }, []);
  // Section bypass for the nature/bowl layers: click-free ramp on the
  // engine's layer bus; per-layer settings are kept for re-enable.
  const setLayersOn = useCallback((on: boolean) => {
    setLayersOnState(on);
    engineRef.current.setLayersBypass(on);
    setDirty(true);
  }, []);
  // Bowl "detune to carrier" lock.
  useEffect(() => {
    if (bowl.on && bowl.lock) engineRef.current.setBowl(true, carrierHz, bowl.db);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierHz, bowl.lock, bowl.on]);
  const setVolumeDb = useCallback((db: number) => {
    setVolumeDbState(db);
    engineRef.current.setOutputDb(db);
  }, []);
  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    engineRef.current.setMuted(m);
  }, []);
  const setLimitMin = useCallback(
    (min: number) => {
      // Limits only tighten live; loosening applies next session (safety.md).
      if (!running || min < limitMin) setLimitMinState(min);
    },
    [running, limitMin],
  );
  const setGovernor = useCallback((patch: Partial<GovernorConfig>) => {
    setGovernorState((cur) => ({ ...cur, ...patch }));
  }, []);
  const setPhases = useCallback((p: UiPhase[]) => {
    setPhasesState(p.slice(0, 8));
    setDirty(true);
  }, []);

  // ---- user presets (Studio "SAVE AS PRESET") -------------------------------
  const saveCurrentAsPreset = useCallback(
    (name: string): UserPreset => {
      // Snapshot the front panel as a data-layer SessionSpec: per-phase beat,
      // current carrier/mode, unity gain (the fader is a playback control,
      // not part of the saved stimulus).
      const spec: DataSessionSpec = {
        autoShutoff: true,
        phases: phases.map((p, i) => ({
          name: `phase-${i + 1}`,
          durationSec: p.durationSec,
          carrierHz,
          beatHz: p.beatHz,
          gainDbFs: 0,
          mode,
        })),
      };
      const result = saveUserPreset(name, spec);
      setUserPresets(result.presets);
      setPresetName(result.preset.name);
      setPresetGrade(null);
      setDirty(false);
      return result.preset;
    },
    [phases, carrierHz, mode],
  );

  const deleteUserPresetById = useCallback((id: string) => {
    setUserPresets(deleteUserPreset(id));
  }, []);

  // ---- loading --------------------------------------------------------------
  const loadPreset = useCallback(
    (preset: Preset) => {
      const first = preset.spec.phases[0];
      if (first) {
        setCarrierState(first.carrierHz);
        setBeatState(first.beatHz);
        pushConfig({ carrierHz: first.carrierHz, beatHz: first.beatHz });
      }
      setPhasesState(
        preset.spec.phases.slice(0, 8).map((p) => newPhase(p.durationSec, p.beatHz)),
      );
      setPresetName(preset.title);
      setPresetGrade(preset.grade);
      setDirty(false);
    },
    [pushConfig],
  );

  const loadFrequency = useCallback(
    (hz: number, name?: string) => {
      // Sub-40 Hz values load as a beat at a 200 Hz carrier; audible ones as carrier.
      if (hz <= 40) {
        setCarrierState(200);
        setBeatState(hz);
        pushConfig({ carrierHz: 200, beatHz: hz });
        setPhasesState([newPhase(20 * 60, hz)]);
      } else {
        setCarrierState(Math.min(1000, hz));
        pushConfig({ carrierHz: Math.min(1000, hz) });
      }
      setPresetName(name ?? null);
      setPresetGrade(null);
      setDirty(false);
    },
    [pushConfig],
  );

  const previewHz = useCallback((hz: number) => {
    // Inaudible values (< 40 Hz) preview as a binaural beat on a 200 Hz carrier.
    const phase: EnginePhase =
      hz <= 40
        ? { durationSec: 2.5, carrierHz: 200, beatHz: Math.max(0.1, hz), mode: 'binaural', gainDb: -14 }
        : { durationSec: 2.5, carrierHz: Math.min(1200, hz), beatHz: 0, mode: 'monaural', gainDb: -14 };
    const r = renderPhase(phase, 48000);
    engineRef.current.playBuffer(r.left, r.right, 48000, -12);
  }, []);

  // ---- previews (≤30 s, never dose-debited — the dose clock only ticks while
  // a session is running, and previews never call start()) -------------------
  const stopPreview = useCallback(() => {
    previewStopRef.current?.();
    previewStopRef.current = null;
    engineRef.current.stopPreviews();
    setPreviewId(null);
  }, []);

  const startPreview = useCallback((id: string, startFn: () => (() => void) | void) => {
    // One preview at a time: stop whatever is playing first.
    previewStopRef.current?.();
    previewStopRef.current = null;
    engineRef.current.stopPreviews();
    const stopFn = startFn();
    previewStopRef.current = typeof stopFn === 'function' ? stopFn : null;
    setPreviewId(id);
  }, []);

  const togglePreview = useCallback(
    (id: string, startFn: () => (() => void) | void) => {
      if (previewId === id) stopPreview();
      else startPreview(id, startFn);
    },
    [previewId, startPreview, stopPreview],
  );

  const previewPhases = useCallback(
    (id: string, phases: readonly EnginePhase[], maxSec: number = PREVIEW_MAX_SEC) => {
      if (previewId === id) {
        stopPreview();
        return;
      }
      const truncated = truncatePhases(phases, Math.min(30, maxSec));
      if (truncated.length === 0) return;
      const r = renderSession({ name: 'preview', phases: truncated, crossfadeSec: 0.5, masterGainDb: -6 });
      if (r.left.length === 0) return;
      const sr = r.manifest.sampleRate;
      // Previews respect the governor gain cap (quiet hours / infant mode).
      const db = Math.min(-12, governor.maxGainDbFs);
      startPreview(id, () => {
        engineRef.current.playBuffer(r.left, r.right, sr, db, () =>
          setPreviewId((cur) => (cur === id ? null : cur)),
        );
      });
    },
    [previewId, governor.maxGainDbFs, startPreview, stopPreview],
  );

  const previewPreset = useCallback(
    (preset: Preset) => {
      previewPhases(`preset:${preset.id}`, presetPreviewPhases(preset));
    },
    [previewPhases],
  );

  const previewUrl = useCallback(
    (id: string, url: string) => {
      if (previewId === id) {
        stopPreview();
        return;
      }
      // Governor gain cap applied as HTMLAudio volume (engine previews use the
      // same min(−12 dB, cap) rule). File previews are ≤30 s renders and never
      // touch the dose clock; panic()/stopPreview() cut them via the stop fn.
      const db = Math.min(-12, governor.maxGainDbFs);
      startPreview(id, () => {
        const audio = new Audio(url);
        audio.volume = Math.min(1, Math.pow(10, db / 20));
        const clearIfCurrent = () => setPreviewId((cur) => (cur === id ? null : cur));
        audio.onended = clearIfCurrent;
        audio.onerror = clearIfCurrent;
        void audio.play().catch(clearIfCurrent);
        return () => {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.src = '';
        };
      });
    },
    [previewId, governor.maxGainDbFs, startPreview, stopPreview],
  );

  const previewTone = useCallback(
    (id: string, hz: number, durSec = 30) => {
      if (previewId === id) {
        stopPreview();
        return;
      }
      const carrier = Math.min(1200, Math.max(20, hz));
      const dur = Math.min(30, Math.max(1, durSec));
      const r = renderPhase(
        { durationSec: dur, carrierHz: carrier, beatHz: 0, mode: 'monaural', gainDb: Math.min(-14, governor.maxGainDbFs) },
        48000,
      );
      const db = Math.min(-12, governor.maxGainDbFs);
      startPreview(id, () => {
        engineRef.current.playBuffer(r.left, r.right, 48000, db, () =>
          setPreviewId((cur) => (cur === id ? null : cur)),
        );
      });
    },
    [previewId, governor.maxGainDbFs, startPreview, stopPreview],
  );

  const exportWav = useCallback(() => {
    const totalSec = Math.min(
      phases.reduce((a, p) => a + p.durationSec, 0),
      limitMin * 60,
    );
    // Bypassed sections are omitted from the export (see buildExportPhases).
    const enginePhases = buildExportPhases(phases, carrierHz, mode, { noiseDb, noiseOn, nature, bowl, layersOn });
    const spec: SessionSpec = { name: presetName ?? 'Open Sync session', phases: enginePhases, masterGainDb: -6 };
    void totalSec;
    const rendered = renderSession(spec);
    const wav = encodeWav(rendered.left, rendered.right, rendered.manifest.sampleRate, 'pcm16');
    const blob = new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(presetName ?? 'open-sync').replace(/\s+/g, '-').toLowerCase()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [phases, carrierHz, mode, noiseDb, noiseOn, bowl, nature, layersOn, presetName, limitMin]);

  // ---- warnings (engine guardrails) ------------------------------------------
  const warnings = useMemo(() => {
    const w = checkPhaseGuardrails(
      { durationSec: 60, carrierHz, beatHz, mode, gainDb: 0 },
      48000,
    );
    if (waveform === 'square') w.push('square wave: harmonics — check THD in Analyzer');
    return w;
  }, [carrierHz, beatHz, mode, waveform]);

  const value = useMemo<SessionSnapshot & SessionActions>(
    () => ({
      mode,
      carrierHz,
      beatHz,
      waveform,
      phaseLock,
      gateDuty,
      gateShape,
      running,
      paused,
      panicked,
      elapsedSec,
      limitMin,
      volumeDb,
      muted,
      band: bandForBeat(beatHz),
      warnings,
      noiseDb,
      noiseOn,
      nature,
      bowl,
      layersOn,
      phases,
      activePhaseIdx,
      dosePercent,
      estDbA: volumeDb + DBFS_TO_DBA_OFFSET,
      governor,
      presetName,
      presetGrade,
      dirty,
      userPresets,
      previewId,
      togglePreview,
      stopPreview,
      previewPreset,
      previewPhases,
      previewUrl,
      previewTone,
      start,
      stop,
      togglePause,
      panic,
      rehearsePanic,
      resumeSafely,
      dismissPanic,
      setMode,
      setCarrierHz,
      setBeatHz,
      setWaveform,
      setPhaseLock,
      setGateDuty,
      setGateShape,
      setNoiseDb,
      setNoiseOn,
      setNature,
      setBowl,
      setLayersOn,
      setVolumeDb,
      setMuted,
      setLimitMin,
      setGovernor,
      setPhases,
      saveCurrentAsPreset,
      deleteUserPreset: deleteUserPresetById,
      loadPreset,
      loadFrequency,
      previewHz,
      exportWav,
      engineRef,
    }),
    [
      mode, carrierHz, beatHz, waveform, phaseLock, gateDuty, gateShape, running, paused, panicked,
      elapsedSec, limitMin, volumeDb, muted, warnings, noiseDb, noiseOn, nature, bowl, layersOn, phases,
      activePhaseIdx, dosePercent, governor, presetName, presetGrade, dirty, userPresets,
      previewId, togglePreview, stopPreview, previewPreset, previewPhases, previewUrl, previewTone,
      start, stop, togglePause, panic, rehearsePanic, resumeSafely, dismissPanic, setMode, setCarrierHz, setBeatHz,
      setWaveform, setGateDuty, setGateShape, setNoiseDb, setNoiseOn, setNature, setBowl, setLayersOn, setVolumeDb,
      setMuted, setLimitMin, setGovernor, setPhases, saveCurrentAsPreset, deleteUserPresetById,
      loadPreset, loadFrequency, previewHz, exportWav,
    ],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionSnapshot & SessionActions {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** Like useSession but returns null outside a provider (SSR smoke renders). */
export function useSessionOptional(): (SessionSnapshot & SessionActions) | null {
  return useContext(SessionCtx);
}

/** mm:ss or hh:mm:ss mono formatting for timers. */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}
