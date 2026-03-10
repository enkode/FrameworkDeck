import { useHealth } from '../hooks/useHealth'
import { usePower } from '../hooks/usePower'
import { useConfig } from '../hooks/useConfig'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'
import type { Config } from '../api/types'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function CellBar({ value, max = 100, color, segments = 20 }: { value: number; max?: number; color: string; segments?: number }) {
  const filled = Math.max(0, Math.round((Math.min(value, max) / max) * segments))
  return (
    <div style={{ display: 'flex', gap: 2, height: 20 }}>
      {Array.from({ length: segments }, (_, i) => (
        <div key={i} style={{
          flex: 1,
          background: i < filled ? color : '#111111',
          border: `1px solid ${i < filled ? color : '#1e1e1e'}`,
          opacity: i < filled ? (0.5 + (i / segments) * 0.5) : 0.2,
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

function StatRow({ label, value, color = '#888888', large }: { label: string; value: string; color?: string; large?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 10, color: '#555555' }}>{label}</span>
      <span style={{ ...mono, fontSize: large ? 16 : 12, color, lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function LevelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 5, background: '#0d0d0d', border: '1px solid #1a1a1a', position: 'relative', marginBottom: 10 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
      {[25, 50, 75].map((t) => (
        <div key={t} style={{ position: 'absolute', left: `${t}%`, top: 0, height: '100%', width: 1, background: '#1e1e1e', pointerEvents: 'none' }} />
      ))}
    </div>
  )
}

export function BatteryModule() {
  const { connected } = useHealth()
  const { data: power } = usePower()
  const { data: config, updateConfig } = useConfig()

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
    await updateConfig({ battery: { ...config.battery, charge_limit_max_pct: { enabled: true, value: newVal } } })
  }

  const socColor = soc != null && soc < 15 ? '#cc2222' : soc != null && soc < 30 ? '#c09060' : '#e8e0d0'

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...mono, fontSize: 14, color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          BATTERY HEALTH
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LEDIndicator active={charging} color="#22cc44" pulse={charging} size={6} />
            <span style={{ ...mono, fontSize: 10, color: charging ? '#22cc44' : discharging ? '#c09060' : '#555555' }}>
              {charging ? 'CHARGING' : discharging ? 'DISCHARGING' : 'IDLE'}
            </span>
          </div>
          {soc != null && (
            <span style={{ ...mono, fontSize: 14, color: socColor }}>
              {Math.round(soc)}%
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1000 }}>

        {/* ── State of Charge ──────────────────── */}
        <Panel label="STATE OF CHARGE">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...mono, fontSize: 11, color: '#555555' }}>SOC</span>
              <span style={{ ...mono, fontSize: 24, color: socColor }}>
                {soc != null ? `${Math.round(soc)}%` : '--'}
              </span>
            </div>
            <CellBar value={soc ?? 0} color={socColor} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ ...mono, fontSize: 9, color: '#333333' }}>0%</span>
              <span style={{ ...mono, fontSize: 9, color: '#333333' }}>100%</span>
            </div>
          </div>
        </Panel>

        {/* ── Health ───────────────────────────── */}
        {healthPct != null && (
          <Panel label="BATTERY HEALTH">
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...mono, fontSize: 11, color: '#555555' }}>HEALTH</span>
                <span style={{ ...mono, fontSize: 20, color: healthPct < 80 ? '#cc2222' : healthPct < 90 ? '#c09060' : '#22cc44' }}>
                  {healthPct.toFixed(1)}%
                </span>
              </div>
              <CellBar value={healthPct} color={healthPct < 80 ? '#cc2222' : healthPct < 90 ? '#c09060' : '#22cc44'} segments={16} />

              {bat?.design_capacity_mah != null && bat?.last_full_charge_capacity_mah != null && (
                <div style={{ marginTop: 12 }}>
                  <StatRow label="DESIGN" value={`${bat.design_capacity_mah} mAh`} />
                  <StatRow label="CURRENT MAX" value={`${bat.last_full_charge_capacity_mah} mAh`} />
                  <StatRow
                    label="CAPACITY LOSS"
                    value={`${(bat.design_capacity_mah - bat.last_full_charge_capacity_mah)} mAh`}
                    color={healthPct < 80 ? '#cc2222' : '#888888'}
                  />
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* ── Live Stats ───────────────────────── */}
        <Panel label="LIVE STATS">
          <div style={{ padding: '14px 16px' }}>
            {rateW != null && (
              <>
                <StatRow
                  label={discharging ? 'DISCHARGE RATE' : 'CHARGE RATE'}
                  value={`${discharging ? '-' : '+'}${rateW.toFixed(1)}W`}
                  color={discharging ? '#c09060' : '#22cc44'}
                  large
                />
                <LevelBar value={rateW} max={100} color={discharging ? '#c09060' : '#22cc44'} />
              </>
            )}
            {bat?.present_voltage_mv != null && (
              <StatRow label="VOLTAGE" value={`${(bat.present_voltage_mv / 1000).toFixed(2)}V`} />
            )}
            {bat?.present_rate_ma != null && (
              <StatRow label="CURRENT" value={`${Math.abs(bat.present_rate_ma)} mA`} />
            )}
            {bat?.remaining_capacity_mah != null && (
              <StatRow label="REMAINING" value={`${bat.remaining_capacity_mah} mAh`} />
            )}
            {bat?.cycle_count != null && (
              <StatRow label="CYCLE COUNT" value={`${bat.cycle_count}`} />
            )}
          </div>
        </Panel>

        {/* ── Charge Limit ─────────────────────── */}
        <Panel label="CHARGE LIMIT">
          <div style={{ padding: '14px 16px' }}>
            {chargeLimit ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ ...mono, fontSize: 11, color: chargeLimit.enabled ? '#555555' : '#2a2a2a' }}>
                    MAX CHARGE
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => handleLimitChange(-5)} style={nudgeBtn}>−</button>
                    <span style={{ ...mono, fontSize: 16, color: chargeLimit.enabled ? '#2255aa' : '#333333', minWidth: 52, textAlign: 'center' }}>
                      {chargeLimit.enabled ? `${chargeLimit.value}%` : 'OFF'}
                    </span>
                    <button onClick={() => handleLimitChange(+5)} style={nudgeBtn}>+</button>
                  </div>
                </div>
                {chargeLimit.enabled && (
                  <>
                    <LevelBar value={chargeLimit.value} max={100} color="#2255aa" />
                    <div style={{ ...mono, fontSize: 9, color: '#333333', marginTop: 4 }}>
                      Battery will stop charging at {chargeLimit.value}%. Extends battery lifespan.
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ ...mono, fontSize: 10, color: '#333333' }}>
                Charge limit not available — requires framework-control service
              </div>
            )}
          </div>
        </Panel>

        {/* ── Power Source ─────────────────────── */}
        <Panel label="POWER SOURCE">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['AC', 'BATTERY'] as const).map((label) => {
                const isActive = label === 'AC' ? acPresent : !acPresent
                const col = label === 'AC' ? '#2255aa' : '#c09060'
                return (
                  <div key={label} style={{
                    flex: 1, padding: '10px 0', textAlign: 'center',
                    background: isActive ? `${col}18` : 'transparent',
                    border: `1px solid ${isActive ? col : '#1a1a1a'}`,
                    ...mono, fontSize: 11,
                    color: isActive ? col : '#2a2a2a', letterSpacing: '0.1em',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <LEDIndicator active={isActive} color={col} size={5} />
                      {label}
                    </div>
                  </div>
                )
              })}
            </div>

            {bat?.charger_voltage_mv != null && (
              <StatRow label="CHARGER VOLTAGE" value={`${(bat.charger_voltage_mv / 1000).toFixed(1)}V`} />
            )}
            {bat?.charger_current_ma != null && (
              <StatRow label="CHARGER CURRENT" value={`${bat.charger_current_ma} mA`} />
            )}
            {bat?.charge_input_current_ma != null && (
              <StatRow label="INPUT CURRENT" value={`${bat.charge_input_current_ma} mA`} />
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

const nudgeBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #252525',
  color: '#666666', fontFamily: 'JetBrains Mono, monospace',
  fontSize: 14, width: 28, height: 28, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
}
