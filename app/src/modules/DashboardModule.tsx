import { useEffect, useMemo } from 'react'
import { useHealth } from '../hooks/useHealth'
import { useThermalHistory } from '../hooks/useThermal'
import { usePower, useSystem, useVersions } from '../hooks/usePower'
import { useConfig } from '../hooks/useConfig'
import { useAppStore } from '../store/app'
import { buildChannels, DEFAULT_CHANNELS } from '../config/channels'
import { DeviceHeader } from '../components/panels/DeviceHeader'
import { OscilloscopeView } from '../components/display/OscilloscopeView'
import { ChannelSelector } from '../components/display/ChannelSelector'
import { ControlsPanel } from '../components/layout/ControlsPanel'
import { StatusBar } from '../components/layout/StatusBar'

export function DashboardModule() {
  const { connected, cliPresent } = useHealth()
  const { data: history = [] } = useThermalHistory()
  const { data: power } = usePower()
  const { data: system } = useSystem()
  const { data: versions } = useVersions()
  const { data: config, updateConfig, updateFanDuty, setFanMode } = useConfig()
  const { theme, setTheme, activeChannels, toggleChannel, pauseScope, togglePause, timeWindow, setTimeWindow, fontScale } = useAppStore()

  const channels = useMemo(() => {
    const lastSample = history[history.length - 1]
    if (!lastSample) return DEFAULT_CHANNELS
    const keys = Object.keys(lastSample.temps)
    const rpmCount = lastSample.rpms.length
    if (keys.length === 0 && rpmCount === 0) return DEFAULT_CHANNELS
    return buildChannels(keys, rpmCount)
  }, [history])

  const currentRpm = useMemo(() => {
    const last = history[history.length - 1]
    return last?.rpms[0]
  }, [history])

  useEffect(() => {
    if (channels.length === 0) return
    const hasValid = activeChannels.some((id) => channels.some((c) => c.id === id))
    if (!hasValid) {
      const preferred = channels.filter((c) =>
        ['APU', 'dGPU temp', 'fan_0', 'fan_1'].includes(c.id)
      )
      const seed = preferred.length > 0 ? preferred : channels.slice(0, 4)
      useAppStore.getState().setChannels(seed.map((c) => c.id))
    }
  }, [channels, activeChannels])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplate: `"header header" auto "toolbar toolbar" auto "scope controls" 1fr "status status" auto / 1fr ${Math.round(230 * fontScale)}px`,
        height: '100%',
        background: 'var(--bg)',
        gap: 0,
      }}
    >
      <DeviceHeader
        connected={connected}
        cliPresent={cliPresent}
        versions={versions}
        power={power}
        system={system}
        theme={theme}
        onThemeChange={setTheme}
        paused={pauseScope}
        onTogglePause={togglePause}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
      />

      <div style={{
        gridArea: 'toolbar',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <ChannelSelector
          channels={channels}
          activeChannels={activeChannels}
          onToggle={toggleChannel}
        />
      </div>

      <main style={{
        gridArea: 'scope',
        overflow: 'hidden',
        position: 'relative',
        background: '#0d0d0d',
      }}>
        {connected ? (
          <OscilloscopeView
            history={history}
            channels={channels}
            activeChannels={activeChannels}
            timeWindow={timeWindow}
            paused={pauseScope}
          />
        ) : (
          <OfflineScreen />
        )}
      </main>

      <div style={{ gridArea: 'controls', overflow: 'hidden' }}>
        <ControlsPanel
          config={config}
          power={power}
          currentRpm={currentRpm}
          onFanModeChange={setFanMode}
          onFanDutyChange={updateFanDuty}
          onConfigUpdate={updateConfig}
        />
      </div>

      <StatusBar
        channels={channels}
        activeChannels={activeChannels}
        history={history}
        paused={pauseScope}
        connected={connected}
      />
    </div>
  )
}

function OfflineScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, background: '#0d0d0d',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${i * 10}%`, top: 0, bottom: 0, width: 1, background: '#e8e0d0' }} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', top: `${i * 12.5}%`, left: 0, right: 0, height: 1, background: '#e8e0d0' }} />
        ))}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#222222', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
        NO SIGNAL
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#1a1a1a', letterSpacing: '0.1em' }}>
        Start framework-control service on port 8090
      </div>
    </div>
  )
}
