/**
 * Module 6 — Safety Center (design: safety.md). Panic, session limits,
 * WHO-ITU H.870 dose tracking, infant mode, graded medical advisories,
 * crisis resources. Tone: calm; the real risks are boring (loud + long).
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SafetyGovernor } from '@/safety/governor';
import { INFANT_CEILING_DBA, NICU_LEQ_DBA } from '@/safety/dose';
import { Panel, Led, WarningChip, Chip } from '@/ui/components/primitives';
import { PanicButtonLarge } from '@/ui/components/Panic';
import { DoseGauge } from '@/ui/components/DoseGauge';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { InfoPopover } from '@/ui/components/InfoPopover';
import { useSession, fmtClock } from '@/ui/session/SessionContext';
import { useIsMobile } from '@/hooks/use-mobile';

const ADVISORIES: { title: string; grade: 'A' | 'B' | 'C' | 'D'; body: string; action?: 'iso' }[] = [
  {
    title: 'EPILEPSY / PHOTOSENSITIVITY',
    grade: 'B',
    body: 'Isochronic pulses and gamma-rate flicker-adjacent audio are a theoretical seizure trigger for a small photosensitive population; human evidence is thin but the precaution is standard. If you have a seizure disorder, avoid isochronic modes and consult a clinician.',
    action: 'iso',
  },
  {
    title: 'TINNITUS / HYPERACUSIS',
    grade: 'C',
    body: 'Low-level broadband noise is used in tinnitus management protocols; beats are not. Start at −40 dBFS. Stop on any discomfort.',
  },
  {
    title: 'PSYCHIATRIC CAUTION',
    grade: 'C',
    body: 'Intense relaxation/dissociative-adjacent protocols (Deep Focus levels) can be destabilizing for some people with psychosis-spectrum or severe trauma conditions. F21+ shows this warning inline.',
  },
  {
    title: 'PACEMAKERS / IMPLANTS',
    grade: 'A',
    body: 'Audio through headphones cannot affect implanted electronics — no mechanism exists. Listed because users ask.',
  },
  {
    title: 'DRIVING / OPERATING MACHINERY',
    grade: 'B',
    body: "Delta/theta sleep protocols while driving: don't. This is the one advisory that is pure common sense graded as human-evidence-adjacent.",
  },
];

export default function Safety() {
  const s = useSession();
  const gov = useMemo(() => new SafetyGovernor(s.governor), [s.governor]);
  const texts = gov.advisoryTexts();
  const [openAdv, setOpenAdv] = useState<number | null>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [customMin, setCustomMin] = useState('');
  const isMobile = useIsMobile();

  const levelZone = s.volumeDb > -6 ? 'LOUD' : s.volumeDb > -18 ? 'CAUTION' : 'SAFE';
  const zoneColor = levelZone === 'LOUD' ? 'var(--danger)' : levelZone === 'CAUTION' ? 'var(--amber)' : 'var(--grade-A, #5FA98C)';
  const sessionPct = Math.min(100, (s.elapsedSec / (s.limitMin * 60)) * 100);

  const confirm = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Safety Center</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          Loud, long, or late is the actual risk here — not the beat frequency. This panel controls all three.
        </p>

        {/* Live safety state strip */}
        <div className="flex items-stretch flex-wrap" style={{ margin: '20px 0' }}>
          <div style={{ padding: '0 24px 0 0' }}>
            <div className="t-readout-lg flex items-center gap-2" style={{ color: s.running ? 'var(--teal)' : 'var(--text-3)' }}>
              <Led state={s.running ? 'teal' : 'off'} />
              {s.running ? 'RUNNING' : 'OFF'}
            </div>
            <div className="t-label">ENGINE</div>
          </div>
          <div style={{ padding: isMobile ? '0 16px 8px 0' : '0 24px', borderLeft: isMobile ? 'none' : '1px solid var(--line-1)' }}>
            <div className="t-readout-lg" style={{ color: 'var(--text-1)' }}>
              {s.volumeDb.toFixed(1)}
              <span className="text-3" style={{ fontSize: '0.5em' }}>
                {'\u2009'}dBFS
              </span>{' '}
              <span className="t-label" style={{ color: zoneColor }}>
                {levelZone === 'SAFE' ? 'LOWER-RISK' : levelZone}
              </span>
            </div>
            <div className="t-label">LEVEL</div>
          </div>
          <div style={{ padding: isMobile ? '0 16px 8px 0' : '0 24px', borderLeft: isMobile ? 'none' : '1px solid var(--line-1)' }}>
            <div className="t-readout-lg" style={{ color: s.dosePercent >= 100 ? 'var(--danger)' : s.dosePercent >= 75 ? 'var(--amber)' : 'var(--teal)' }}>
              {s.dosePercent.toFixed(0)}
              <span className="text-3" style={{ fontSize: '0.5em' }}>
                %
              </span>
            </div>
            <div className="t-label">DOSE THIS WEEK</div>
          </div>
          <div style={{ padding: isMobile ? '0 16px 8px 0' : '0 24px', borderLeft: isMobile ? 'none' : '1px solid var(--line-1)' }}>
            <div className="t-readout-lg" style={{ color: 'var(--text-1)' }}>
              {fmtClock(s.elapsedSec)}
              <span className="text-3" style={{ fontSize: '0.5em' }}>
                {' '}
                / {fmtClock(s.limitMin * 60)}
              </span>
            </div>
            <div className="t-label">SESSION</div>
            <div style={{ width: 140, height: 2, background: 'var(--ink-4)', marginTop: 4 }}>
              <div style={{ width: `${sessionPct}%`, height: '100%', background: sessionPct >= 80 ? 'var(--danger)' : 'var(--amber)' }} />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
        {/* Panic panel — first in mobile order */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ gridColumn: isMobile ? 'span 1' : 'span 5' }}>
          <Panel title="PANIC" style={{ height: '100%' }}>
            <PanicButtonLarge />
            <p className="t-body-sm text-2" style={{ margin: '16px 0 8px' }}>
              Single press, no confirm — a confirm dialog on an emergency stop is an anti-pattern. Mutes at 0 ms,
              everywhere. Keyboard: <span className="font-mono2">P</span> (test:{' '}
              <span className="font-mono2">Shift+P</span>).
            </p>
            {isMobile && (
              <p className="t-caption text-3" style={{ margin: '0 0 8px' }}>
                On touch devices the same panic control is pinned in the bottom bar of every screen.
              </p>
            )}
            <button
              type="button"
              className="chip"
              onClick={() => {
                s.rehearsePanic();
                confirm('PANIC REHEARSAL — VISUAL ONLY');
              }}
            >
              TEST PANIC
            </button>
            <p className="t-caption text-3" style={{ marginTop: 8 }}>
              Rehearse it once. Muscle memory beats reading.
            </p>
          </Panel>
        </motion.div>

        {/* Session limits */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ gridColumn: isMobile ? 'span 1' : 'span 7' }}>
          <Panel title="SESSION LIMITS">
            <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 20 }}>
              <span className="t-readout-lg">{fmtClock(s.limitMin * 60)}</span>
              {[30, 60, 90, 120].map((m) => (
                <Chip
                  key={m}
                  active={s.limitMin === m}
                  onClick={() => {
                    if (s.running && m > s.limitMin) {
                      // Nothing is queued: the click is simply refused. Say so.
                      confirm('LOOSENING REFUSED WHILE RUNNING — SET IT AFTER STOP');
                      return;
                    }
                    s.setLimitMin(m);
                    if (s.running) confirm(`LIMIT ${fmtClock(s.limitMin * 60)} → ${fmtClock(m * 60)} · APPLIES NOW`);
                  }}
                >
                  {m}
                </Chip>
              ))}
              <input
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = parseInt(customMin, 10);
                    if (Number.isFinite(v) && v >= 5 && v <= 240) s.setLimitMin(v);
                    setCustomMin('');
                  }
                }}
                placeholder="custom min"
                className="font-mono2"
                style={{ width: 100, background: 'var(--ink-3)', border: '1px solid var(--line-1)', borderRadius: 2, color: 'var(--text-1)', padding: '5px 8px', fontSize: 12 }}
              />
            </div>
            <p className="t-caption text-3" style={{ marginBottom: 20 }}>
              Default 90:00. Not a magic number — a ceiling against habituation and dose creep. Studio enforces it with a
              gentle fade-out over 30 s at limit, not a hard cut (except panic). Limits only tighten live; loosening
              takes effect next session.
            </p>
            <div className="flex items-start gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span className="t-label">H.870 DOSE MODEL</span>
                  <InfoPopover featureId="dose-gauge" label="About the sound dose gauge" />
                  <GradeBadge
                    grade="A"
                    compact
                    citation={{
                      verdict: 'Dose math is real occupational-health engineering.',
                      summary:
                        'ITU-T H.870 / WHO Make Listening Safe, 3 dB exchange rate. Our headphone-level estimate is approximate — flat-response assumption — stated as such.',
                      source: 'ITU-T H.870 (2019); WHO-NMH-NVI-19.4; NIOSH REL 85 dBA / 3 dB',
                    }}
                  />
                </div>
                <div style={isMobile ? { display: 'flex', justifyContent: 'center' } : undefined}>
                  <DoseGauge percent={s.dosePercent} width={280} />
                </div>
                <div className="t-readout-sm text-2" style={{ marginTop: 8 }}>
                  EST. LEVEL {s.volumeDb.toFixed(0)} dBFS ≈ {s.estDbA.toFixed(0)} dBA (headphone est.) · DOSE {s.dosePercent.toFixed(0)}%
                </div>
                <p className="t-caption text-3" style={{ marginTop: 8, maxWidth: 380 }}>
                  Without calibrated headphones this is an estimate within roughly ±6 dB — a digital cap is not an
                  acoustic limit. We show the uncertainty instead of hiding it.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="t-label" style={{ width: 110 }}>QUIET HOURS</span>
                  <Chip active={s.governor.maxGainDbFs <= -30} onClick={() => {
                    const enabling = s.governor.maxGainDbFs > -30;
                    s.setGovernor({ maxGainDbFs: enabling ? -30 : -6 });
                    if (enabling && s.volumeDb > -30) s.setVolumeDb(-30);
                    confirm(enabling ? 'QUIET HOURS 22:00–07:00 · CAPPED −30 dBFS' : 'QUIET HOURS OFF');
                  }}>
                    22:00–07:00
                  </Chip>
                  <Led state={s.governor.maxGainDbFs <= -30 ? 'amber' : 'off'} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="t-label" style={{ width: 110 }}>AUTO-FADE SLEEP</span>
                  <Chip onClick={() => confirm('AUTO-FADE ON SLEEP PRESETS ENABLED')}>20 MIN IDLE → FADE 10 MIN</Chip>
                  <Led state="teal" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="t-label" style={{ width: 110 }}>DRIVING ACK</span>
                  <Chip
                    active={s.governor.drivingWarningAcknowledged}
                    onClick={() => {
                      s.setGovernor({ drivingWarningAcknowledged: !s.governor.drivingWarningAcknowledged });
                      confirm(s.governor.drivingWarningAcknowledged ? 'ACK CLEARED' : 'DRIVING WARNING ACKNOWLEDGED');
                    }}
                  >
                    {s.governor.drivingWarningAcknowledged ? 'ACKNOWLEDGED' : 'NOT ACKNOWLEDGED'}
                  </Chip>
                </div>
                <p className="t-caption text-3" style={{ maxWidth: 320 }}>
                  {texts.driving}
                </p>
              </div>
            </div>
          </Panel>
        </motion.div>

        {/* Infant mode */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ gridColumn: isMobile ? 'span 1' : 'span 4' }}>
          <Panel title="INFANT MODE" right={<Led state={s.governor.infantMode ? 'teal' : 'off'} />}>
            <button
              type="button"
              className={`chip ${s.governor.infantMode ? 'chip-active' : ''}`}
              onClick={() => {
                s.setGovernor({ infantMode: !s.governor.infantMode });
                if (!s.governor.infantMode) {
                  s.setVolumeDb(Math.min(s.volumeDb, -40));
                  s.setLimitMin(20);
                }
                confirm(!s.governor.infantMode ? 'INFANT MODE ON — CAPPED −40 dBFS / 20:00' : 'INFANT MODE OFF');
              }}
            >
              {s.governor.infantMode ? 'ON' : 'OFF'}
            </button>
            <p className="t-body-sm text-2" style={{ margin: '12px 0' }}>
              For playback in a room with an infant present. Output hard-capped at −40 dBFS, carriers limited to 40–500
              Hz, isochronic gating disabled, sessions capped at 20:00. Corrected spec: ≤{INFANT_CEILING_DBA} dBA at the
              infant's ear position (AAP-aligned; NICU hourly Leq ≤ {NICU_LEQ_DBA} dBA).
            </p>
            <div className="flex gap-2" style={{ marginBottom: 8 }}>
              <GradeBadge grade="D" compact citation={{ verdict: "Grade D as a 'feature'.", summary: 'There is no evidence binaural audio benefits infants, and no safety trials either.', source: 'Hugh et al., Pediatrics 2014 (PMID 24590753)' }} />
              <GradeBadge grade="A" compact citation={{ verdict: 'Grade A as a precaution.', summary: 'All 14 tested infant sleep machines exceeded 50 dBA at 30 cm at max volume; 3 exceeded 85 dBA.', source: 'Hugh et al., Pediatrics 2014; AAP 2023 reaffirmation' }} />
            </div>
            <WarningChip tone="danger">Never put headphones on an infant.</WarningChip>
          </Panel>
        </motion.div>

        {/* Medical advisories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ gridColumn: isMobile ? 'span 1' : 'span 4' }}>
          <Panel title="MEDICAL ADVISORIES">
            <div className="flex flex-col">
              {ADVISORIES.map((a, i) => (
                <div key={a.title} style={{ borderTop: i > 0 ? '1px solid var(--line-1)' : 'none', padding: '10px 0' }}>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setOpenAdv(openAdv === i ? null : i)}
                  >
                    <GradeBadge grade={a.grade} compact />
                    <span className="t-label" style={{ flex: 1, textAlign: 'left' }}>
                      {a.title}
                    </span>
                    <span className="text-3">{openAdv === i ? '▾' : '▸'}</span>
                  </button>
                  {openAdv === i && (
                    <div style={{ marginTop: 8 }}>
                      <p className="t-body-sm text-2">{a.body}</p>
                      {a.action === 'iso' && (
                        <button type="button" className="chip" style={{ marginTop: 8 }} onClick={() => { s.setMode('binaural'); confirm('ISOCHRONIC DISABLED GLOBALLY'); }}>
                          DISABLE ISOCHRONIC GLOBALLY
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="t-caption text-3" style={{ marginTop: 12 }}>
              {texts.seizure}
            </p>
            <p className="t-caption text-3" style={{ marginTop: 8 }}>
              {texts.medication}
            </p>
          </Panel>
        </motion.div>

        {/* Crisis strip */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ gridColumn: 'span 4' }}>
          <Panel title="IF SOMETHING FEELS WRONG">
            <p className="t-body-sm text-2" style={{ marginBottom: 12 }}>
              If audio playback ever coincides with dizziness, visual disturbance, chest symptoms, or a panic response:
              stop playback, sit down, breathe. That's the whole protocol.
            </p>
            <div className="t-readout-md" style={{ color: 'var(--amber)', marginBottom: 4 }}>
              US — call/text 988
            </div>
            <p className="t-caption text-3" style={{ marginBottom: 12 }}>
              {texts.crisis}
            </p>
            <p className="t-body-sm text-2">
              If you experience a first seizure, sudden hearing loss, or severe tinnitus onset: that is a doctor visit,
              not a settings change.
            </p>
            <p className="t-caption text-3" style={{ marginTop: 12 }}>
              These resources are general information; Open Sync is not a medical device and makes no therapeutic
              claims.
            </p>
          </Panel>
        </motion.div>
      </div>

      {/* confirmation toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="t-readout-sm"
          style={{
            position: 'fixed',
            bottom: isMobile ? 88 : 24,
            right: isMobile ? 16 : 24,
            left: isMobile ? 16 : undefined,
            background: 'var(--ink-3)',
            border: '1px solid var(--line-2)',
            borderRadius: 2,
            padding: '8px 14px',
            color: 'var(--text-1)',
            zIndex: 80,
          }}
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
