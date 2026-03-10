import { usePower } from '../hooks/usePower'
import { useConfig } from '../hooks/useConfig'
import { useAppStore } from '../store/app'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'
import type { PowerProfile } from '../api/types'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function LevelBar({ value, max, color, warning }: { value: number; max: number; color: string; warning?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const isWarn = warning != null && value >= warning
  return (
    <div style={{ height: 6, background: '#0d0d0d', border: '1px solid #1a1a1a', position: 'relative', marginBottom: 10 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: isWarn ? '#cc2222' : color, transition: 'width 0.4s' }} />
      {[25, 50, 75].map((t) => (
        <div key={t} style={{ position: 'absolute', left: `${t}%`, top: 0, height: '100%', width: 1, background: '#1e1e1e', pointerEvents: 'none' }} />
      ))}
    </div>
  )
}

function NudgeRow({ label, value, unit, onDec, onInc, enabled = true }: {
  label: string; value: string; unit?: string; onDec: () => void; onInc: () => void; enabled?: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 11, color: enabled ? '#666666' : '#333333', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onDec} style={nudgeBtn}>−</button>
          <span style={{ ...mono, fontSize: 14, color: enabled ? '#e8e0d0' : '#444444', minWidth: 52, textAlign: 'center' }}>
            {value}{unit}
          </span>
          <button onClick={onInc} style={nudgeBtn}>+</button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, color = '#888888' }: { label: string; value?: string | null; color?: string }) {
  if (value == null) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 10, color: '#555555' }}>{label}</span>
      <span style={{ ...mono, fontSize: 11, color }}>{value}</span>
    </div>
  )
}

export function PowerModule() {
  const { data: power } = usePower()
  const { data: config, updateConfig } = useConfig()
  const { useFahrenheit } = useAppStore()

  const bat = power?.battery
  const ctrl = power?.power_control
  const acPresent = bat?.ac_present ?? false
  const caps = ctrl?.capabilities

  const liveTdp = ctrl?.current_state.tdp_limit_watts
  const liveThermal = ctrl?.current_state.thermal_limit_c
  const liveEpp = ctrl?.current_state.epp_preference
  const liveGov = ctrl?.current_state.governor

  const profile = acPresent ? config?.power?.ac : config?.power?.battery
  const cfgTdp = profile?.tdp_watts
  const cfgThermal = profile?.thermal_limit_c

  const tdpDisplay = cfgTdp?.enabled ? cfgTdp.value : liveTdp
  const thermalDisplay = cfgThermal?.enabled ? cfgThermal.value : liveThermal
  const tdpMax = caps?.tdp_max_watts ?? 145
  const tdpMin = caps?.tdp_min_watts ?? 5

  const rateW = bat?.present_rate_ma && bat?.present_voltage_mv
    ? Math.abs((bat.present_rate_ma * bat.present_voltage_mv) / 1_000_000)
    : null

  const updateProfile = async (key: 'ac' | 'battery', patch: Partial<PowerProfile>) => {
    if (!config) return
    const existing = key === 'ac' ? config.power.ac : config.power.battery
    await updateConfig({
      power: { ...config.power, [key]: { ...(existing ?? {}), ...patch } },
    })
  }

  const handleTdpChange = async (delta: number) => {
    const current = tdpDisplay ?? 45
    const newVal = Math.max(tdpMin, Math.min(tdpMax, current + delta))
    await updateProfile(acPresent ? 'ac' : 'battery', { tdp_watts: { enabled: true, value: newVal } })
  }

  const handleThermalChange = async (delta: number) => {
    const current = thermalDisplay ?? 90
    const newVal = Math.max(50, Math.min(100, current + delta))
    await updateProfile(acPresent ? 'ac' : 'battery', { thermal_limit_c: { enabled: true, value: newVal } })
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...mono, fontSize: 14, color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          POWER MANAGEMENT
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LEDIndicator active={acPresent} color="#2255aa" size={6} />
            <span style={{ ...mono, fontSize: 10, color: acPresent ? '#2255aa' : '#c09060' }}>
              {acPresent ? 'AC POWER' : 'BATTERY'}
            </span>
          </div>
          {rateW != null && (
            <span style={{ ...mono, fontSize: 11, color: rateW > 80 ? '#cc2222' : '#888888' }}>
              {rateW.toFixed(1)}W
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1000 }}>

        {/* ── TDP Control ──────────────────────── */}
        <Panel label="TDP LIMIT">
          <div style={{ padding: '12px 14px' }}>
            {(tdpDisplay != null || caps?.supports_tdp) ? (
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

                {liveTdp != null && cfgTdp?.enabled && liveTdp !== cfgTdp.value && (
                  <InfoRow label="LIVE TDP" value={`${liveTdp}W`} color="#555555" />
                )}

                <div style={{ ...mono, fontSize: 9, color: '#333333', marginTop: 4 }}>
                  Range: {tdpMin}W – {tdpMax}W (step 5W)
                </div>
              </>
            ) : (
              <div style={{ ...mono, fontSize: 10, color: '#333333' }}>TDP control not available</div>
            )}
          </div>
        </Panel>

        {/* ── Thermal Limit ────────────────────── */}
        <Panel label="THERMAL LIMIT">
          <div style={{ padding: '12px 14px' }}>
            {(thermalDisplay != null || caps?.supports_thermal) ? (
              <>
                <NudgeRow
                  label="THERMAL"
                  value={thermalDisplay != null
                    ? useFahrenheit ? `${Math.round(thermalDisplay * 9 / 5 + 32)}` : `${thermalDisplay}`
                    : '--'}
                  unit={useFahrenheit ? '°F' : '°C'}
                  onDec={() => handleThermalChange(-5)}
                  onInc={() => handleThermalChange(+5)}
                  enabled={thermalDisplay != null}
                />
                {thermalDisplay != null && <LevelBar value={thermalDisplay} max={100} color="#c09060" warning={95} />}

                {/* Safety warning */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 4,
                  padding: '6px 8px', background: '#1a0e00', border: '1px solid #2e1800',
                }}>
                  <span style={{ color: '#cc8800', fontSize: 10, flexShrink: 0 }}>!</span>
                  <span style={{ ...mono, fontSize: 9, color: '#664400', lineHeight: 1.5 }}>
                    Modifying thermal limits may cause system instability or hardware damage. Use with caution.
                  </span>
                </div>
              </>
            ) : (
              <div style={{ ...mono, fontSize: 10, color: '#333333' }}>Thermal limit control not available</div>
            )}
          </div>
        </Panel>

        {/* ── EPP / Governor ───────────────────── */}
        {(caps?.supports_epp || caps?.supports_governor) && (
          <Panel label="CPU POLICY">
            <div style={{ padding: '12px 14px' }}>
              {caps?.supports_epp && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...mono, fontSize: 10, color: '#666666', marginBottom: 6 }}>EPP PREFERENCE</div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {(caps.available_epp_preferences ?? ['performance', 'balance_performance', 'balance_power', 'power']).map((pref) => (
                      <button
                        key={pref}
                        onClick={() => updateProfile(acPresent ? 'ac' : 'battery', { epp_preference: { enabled: true, value: pref } })}
                        style={{
                          padding: '5px 10px',
                          background: liveEpp === pref ? 'var(--blue-dim)' : 'transparent',
                          border: `1px solid ${liveEpp === pref ? 'var(--blue)' : '#2a2a2a'}`,
                          color: liveEpp === pref ? 'var(--blue)' : '#555555',
                          ...mono, fontSize: 9, letterSpacing: '0.05em',
                          cursor: 'pointer',
                        }}
                      >
                        {pref.replace(/_/g, ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {caps?.supports_governor && (
                <div>
                  <div style={{ ...mono, fontSize: 10, color: '#666666', marginBottom: 6 }}>CPU GOVERNOR</div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {(caps.available_governors ?? ['performance', 'powersave', 'schedutil']).map((gov) => (
                      <button
                        key={gov}
                        onClick={() => updateProfile(acPresent ? 'ac' : 'battery', { governor: { enabled: true, value: gov } })}
                        style={{
                          padding: '5px 10px',
                          background: liveGov === gov ? 'var(--blue-dim)' : 'transparent',
                          border: `1px solid ${liveGov === gov ? 'var(--blue)' : '#2a2a2a'}`,
                          color: liveGov === gov ? 'var(--blue)' : '#555555',
                          ...mono, fontSize: 9, letterSpacing: '0.05em',
                          cursor: 'pointer',
                        }}
                      >
                        {gov.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* ── Profile Tabs ─────────────────────── */}
        <Panel label="ACTIVE PROFILE">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(['AC', 'BATTERY'] as const).map((label) => {
                const isActive = label === 'AC' ? acPresent : !acPresent
                const col = label === 'AC' ? '#2255aa' : '#c09060'
                return (
                  <div key={label} style={{
                    flex: 1, padding: '8px 0', textAlign: 'center',
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
            <div style={{ ...mono, fontSize: 9, color: '#333333' }}>
              Settings apply to the {acPresent ? 'AC' : 'battery'} profile. Switch power source to configure the other profile.
            </div>
          </div>
        </Panel>

        {/* ── Live Power Draw ──────────────────── */}
        {rateW != null && (
          <Panel label="POWER DRAW">
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...mono, fontSize: 11, color: '#555555' }}>DRAW</span>
                <span style={{ ...mono, fontSize: 18, color: rateW > 80 ? '#cc2222' : 'var(--cream)' }}>
                  {rateW.toFixed(1)}W
                </span>
              </div>
              <LevelBar value={rateW} max={150} color="#2255aa" warning={100} />
            </div>
          </Panel>
        )}
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
