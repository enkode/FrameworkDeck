import type { Channel } from '../../config/channels'

interface Props {
  channels: Channel[]
  activeChannels: string[]
  onToggle: (id: string) => void
}

export function ChannelSelector({ channels, activeChannels, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 10px' }}>
      {channels.map((ch) => {
        const active = activeChannels.includes(ch.id)
        return (
          <button
            key={ch.id}
            onClick={() => onToggle(ch.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${active ? ch.color : '#2a2a2a'}`,
              color: active ? ch.color : '#444444',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: active ? ch.color : '#2a2a2a',
                boxShadow: active ? `0 0 4px ${ch.glowColor}` : 'none',
                flexShrink: 0,
              }}
            />
            {ch.label}
          </button>
        )
      })}
    </div>
  )
}
