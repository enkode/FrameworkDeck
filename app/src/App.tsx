import { useEffect, useMemo } from 'react'
import { SWRConfig } from 'swr'
import { useHealth } from './hooks/useHealth'
import { useThermalHistory } from './hooks/useThermal'
import { usePower, useSystem, useVersions } from './hooks/usePower'
import { useConfig } from './hooks/useConfig'
import { useAppStore } from './store/app'
import { buildChannels, DEFAULT_CHANNELS } from './config/channels'
import { DeviceHeader } from './components/panels/DeviceHeader'
import { OscilloscopeView } from './components/display/OscilloscopeView'
import { ChannelSelector } from './components/display/ChannelSelector'
import { ControlsPanel } from './components/layout/ControlsPanel'
import { StatusBar } from './components/layout/StatusBar'

function AppInner() {
  const { connected, cliPresent, version } = useHealth()
  const { data: history = [] } = useThermalHistory()
  const { data: power } = usePower()
  const { data: system } = useSystem()
  const { data: versions } = useVersions()
  const { data: config, updateConfig, updateFanDuty, setFanMode } = useConfig()
  const { theme, setTheme, activeChannels, toggleChannel, pauseScope, togglePause, timeWindow, setTimeWindow } = useAppStore()

  // Initialize theme on mount
  useEffect(() => {
    if (theme !== 'reel') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  // Build channels dynamically from what the device reports
  const channels = useMemo(() => {
    const lastSample = history[history.length - 1]
    if (!lastSample) return DEFAULT_CHANNELS
    const keys = Object.keys(lastSample.temps)
    const rpmCount = lastSample.rpms.length
    if (keys.length === 0 && rpmCount === 0) return DEFAULT_CHANNELS
    return buildChannels(keys, rpmCount)
  }, [history])

  // Current fan RPM from latest sample
  const currentRpm = useMemo(() => {
    const last = history[history.length - 1]
    return last?.rpms[0]
  }, [history])

  // On first connection, seed active channels with what device reports
  useEffect(() => {
    if (connected && channels.length > 0 && activeChannels.length === 0) {
      useAppStore.getState().setChannels(channels.slice(0, 4).map((c) => c.id))
    }
  }, [connected, channels, activeChannels.length])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplate: '"header header" auto "toolbar toolbar" auto "scope controls" 1fr "status status" auto / 1fr 230px',
        height: '100vh',
        background: 'var(--bg)',
        gap: 0,
      }}
    >
      {/* Header bar */}
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

      {/* Channel toolbar */}
      <div
        style={{
          gridArea: 'toolbar',
          background: '#090909',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ChannelSelector
          channels={channels}
          activeChannels={activeChannels}
          onToggle={toggleChannel}
        />
      </div>

      {/* Main oscilloscope */}
      <main
        style={{
          gridArea: 'scope',
          overflow: 'hidden',
          position: 'relative',
          background: '#0d0d0d',
        }}
      >
        {connected ? (
          <OscilloscopeView
            history={history}
            channels={channels}
            activeChannels={activeChannels}
            timeWindow={timeWindow}
            paused={pauseScope}
          />
        ) : (
          <OfflineScreen version={version} />
        )}
      </main>

      {/* Controls panel */}
      <ControlsPanel
        config={config}
        power={power}
        currentRpm={currentRpm}
        onFanModeChange={setFanMode}
        onFanDutyChange={updateFanDuty}
        onConfigUpdate={updateConfig}
      />

      {/* Status bar */}
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

function OfflineScreen(_: { version?: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#0d0d0d',
      }}
    >
      {/* Animated graticule grid */}
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
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#151515', marginTop: 8 }}>
        framework-control-service.exe
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SWRConfig value={{ errorRetryCount: 3, errorRetryInterval: 2000 }}>
      <AppInner />
    </SWRConfig>
  )
}
