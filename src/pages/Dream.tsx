/**
 * Sleep & Dream Lab (Swarm W7, design.md idioms).
 *
 * Tiered technique cards (1 validated / 2 honest labels / 3 why-we-don't),
 * dream journal (localStorage), reality-check reminder scheduler, night-plan
 * visualizer (bedtime → WBTB → TLR cue windows), TLR cue preview, and the
 * safety rails surfaced as first-class UI. Claim discipline: techniques
 * "support the practice of" lucid dreaming — nothing here "induces" it.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BookOpen, Moon, Play, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { Chip, Panel, WarningChip } from '@/ui/components/primitives';
import { useSession } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  REALITY_CHECK,
  TLR_CUE,
  dreamProtocolsByTier,
  type DreamProtocol,
  type ScreeningAnswers,
} from '@/dream/protocols';
import {
  WBTB_WEEKLY_CAP,
  fmtMin,
  parseBedtime,
  planNight,
  realityCheckSchedule,
  wbtbWeeklyGate,
  type NightPlan,
} from '@/dream/scheduler';
import {
  addEntry,
  createEntry,
  loadJournal,
  lucidRate,
  removeEntry,
  saveJournal,
  type DreamJournalEntry,
} from '@/dream/journal';
import { renderTlrCue } from '@/dream/cue';

const WBTB_STORAGE_KEY = 'open-sync.wbtb-nights.v1';
const RC_STORAGE_KEY = 'open-sync.reality-check.v1';

const storage = (): Storage | null => (typeof window === 'undefined' ? null : window.localStorage);

// ---------------------------------------------------------------------------
// Technique card
// ---------------------------------------------------------------------------

function ProtocolCard({ p }: { p: DreamProtocol }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="panel"
      style={{
        padding: 20,
        borderLeft:
          p.tier === 3 ? '3px solid var(--danger)' : p.tier === 2 ? '3px solid var(--amber)' : '3px solid var(--teal)',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="t-label text-3">TIER {p.tier} · {p.safetyClass.toUpperCase()}</span>
        <GradeBadge
          grade={p.grade}
          minus={p.gradeMinus}
          citation={
            p.citations[0]
              ? { verdict: p.citations[0].verdict, summary: p.citations[0].summary, source: p.citations[0].source }
              : undefined
          }
        />
      </div>
      <h3 className="t-h3">{p.name}</h3>
      <p className="t-body-sm" style={{ color: 'var(--amber)', margin: '4px 0 8px' }}>
        {p.tagline}
      </p>
      <p className="t-body-sm text-2">{p.description}</p>
      {p.expected && (
        <p className="t-caption font-mono2 text-3" style={{ marginTop: 8 }}>
          EXPECTED · {p.expected}
        </p>
      )}
      {p.whyWeDont && (
        <div
          className="t-body-sm"
          style={{
            borderLeft: '2px solid var(--danger)',
            background: 'var(--ink-0)',
            padding: 12,
            marginTop: 12,
            color: 'var(--text-2)',
          }}
        >
          <span className="t-label" style={{ color: 'var(--danger)' }}>WHY WE DON’T DO THIS · </span>
          {p.whyWeDont}
        </div>
      )}
      {p.culturalOnly && (
        <div style={{ marginTop: 10 }}>
          <WarningChip tone="amber">Cultural / historical content only — never a validated capability</WarningChip>
        </div>
      )}
      {p.safetyNotes.length > 0 && (
        <div className="flex flex-col gap-1" style={{ marginTop: 12 }}>
          {p.safetyNotes.map((n) => (
            <span key={n} className="t-caption text-3 flex items-start gap-2">
              <ShieldAlert size={11} style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
              {n}
            </span>
          ))}
        </div>
      )}
      {p.steps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="chip" style={{ height: 22, padding: '0 8px' }} onClick={() => setOpen((v) => !v)}>
            {open ? 'HIDE PROTOCOL' : 'SHOW PROTOCOL'}
          </button>
          {open && (
            <ol className="flex flex-col gap-2" style={{ marginTop: 10, paddingLeft: 18 }}>
              {p.steps.map((s, i) => (
                <li key={i} className="t-body-sm text-2" style={{ listStyle: 'decimal' }}>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {p.citations.map((c) => (
        <p key={c.source} className="t-caption font-mono2 text-3" style={{ marginTop: 6 }}>
          ▸ {c.source}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safety screening (screen-and-advise rail)
// ---------------------------------------------------------------------------

const SCREEN_ITEMS: { key: keyof ScreeningAnswers; label: string }[] = [
  { key: 'insomnia', label: 'Insomnia / trouble maintaining sleep' },
  { key: 'psychosisSpectrum', label: 'Psychosis-spectrum condition' },
  { key: 'dissociative', label: 'Dissociative / derealization-prone' },
  { key: 'nightmareDisorder', label: 'Nightmare disorder / PTSD' },
];

function ScreeningPanel({ value, onChange }: { value: ScreeningAnswers; onChange: (s: ScreeningAnswers) => void }) {
  return (
    <Panel title="SAFETY SCREEN — CHECK WHAT APPLIES" pad>
      <div className="flex flex-wrap gap-2">
        {SCREEN_ITEMS.map((it) => (
          <Chip
            key={it.key}
            active={value[it.key]}
            danger={value[it.key]}
            onClick={() => onChange({ ...value, [it.key]: !value[it.key] })}
          >
            {it.label.toUpperCase()}
          </Chip>
        ))}
      </div>
      <p className="t-caption text-3" style={{ marginTop: 10 }}>
        Answers stay on this device and only adjust advisories below. Sleep-paralysis pre-education (Tier 1)
        is mandatory reading before any deep-sleep protocol. ~80% of lucid dreamers report no negative
        effects (Stumbrys 2024) — the rails exist for the other 20%.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Night plan visualizer
// ---------------------------------------------------------------------------

function NightPlanPanel({ screening }: { screening: ScreeningAnswers }) {
  const isMobile = useIsMobile();
  const [bedRaw, setBedRaw] = useState('23:00');
  const [wbtbOn, setWbtbOn] = useState(true);
  const [tlrOn, setTlrOn] = useState(true);
  const [wbtbDates, setWbtbDates] = useState<string[]>(() => {
    try {
      return JSON.parse(storage()?.getItem(WBTB_STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const [committed, setCommitted] = useState(false);

  const bedtimeMin = parseBedtime(bedRaw);
  const plan: NightPlan | null = useMemo(
    () =>
      bedtimeMin === null
        ? null
        : planNight({ bedtimeMin, includeWbtb: wbtbOn, includeTlr: tlrOn, screening }),
    [bedtimeMin, wbtbOn, tlrOn, screening],
  );

  const gate = useMemo(
    () => wbtbWeeklyGate(wbtbDates.map((d) => new Date(`${d}T12:00:00`)), new Date()),
    [wbtbDates],
  );

  // Local calendar day — NOT toISOString() (UTC): near midnight the UTC date
  // is already tomorrow, which would double-count or mis-file the commit.
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  // A reload resets `committed`; the stored dates are the source of truth.
  const committedToday = committed || wbtbDates.includes(todayKey);

  const commitWbtb = () => {
    if (!gate.ok || committedToday) return;
    const next = [...wbtbDates, todayKey];
    setWbtbDates(next);
    storage()?.setItem(WBTB_STORAGE_KEY, JSON.stringify(next));
    setCommitted(true);
  };

  const totalRel = plan ? plan.wakeTime.relMin : 1;
  // On mobile the plan runs top (bedtime) → bottom (wake) instead of left → right.
  const bar = (startRel: number, endRel: number, color: string, label: string, title?: string) => (
    <div
      key={label + startRel}
      title={title ?? label}
      style={
        isMobile
          ? {
              position: 'absolute',
              top: `${(startRel / totalRel) * 100}%`,
              height: `${((endRel - startRel) / totalRel) * 100}%`,
              left: 0,
              right: 0,
              background: color,
              borderRadius: 2,
            }
          : {
              position: 'absolute',
              left: `${(startRel / totalRel) * 100}%`,
              width: `${((endRel - startRel) / totalRel) * 100}%`,
              top: 0,
              bottom: 0,
              background: color,
              borderRadius: 2,
            }
      }
    />
  );

  return (
    <Panel title="NIGHT PLAN — BEDTIME → WBTB → CUE WINDOWS" right={<InfoPopover featureId="lucid-dream-cues" label="About the night plan" />} pad>
      <div className="flex items-end flex-wrap gap-4" style={{ marginBottom: 16 }}>
        <label className="t-label text-3">
          BEDTIME
          <input
            value={bedRaw}
            onChange={(e) => setBedRaw(e.target.value)}
            className="font-mono2"
            placeholder="23:00"
            style={{
              display: 'block',
              marginTop: 4,
              background: 'var(--ink-0)',
              border: `1px solid ${bedtimeMin === null ? 'var(--danger)' : 'var(--line-2)'}`,
              borderRadius: 2,
              color: 'var(--text-1)',
              padding: '6px 10px',
              width: 110,
              fontSize: 14,
            }}
          />
        </label>
        <Chip active={wbtbOn} onClick={() => setWbtbOn((v) => !v)}>WBTB {wbtbOn ? 'ON' : 'OFF'}</Chip>
        <Chip active={tlrOn} onClick={() => setTlrOn((v) => !v)}>TLR CUES {tlrOn ? 'ON' : 'OFF'}</Chip>
        <span className="t-readout-sm text-2">
          WBTB THIS WEEK · {gate.count}/{WBTB_WEEKLY_CAP}
        </span>
        {wbtbOn && !screening.insomnia && (
          <button
            type="button"
            className="chip"
            disabled={!gate.ok || committedToday}
            style={{
              borderColor: gate.ok ? 'rgba(79,140,130,0.5)' : 'rgba(196,99,79,0.6)',
              color: gate.ok ? 'var(--teal-hi)' : 'var(--danger)',
              opacity: committedToday ? 0.5 : 1,
            }}
            onClick={commitWbtb}
          >
            {committedToday ? 'COMMITTED ✓' : gate.ok ? 'COMMIT WBTB TONIGHT' : 'CAP REACHED'}
          </button>
        )}
      </div>

      {bedtimeMin === null && (
        <WarningChip tone="danger">Invalid bedtime — use HH:MM (24 h) or e.g. “11:30 pm”.</WarningChip>
      )}

      {plan && (
        <>
          <div
            style={{
              position: 'relative',
              height: isMobile ? 260 : 44,
              width: isMobile ? 56 : undefined,
              background: 'var(--ink-0)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {/* base sleep bar */}
            {bar(plan.sleepOnset.relMin, plan.wakeTime.relMin, 'rgba(79,140,130,0.15)', 'sleep')}
            {/* REM-rich last third */}
            {bar(plan.sleepOnset.relMin + (plan.wakeTime.relMin - plan.sleepOnset.relMin) * (2 / 3), plan.wakeTime.relMin, 'rgba(148,136,168,0.25)', 'rem', 'REM-rich last third of the night')}
            {/* WBTB wake window */}
            {plan.wbtb && bar(plan.wbtb.alarm.relMin, plan.wbtb.backToBed.relMin, 'rgba(217,164,65,0.55)', 'wbtb', `WBTB wake window (${plan.wbtb.awakeWindowMin} min)`)}
            {/* TLR cue window */}
            {plan.tlr && bar(plan.tlr.windowStart.relMin, plan.tlr.windowEnd.relMin, 'rgba(79,140,130,0.6)', 'tlr', 'TLR cue replay window (inside REM-rich window)')}
          </div>
          {/* legend — tap-visible equivalent of the bar title tooltips */}
          <div className="t-caption text-3 flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: 8 }}>
            <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(79,140,130,0.15)', border: '1px solid var(--line-1)' }} /> SLEEP</span>
            <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(148,136,168,0.25)', border: '1px solid var(--line-1)' }} /> REM-RICH LAST THIRD</span>
            {plan.wbtb && <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(217,164,65,0.55)' }} /> WBTB WAKE WINDOW</span>}
            {plan.tlr && <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(79,140,130,0.6)' }} /> TLR CUE REPLAY</span>}
          </div>
          <div className="t-readout-sm text-2 flex flex-wrap gap-x-6 gap-y-1" style={{ marginTop: 10 }}>
            <span>BED {fmtMin(plan.bedtime.absMin)}</span>
            <span>ONSET ~{fmtMin(plan.sleepOnset.absMin)}</span>
            {plan.wbtb && <span style={{ color: 'var(--amber)' }}>WBTB ALARM {fmtMin(plan.wbtb.alarm.absMin)} → BACK {fmtMin(plan.wbtb.backToBed.absMin)}</span>}
            {plan.tlr && <span style={{ color: 'var(--teal-hi)' }}>TLR CUES {fmtMin(plan.tlr.windowStart.absMin)}–{fmtMin(plan.tlr.windowEnd.absMin)}</span>}
            <span>WAKE {fmtMin(plan.wakeTime.absMin)}</span>
          </div>
          <div className="flex flex-col gap-1" style={{ marginTop: 10 }}>
            {!gate.ok && <WarningChip tone="danger">{gate.warning}</WarningChip>}
            {plan.warnings.map((w) => (
              <WarningChip key={w} tone={w.startsWith('Screening') ? 'danger' : 'amber'}>{w}</WarningChip>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// TLR cue preview
// ---------------------------------------------------------------------------

function TlrCuePanel() {
  const { engineRef } = useSession();
  const [played, setPlayed] = useState(false);
  const play = () => {
    const buf = renderTlrCue(48000);
    engineRef.current.playBuffer(buf.left, buf.right, 48000, -20);
    setPlayed(true);
    window.setTimeout(() => setPlayed(false), 900);
  };
  return (
    <Panel title="TLR CUE — PREVIEW & PAIRING" pad>
      <p className="t-body-sm text-2">
        The validated cue: ascending pure tones {TLR_CUE.freqsHz.join(' → ')} Hz, ~{TLR_CUE.durationMs} ms,
        played at ~{TLR_CUE.levelSplDb.min}–{TLR_CUE.levelSplDb.max} dB SPL equivalent — just above hearing
        threshold, below arousal threshold. Pair it before sleep with the critical-awareness practice
        (“notice the signal → question your state”), up to {TLR_CUE.pairingPresentations} presentations.
        The pairing, not the sound, is the active ingredient.
      </p>
      <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
        <button type="button" className="chip chip-active" onClick={play}>
          <Play size={11} style={{ marginRight: 4 }} />
          {played ? 'PLAYING…' : 'TEST CUE'}
        </button>
        <span className="t-readout-sm text-3">
          {TLR_CUE.freqsHz.join('/')} Hz · {TLR_CUE.durationMs} ms · ≤{TLR_CUE.levelSplDb.max} dB SPL EQ
        </span>
      </div>
      <p className="t-caption text-3" style={{ marginTop: 10 }}>
        Test at the level you will actually sleep with. If it startles you awake, it is too loud.
        Cueing supports the practice of lucid dreaming — reactivation of a practiced intention, never suggestion.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Reality-check reminders
// ---------------------------------------------------------------------------

function RealityCheckPanel() {
  const [count, setCount] = useState(REALITY_CHECK.minChecksPerDay + 1);
  const [enabled, setEnabled] = useState(() => storage()?.getItem(RC_STORAGE_KEY) === 'on');
  const schedule = useMemo(
    () => realityCheckSchedule({ startMin: 8 * 60, endMin: 22 * 60, count }),
    [count],
  );
  useEffect(() => {
    storage()?.setItem(RC_STORAGE_KEY, enabled ? 'on' : 'off');
  }, [enabled]);
  return (
    <Panel title="REALITY-CHECK REMINDERS (≥5 GENUINE CHECKS/DAY)" pad>
      <div className="flex items-center flex-wrap gap-2" style={{ marginBottom: 12 }}>
        {[5, 6, 8, 10].map((n) => (
          <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}/DAY</Chip>
        ))}
        <Chip active={enabled} onClick={() => setEnabled((v) => !v)}>
          <Bell size={11} style={{ marginRight: 4 }} />{enabled ? 'SCHEDULED' : 'ENABLE'}
        </Chip>
      </div>
      <div className="t-readout-sm text-2 flex flex-wrap gap-x-4 gap-y-1">
        {schedule.timesMin.map((t) => <span key={t}>{fmtMin(t)}</span>)}
      </div>
      {schedule.warnings.map((w) => <div key={w} style={{ marginTop: 6 }}><WarningChip>{w}</WarningChip></div>)}
      <div className="flex flex-col gap-1" style={{ marginTop: 12 }}>
        {REALITY_CHECK.checks.map((c) => (
          <span key={c.id} className="t-body-sm text-2">
            <span className="font-mono2" style={{ color: 'var(--amber)' }}>{c.name.toUpperCase()}</span> — {c.how}
          </span>
        ))}
      </div>
      <p className="t-caption text-3" style={{ marginTop: 10 }}>
        Scheduled times live on this device; the habit only works when each check is done with genuine doubt.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Dream journal
// ---------------------------------------------------------------------------

function JournalPanel() {
  const [entries, setEntries] = useState<DreamJournalEntry[]>(() => {
    const s = storage();
    return s ? loadJournal(s) : [];
  });
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [lucid, setLucid] = useState(false);

  const persist = (next: DreamJournalEntry[]) => {
    setEntries(next);
    const s = storage();
    if (s) saveJournal(next, s);
  };

  const submit = () => {
    if (!text.trim()) return;
    persist(addEntry(entries, createEntry({ text, tags, lucid })));
    setText('');
    setTags('');
    setLucid(false);
  };

  const rate = lucidRate(entries);

  return (
    <Panel
      title="DREAM JOURNAL — LOCAL ONLY"
      right={<span className="t-readout-sm text-3">{entries.length} ENTRIES · LUCID {(rate * 100).toFixed(0)}%</span>}
      pad
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="On waking, stay still and let the dream come back. Log even one fragment…"
        rows={3}
        style={{
          width: '100%',
          background: 'var(--ink-0)',
          border: '1px solid var(--line-1)',
          borderRadius: 2,
          color: 'var(--text-1)',
          padding: 10,
          fontSize: 13,
          resize: 'vertical',
        }}
      />
      <div className="flex items-center flex-wrap gap-2" style={{ margin: '8px 0 12px' }}>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags: flying, childhood-home, false-awakening"
          className="font-mono2"
          style={{
            flex: 1,
            minWidth: 220,
            background: 'var(--ink-0)',
            border: '1px solid var(--line-1)',
            borderRadius: 2,
            color: 'var(--text-1)',
            padding: '6px 10px',
            fontSize: 12,
          }}
        />
        <Chip active={lucid} color="var(--teal)" onClick={() => setLucid((v) => !v)}>LUCID {lucid ? '✓' : ''}</Chip>
        <button type="button" className="chip chip-active" onClick={submit} disabled={!text.trim()}>
          <Plus size={11} style={{ marginRight: 4 }} />LOG ENTRY
        </button>
      </div>
      <div className="flex flex-col gap-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {entries.length === 0 && (
          <p className="t-body-sm text-3">No entries yet. Recall is the strongest predictor of everything else on this page.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="panel" style={{ padding: 12, background: 'var(--ink-2)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span className="t-caption font-mono2 text-3">
                {e.createdIso.slice(0, 10)} {e.createdIso.slice(11, 16)}
                {e.lucid && <span style={{ color: 'var(--teal-hi)' }}> · LUCID</span>}
              </span>
              <button
                type="button"
                onClick={() => persist(removeEntry(entries, e.id))}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                title="Delete entry"
                aria-label="Delete journal entry"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <p className="t-body-sm text-2" style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>
            {e.tags.length > 0 && (
              <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>
                {e.tags.map((t) => (
                  <span key={t} className="t-caption font-mono2" style={{ color: 'var(--amber)', border: '1px solid var(--line-1)', borderRadius: 2, padding: '1px 6px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TIER_META: { tier: 1 | 2 | 3; title: string; blurb: string }[] = [
  {
    tier: 1,
    title: 'TIER 1 — VALIDATED CORE',
    blurb:
      'Lucid dreaming is real and learnable; the best methods work ~half the time for ~half of people within a week. No device or frequency does it for you.',
  },
  {
    tier: 2,
    title: 'TIER 2 — HONEST LABELS',
    blurb: 'Real but thinner evidence. We say exactly how thin.',
  },
  {
    tier: 3,
    title: 'TIER 3 — WHY WE DON’T DO THIS',
    blurb: 'Excluded and debunked claims, kept visible so you can recognize them in the wild.',
  },
];

export default function Dream() {
  const isMobile = useIsMobile();
  const [screening, setScreening] = useState<ScreeningAnswers>({
    insomnia: false,
    psychosisSpectrum: false,
    dissociative: false,
    nightmareDisorder: false,
  });

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Sleep & Dream Lab</h1>
        <p className="t-body text-2" style={{ marginTop: 8, maxWidth: 860 }}>
          Evidence-graded lucid-dream practice. Every technique carries its grade and its citation;
          every protocol on this page <em>supports the practice of</em> lucid dreaming — none of them,
          and nothing else on the market, can honestly promise more.
        </p>
        <div className="flex flex-wrap gap-2" style={{ margin: '16px 0 24px' }}>
          <WarningChip tone="teal"><Moon size={11} /> Lucid dreaming: signal-verified in REM since 1978–1981 (Grade A)</WarningChip>
          <WarningChip>Sleep fragmentation is the primary real cost — WBTB capped at {WBTB_WEEKLY_CAP} nights/week</WarningChip>
          <WarningChip tone="teal"><BookOpen size={11} /> Sleep-paralysis card (Tier 1) is mandatory pre-reading</WarningChip>
        </div>
      </motion.div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', marginBottom: 24 }}>
        <NightPlanPanel screening={screening} />
        <ScreeningPanel value={screening} onChange={setScreening} />
        <TlrCuePanel />
        <RealityCheckPanel />
      </div>

      <div style={{ marginBottom: 32 }}>
        <JournalPanel />
      </div>

      {TIER_META.map((t) => (
        <section key={t.tier} style={{ marginBottom: 32 }}>
          <h2 className="t-h2">{t.title}</h2>
          <p className="t-body-sm text-2" style={{ margin: '4px 0 16px' }}>{t.blurb}</p>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))' }}>
            {dreamProtocolsByTier(t.tier).map((p) => <ProtocolCard key={p.id} p={p} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
