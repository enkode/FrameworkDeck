interface Props {
  active: boolean
  color?: string
  pulse?: boolean
  size?: number
  label?: string
}

export function LEDIndicator({ active, color = '#22cc44', pulse = false, size = 7, label }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: active ? color : '#1a1a1a',
          border: `1px solid ${active ? color : '#2a2a2a'}`,
          boxShadow: active ? `0 0 6px ${color}, 0 0 2px ${color}` : 'none',
          animation: active && pulse ? 'led-pulse 2s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      {label && (
        <span style={{ color: active ? '#e8e0d0' : '#444444', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
          {label}
        </span>
      )}
    </div>
  )
}
