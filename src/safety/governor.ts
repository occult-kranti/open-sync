/**
 * SafetyGovernor — pure authorization layer for audio sessions.
 *
 * Enforces the evidence-anchored safety spec:
 *   - General sessions: duration <= maxSessionMin (default 90 min; conservative
 *     vs NIOSH 85 dBA / 8 h REL), digital gain <= maxGainDbFs (default -6 dBFS;
 *     note a digital cap is NOT an acoustic limit — see WHO-ITU H.870 / EN 50332).
 *   - Infant mode: mandatory lowpass <= 1000 Hz (matches intrauterine acoustics),
 *     gain path targeting <= 50 dBA at the crib (AAP guidance; Hugh et al. 2014),
 *     auto-shutoff required (Hugh 2014; NICU music-therapy norms 20-45 min),
 *     heartbeat content restricted to 60-80 BPM (maternal resting range).
 *   - Driving/operating-machinery warning must be acknowledged before any session
 *     (Klichowski et al. 2023, Sci Rep, n=1000: home-use binaural beats worsened
 *     fluid-intelligence scores during listening).
 */

import { INFANT_CEILING_DBA } from './dose';

/** Maximum low-pass cutoff permitted in infant mode (Hz). */
export const INFANT_MAX_LOWPASS_HZ = 1000;
/** Permitted heartbeat range for infant content (BPM, maternal resting range). */
export const INFANT_HEARTBEAT_BPM_MIN = 60;
export const INFANT_HEARTBEAT_BPM_MAX = 80;
/** Maximum infant heartbeat/session auto-shutoff (min), per NICU music-therapy norms. */
export const INFANT_MAX_SESSION_MIN = 45;

/**
 * Session specification as seen by the governor. This is a local, decoupled
 * shape — the audio engine (W3) adapts its SessionSpec to this interface.
 */
export interface GovernorSessionSpec {
  /** Total session length in minutes. */
  durationMin: number;
  /** Maximum digital gain in dBFS (<= 0; more negative = quieter). */
  gainDbFs: number;
  /** Low-pass filter cutoff in Hz, if the signal chain applies one. */
  lowpassHz?: number;
  /** Whether the session stops automatically (mandatory for infants). */
  autoShutoff?: boolean;
  /** Heartbeat pulse rate in BPM, if the session renders heartbeat content. */
  heartbeatBpm?: number;
  /** Estimated level at the listener's ear in dBA, if known/calibrated. */
  targetDbA?: number;
}

export interface GovernorConfig {
  /** Hard session-length cap in minutes (default 90). */
  maxSessionMin: number;
  /** Digital gain cap in dBFS (default -6). */
  maxGainDbFs: number;
  /** Enable infant-mode constraints. */
  infantMode: boolean;
  /** User must acknowledge the driving/machinery warning before sessions. */
  drivingWarningAcknowledged: boolean;
}

export const DEFAULT_GOVERNOR_CONFIG: GovernorConfig = {
  maxSessionMin: 90,
  maxGainDbFs: -6,
  infantMode: false,
  drivingWarningAcknowledged: false,
};

export interface AuthorizationResult {
  ok: boolean;
  reasons: string[];
}

export interface PanicSequenceStep {
  /** Duration of this step in seconds. */
  durationSec: number;
  /** Linear gain at the start of the step (1 = unity). */
  fromGainLinear: number;
  /** Linear gain at the end of the step. */
  toGainLinear: number;
}

export interface PanicSequence {
  /** Attention/tremolo pulse rate during the fade, Hz. */
  pulseHz: number;
  /** Total wall-clock time of the sequence, seconds. */
  totalSec: number;
  steps: PanicSequenceStep[];
  /** Final linear gain — always 0 (full silence). */
  endGainLinear: number;
}

export interface AdvisoryTexts {
  medication: string;
  seizure: string;
  driving: string;
  crisis: string;
}

export class SafetyGovernor {
  readonly config: GovernorConfig;

  constructor(config: Partial<GovernorConfig> = {}) {
    this.config = { ...DEFAULT_GOVERNOR_CONFIG, ...config };
  }

  authorizeSession(spec: GovernorSessionSpec): AuthorizationResult {
    const reasons: string[] = [];
    const c = this.config;

    if (!Number.isFinite(spec.durationMin) || spec.durationMin <= 0) {
      reasons.push('Session duration must be a positive number of minutes.');
    }
    if (!Number.isFinite(spec.gainDbFs)) {
      reasons.push('Gain must be a finite dBFS value.');
    }

    // Driving/operating-machinery acknowledgment gate (all sessions).
    if (!c.drivingWarningAcknowledged) {
      reasons.push(
        'Driving/operating-machinery warning has not been acknowledged. ' +
          'Never use while driving or operating machinery (listening can impair task performance).',
      );
    }

    // General constraints.
    if (Number.isFinite(spec.durationMin) && spec.durationMin > c.maxSessionMin) {
      reasons.push(`Session exceeds the ${c.maxSessionMin}-minute limit (${spec.durationMin} min requested).`);
    }
    if (Number.isFinite(spec.gainDbFs) && spec.gainDbFs > c.maxGainDbFs) {
      reasons.push(`Gain ${spec.gainDbFs} dBFS exceeds the ${c.maxGainDbFs} dBFS cap.`);
    }

    // Infant-mode constraints (AAP crib guidance / NICU ceilings).
    if (c.infantMode) {
      if (spec.lowpassHz === undefined) {
        reasons.push('Infant mode requires a low-pass filter at or below 1000 Hz.');
      } else if (!Number.isFinite(spec.lowpassHz) || spec.lowpassHz > INFANT_MAX_LOWPASS_HZ) {
        reasons.push(`Infant low-pass must be <= ${INFANT_MAX_LOWPASS_HZ} Hz (got ${spec.lowpassHz} Hz).`);
      }

      if (spec.targetDbA === undefined) {
        reasons.push(
          `Infant mode requires a calibrated output target of <= ${INFANT_CEILING_DBA} dBA at the crib.`,
        );
      } else if (!Number.isFinite(spec.targetDbA) || spec.targetDbA > INFANT_CEILING_DBA) {
        reasons.push(
          `Infant gain path targets ${spec.targetDbA} dBA, above the ${INFANT_CEILING_DBA} dBA crib ceiling.`,
        );
      }

      if (spec.autoShutoff !== true) {
        reasons.push('Infant mode requires an automatic shutoff timer.');
      }

      if (Number.isFinite(spec.durationMin) && spec.durationMin > INFANT_MAX_SESSION_MIN) {
        reasons.push(`Infant sessions are limited to ${INFANT_MAX_SESSION_MIN} minutes.`);
      }

      if (spec.heartbeatBpm !== undefined) {
        const bpm = spec.heartbeatBpm;
        if (
          !Number.isFinite(bpm) ||
          bpm < INFANT_HEARTBEAT_BPM_MIN ||
          bpm > INFANT_HEARTBEAT_BPM_MAX
        ) {
          reasons.push(
            `Infant heartbeat content must be ${INFANT_HEARTBEAT_BPM_MIN}-${INFANT_HEARTBEAT_BPM_MAX} BPM (maternal resting range); got ${bpm}.`,
          );
        }
      }
    }

    return { ok: reasons.length === 0, reasons };
  }

  /**
   * Panic-stop sequence spec: immediate attention pulse at 10 Hz with a
   * <= 2.5 s fade that always ends in full silence.
   */
  panicSequence(): PanicSequence {
    return {
      pulseHz: 10,
      totalSec: 2.0,
      steps: [
        { durationSec: 0.5, fromGainLinear: 1, toGainLinear: 0.5 },
        { durationSec: 1.5, fromGainLinear: 0.5, toGainLinear: 0 },
      ],
      endGainLinear: 0,
    };
  }

  /**
   * Precautionary advisory copy. Wording rules (evidence-anchored):
   *   - Medication: NO peer-reviewed evidence exists for SSRI/MAOI/stimulant/
   *     psychedelic x audio-entrainment interactions (PubMed 2026: zero results).
   *     Word as a precaution ("consult your clinician"), never as a mechanism.
   *   - Seizure: rhythmic sound can trigger seizures in predisposed people;
   *     users with seizure disorders are excluded as a precaution.
   *   - Crisis: 988 Suicide & Crisis Lifeline (US, call/text/chat) plus an
   *     international directory note.
   */
  advisoryTexts(): AdvisoryTexts {
    return {
      medication:
        'Precaution: no studies have found interactions between audio sessions and ' +
        'psychiatric medications (SSRIs, MAOIs, stimulants) or psychedelics, and no ' +
        'pharmacological interaction mechanism is known. As a conservative precaution, ' +
        'if you take psychiatric medication, use psychedelics, are pregnant, or have a ' +
        'neurological or psychiatric condition, please consult your clinician before use.',
      seizure:
        'Seizure-disorder notice: rhythmic sound can trigger seizures in some ' +
        'predisposed individuals. If you have epilepsy or any history of seizures, do ' +
        'not use this app and consult your physician. This product is audio-only; no ' +
        'flashing visuals are used.',
      driving:
        'Never use while driving or operating machinery. Research has shown that ' +
        'listening to binaural-beat audio can temporarily impair task performance.',
      crisis:
        'If you are in emotional distress or crisis, help is available now. US: call or ' +
        'text 988 (Suicide & Crisis Lifeline) or chat via 988lifeline.org. Outside the ' +
        'US: find local lines at findahelpline.com. In an emergency, call your local ' +
        'emergency number (911 in the US). This app is not a substitute for professional care.',
    };
  }
}
