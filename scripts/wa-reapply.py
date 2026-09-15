#!/usr/bin/env python3
"""Idempotent re-application of W-A edits that a concurrent stale-buffer writer
keeps reverting. Each fix checks for the broken pattern, then patches. Safe to
run repeatedly. Exits non-zero if a pattern can't be found either way."""
import re
import sys

FAIL = []

def fix(path, old, new, must_be_absent=None):
    with open(path) as f:
        src = f.read()
    if new in src and (must_be_absent is None or must_be_absent not in src):
        return  # already applied
    if old in src:
        src = src.replace(old, new, 1)
        with open(path, 'w') as f:
            f.write(src)
        print(f'PATCHED {path}')
        return
    FAIL.append((path, old[:60]))
    print(f'MISS  {path}: neither pattern found: {old[:60]!r}')

SC = 'src/ui/session/SessionContext.tsx'
SH = 'src/ui/layout/AppShell.tsx'
CP = 'src/ui/components/CommandPalette.tsx'
PR = 'src/pages/Presets.tsx'

# --- SessionContext: imports
fix(SC,
    "import type { Preset } from '@/data/presets';\nimport type { Grade } from '@/data/frequencies';",
    "import type { Preset, SessionSpec as DataSessionSpec } from '@/data/presets';\nimport type { Grade } from '@/data/frequencies';\nimport {\n  deleteUserPreset,\n  loadUserPresets,\n  saveUserPreset,\n  type UserPreset,\n} from './userPresets';")

# --- SessionContext: snapshot interface
fix(SC,
    "  gateShape: GateShape;\n  running: boolean;\n  panicked: boolean;",
    "  gateShape: GateShape;\n  running: boolean;\n  /** True while a running session is paused (audio frozen, clock held). */\n  paused: boolean;\n  panicked: boolean;")
fix(SC,
    "  presetGrade: Grade | null;\n  dirty: boolean;\n}",
    "  presetGrade: Grade | null;\n  dirty: boolean;\n  /** Saved \"MY PRESETS\" entries (localStorage-backed, versioned). */\n  userPresets: UserPreset[];\n}")

# --- SessionContext: actions interface
fix(SC,
    "  previewPhases: (id: string, phases: readonly EnginePhase[], maxSec?: number) => void;\n  /** Play a plain tone",
    "  previewPhases: (id: string, phases: readonly EnginePhase[], maxSec?: number) => void;\n  /** Play a pre-rendered preview file (public/previews/<id>.wav) via HTMLAudio; toggle on repeat. */\n  previewUrl: (id: string, url: string) => void;\n  /** Play a plain tone")
fix(SC,
    "  start: () => void;\n  stop: () => void;\n  panic: () => void;",
    "  start: () => void;\n  stop: () => void;\n  /**\n   * Global pause/resume (Space hotkey, status-bar chip, palette). Freezes the\n   * live engine phase-coherently (suspend, no click/jump) and holds the\n   * session clock. No-op while idle or panicked.\n   */\n  togglePause: () => void;\n  panic: () => void;")
fix(SC,
    "  setPhases: (phases: UiPhase[]) => void;\n  loadPreset: (preset: Preset) => void;",
    "  setPhases: (phases: UiPhase[]) => void;\n  /**\n   * Persist the current front-panel config as a named user preset\n   * (Studio \"SAVE AS PRESET\"). Duplicate names replace in place.\n   * Returns the stored entry.\n   */\n  saveCurrentAsPreset: (name: string) => UserPreset;\n  /** Delete a user preset by id. */\n  deleteUserPreset: (id: string) => void;\n  loadPreset: (preset: Preset) => void;")

# --- SessionContext: value object
fix(SC,
    "      gateShape,\n      running,\n      panicked,\n      elapsedSec,",
    "      gateShape,\n      running,\n      paused,\n      panicked,\n      elapsedSec,")
fix(SC,
    "      presetName,\n      presetGrade,\n      dirty,\n      previewId,\n      togglePreview,\n      stopPreview,\n      previewPreset,\n      previewPhases,\n      previewTone,\n      start,\n      stop,\n      panic,",
    "      presetName,\n      presetGrade,\n      dirty,\n      userPresets,\n      previewId,\n      togglePreview,\n      stopPreview,\n      previewPreset,\n      previewPhases,\n      previewUrl,\n      previewTone,\n      start,\n      stop,\n      togglePause,\n      panic,")
fix(SC,
    "      setGovernor,\n      setPhases,\n      loadPreset,\n      loadFrequency,\n      previewHz,\n      exportWav,\n      engineRef,\n    }),",
    "      setGovernor,\n      setPhases,\n      saveCurrentAsPreset,\n      deleteUserPreset: deleteUserPresetById,\n      loadPreset,\n      loadFrequency,\n      previewHz,\n      exportWav,\n      engineRef,\n    }),")

# --- AppShell: soon block
fix(SH,
    "          {!collapsed &&\n            (soon ? (\n              <span className=\"t-caption\" style={{ color: 'var(--text-3)', fontSize: 9 }}>\n                SOON\n              </span>\n            ) : (\n              ledState && <Led state={ledState} />\n            ))}",
    "          {!collapsed && ledState && <Led state={ledState} />}")
fix(SH,
    "            color: isActive ? 'var(--amber)' : 'var(--text-2)',\n            opacity: soon ? 0.45 : 1,\n          }}",
    "            color: isActive ? 'var(--amber)' : 'var(--text-2)',\n          }}")

# --- SessionContext: stop clears paused
fix(SC,
    "  const stop = useCallback(() => {\n    engineRef.current.stop(0.3);\n    setRunning(false);\n  }, []);",
    "  const stop = useCallback(() => {\n    engineRef.current.stop(0.3);\n    setRunning(false);\n    setPaused(false);\n  }, []);")

# --- SessionContext: panic clears paused
fix(SC,
    "    engineRef.current.panic();\n    setRunning(false);\n    setPanicked(true);\n  }, []);",
    "    engineRef.current.panic();\n    setRunning(false);\n    setPaused(false);\n    setPanicked(true);\n  }, []);")

# --- SessionContext: clock effect pause guard
fix(SC,
    "  useEffect(() => {\n    if (!running) return;\n    const t0 = Date.now();",
    "  useEffect(() => {\n    // Paused: clock held (elapsed/dose freeze); resumes from `elapsedSec`.\n    if (!running || paused) return;\n    const t0 = Date.now();")
fix(SC,
    "    return () => window.clearInterval(iv);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [running]);",
    "    return () => window.clearInterval(iv);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [running, paused]);")

# --- AppShell: lucide Pause/Play import
fix(SH, "  Orbit,\n  Zap,", "  Orbit,\n  Pause,\n  Play,\n  Zap,")

# --- AppShell: rail STUDIO LED consistent states
fix(SH,
    "                ledState={\n                  m.path === '/studio'\n                    ? running\n                      ? 'amber'\n                      : 'off'\n                    : m.path === '/safety'",
    "                ledState={\n                  m.path === '/studio'\n                    ? engineLedState(running, paused)\n                    : m.path === '/safety'")

# --- AppShell: desktop status bar LED + PauseChip
fix(SH,
    "      <PaletteHint onOpen={onPalette} />\n      <UtcClock />\n      <PanicButton />",
    "      <PaletteHint onOpen={onPalette} />\n      <span title={running ? (paused ? 'Session paused' : 'Engine running') : 'Engine off'}>\n        <Led state={engineLedState(running, paused)} />\n      </span>\n      <PauseChip />\n      <UtcClock />\n      <PanicButton />")

# --- AppShell: MobileStatusBar needs paused for the LED states
fix(SH,
    "function MobileStatusBar({ onPalette }: { onPalette: () => void }) {\n  const { running } = useSession();",
    "function MobileStatusBar({ onPalette }: { onPalette: () => void }) {\n  const { running, paused } = useSession();")

# --- AppShell: mobile status bar LED consistent states
fix(SH,
    "        <span title={running ? 'Engine running' : 'Engine off'}>\n          <Led state={running ? 'amber' : 'off'} />\n        </span>",
    "        <span title={running ? (paused ? 'Session paused' : 'Engine running') : 'Engine off'}>\n          <Led state={engineLedState(running, paused)} />\n        </span>")

# --- AppShell: MobilePauseChip definition (before the BottomBar doc block)
fix(SH,
    "/**\n * Phone bottom bar (§3.2): 4 primary tabs + MORE + persistent PANIC segment.",
    "/**\n * Compact pause chip for the phone bottom bar: icon + micro label, pinned as\n * its own segment immediately before PANIC (panic keeps its fixed 72px\n * trailing slot — the chip never overlaps or obscures it). Disabled while\n * idle; the global Space hotkey is the desktop equivalent.\n */\nfunction MobilePauseChip() {\n  const { running, paused, togglePause } = useSession();\n  return (\n    <button\n      type=\"button\"\n      data-testid=\"mobile-pause\"\n      aria-label={paused ? 'Resume session' : 'Pause session'}\n      aria-pressed={paused}\n      disabled={!running}\n      onClick={togglePause}\n      className=\"flex flex-col items-center justify-center\"\n      style={{\n        width: '100%',\n        minHeight: BOTTOM_BAR_H,\n        gap: 3,\n        border: 'none',\n        borderLeft: '1px solid var(--line-1)',\n        color: paused ? 'var(--teal)' : 'var(--text-2)',\n        background: paused ? 'var(--ink-2)' : 'transparent',\n        opacity: running ? 1 : 0.4,\n        cursor: running ? 'pointer' : 'default',\n        fontFamily: '\"IBM Plex Mono\", monospace',\n        fontSize: 9,\n        letterSpacing: '0.1em',\n        touchAction: 'manipulation',\n      }}\n    >\n      {paused ? <Play size={18} strokeWidth={1.5} /> : <Pause size={18} strokeWidth={1.5} />}\n      {paused ? 'RESUME' : 'PAUSE'}\n    </button>\n  );\n}\n\n/**\n * Phone bottom bar (§3.2): 4 primary tabs + MORE + persistent PANIC segment.")

# --- AppShell: Space hotkey effect (after the panic hotkey effect)
fix(SH,
    "    window.addEventListener('keydown', onKey);\n    return () => window.removeEventListener('keydown', onKey);\n  }, [panic, rehearsePanic]);\n\n  return (",
    "    window.addEventListener('keydown', onKey);\n    return () => window.removeEventListener('keydown', onKey);\n  }, [panic, rehearsePanic]);\n\n  // Global pause hotkey: Space toggles pause/resume while a session is live.\n  // Guarded — never fires from form fields, contenteditable, or focused\n  // buttons/links (Space is their activation key), and stays fully inert\n  // when idle so Space keeps its default scroll behavior.\n  useEffect(() => {\n    const onKey = (e: KeyboardEvent) => {\n      if (e.key !== ' ' && e.key !== 'Spacebar') return;\n      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;\n      const target = e.target as HTMLElement | null;\n      const tag = target?.tagName;\n      if (\n        tag === 'INPUT' ||\n        tag === 'TEXTAREA' ||\n        tag === 'SELECT' ||\n        tag === 'BUTTON' ||\n        tag === 'A' ||\n        target?.isContentEditable\n      ) {\n        return;\n      }\n      if (!running) return;\n      e.preventDefault();\n      togglePause();\n    };\n    window.addEventListener('keydown', onKey);\n    return () => window.removeEventListener('keydown', onKey);\n  }, [running, togglePause]);\n\n  return (")

# --- CommandPalette: Pause icon import
fix(CP,
    "  OctagonX,\n  PanelLeft,\n  Play,",
    "  OctagonX,\n  PanelLeft,\n  Pause,\n  Play,")

# --- Presets.tsx: imports + playPreview helper
fix(PR,
    "import { useSession, fmtClock } from '@/ui/session/SessionContext';",
    "import { useSession, fmtClock } from '@/ui/session/SessionContext';\nimport { previewUrlFor, usePreviewManifest } from '@/ui/session/previewManifest';\nimport { userPresetAsPreset } from '@/ui/session/userPresets';")
fix(PR,
    "    window.setTimeout(() => navigate('/studio'), 600);\n  };\n\n  return (",
    "    window.setTimeout(() => navigate('/studio'), 600);\n  };\n\n  /**\n   * Preview source selection: pre-rendered file (public/previews/<id>.wav)\n   * when the manifest covers the preset, else the live engine render. Both\n   * paths route through the same SessionContext preview machinery (one at a\n   * time, ≤30 s, never dose-debited, panic cuts).\n   */\n  const playPreview = (p: Preset) => {\n    const url = previewUrlFor(p.id, previewManifest);\n    if (url) previewUrl(`preset:${p.id}`, url);\n    else previewPreset(p);\n  };\n\n  return (")
fix(PR, "onClick={() => previewPreset(featured)}", "onClick={() => playPreview(featured)}")

sys.exit(1 if FAIL else 0)
