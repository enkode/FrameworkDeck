import { fs } from '../../utils/font'
import type { TelemetrySample } from '../../api/types'
import type { Channel } from '../../config/channels'

interface Props {
  channels: Channel[]
  activeChannels: string[]
  history: TelemetrySample[]
  paused: boolean
  connected: boolean
}

export function StatusBar({ channels, activeChannels, history, paused, connected }: Props) {
  const lastSample = history[history.length - 1]
  const activeChList = channels.filter((c) => activeChannels.includes(c.id))

  // Compute stats for each active channel
  const stats = activeChList.map((ch) => {
    const values = history
      .map((s) => ch.getValue(s))
      .filter((v): v is number => v !== null)
    const cur = lastSample ? ch.getValue(lastSample) : null
    const min = values.length ? Math.min(...values) : null
    const max = values.length ? Math.max(...values) : null
    return { ch, cur, min, max }
  })

  return (
    <div
      style={{
        gridArea: 'status',
        background: '#080808',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        height: 28,
        gap: 20,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Status flag */}
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: fs(8),
          letterSpacing: '0.15em',
          color: paused ? '#cc8800' : connected ? '#22cc44' : '#cc2222',
          flexShrink: 0,
        }}
      >
        {paused ? '■ STOP' : connected ? '● RUN' : '✕ DISC'}
      </span>

      <div style={{ width: 1, height: 12, background: '#1e1e1e' }} />

      {/* Channel readouts */}
      {stats.map(({ ch, cur, min, max }) => (
        <div key={ch.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: fs(8),
              color: ch.color,
              letterSpacing: '0.05em',
            }}
          >
            {ch.label}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fs(10), color: '#e8e0d0' }}>
            {cur != null ? ch.formatValue(cur) : '--'}
          </span>
          {min != null && max != null && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fs(8), color: '#333333' }}>
              ↓{ch.formatValue(min)} ↑{ch.formatValue(max)}
            </span>
          )}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Sample count */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fs(8), color: '#2a2a2a' }}>
        {history.length} samples
      </span>
    </div>
  )
}
