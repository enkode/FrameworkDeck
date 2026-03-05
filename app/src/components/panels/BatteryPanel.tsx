import type { PowerData, Config } from '../../api/types'
import { fmtPct, fmtWatts, fmtMilliAmps, fmtMilliVolts } from '../../utils/format'
import { LEDIndicator } from '../analog/LEDIndicator'
import { Panel } from '../layout/Panel'

interface Props {
  power?: PowerData
  config?: Config
  onUpdate: (patch: Partial<Config>) => Promise<void>
}

function CellBar({ value, max = 100, color, segments = 10 }: { value: number; max?: number; color: string; segments?: number }) {
  const filled = Math.round((value / max) * segments)
  return (
    <div style={{ display: 'flex', gap: 2, height: 12 }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: i < filled ? color : '#111111',
            border: `1px solid ${i < filled ? color : '#1e1e1e'}`,
            opacity: i < filled ? (1 - (segments - 1 - i) * 0.04) : 0.4,
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  )
}

export function BatteryPanel({ power, config, onUpdate }: Props) {
  const bat = power as any // battery info is embedded in power response
  const soc = bat?.soc ?? bat?.percentage
  const acPresent = power?.ac_present ?? false
  const charging = bat?.charging ?? false
  const rateW = bat?.present_rate_w
  const rateMa = bat?.present_rate_ma
  const voltageMv = bat?.present_voltage_mv
  const healthPct =
    bat?.last_full_charge_capacity_mah && bat?.design_capacity_mah
      ? (bat.last_full_charge_capacity_mah / bat.design_capacity_mah) * 100
      : null
  const cycleCount = bat?.cycle_count
  const chargeLimit = config?.battery?.charge_limit_max_pct

  const handleChargeLimitChange = async (delta: number) => {
    if (!config || !chargeLimit?.enabled) return
    const newVal = Math.max(25, Math.min(100, chargeLimit.value + delta))
    await onUpdate({
      battery: { ...config.battery, charge_limit_max_pct: { enabled: true, value: newVal } },
    })
  }

  const powerW = rateW != null ? Math.abs(rateW) : rateMa && voltageMv ? Math.abs((rateMa * voltageMv) / 1_000_000) : null
  const isDischarging = !acPresent || (!charging && acPresent && powerW && powerW > 1)

  return (
    <Panel
      label="BATTERY"
      rightContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LEDIndicator active={charging} color="#22cc44" pulse={charging} size={6} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444' }}>
            {charging ? 'CHG' : isDischarging ? 'DSCHG' : 'IDLE'}
          </span>
        </div>
      }
    >
      <div style={{ padding: 10 }}>
        {/* SoC */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444' }}>STATE OF CHARGE</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: soc != null && soc < 20 ? '#cc2222' : '#e8e0d0' }}>
              {soc != null ? fmtPct(soc) : '--'}
            </span>
          </div>
          <CellBar
            value={soc ?? 0}
            max={100}
            color={soc != null && soc < 20 ? '#cc2222' : soc != null && soc < 40 ? '#c09060' : '#e8e0d0'}
          />
        </div>

        {/* Health */}
        {healthPct != null && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444' }}>HEALTH</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: healthPct < 80 ? '#cc2222' : '#888888' }}>
                {fmtPct(healthPct)}
              </span>
            </div>
            <CellBar value={healthPct} max={100} color={healthPct < 80 ? '#cc2222' : '#444444'} segments={8} />
          </div>
        )}

        {/* Power draw */}
        {powerW != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444444' }}>
              {isDischarging ? 'DRAW' : 'INPUT'}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#888888' }}>
              {isDischarging ? '-' : '+'}{fmtWatts(powerW)}
            </span>
          </div>
        )}

        {/* Voltage / current */}
        {voltageMv && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333333' }}>
              {fmtMilliVolts(voltageMv)}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333333' }}>
              {fmtMilliAmps(rateMa)}
            </span>
          </div>
        )}

        {/* Cycle count */}
        {cycleCount != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333333' }}>CYCLES</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555555' }}>{cycleCount}</span>
          </div>
        )}

        {/* Charge limit */}
        {chargeLimit && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: chargeLimit.enabled ? '#444444' : '#2a2a2a' }}>
                MAX CHARGE
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => handleChargeLimitChange(-5)}
                  style={nudgeBtn}
                >
                  −
                </button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: chargeLimit.enabled ? '#2255aa' : '#333333', minWidth: 36, textAlign: 'center' }}>
                  {chargeLimit.enabled ? fmtPct(chargeLimit.value) : 'OFF'}
                </span>
                <button
                  onClick={() => handleChargeLimitChange(+5)}
                  style={nudgeBtn}
                >
                  +
                </button>
              </div>
            </div>
            {chargeLimit.enabled && (
              <div style={{ height: 3, background: '#111111', border: '1px solid #1a1a1a', marginTop: 4 }}>
                <div style={{ width: `${chargeLimit.value}%`, height: '100%', background: '#2255aa', opacity: 0.6 }} />
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

const nudgeBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1e1e1e',
  color: '#555555',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  width: 18,
  height: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
}
