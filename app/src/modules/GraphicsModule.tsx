import { useState, useMemo } from 'react'
import { fs } from '../utils/font'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'
import {
  useGraphicsState,
  useDxgkrnlEvents,
  useGpuPreferences,
  useNvidiaSmi,
} from '../hooks/useGraphics'
import {
  setGpuPreference,
  removeGpuPreference,
  findKnownExes,
  openAmdAdrenalin,
  openNvidiaControlPanel,
  openWindowsGraphicsSettings,
  recoverDgpu,
  GPU_PREFERENCE_LABEL,
  PROBLEM_CODE_LABEL,
  type DisplayDevice,
  type DxgKrnlEvent,
  type GpuPreference,
  type GpuPreferenceValue,
} from '../api/graphics'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function InfoRow({
  label,
  value,
  color = '#888888',
  small = false,
}: {
  label: string
  value?: string | number | null
  color?: string
  small?: boolean
}) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12 }}>
      <span style={{ ...mono, fontSize: fs(small ? 9 : 10), color: '#555555', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span
        style={{
          ...mono,
          fontSize: fs(small ? 10 : 11),
          color,
          textAlign: 'right',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        ...mono,
        fontSize: fs(9),
        letterSpacing: '0.1em',
        padding: '2px 6px',
        border: `1px solid ${ok ? '#22cc44' : '#cc2222'}`,
        color: ok ? '#22cc44' : '#cc2222',
        background: ok ? 'rgba(34,204,68,0.08)' : 'rgba(204,34,34,0.08)',
        borderRadius: 2,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

function btn(variant: 'primary' | 'secondary' | 'danger' = 'secondary'): React.CSSProperties {
  const colors = {
    primary:   { bg: 'var(--tan)',  fg: 'var(--bg)',   border: 'var(--tan)' },
    secondary: { bg: 'transparent', fg: 'var(--cream)', border: 'var(--border)' },
    danger:    { bg: 'transparent', fg: '#cc2222',     border: '#552222' },
  }[variant]
  return {
    ...mono,
    fontSize: fs(10),
    letterSpacing: '0.08em',
    padding: '6px 12px',
    background: colors.bg,
    color: colors.fg,
    border: `1px solid ${colors.border}`,
    borderRadius: 2,
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'all 100ms',
  }
}

function AdapterCard({ d, onRecover }: { d: DisplayDevice; onRecover: (id: string) => void }) {
  const ok = d.problemCode === 0
  const isNvidia = d.name.toLowerCase().includes('nvidia') || d.instanceId.toLowerCase().includes('ven_10de')
  const accent = isNvidia ? '#76b900' : d.name.toLowerCase().includes('amd') || d.name.toLowerCase().includes('radeon') ? '#ed1c24' : 'var(--cream)'
  const problemLabel = PROBLEM_CODE_LABEL[d.problemCode] ?? `CODE_${d.problemCode}`

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '10px 12px',
        marginBottom: 8,
        background: 'var(--bg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: fs(11), color: accent, letterSpacing: '0.05em' }}>
          {d.name}
        </span>
        <StatusBadge ok={ok} label={ok ? 'OK' : problemLabel} />
      </div>
      <InfoRow label="DRIVER" value={d.driverVer} color="var(--cream)" />
      <InfoRow label="INF" value={d.driverInf} small />
      <InfoRow label="PCIe (CURRENT)" value={d.linkCur?.replace(/\s+x$/, '')} />
      <InfoRow label="PCIe (MAX)" value={d.linkMax?.replace(/\s+x$/, '')} />
      <InfoRow label="LOCATION" value={d.location} small />
      <InfoRow label="LAST ARRIVAL" value={d.lastArrival} small />
      {!ok && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button style={btn('danger')} onClick={() => onRecover(d.instanceId)}>
            RECOVER (UAC)
          </button>
        </div>
      )}
    </div>
  )
}

function EventRow({ e }: { e: DxgKrnlEvent }) {
  const isError = e.level === 'Error' || e.level === 'Critical'
  const color = isError ? '#cc2222' : '#c09060'
  const ts = new Date(e.ts * 1000).toLocaleString()
  return (
    <div
      style={{
        borderLeft: `2px solid ${color}`,
        paddingLeft: 8,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ ...mono, fontSize: fs(9), color, letterSpacing: '0.1em' }}>
          {e.level.toUpperCase()} · ID {e.id}
        </span>
        <span style={{ ...mono, fontSize: fs(9), color: '#444444' }}>{ts}</span>
      </div>
      <div style={{ ...mono, fontSize: fs(10), color: '#aaaaaa', lineHeight: 1.5 }}>
        {e.message}
      </div>
    </div>
  )
}

function GpuPreferenceRow({
  p,
  onChange,
  onRemove,
}: {
  p: GpuPreference
  onChange: (exe: string, pref: GpuPreferenceValue) => void
  onRemove: (exe: string) => void
}) {
  const fileName = p.exe.split('\\').pop() ?? p.exe
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...mono, fontSize: fs(11), color: p.fileExists ? 'var(--cream)' : '#666666' }}>
          {fileName}
        </div>
        <div style={{ ...mono, fontSize: fs(9), color: '#444444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.exe}
        </div>
      </div>
      <select
        value={p.preference}
        onChange={(e) => onChange(p.exe, Number(e.target.value) as GpuPreferenceValue)}
        style={{
          ...mono,
          fontSize: fs(10),
          padding: '4px 6px',
          background: 'var(--bg)',
          color: 'var(--cream)',
          border: '1px solid var(--border)',
        }}
      >
        <option value={0}>AUTO</option>
        <option value={1}>POWER SAVING</option>
        <option value={2}>HIGH PERFORMANCE</option>
      </select>
      <button style={btn('danger')} onClick={() => onRemove(p.exe)}>
        DEL
      </button>
    </div>
  )
}

export function GraphicsModule() {
  const { data: state, error: stateErr, mutate: refetchState } = useGraphicsState()
  const { data: events } = useDxgkrnlEvents(60, 50)
  const { data: prefs, mutate: refetchPrefs } = useGpuPreferences()
  const { data: smi, mutate: refetchSmi } = useNvidiaSmi()

  const [newExe, setNewExe] = useState('')
  const [newPref, setNewPref] = useState<GpuPreferenceValue>(2)
  const [discoveredExes, setDiscoveredExes] = useState<string[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const nvSvc = state?.services?.nvlddmkm
  const amdSvc = state?.services?.amdkmdag

  // Defensive: if the IPC layer ever drifts and returns a non-array (PowerShell
  // single-item unwrap, etc.) we don't want it to crash render.
  const eventsArr = Array.isArray(events) ? events : []
  const prefsArr = Array.isArray(prefs) ? prefs : []
  const devicesArr = Array.isArray(state?.devices) ? state!.devices : []

  const errorEvents = useMemo(
    () => eventsArr.filter((e) => e.level === 'Error' || e.level === 'Critical'),
    [eventsArr],
  )

  const handleSetPref = async (exe: string, pref: GpuPreferenceValue) => {
    try {
      await setGpuPreference(exe, pref)
      setActionMsg(`Set ${exe.split('\\').pop()} → ${GPU_PREFERENCE_LABEL[pref]}`)
      refetchPrefs()
    } catch (e) {
      setActionMsg(`Failed: ${(e as Error).message}`)
    }
  }

  const handleRemovePref = async (exe: string) => {
    try {
      await removeGpuPreference(exe)
      setActionMsg(`Removed ${exe.split('\\').pop()}`)
      refetchPrefs()
    } catch (e) {
      setActionMsg(`Failed: ${(e as Error).message}`)
    }
  }

  const handleAddPref = async () => {
    if (!newExe.trim()) return
    await handleSetPref(newExe.trim(), newPref)
    setNewExe('')
  }

  const handleDiscover = async () => {
    setDiscovering(true)
    setActionMsg('Scanning for known executables… (up to a minute)')
    try {
      const found = await findKnownExes()
      setDiscoveredExes(found ?? [])
      setActionMsg(`Found ${found?.length ?? 0} known executable(s)`)
    } catch (e) {
      setActionMsg(`Failed: ${(e as Error).message}`)
    } finally {
      setDiscovering(false)
    }
  }

  const handleRecover = async (instanceId: string) => {
    const proceed = window.confirm(
      'This will run an elevated PowerShell that removes and rescans this GPU device.\n\nWindows will prompt for UAC. Continue?',
    )
    if (!proceed) return
    setActionMsg('Running recovery… (UAC prompt will appear)')
    try {
      await recoverDgpu(instanceId)
      setActionMsg('Recovery completed. Refreshing state.')
      setTimeout(() => {
        refetchState()
        refetchSmi()
      }, 1500)
    } catch (e) {
      setActionMsg(`Recovery failed: ${(e as Error).message}`)
    }
  }

  // Non-Tauri fallback
  if (!isTauri) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 40 }}>
        <div style={{ ...mono, fontSize: fs(11), color: 'var(--cream-dim)', textAlign: 'center', maxWidth: 480 }}>
          Graphics module requires the Tauri runtime (it queries Windows PnP, event log, and registry).
          Run Framework Deck as a desktop app, not in a browser.
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ ...mono, fontSize: fs(14), color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          GRAPHICS
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
          {nvSvc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LEDIndicator active={nvSvc.status === 'Running'} color={nvSvc.status === 'Running' ? '#76b900' : '#cc2222'} size={6} />
              <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>
                nvlddmkm: <span style={{ color: nvSvc.status === 'Running' ? '#76b900' : '#cc2222' }}>{nvSvc.status}</span>
              </span>
            </div>
          )}
          {amdSvc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LEDIndicator active={amdSvc.status === 'Running'} color={amdSvc.status === 'Running' ? '#ed1c24' : '#cc2222'} size={6} />
              <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>
                amdkmdag: <span style={{ color: amdSvc.status === 'Running' ? '#ed1c24' : '#cc2222' }}>{amdSvc.status}</span>
              </span>
            </div>
          )}
          {stateErr && (
            <span style={{ ...mono, fontSize: fs(10), color: '#cc2222' }}>
              {(stateErr as Error).message}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'flex-start' }}>

        {/* GPU ADAPTERS */}
        <Panel
          label="GPU ADAPTERS"
          rightContent={
            <button style={btn('secondary')} onClick={() => refetchState()}>
              REFRESH
            </button>
          }
        >
          <div style={{ padding: 10 }}>
            {!state && <div style={{ ...mono, fontSize: fs(10), color: '#444444' }}>Loading…</div>}
            {devicesArr.map((d) => (
              <AdapterCard key={d.instanceId} d={d} onRecover={handleRecover} />
            ))}
            {state && devicesArr.length === 0 && (
              <div style={{ ...mono, fontSize: fs(10), color: '#444444' }}>No display adapters detected</div>
            )}
          </div>
        </Panel>

        {/* DIAGNOSTICS */}
        <Panel
          label={`DIAGNOSTICS · DXGKRNL-ADMIN${errorEvents.length ? ` · ${errorEvents.length} ERR` : ''}`}
        >
          <div style={{ padding: 12, maxHeight: 360, overflowY: 'auto' }}>
            {!events && <div style={{ ...mono, fontSize: fs(10), color: '#444444' }}>Loading…</div>}
            {events && eventsArr.length === 0 && (
              <div style={{ ...mono, fontSize: fs(10), color: '#22cc44' }}>
                No errors or warnings in the last hour
              </div>
            )}
            {eventsArr.map((e, i) => (
              <EventRow key={`${e.ts}-${i}`} e={e} />
            ))}
          </div>
        </Panel>

        {/* PER-APP GPU PREFERENCES */}
        <Panel
          label="PER-APP GPU PREFERENCES"
          rightContent={
            <button style={btn('secondary')} onClick={handleDiscover} disabled={discovering}>
              {discovering ? 'SCANNING…' : 'AUTO-DISCOVER'}
            </button>
          }
          style={{ gridColumn: '1 / -1' }}
        >
          <div style={{ padding: 12 }}>
            {/* Add row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newExe}
                onChange={(e) => setNewExe(e.target.value)}
                placeholder="C:\Path\To\App.exe"
                list="discovered-exes"
                style={{
                  ...mono,
                  fontSize: fs(10),
                  padding: '6px 8px',
                  flex: 1,
                  minWidth: 280,
                  background: 'var(--bg)',
                  color: 'var(--cream)',
                  border: '1px solid var(--border)',
                }}
              />
              <datalist id="discovered-exes">
                {discoveredExes.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <select
                value={newPref}
                onChange={(e) => setNewPref(Number(e.target.value) as GpuPreferenceValue)}
                style={{
                  ...mono,
                  fontSize: fs(10),
                  padding: '6px 8px',
                  background: 'var(--bg)',
                  color: 'var(--cream)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value={0}>AUTO</option>
                <option value={1}>POWER SAVING</option>
                <option value={2}>HIGH PERFORMANCE</option>
              </select>
              <button style={btn('primary')} onClick={handleAddPref} disabled={!newExe.trim()}>
                ADD
              </button>
            </div>

            {/* List */}
            {!prefs && <div style={{ ...mono, fontSize: fs(10), color: '#444444' }}>Loading…</div>}
            {prefs && prefsArr.length === 0 && (
              <div style={{ ...mono, fontSize: fs(10), color: '#444444' }}>
                No per-app GPU preferences set. Add one above or click AUTO-DISCOVER to find known games.
              </div>
            )}
            {prefsArr.map((p) => (
              <GpuPreferenceRow
                key={p.exe}
                p={p}
                onChange={handleSetPref}
                onRemove={handleRemovePref}
              />
            ))}

            <div style={{ ...mono, fontSize: fs(9), color: '#444444', marginTop: 12, lineHeight: 1.6 }}>
              Writes to HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences. Equivalent to Windows Settings → Display → Graphics. Takes effect on next app launch.
            </div>
          </div>
        </Panel>

        {/* QUICK ACTIONS */}
        <Panel label="QUICK ACTIONS" style={{ gridColumn: '1 / -1' }}>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <button style={btn('secondary')} onClick={() => openAmdAdrenalin().catch((e) => setActionMsg(`Failed: ${(e as Error).message}`))}>
              AMD ADRENALIN ▸ SMARTACCESS
            </button>
            <button style={btn('secondary')} onClick={() => openNvidiaControlPanel().catch((e) => setActionMsg(`Failed: ${(e as Error).message}`))}>
              NVIDIA CONTROL PANEL
            </button>
            <button style={btn('secondary')} onClick={() => openWindowsGraphicsSettings().catch((e) => setActionMsg(`Failed: ${(e as Error).message}`))}>
              WINDOWS GRAPHICS SETTINGS
            </button>
            <button
              style={btn('secondary')}
              onClick={() => {
                refetchState()
                refetchSmi()
                refetchPrefs()
              }}
            >
              REFRESH ALL
            </button>
          </div>
          <div style={{ padding: '0 14px 14px', ...mono, fontSize: fs(9), color: '#444444', lineHeight: 1.6 }}>
            The Framework 16 MUX cannot be toggled programmatically. Adrenalin Settings, Graphics, AMD SmartAccess Graphics is the only path on Windows. These shortcuts open the right tools.
          </div>
        </Panel>

        {/* NVIDIA-SMI */}
        {smi && (
          <Panel
            label="NVIDIA-SMI"
            style={{ gridColumn: '1 / -1' }}
            rightContent={
              <button style={btn('secondary')} onClick={() => refetchSmi()}>
                REFRESH
              </button>
            }
          >
            <div style={{ padding: 12 }}>
              <pre
                style={{
                  ...mono,
                  fontSize: fs(9),
                  color: smi.available ? 'var(--cream)' : '#888888',
                  background: 'var(--bg)',
                  padding: 10,
                  border: '1px solid #1a1a1a',
                  margin: 0,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  maxHeight: 280,
                }}
              >
                {smi.output}
              </pre>
            </div>
          </Panel>
        )}
      </div>

      {/* Action toast */}
      {actionMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '10px 14px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            ...mono,
            fontSize: fs(10),
            color: 'var(--cream)',
            maxWidth: 480,
            zIndex: 100,
          }}
          onClick={() => setActionMsg(null)}
        >
          {actionMsg}
        </div>
      )}
    </div>
  )
}
