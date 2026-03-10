import type { PowerApiResponse, Config } from '../../api/types'
import { fmtPct, fmtWatts, fmtMilliAmps, fmtMilliVolts } from '../../utils/format'
import { LEDIndicator } from '../analog/LEDIndicator'
import { Panel } from '../layout/Panel'

interface Props {
  power?: PowerApiResponse
  config?: Config
  onUpdate: (patch: Partial<Config>) => Promise<void>
}

function CellBar({ value, max = 100, color, segments = 10 }: { value: number; max?: number; color: string; segments?: number }) {
  const filled = Math.max(0, Math.round((Math.min(value, max) / max) * segments))
  return (
    <div style={{ display: 'flex', gap: 2, height: 14 }}>
      {Array.from({ length: segments }, (_, i) => (
        <div key={i} style={{
          flex: 1,
          background: i < filled ? color : '#111111',
          border: `1px solid ${i < filled ? color : '#1e1e1e'}`,
          opacity: i < filled ? (0.55 + (i / segments) * 0.45) : 0.25,
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

function StatRow({ label, value, color = '#888888' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#444444' }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color }}>{value}</span>
    </div>
  )
}

export function BatteryPanel({ power, config, onUpdate }: Props) {
  const bat = power?.battery
  const soc = bat?.soc_pct ?? bat?.percentage
  const acPresent = bat?.ac_present ?? false
  const charging = bat?.charging ?? false
  const discharging = bat?.discharging ?? (!charging && !acPresent)

  const healthPct = bat?.last_full_charge_capacity_mah && bat?.design_capacity_mah
    ? (bat.last_full_charge_capacity_mah / bat.design_capacity_mah) * 100
    : null

  const rateW = bat?.present_rate_ma && bat?.present_voltage_mv
    ? Math.abs((bat.present_rate_ma * bat.present_voltage_mv) / 1_000_000)
    : null

  const chargeLimit = config?.battery?.charge_limit_max_pct

  const handleLimitChange = async (delta: number) => {
    if (!config || !chargeLimit?.enabled) return
    const newVal = Math.max(25, Math.min(100, chargeLimit.value + delta))
    await onUpdate({ battery: { ...config.battery, charge_limit_max_pct: { enabled: true, value: newVal } } })
  }

  return (
    <Panel
      label="BATTERY"
      rightContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LEDIndicator active={charging} color="#22cc44" pulse={charging} size={6} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555555' }}>
            {charging ? 'CHG' : discharging ? 'DSCHG' : 'IDLE'}
          </span>
        </div>
      }
    >
      <div style={{ padding: '10px 12px' }}>
        {/* SoC */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555555' }}>STATE OF CHARGE</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: soc != null && soc < 15 ? '#cc2222' : '#e8e0d0', lineHeight: 1 }}>
              {soc != null ? `${Math.round(soc)}%` : '--'}
            </span>
          </div>
          <CellBar value={soc ?? 0} color={soc != null && soc < 15 ? '#cc2222' : soc != null && soc < 30 ? '#c09060' : '#e8e0d0'} />
        </div>

        {/* Health */}
        {healthPct != null && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#444444' }}>HEALTH</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: healthPct < 80 ? '#cc2222' : '#888888' }}>
                {fmtPct(healthPct)}
              </span>
            </div>
            <CellBar value={healthPct} color={healthPct < 80 ? '#cc2222' : '#444444'} segments={8} />
          </div>
        )}

        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 8, marginTop: 2 }}>
          {rateW != null && (
            <StatRow label={discharging ? 'DRAW' : 'INPUT'} value={`${discharging ? '-' : '+'}${fmtWatts(rateW)}`} color={discharging ? '#c09060' : '#22cc44'} />
          )}
          {bat?.present_voltage_mv != null && (
            <StatRow label="VOLTAGE" value={fmtMilliVolts(bat.present_voltage_mv)} color="#555555" />
          )}
          {bat?.present_rate_ma != null && (
            <StatRow label="CURRENT" value={fmtMilliAmps(bat.present_rate_ma)} color="#555555" />
          )}
          {bat?.cycle_count != null && (
            <StatRow label="CYCLES" value={`${bat.cycle_count}`} color="#444444" />
          )}
          {bat?.remaining_capacity_mah != null && bat?.last_full_charge_capacity_mah != null && (
            <StatRow label="CAPACITY" value={`${Math.round(bat.remaining_capacity_mah)}/${Math.round(bat.last_full_charge_capacity_mah)} mAh`} color="#3a3a3a" />
          )}
        </div>

        {/* Charge limit */}
        {chargeLimit && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: chargeLimit.enabled ? '#555555' : '#2a2a2a' }}>
                MAX CHARGE
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleLimitChange(-5)} style={nudgeBtn}>−</button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: chargeLimit.enabled ? '#2255aa' : '#333333', minWidth: 44, textAlign: 'center' }}>
                  {chargeLimit.enabled ? fmtPct(chargeLimit.value) : 'OFF'}
                </span>
                <button onClick={() => handleLimitChange(+5)} style={nudgeBtn}>+</button>
              </div>
            </div>
            {chargeLimit.enabled && (
              <div style={{ height: 4, background: '#111111', border: '1px solid #1a1a1a' }}>
                <div style={{ width: `${chargeLimit.value}%`, height: '100%', background: '#2255aa', opacity: 0.7 }} />
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

const nudgeBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #222222',
  color: '#666666', fontFamily: 'JetBrains Mono, monospace',
  fontSize: 14, width: 24, height: 24, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
}
