import { useState } from 'react'
import type { Config, FanMode } from '../../api/types'
import { fmtPct } from '../../utils/format'
import { Panel } from '../layout/Panel'

interface Props {
  config?: Config
  currentRpm?: number
  onModeChange: (mode: FanMode) => Promise<void>
  onDutyChange: (duty: number) => Promise<void>
}

function ScopeBar({
  value, max = 100, color = '#e8e0d0', label, unit = '%',
}: { value: number; max?: number; color?: string; label: string; unit?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555555', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color }}>
          {Math.round(value)}{unit}
        </span>
      </div>
      <div style={{ height: 6, background: '#111111', border: '1px solid #1e1e1e', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
        {/* tick marks */}
        {[25, 50, 75].map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: `${t}%`,
              top: 0,
              height: '100%',
              width: 1,
              background: '#222222',
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function DragSlider({
  value, min, max, onChange, color = '#e8e0d0',
}: { value: number; min: number; max: number; onChange: (v: number) => void; color?: string }) {
  const pct = ((value - min) / (max - min)) * 100

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(Math.round(min + frac * (max - min)))
  }

  return (
    <div
      onClick={handleClick}
      style={{
        height: 12,
        background: '#0d0d0d',
        border: '1px solid #222222',
        position: 'relative',
        cursor: 'crosshair',
        marginTop: 4,
      }}
    >
      {/* Fill */}
      <div style={{ width: `${pct}%`, height: '100%', background: `${color}22` }} />
      {/* Cursor */}
      <div
        style={{
          position: 'absolute',
          left: `${pct}%`,
          top: 0,
          height: '100%',
          width: 2,
          background: color,
          transform: 'translateX(-50%)',
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      {/* Ticks */}
      {[25, 50, 75].map((t) => (
        <div
          key={t}
          style={{
            position: 'absolute',
            left: `${t}%`,
            top: 0,
            height: '100%',
            width: 1,
            background: '#1e1e1e',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  )
}

export function FanPanel({ config, currentRpm, onModeChange, onDutyChange }: Props) {
  const fanConfig = config?.fan
  const mode: FanMode = fanConfig?.mode ?? 'disabled'
  const duty = fanConfig?.manual?.duty_pct ?? 0
  const [pendingDuty, setPendingDuty] = useState<number | null>(null)
  const displayDuty = pendingDuty ?? duty

  const MODES: FanMode[] = ['disabled', 'manual', 'curve']
  const MODE_LABELS: Record<FanMode, string> = {
    disabled: 'AUTO',
    manual: 'MANUAL',
    curve: 'CURVE',
  }

  const handleDutyChange = (v: number) => {
    setPendingDuty(v)
    onDutyChange(v).finally(() => setPendingDuty(null))
  }

  return (
    <Panel label="FAN CONTROL">
      <div style={{ padding: 10 }}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                flex: 1,
                padding: '4px 0',
                background: mode === m ? '#1e1e1e' : 'transparent',
                border: `1px solid ${mode === m ? '#c09060' : '#1e1e1e'}`,
                color: mode === m ? '#c09060' : '#444444',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Manual duty slider */}
        {mode === 'manual' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555555' }}>
                DUTY
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#c09060' }}>
                {fmtPct(displayDuty)}
              </span>
            </div>
            <DragSlider
              value={displayDuty}
              min={0}
              max={100}
              onChange={handleDutyChange}
              color="#c09060"
            />
          </div>
        )}

        {/* RPM readout */}
        <div style={{ marginTop: 8 }}>
          <ScopeBar
            value={currentRpm ?? 0}
            max={5000}
            color="#c09060"
            label="FAN RPM"
            unit=" rpm"
          />
        </div>

        {/* Auto mode note */}
        {mode === 'disabled' && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333333', marginTop: 4 }}>
            EC auto control active
          </div>
        )}

        {/* Curve mode note */}
        {mode === 'curve' && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333333', marginTop: 4 }}>
            {fanConfig?.curve
              ? `${fanConfig.curve.points.length} points · ${fanConfig.curve.hysteresis_c}°C hyst`
              : 'No curve configured'}
          </div>
        )}
      </div>
    </Panel>
  )
}
