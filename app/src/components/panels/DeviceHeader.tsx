import { LEDIndicator } from '../analog/LEDIndicator'
import type { VersionInfo, PowerData, SystemInfo } from '../../api/types'
import type { Theme } from '../../store/app'
import { THEMES } from '../../store/app'

interface Props {
  connected: boolean
  cliPresent: boolean
  versions?: VersionInfo
  power?: PowerData
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

export function DeviceHeader({
  connected, cliPresent, versions, power, system, theme,
  onThemeChange, paused, onTogglePause, timeWindow, onTimeWindowChange,
}: Props) {
  const deviceLabel = versions?.mainboard_type ?? (connected ? 'Framework' : 'NO DEVICE')
  const cpuLabel = system?.cpu_name?.replace('AMD ', '').replace('Intel(R) Core(TM) ', '').replace('Intel(R) ', '') ?? '---'
  const acStatus = power?.ac_present ? '⚡ AC' : '🔋 BAT'
  const socPct = power?.soc != null ? `${Math.round(power.soc)}%` : null

  return (
    <header
      style={{
        gridArea: 'header',
        background: '#0a0a0a',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        height: 44,
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ width: 3, height: 18, background: '#e8e0d0' }} />
          <div style={{ width: 3, height: 18, background: '#e8e0d0', opacity: 0.5 }} />
          <div style={{ width: 3, height: 18, background: '#e8e0d0', opacity: 0.25 }} />
        </div>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#e8e0d0',
            fontWeight: 600,
          }}
        >
          FRAMEWORK DECK
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#222222' }} />

      {/* Device name */}
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#888888',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}
      >
        {deviceLabel}
      </span>

      {/* CPU */}
      {cpuLabel !== '---' && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444', flexShrink: 0 }}>
          {cpuLabel}
        </span>
      )}

      {/* GPU */}
      {system?.dgpu_name && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444', flexShrink: 0 }}>
          {system.dgpu_name.replace('NVIDIA ', '').replace(' Laptop GPU', '')}
        </span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Power status */}
      {socPct && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#666666', flexShrink: 0 }}>
          {acStatus} {socPct}
        </span>
      )}

      {/* Time window */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {TIME_WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => onTimeWindowChange(w)}
            style={{
              background: timeWindow === w ? '#1e1e1e' : 'transparent',
              border: `1px solid ${timeWindow === w ? '#333333' : '#1a1a1a'}`,
              color: timeWindow === w ? '#e8e0d0' : '#444444',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              padding: '2px 6px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {w < 60 ? `${w}s` : `${w / 60}m`}
          </button>
        ))}
      </div>

      {/* Pause button */}
      <button
        onClick={onTogglePause}
        title={paused ? 'Resume' : 'Pause'}
        style={{
          background: paused ? '#1a1000' : 'transparent',
          border: `1px solid ${paused ? '#664400' : '#1e1e1e'}`,
          color: paused ? '#cc8800' : '#444444',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          padding: '3px 8px',
          cursor: 'pointer',
          letterSpacing: '0.1em',
        }}
      >
        {paused ? '▶ RUN' : '■ STOP'}
      </button>

      {/* Theme selector */}
      <div style={{ display: 'flex', gap: 2 }}>
        {THEMES.map((t) => (
          <button
            key={t}
            onClick={() => onThemeChange(t)}
            style={{
              background: theme === t ? '#1e1e1e' : 'transparent',
              border: `1px solid ${theme === t ? '#333333' : '#1a1a1a'}`,
              color: theme === t ? '#e8e0d0' : '#333333',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              padding: '2px 5px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <LEDIndicator
          active={connected}
          color={cliPresent ? '#22cc44' : '#cc8800'}
          pulse={connected}
        />
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: connected ? '#22cc44' : '#444444',
            letterSpacing: '0.1em',
          }}
        >
          {connected ? (cliPresent ? 'LIVE' : 'SVC') : 'OFFLINE'}
        </span>
      </div>
    </header>
  )
}
