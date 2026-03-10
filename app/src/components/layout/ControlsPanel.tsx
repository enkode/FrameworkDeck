import { fs } from '../../utils/font'
import type { Config, PowerApiResponse } from '../../api/types'
import { FanPanel } from '../panels/FanPanel'
import { PowerPanel } from '../panels/PowerPanel'
import { BatteryPanel } from '../panels/BatteryPanel'

interface Props {
  config?: Config
  power?: PowerApiResponse
  currentRpm?: number
  onFanModeChange: (mode: 'disabled' | 'manual' | 'curve') => Promise<void>
  onFanDutyChange: (duty: number) => Promise<void>
  onConfigUpdate: (patch: Partial<Config>) => Promise<void>
}

const PRESETS = [
  { id: 'silent', label: 'SILENT', tdp: 15, thermal: 75 },
  { id: 'balanced', label: 'BALANCED', tdp: 45, thermal: 88 },
  { id: 'performance', label: 'PERFORM', tdp: 95, thermal: 95 },
  { id: 'turbo', label: 'TURBO', tdp: 145, thermal: 100 },
]

export function ControlsPanel({
  config, power, currentRpm, onFanModeChange, onFanDutyChange, onConfigUpdate,
}: Props) {
  const handlePreset = async (preset: typeof PRESETS[0]) => {
    if (!config) return
    const acProfile = {
      ...(config.power.ac ?? {}),
      tdp_watts: { enabled: true, value: preset.tdp },
      thermal_limit_c: { enabled: true, value: preset.thermal },
    }
    const batProfile = {
      ...(config.power.battery ?? {}),
      tdp_watts: { enabled: true, value: Math.round(preset.tdp * 0.6) },
    }
    await onConfigUpdate({ power: { ac: acProfile, battery: batProfile } })
  }

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Presets */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fs(9), color: '#333333', letterSpacing: '0.15em', marginBottom: 6 }}>
          PRESET
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p)}
              style={{
                padding: '5px 4px',
                background: 'transparent',
                border: '1px solid #1e1e1e',
                color: '#444444',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fs(9),
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#333333'
                e.currentTarget.style.color = '#e8e0d0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e1e1e'
                e.currentTarget.style.color = '#444444'
              }}
            >
              {p.label}
              <div style={{ color: '#333333', fontSize: fs(8), marginTop: 1 }}>{p.tdp}W</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fan control */}
      <FanPanel
        config={config}
        currentRpm={currentRpm}
        onModeChange={onFanModeChange}
        onDutyChange={onFanDutyChange}
      />

      {/* Power control */}
      <PowerPanel
        config={config}
        power={power}
        onUpdate={onConfigUpdate}
      />

      {/* Battery */}
      <BatteryPanel
        power={power}
        config={config}
        onUpdate={onConfigUpdate}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          padding: '6px 10px',
          borderTop: '1px solid #1a1a1a',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: fs(8),
          color: '#2a2a2a',
          letterSpacing: '0.05em',
        }}
      >
        FRAMEWORK DECK · framework-control API
      </div>
    </div>
  )
}
