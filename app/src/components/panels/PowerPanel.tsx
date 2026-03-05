import type { Config, PowerData } from '../../api/types'
import { fmtWatts, fmtTemp } from '../../utils/format'
import { LEDIndicator } from '../analog/LEDIndicator'
import { Panel } from '../layout/Panel'

interface Props {
  config?: Config
  power?: PowerData
  onUpdate: (patch: Partial<Config>) => Promise<void>
}

function ReadoutRow({ label, value, color = '#e8e0d0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color }}>
        {value}
      </span>
    </div>
  )
}

function LevelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 4, background: '#0d0d0d', border: '1px solid #1a1a1a', marginBottom: 8, position: 'relative' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: 0.7 }} />
    </div>
  )
}

export function PowerPanel({ config, power, onUpdate }: Props) {
  const acPresent = power?.ac_present ?? false
  const profile = acPresent ? config?.power?.ac : config?.power?.battery
  const tdp = profile?.tdp_watts
  const thermal = profile?.thermal_limit_c
  const rateW = power?.present_rate_w

  // Determine power draw in watts from mA + mV if not directly available
  const powerW = rateW != null ? Math.abs(rateW) : null

  const handleTdpChange = async (delta: number) => {
    if (!config || !tdp?.enabled) return
    const newVal = Math.max(5, Math.min(145, tdp.value + delta))
    const key = acPresent ? 'ac' : 'battery'
    await onUpdate({
      power: {
        ...config.power,
        [key]: { ...profile, tdp_watts: { enabled: true, value: newVal } },
      },
    })
  }

  const handleThermalChange = async (delta: number) => {
    if (!config || !thermal?.enabled) return
    const newVal = Math.max(50, Math.min(100, thermal.value + delta))
    const key = acPresent ? 'ac' : 'battery'
    await onUpdate({
      power: {
        ...config.power,
        [key]: { ...profile, thermal_limit_c: { enabled: true, value: newVal } },
      },
    })
  }

  return (
    <Panel
      label="POWER"
      rightContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LEDIndicator active={acPresent} color="#2255aa" size={6} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444' }}>
            {acPresent ? 'AC' : 'BAT'}
          </span>
        </div>
      }
    >
      <div style={{ padding: 10 }}>
        {/* Power draw */}
        {powerW != null && (
          <>
            <ReadoutRow label="DRAW" value={fmtWatts(powerW)} color={powerW > 60 ? '#cc2222' : '#e8e0d0'} />
            <LevelBar value={powerW} max={150} color={powerW > 80 ? '#cc2222' : '#2255aa'} />
          </>
        )}

        {/* TDP */}
        {tdp && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: tdp.enabled ? '#555555' : '#333333' }}>
                TDP LIMIT
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => handleTdpChange(-5)} style={nudgeBtn}>−</button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: tdp.enabled ? '#e8e0d0' : '#444444', minWidth: 40, textAlign: 'center' }}>
                  {tdp.enabled ? `${tdp.value}W` : 'OFF'}
                </span>
                <button onClick={() => handleTdpChange(+5)} style={nudgeBtn}>+</button>
              </div>
            </div>
            {tdp.enabled && <LevelBar value={tdp.value} max={145} color="#e8e0d0" />}
          </div>
        )}

        {/* Thermal limit */}
        {thermal && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: thermal.enabled ? '#555555' : '#333333' }}>
                THERMAL
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => handleThermalChange(-5)} style={nudgeBtn}>−</button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: thermal.enabled ? '#e8e0d0' : '#444444', minWidth: 40, textAlign: 'center' }}>
                  {thermal.enabled ? fmtTemp(thermal.value) : 'OFF'}
                </span>
                <button onClick={() => handleThermalChange(+5)} style={nudgeBtn}>+</button>
              </div>
            </div>
            {thermal.enabled && <LevelBar value={thermal.value} max={100} color={thermal.value >= 90 ? '#cc2222' : '#c09060'} />}
          </div>
        )}

        {/* Profile indicator */}
        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
          <div
            style={{
              flex: 1,
              padding: '3px 0',
              textAlign: 'center',
              background: acPresent ? '#0d1a2a' : 'transparent',
              border: `1px solid ${acPresent ? '#2255aa' : '#1a1a1a'}`,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              color: acPresent ? '#2255aa' : '#333333',
              letterSpacing: '0.1em',
            }}
          >
            PLUGGED
          </div>
          <div
            style={{
              flex: 1,
              padding: '3px 0',
              textAlign: 'center',
              background: !acPresent ? '#1a0d0d' : 'transparent',
              border: `1px solid ${!acPresent ? '#cc2222' : '#1a1a1a'}`,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              color: !acPresent ? '#cc2222' : '#333333',
              letterSpacing: '0.1em',
            }}
          >
            BATTERY
          </div>
        </div>
      </div>
    </Panel>
  )
}

const nudgeBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #222222',
  color: '#666666',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  width: 20,
  height: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
}
