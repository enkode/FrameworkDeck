import type { Config, PowerApiResponse } from '../../api/types'
import { fmtWatts } from '../../utils/format'
import { useAppStore } from '../../store/app'
import { LEDIndicator } from '../analog/LEDIndicator'
import { Panel } from '../layout/Panel'

interface Props {
  config?: Config
  power?: PowerApiResponse
  onUpdate: (patch: Partial<Config>) => Promise<void>
}

function LevelBar({ value, max, color, warning }: { value: number; max: number; color: string; warning?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const isWarn = warning != null && value >= warning
  return (
    <div style={{ height: 5, background: '#0d0d0d', border: '1px solid #1a1a1a', position: 'relative', marginBottom: 10 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: isWarn ? '#cc2222' : color, transition: 'width 0.4s' }} />
      {[25, 50, 75].map((t) => (
        <div key={t} style={{ position: 'absolute', left: `${t}%`, top: 0, height: '100%', width: 1, background: '#1e1e1e', pointerEvents: 'none' }} />
      ))}
    </div>
  )
}

function NudgeRow({
  label, value, unit, onDec, onInc, enabled = true,
}: { label: string; value: string; unit?: string; onDec: () => void; onInc: () => void; enabled?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: enabled ? '#666666' : '#333333', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onDec} style={nudgeBtn}>−</button>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: enabled ? '#e8e0d0' : '#444444', minWidth: 52, textAlign: 'center' }}>
            {value}{unit}
          </span>
          <button onClick={onInc} style={nudgeBtn}>+</button>
        </div>
      </div>
    </div>
  )
}

export function PowerPanel({ config, power, onUpdate }: Props) {
  const { useFahrenheit } = useAppStore()
  const bat = power?.battery
  const ctrl = power?.power_control
  const acPresent = bat?.ac_present ?? false

  // Live current state from hardware
  const liveTdp = ctrl?.current_state.tdp_limit_watts
  const liveThermal = ctrl?.current_state.thermal_limit_c
  const caps = ctrl?.capabilities

  // Config desired values (may be null if not set)
  const profile = acPresent ? config?.power?.ac : config?.power?.battery
  const cfgTdp = profile?.tdp_watts
  const cfgThermal = profile?.thermal_limit_c

  // Power draw from battery
  const rateW = bat?.present_rate_ma && bat?.present_voltage_mv
    ? Math.abs((bat.present_rate_ma * bat.present_voltage_mv) / 1_000_000)
    : null

  const tdpDisplay = cfgTdp?.enabled ? cfgTdp.value : liveTdp
  const thermalDisplay = cfgThermal?.enabled ? cfgThermal.value : liveThermal
  const tdpMax = caps?.tdp_max_watts ?? 145
  const tdpMin = caps?.tdp_min_watts ?? 5

  const handleTdpChange = async (delta: number) => {
    if (!config) return
    const current = tdpDisplay ?? 45
    const newVal = Math.max(tdpMin, Math.min(tdpMax, current + delta))
    const key = acPresent ? 'ac' : 'battery'
    const existing = acPresent ? config.power.ac : config.power.battery
    await onUpdate({
      power: {
        ...config.power,
        [key]: { ...(existing ?? {}), tdp_watts: { enabled: true, value: newVal } },
      },
    })
  }

  const handleThermalChange = async (delta: number) => {
    if (!config) return
    const current = thermalDisplay ?? 90
    const newVal = Math.max(50, Math.min(100, current + delta))
    const key = acPresent ? 'ac' : 'battery'
    const existing = acPresent ? config.power.ac : config.power.battery
    await onUpdate({
      power: {
        ...config.power,
        [key]: { ...(existing ?? {}), thermal_limit_c: { enabled: true, value: newVal } },
      },
    })
  }

  return (
    <Panel
      label="POWER"
      rightContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LEDIndicator active={acPresent} color="#2255aa" size={6} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555555' }}>
            {acPresent ? 'AC' : 'BAT'}
          </span>
        </div>
      }
    >
      <div style={{ padding: '10px 12px' }}>
        {/* Live power draw */}
        {rateW != null && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555555' }}>DRAW</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: rateW > 80 ? '#cc2222' : '#e8e0d0' }}>
                {fmtWatts(rateW)}
              </span>
            </div>
            <LevelBar value={rateW} max={150} color="#2255aa" warning={100} />
          </>
        )}

        {/* TDP */}
        {(tdpDisplay != null || caps?.supports_tdp) && (
          <>
            <NudgeRow
              label="TDP"
              value={tdpDisplay != null ? `${tdpDisplay}` : '--'}
              unit="W"
              onDec={() => handleTdpChange(-5)}
              onInc={() => handleTdpChange(+5)}
              enabled={tdpDisplay != null}
            />
            {tdpDisplay != null && <LevelBar value={tdpDisplay} max={tdpMax} color="#e8e0d0" warning={120} />}
          </>
        )}

        {/* Thermal limit */}
        {(thermalDisplay != null || caps?.supports_thermal) && (
          <>
            <NudgeRow
              label="THERMAL"
              value={thermalDisplay != null
                ? useFahrenheit
                  ? `${Math.round(thermalDisplay * 9 / 5 + 32)}`
                  : `${thermalDisplay}`
                : '--'}
              unit={useFahrenheit ? '°F' : '°C'}
              onDec={() => handleThermalChange(-5)}
              onInc={() => handleThermalChange(+5)}
              enabled={thermalDisplay != null}
            />
            {thermalDisplay != null && <LevelBar value={thermalDisplay} max={100} color="#c09060" warning={95} />}
            {/* Safety warning */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: -4, marginBottom: 8,
              padding: '5px 6px', background: '#1a0e00', border: '1px solid #2e1800',
            }}>
              <span style={{ color: '#cc8800', fontSize: 9, flexShrink: 0, lineHeight: 1.4 }}>⚠</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#664400', lineHeight: 1.4 }}>
                Modifying thermal limits may cause system instability or hardware damage. Use with caution.
              </span>
            </div>
          </>
        )}

        {/* Live TDP readout if different from config */}
        {liveTdp != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #1a1a1a' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333333' }}>LIVE TDP</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555555' }}>{liveTdp}W</span>
          </div>
        )}

        {/* AC / Battery profile tabs */}
        <div style={{ marginTop: 10, display: 'flex', gap: 3 }}>
          {(['AC', 'BAT'] as const).map((label) => {
            const isActive = label === 'AC' ? acPresent : !acPresent
            const col = label === 'AC' ? '#2255aa' : '#cc2222'
            return (
              <div key={label} style={{
                flex: 1, padding: '4px 0', textAlign: 'center',
                background: isActive ? `${col}18` : 'transparent',
                border: `1px solid ${isActive ? col : '#1a1a1a'}`,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: isActive ? col : '#2a2a2a', letterSpacing: '0.1em',
              }}>
                {label}
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

const nudgeBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #252525',
  color: '#666666',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 14,
  width: 24,
  height: 24,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
}
