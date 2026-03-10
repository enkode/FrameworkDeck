import { useHealth } from '../hooks/useHealth'
import { usePower, useSystem, useVersions } from '../hooks/usePower'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function InfoRow({ label, value, color = '#888888' }: { label: string; value?: string | number | null; color?: string }) {
  if (value == null) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 10, color: '#555555', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ ...mono, fontSize: 11, color }}>{value}</span>
    </div>
  )
}

export function SystemModule() {
  const { connected, cliPresent, version } = useHealth()
  const { data: power } = usePower()
  const { data: system } = useSystem()
  const { data: versions } = useVersions()

  const bat = power?.battery

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg)',
      padding: '24px 32px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...mono, fontSize: 14, color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          SYSTEM INFORMATION
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <LEDIndicator active={connected} color={cliPresent ? '#22cc44' : '#cc8800'} size={6} />
          <span style={{ ...mono, fontSize: 10, color: connected ? '#22cc44' : '#444444' }}>
            {connected ? (cliPresent ? `framework-control ${version ?? ''}` : 'Service connected (CLI not found)') : 'Service offline'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1000 }}>

        {/* ── Hardware ─────────────────────────── */}
        <Panel label="HARDWARE">
          <div style={{ padding: '12px 14px' }}>
            <InfoRow label="MAINBOARD" value={versions?.mainboard_type} color="var(--cream)" />
            <InfoRow label="REVISION" value={versions?.mainboard_revision} />
            <InfoRow label="CPU" value={system?.cpu} color="var(--cream)" />
            <InfoRow label="GPU" value={system?.dgpu} />
            <InfoRow
              label="MEMORY"
              value={system?.memory_total_mb ? `${(system.memory_total_mb / 1024).toFixed(0)} GB` : null}
            />
            <InfoRow label="OS" value={system?.os} />
            {!connected && (
              <div style={{ ...mono, fontSize: 10, color: '#333333', marginTop: 8 }}>
                Connect framework-control service to view hardware info
              </div>
            )}
          </div>
        </Panel>

        {/* ── Firmware ─────────────────────────── */}
        <Panel label="FIRMWARE">
          <div style={{ padding: '12px 14px' }}>
            <InfoRow label="BIOS" value={versions?.uefi_version} color="var(--cream)" />
            <InfoRow label="BIOS DATE" value={versions?.uefi_release_date} />
            <InfoRow label="EC BUILD" value={versions?.ec_build_version} />
            <InfoRow label="EC IMAGE" value={versions?.ec_current_image} />
            {!versions && connected && (
              <div style={{ ...mono, fontSize: 10, color: '#333333', marginTop: 8 }}>
                Version info not available from service
              </div>
            )}
          </div>
        </Panel>

        {/* ── Power State ──────────────────────── */}
        <Panel label="POWER STATE">
          <div style={{ padding: '12px 14px' }}>
            <InfoRow label="AC" value={bat?.ac_present ? 'Connected' : 'Disconnected'} color={bat?.ac_present ? '#2255aa' : '#c09060'} />
            <InfoRow
              label="STATUS"
              value={bat?.charging ? 'Charging' : bat?.discharging ? 'Discharging' : 'Idle'}
              color={bat?.charging ? '#22cc44' : '#888888'}
            />
            {bat?.present_voltage_mv != null && (
              <InfoRow label="VOLTAGE" value={`${(bat.present_voltage_mv / 1000).toFixed(2)}V`} />
            )}
            {bat?.present_rate_ma != null && bat?.present_voltage_mv != null && (
              <InfoRow
                label="POWER DRAW"
                value={`${Math.abs((bat.present_rate_ma * bat.present_voltage_mv) / 1_000_000).toFixed(1)}W`}
                color={Math.abs((bat.present_rate_ma * bat.present_voltage_mv) / 1_000_000) > 80 ? '#cc2222' : '#888888'}
              />
            )}

            {/* Power control capabilities */}
            {power?.power_control && (
              <>
                <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 8, paddingTop: 8 }}>
                  <div style={{ ...mono, fontSize: 9, color: '#444444', letterSpacing: '0.1em', marginBottom: 6 }}>CAPABILITIES</div>
                </div>
                <InfoRow label="TDP CONTROL" value={power.power_control.capabilities.supports_tdp ? 'Supported' : 'No'} />
                <InfoRow label="THERMAL LIMIT" value={power.power_control.capabilities.supports_thermal ? 'Supported' : 'No'} />
                <InfoRow label="EPP" value={power.power_control.capabilities.supports_epp ? 'Supported' : 'No'} />
                {power.power_control.capabilities.tdp_min_watts != null && (
                  <InfoRow label="TDP RANGE" value={`${power.power_control.capabilities.tdp_min_watts}–${power.power_control.capabilities.tdp_max_watts}W`} />
                )}
                {power.power_control.current_state.tdp_limit_watts != null && (
                  <InfoRow label="CURRENT TDP" value={`${power.power_control.current_state.tdp_limit_watts}W`} color="var(--cream)" />
                )}
              </>
            )}
          </div>
        </Panel>

        {/* ── Battery Detail ───────────────────── */}
        {bat && (
          <Panel label="BATTERY DETAIL">
            <div style={{ padding: '12px 14px' }}>
              {bat.soc_pct != null && (
                <InfoRow label="STATE OF CHARGE" value={`${Math.round(bat.soc_pct)}%`} color="var(--cream)" />
              )}
              {bat.cycle_count != null && (
                <InfoRow label="CYCLE COUNT" value={bat.cycle_count} />
              )}
              {bat.design_capacity_mah != null && (
                <InfoRow label="DESIGN CAPACITY" value={`${bat.design_capacity_mah} mAh`} />
              )}
              {bat.last_full_charge_capacity_mah != null && (
                <InfoRow label="FULL CHARGE CAP" value={`${bat.last_full_charge_capacity_mah} mAh`} />
              )}
              {bat.remaining_capacity_mah != null && (
                <InfoRow label="REMAINING" value={`${bat.remaining_capacity_mah} mAh`} />
              )}
              {bat.design_voltage_mv != null && (
                <InfoRow label="DESIGN VOLTAGE" value={`${(bat.design_voltage_mv / 1000).toFixed(2)}V`} />
              )}
              {bat.last_full_charge_capacity_mah != null && bat.design_capacity_mah != null && (
                <InfoRow
                  label="HEALTH"
                  value={`${((bat.last_full_charge_capacity_mah / bat.design_capacity_mah) * 100).toFixed(1)}%`}
                  color={(bat.last_full_charge_capacity_mah / bat.design_capacity_mah) < 0.8 ? '#cc2222' : '#22cc44'}
                />
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
