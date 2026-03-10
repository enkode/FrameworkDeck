import { useState } from 'react'
import { LEDIndicator } from '../analog/LEDIndicator'
import type { VersionInfo, PowerApiResponse, SystemInfo } from '../../api/types'
import type { Theme } from '../../store/app'
import { THEMES, useAppStore } from '../../store/app'

interface Props {
  connected: boolean
  cliPresent: boolean
  versions?: VersionInfo
  power?: PowerApiResponse
  system?: SystemInfo
  theme: Theme
  onThemeChange: (t: Theme) => void
  paused: boolean
  onTogglePause: () => void
  timeWindow: number
  onTimeWindowChange: (s: number) => void
}

const TIME_WINDOWS = [60, 300, 600, 1800]
const THEME_LABELS: Record<Theme, string> = {
  reel: 'REEL',
  phosphor: 'PHOS',
  amber: 'AMBR',
  framework: 'FW',
}

const headerBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #181818',
  color: '#2e2e2e',
  fontFamily: 'JetBrains Mono, monospace',
  cursor: 'pointer',
  padding: '2px 6px',
  fontSize: 9,
}

export function DeviceHeader({
  connected, cliPresent, versions, power, system, theme,
  onThemeChange, paused, onTogglePause, timeWindow, onTimeWindowChange,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { fontScale, setFontScale, useFahrenheit, setUseFahrenheit, tempWarnC, setTempWarnC, yAutoScale, setYAutoScale } = useAppStore()

  const bat = power?.battery
  const deviceLabel = versions?.mainboard_type ?? (connected ? 'Framework' : 'NO DEVICE')
  const cpuLabel = system?.cpu?.replace('AMD ', '').replace('w/ Radeon ', '+ ') ?? null
  const gpuLabel = system?.dgpu?.replace('NVIDIA ', '').replace(' Laptop GPU', '') ?? null
  const acPresent = bat?.ac_present ?? false
  const soc = bat?.soc_pct ?? bat?.percentage

  return (
    <header
      style={{
        gridArea: 'header',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        height: 46,
        gap: 14,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Logo mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ width: 3, height: 20, background: 'var(--cream)' }} />
          <div style={{ width: 3, height: 20, background: 'var(--cream)', opacity: 0.5 }} />
          <div style={{ width: 3, height: 20, background: 'var(--cream)', opacity: 0.2 }} />
        </div>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.2em', color: 'var(--cream)', fontWeight: 600 }}>
          FRAMEWORK DECK
        </span>
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-2)' }} />

      {/* Device */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.06em', flexShrink: 0 }}>
        {deviceLabel}
      </span>

      {/* CPU */}
      {cpuLabel && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555555', flexShrink: 0 }}>
          {cpuLabel}
        </span>
      )}

      {/* GPU */}
      {gpuLabel && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#444444', flexShrink: 0 }}>
          {gpuLabel}
        </span>
      )}

      {/* RAM */}
      {system?.memory_total_mb && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#363636', flexShrink: 0 }}>
          {Math.round(system.memory_total_mb / 1024)}GB
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Power/battery */}
      {soc != null && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#666666', flexShrink: 0 }}>
          {acPresent ? '⚡' : '🔋'} {Math.round(soc)}%
        </span>
      )}

      {/* BIOS / EC */}
      {versions?.uefi_version && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#2a2a2a', flexShrink: 0 }}>
          BIOS {versions.uefi_version}
        </span>
      )}

      {/* Time window */}
      <div style={{ display: 'flex', gap: 2 }}>
        {TIME_WINDOWS.map((w) => (
          <button key={w} onClick={() => onTimeWindowChange(w)} style={{
            ...headerBtn,
            background: timeWindow === w ? '#1e1e1e' : 'transparent',
            border: `1px solid ${timeWindow === w ? '#333333' : '#181818'}`,
            color: timeWindow === w ? '#e8e0d0' : '#383838',
            fontSize: 10, padding: '3px 7px',
          }}>
            {w < 60 ? `${w}s` : `${w / 60}m`}
          </button>
        ))}
      </div>

      {/* Pause */}
      <button onClick={onTogglePause} style={{
        ...headerBtn,
        background: paused ? '#1a1000' : 'transparent',
        border: `1px solid ${paused ? '#664400' : '#1e1e1e'}`,
        color: paused ? '#cc8800' : '#444444',
        fontSize: 10, padding: '3px 10px', letterSpacing: '0.08em',
      }}>
        {paused ? '▶ RUN' : '■ STOP'}
      </button>

      {/* Themes */}
      <div style={{ display: 'flex', gap: 2 }}>
        {THEMES.map((t) => (
          <button key={t} onClick={() => onThemeChange(t)} style={{
            ...headerBtn,
            background: theme === t ? '#1e1e1e' : 'transparent',
            border: `1px solid ${theme === t ? '#333333' : '#181818'}`,
            color: theme === t ? '#e8e0d0' : '#2e2e2e',
          }}>
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Gear / Settings */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          title="Settings"
          style={{
            background: settingsOpen ? '#1e1e1e' : 'transparent',
            border: `1px solid ${settingsOpen ? '#333333' : '#1a1a1a'}`,
            color: settingsOpen ? 'var(--cream)' : '#444444',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14,
            width: 28, height: 28,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, lineHeight: 1,
            transition: 'all 0.15s',
          }}
        >
          ⚙
        </button>

        {/* Settings dropdown */}
        {settingsOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              background: 'var(--bg-panel-2)',
              border: '1px solid var(--border-2)',
              padding: '14px 16px',
              width: 240,
              zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--gray)', letterSpacing: '0.2em', marginBottom: 14 }}>
              DISPLAY SETTINGS
            </div>

            {/* Text size */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#666666' }}>PANEL TEXT SIZE</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--cream)' }}>{Math.round(fontScale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.5}
                step={0.05}
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cream)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#333333' }}>80%</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#333333' }}>150%</span>
              </div>
            </div>

            {/* Temperature unit */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#666666', marginBottom: 6 }}>TEMPERATURE UNIT</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[false, true].map((f) => (
                  <button
                    key={String(f)}
                    onClick={() => setUseFahrenheit(f)}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      background: useFahrenheit === f ? 'var(--blue-dim)' : 'transparent',
                      border: `1px solid ${useFahrenheit === f ? 'var(--blue)' : '#2a2a2a'}`,
                      color: useFahrenheit === f ? 'var(--blue)' : '#555555',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {f ? '°F' : '°C'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope Y-scale */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#666666', marginBottom: 6 }}>SCOPE Y-SCALE</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[false, true].map((on) => (
                  <button
                    key={String(on)}
                    onClick={() => setYAutoScale(on)}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      background: yAutoScale === on ? 'var(--blue-dim)' : 'transparent',
                      border: `1px solid ${yAutoScale === on ? 'var(--blue)' : '#2a2a2a'}`,
                      color: yAutoScale === on ? 'var(--blue)' : '#555555',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {on ? 'AUTO' : 'FIXED'}
                  </button>
                ))}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#2a2a2a', marginTop: 4 }}>
                AUTO zooms Y-axis to live data range
              </div>
            </div>

            {/* Warning threshold */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#666666' }}>TEMP WARNING</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: tempWarnC >= 90 ? '#cc2222' : '#c09060' }}>
                  {useFahrenheit ? `${Math.round(tempWarnC * 9 / 5 + 32)}°F` : `${tempWarnC}°C`}
                </span>
              </div>
              <input
                type="range"
                min={70}
                max={100}
                step={5}
                value={tempWarnC}
                onChange={(e) => setTempWarnC(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#cc2222', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#333333' }}>{useFahrenheit ? '158°F' : '70°C'}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#333333' }}>{useFahrenheit ? '212°F' : '100°C'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status LED */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <LEDIndicator active={connected} color={cliPresent ? '#22cc44' : '#cc8800'} pulse={connected} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: connected ? '#22cc44' : '#444444', letterSpacing: '0.1em' }}>
          {connected ? (cliPresent ? 'LIVE' : 'SVC') : 'OFFLINE'}
        </span>
      </div>
    </header>
  )
}
