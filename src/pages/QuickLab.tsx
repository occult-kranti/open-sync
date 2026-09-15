/**
 * Quick Lab (S20.1) — the blinded n-of-1 self-experiment runner.
 *
 * Flow: pick a protocol → screening/opt-in → seeded, block-randomized
 * schedule (seed logged). Each session plays the assigned arm through the
 * session engine WITHOUT revealing it (only an opaque condition code is
 * shown); post-session sliders + an optional 60 s reaction tap test feed the
 * log. Results render only as n + estimate + 95% CI with honesty gates.
 * Every session is debited against the WHO-ITU H.870 dose tracker (via the
 * SessionContext clock); a session is refused when the weekly dose is spent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyze,
  armToPlay,
  blindedView,
  defaultStorage,
  enroll,
  loadEnrollments,
  median,
  nextSessionIndex,
  recordSession,
  revealSchedule,
  saveEnrollments,
  upsertEnrollment,
  type Enrollment,
  type SessionRecord,
} from '@/quicklab/engine';
import { getProtocol, PROTOCOLS, PROTOCOL_CITATIONS } from '@/quicklab/protocols';
import type { ArmSpec, QuickLabProtocol } from '@/quicklab/types';
import { useSession } from '@/ui/session/SessionContext';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { ResearchPage, Section } from '@/research/components/common';
import type { NoiseColor } from '@/engine';

const NOISE_COLORS: NoiseColor[] = ['white', 'pink', 'brown', 'blue', 'violet', 'grey'];

const levelToDb = (level: number) => 20 * Math.log10(Math.max(level, 1e-6));

// ---------------------------------------------------------------------------
// Reaction tap test (optional, 60 s simple-reaction probe)
// ---------------------------------------------------------------------------

function TapTest({ onDone }: { onDone: (r: { taps: number; medianMs: number } | null) => void }) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'flash' | 'done'>('idle');
  const [rts, setRts] = useState<number[]>([]);
  const timers = useRef<number[]>([]);
  const flashAt = useRef(0);
  const startedAt = useRef(0);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const scheduleFlash = useCallback(() => {
    const remaining = 60_000 - (performance.now() - startedAt.current);
    if (remaining <= 1500) {
      setPhase('done');
      return;
    }
    // Never schedule a flash past the 60 s window: the timer itself enforces
    // the end so the test cannot hang in 'flash' if the user walks away.
    const delay = Math.min(1500 + Math.random() * 2000, remaining);
    timers.current.push(
      window.setTimeout(() => {
        if (performance.now() - startedAt.current >= 60_000) {
          setPhase('done');
          return;
        }
        flashAt.current = performance.now();
        setPhase('flash');
      }, delay),
    );
  }, []);

  const begin = () => {
    startedAt.current = performance.now();
    setRts([]);
    setPhase('waiting');
    scheduleFlash();
  };

  const tap = () => {
    if (phase === 'flash') {
      const rt = performance.now() - flashAt.current;
      setRts((cur) => [...cur, Math.round(rt)]);
      setPhase('waiting');
      scheduleFlash();
    }
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (phase !== 'done') return;
    if (rts.length === 0) {
      onDone(null);
      return;
    }
    onDone({ taps: rts.length, medianMs: Math.round(median(rts)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="panel" data-testid="tap-test">
      <div className="t-label mb-2" style={{ color: 'var(--text-3)' }}>
        OPTIONAL · 60 s REACTION TAP TEST
      </div>
      {phase === 'idle' && (
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" onClick={begin}>
            Start tap test
          </button>
          <button type="button" className="btn-secondary" onClick={() => onDone(null)}>
            Skip
          </button>
        </div>
      )}
      {(phase === 'waiting' || phase === 'flash') && (
        <button
          type="button"
          onClick={tap}
          className="flex h-32 w-full items-center justify-center rounded-sm"
          style={{
            background: phase === 'flash' ? 'var(--amber)' : 'var(--ink-4)',
            color: phase === 'flash' ? 'var(--text-inv)' : 'var(--text-3)',
            border: '1px solid var(--line-2)',
          }}
        >
          <span className="t-label">{phase === 'flash' ? 'TAP NOW' : `WAIT… · ${rts.length} taps`}</span>
        </button>
      )}
      {phase === 'done' && (
        <p className="t-label" style={{ color: 'var(--teal-hi)' }} data-testid="tap-test-done">
          {rts.length > 0
            ? `LOGGED · ${rts.length} TAPS · MEDIAN ${Math.round(median(rts))} MS`
            : 'DONE · NO TAPS RECORDED'}
        </p>
      )}
      <p className="t-caption mt-2" style={{ color: 'var(--text-3)' }}>
        Tap the pad the moment it turns amber. Runs for 60 seconds; your median reaction time is logged
        alongside the session.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider input for 1–7 style scales
// ---------------------------------------------------------------------------

function ScaleInput({
  scaleId,
  value,
  onChange,
  protocol,
}: {
  scaleId: string;
  value: number | null;
  onChange: (v: number) => void;
  protocol: QuickLabProtocol;
}) {
  const scale = protocol.outcomeScales.find((s) => s.id === scaleId)!;
  return (
    <div>
      <div className="t-label mb-1 flex justify-between" style={{ color: 'var(--text-2)' }}>
        <span>{scale.label}</span>
        <span className="font-mono2" style={{ color: value === null ? 'var(--text-3)' : 'var(--amber)' }}>
          {value === null ? '—' : value}
        </span>
      </div>
      <input
        type="range"
        min={scale.min}
        max={scale.max}
        step={1}
        value={value ?? scale.min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#D9A441]"
        aria-label={scale.label}
      />
      <div className="t-caption flex justify-between" style={{ color: 'var(--text-3)' }}>
        <span>{scale.lowAnchor}</span>
        <span>{scale.highAnchor}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuickLab() {
  const session = useSession();
  const storage = useMemo(() => defaultStorage(), []);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => loadEnrollments(storage));
  const [selectedId, setSelectedId] = useState<string>(PROTOCOLS[0].id);
  const [screening, setScreening] = useState<Record<string, boolean>>({});
  // Post-session rating flow state.
  const [pending, setPending] = useState<{ startedAt: string; scales: Record<string, number>; tapDone: boolean } | null>(null);
  const [tapResult, setTapResult] = useState<{ taps: number; medianMs: number } | null>(null);
  const [browsing, setBrowsing] = useState(false);

  const active = enrollments.find((e) => !e.completedAt) ?? enrollments[enrollments.length - 1] ?? null;
  const activeProtocol = active ? getProtocol(active.protocolId) ?? null : null;
  const analysis = active && activeProtocol ? analyze(activeProtocol, active) : null;
  const overDose = session.dosePercent >= 100;

  const persist = useCallback(
    (e: Enrollment) => setEnrollments(upsertEnrollment(storage, e)),
    [storage],
  );

  const beginEnrollment = (p: QuickLabProtocol) => {
    const answers = p.screening.map((s) => ({ id: s.id, answer: Boolean(screening[s.id]) }));
    persist(enroll(p, { screening: answers }));
    setScreening({});
    setBrowsing(false);
  };

  /** Configure the session engine for the assigned arm — identity never displayed. */
  const startSession = () => {
    if (!active || !activeProtocol || overDose || session.running) return;
    const slot = armToPlay(active);
    if (!slot) return;
    const arm: ArmSpec = activeProtocol.arms[slot.armIndex];
    const ph = arm.phases[0];
    const carrier = arm.channelSwap ? ph.carrierHz + ph.beatHz : ph.carrierHz;
    const beat = arm.channelSwap ? -ph.beatHz : ph.beatHz;
    session.setMode(ph.mode);
    session.setCarrierHz(carrier);
    session.setPhases([{ id: 'ql-1', durationSec: ph.durationSec, beatHz: beat }]);
    for (const c of NOISE_COLORS) session.setNoiseDb(c, -Infinity);
    if (ph.noise) session.setNoiseDb(ph.noise.color, levelToDb(ph.noise.level));
    session.setVolumeDb(ph.gainDb);
    session.setLimitMin(Math.ceil(ph.durationSec / 60) + 1);
    session.start();
    setPending({ startedAt: new Date().toISOString(), scales: {}, tapDone: false });
    setTapResult(null);
  };

  const endSession = () => {
    session.stop();
  };

  const submitRatings = () => {
    if (!active || !activeProtocol || !pending) return;
    const rec: Omit<SessionRecord, 'code' | 'day'> = {
      startedAt: pending.startedAt,
      completedAt: new Date().toISOString(),
      scales: pending.scales,
      tapTest: tapResult ?? undefined,
      // The SessionContext clock debits the H.870 tracker every running second.
      doseDebited: true,
    };
    persist(recordSession(active, rec));
    setPending(null);
    setTapResult(null);
  };

  const discardEnrollment = (e: Enrollment) => {
    const rest = enrollments.filter((x) => !(x.protocolId === e.protocolId && x.createdAt === e.createdAt));
    saveEnrollments(storage, rest);
    setEnrollments(rest);
  };

  const running = session.running && pending !== null;
  const nextIdx = active ? nextSessionIndex(active) : null;
  const view = active ? blindedView(active) : null;
  const selected = getProtocol(selectedId) ?? PROTOCOLS[0];
  const screeningOk = selected.screening.every((s) => screening[s.id]);

  return (
    <ResearchPage
      crumb="LAB / QUICK LAB"
      title="Quick Lab"
      lede="Blinded n-of-1 self-experiments on your own audio response. You pick a question; the app fixes a seeded, block-randomized schedule, plays each session without telling you which condition it is, and reports only an estimate with a confidence interval. Results about you are associations under self-blinding — never proof of cause."
    >
      {/* ---- dose gate ---------------------------------------------------- */}
      {overDose && (
        <div
          role="alert"
          className="mb-4 rounded-sm px-4 py-3"
          style={{ background: 'var(--ink-2)', border: '1px solid var(--danger)' }}
        >
          <span className="t-label" style={{ color: 'var(--danger-hi)' }}>
            SESSION REFUSED — WEEKLY SOUND DOSE EXHAUSTED
          </span>
          <p className="t-body-sm mt-1" style={{ color: 'var(--text-2)' }}>
            Your WHO-ITU H.870 weekly allowance is fully used. Quick Lab sessions are refused until the
            7-day window resets. Safety outranks data.
          </p>
        </div>
      )}

      {/* ---- enrollment ---------------------------------------------------- */}
      {(!active || browsing) && (
        <Section title="Choose a self-experiment">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {PROTOCOLS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="panel text-left"
                style={{
                  borderColor: selectedId === p.id ? 'var(--amber)' : 'var(--line-1)',
                }}
              >
                <div className="t-label mb-1 flex items-center justify-between" style={{ color: 'var(--text-3)' }}>
                  <span>
                    {p.hypothesisId}
                    {p.registryLinks.length > 0 ? ` · links ${p.registryLinks.join(', ')}` : ''}
                  </span>
                  <span className="font-mono2">{p.minSessions}+ sessions</span>
                </div>
                <div className="t-h3">{p.title}</div>
                <p className="t-body-sm mt-2" style={{ color: 'var(--text-2)' }}>
                  {p.question}
                </p>
                <p className="t-caption mt-2" style={{ color: 'var(--text-3)' }}>
                  {p.priorityNote}
                </p>
              </button>
            ))}
          </div>

          {/* screening */}
          <div className="panel mt-6">
            <div className="t-label mb-3" style={{ color: 'var(--text-3)' }}>
              SCREENING &amp; OPT-IN · {selected.id} · safety class {selected.safetyClass}
            </div>
            <p className="t-body-sm mb-4" style={{ color: 'var(--text-2)' }}>
              {selected.mundaneModel}
            </p>
            <div className="space-y-3">
              {selected.screening.map((s) => (
                <label key={s.id} className="t-body-sm flex items-start gap-3" style={{ color: 'var(--text-1)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(screening[s.id])}
                    onChange={(e) => setScreening((cur) => ({ ...cur, [s.id]: e.target.checked }))}
                    className="mt-1 accent-[#D9A441]"
                  />
                  {s.prompt}
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="button" className="btn-primary" disabled={!screeningOk} onClick={() => beginEnrollment(selected)}>
                Enroll — fix my seeded schedule
              </button>
              <span className="t-caption" style={{ color: 'var(--text-3)' }}>
                {selected.powerNote}
              </span>
            </div>
          </div>
        </Section>
      )}

      {/* ---- active enrollment -------------------------------------------- */}
      {active && activeProtocol && view && !browsing && (
        <>
          <Section
            title={`${activeProtocol.title} · session ${Math.min(view.sessions.length + 1, active.plannedSessions)} of ${active.plannedSessions}`}
            aside={
              <span className="font-mono2 text-[12px]" style={{ color: 'var(--text-3)' }}>
                seed {active.seed.toString(16)} · {activeProtocol.blinding} blinding
              </span>
            }
          >
            <div className="panel">
              <div className="t-label mb-2" style={{ color: 'var(--text-3)' }}>
                PROGRESS · {view.sessions.length}/{activeProtocol.minSessions} sessions to unlock an estimate
              </div>
              <div className="h-2 w-full" style={{ background: 'var(--ink-4)' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (100 * view.sessions.length) / activeProtocol.minSessions)}%`,
                    background: 'var(--amber)',
                  }}
                />
              </div>

              {!running && !pending && nextIdx !== null && (
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={overDose || session.running}
                    onClick={startSession}
                  >
                    Start session {view.codes[nextIdx]}
                  </button>
                  <span className="t-caption" style={{ color: 'var(--text-3)' }}>
                    {activeProtocol.sessionMinutes} min · plays one of {activeProtocol.arms.length} blinded
                    conditions — you will not be told which · dose {session.dosePercent.toFixed(2)}% of weekly
                    {session.running && ' · stop the playing session first'}
                  </span>
                </div>
              )}

              {running && (
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <span className="t-readout-md font-mono2" style={{ color: 'var(--amber)' }}>
                    {Math.floor(session.elapsedSec / 60)}:{String(session.elapsedSec % 60).padStart(2, '0')}
                  </span>
                  <span className="t-body-sm" style={{ color: 'var(--text-2)' }}>
                    Session playing. Rate it only after it ends.
                  </span>
                  <button type="button" className="btn-secondary" onClick={endSession}>
                    End session &amp; rate
                  </button>
                </div>
              )}

              {nextIdx === null && !active.completedAt && (
                <p className="t-body-sm mt-4" style={{ color: 'var(--text-2)' }}>
                  Schedule exhausted.
                </p>
              )}

              <button
                type="button"
                className="t-label mt-6"
                style={{ color: 'var(--danger-hi)' }}
                onClick={() => discardEnrollment(active)}
              >
                Discard enrollment &amp; delete log
              </button>
            </div>
          </Section>

          {/* ---- post-session rating --------------------------------------- */}
          {pending && !running && (
            <Section title="Rate this session">
              <div className="panel space-y-5">
                {activeProtocol.outcomeScales.map((s) => (
                  <ScaleInput
                    key={s.id}
                    scaleId={s.id}
                    protocol={activeProtocol}
                    value={pending.scales[s.id] ?? null}
                    onChange={(v) =>
                      setPending((cur) => (cur ? { ...cur, scales: { ...cur.scales, [s.id]: v } } : cur))
                    }
                  />
                ))}
                {activeProtocol.tapTest && (
                  <TapTest
                    onDone={(r) => {
                      setTapResult(r);
                      setPending((cur) => (cur ? { ...cur, tapDone: true } : cur));
                    }}
                  />
                )}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!activeProtocol.outcomeScales.every((s) => typeof pending.scales[s.id] === 'number')}
                  onClick={submitRatings}
                >
                  Log session
                </button>
              </div>
            </Section>
          )}

          {/* ---- results ---------------------------------------------------- */}
          {analysis && (
            <Section
              title="Your estimate"
              aside={<InfoPopover featureId="quicklab-selftest" label="About the estimate panel" />}
            >
              <div className="panel">
                <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono2 text-[13px]" style={{ color: 'var(--text-2)' }}>
                  <span>
                    n = <span style={{ color: 'var(--text-1)' }}>{analysis.n.total}</span>
                  </span>
                  <span>
                    estimate ={' '}
                    <span style={{ color: 'var(--amber)' }}>
                      {analysis.meanDiff === null ? '—' : analysis.meanDiff.toFixed(2)}
                    </span>
                  </span>
                  <span>
                    95% CI{' '}
                    <span style={{ color: 'var(--amber)' }}>
                      {analysis.ci95 ? `[${analysis.ci95[0].toFixed(2)}, ${analysis.ci95[1].toFixed(2)}]` : '[—, —]'}
                    </span>
                  </span>
                  <span className="t-label" style={{ color: analysis.state === 'signal' ? 'var(--grade-A)' : 'var(--text-3)' }}>
                    {analysis.state.toUpperCase()}
                  </span>
                </div>
                <p className="t-body-sm mt-3" style={{ color: 'var(--text-2)' }}>
                  {analysis.text}
                </p>

                {active.completedAt && (
                  <div className="mt-6">
                    <button type="button" className="btn-secondary mb-4" onClick={() => setBrowsing(true)}>
                      Start a new experiment
                    </button>
                    <div className="t-label mb-2" style={{ color: 'var(--teal)' }}>
                      REVEALED — protocol complete
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                          <th className="t-label px-2 py-1" style={{ color: 'var(--text-3)' }}>Session</th>
                          <th className="t-label px-2 py-1" style={{ color: 'var(--text-3)' }}>Code</th>
                          <th className="t-label px-2 py-1" style={{ color: 'var(--text-3)' }}>Condition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revealSchedule(active).map((r, i) => (
                          <tr key={r.code} style={{ borderBottom: '1px solid var(--line-1)' }}>
                            <td className="font-mono2 px-2 py-1 text-[12px]" style={{ color: 'var(--text-2)' }}>
                              {i + 1} · {active.sessions[i]?.day ?? '—'}
                            </td>
                            <td className="font-mono2 px-2 py-1 text-[12px]" style={{ color: 'var(--text-3)' }}>
                              {r.code}
                            </td>
                            <td className="t-body-sm px-2 py-1" style={{ color: 'var(--text-1)' }}>
                              {activeProtocol.arms[r.armIndex].description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="t-caption mt-3" style={{ color: 'var(--text-3)' }}>
                      Arm construction notes:{' '}
                      {activeProtocol.arms.map((a) => a.constructionNote).join(' · ')}
                    </p>
                  </div>
                )}

                {(PROTOCOL_CITATIONS[activeProtocol.id] ?? []).length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {(PROTOCOL_CITATIONS[activeProtocol.id] ?? []).map((c) => (
                      <li key={c.label} className="t-caption font-mono2" style={{ color: 'var(--text-3)' }}>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal-hi)' }}>
                            {c.label} ↗{c.confidence ? ` [confidence: ${c.confidence}]` : ''}
                          </a>
                        ) : (
                          `${c.label}${c.confidence ? ` [confidence: ${c.confidence}]` : ''}`
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </ResearchPage>
  );
}
