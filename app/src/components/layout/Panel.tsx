import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
  rightContent?: ReactNode
  style?: React.CSSProperties
}

export function Panel({ label, children, rightContent, style }: Props) {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #222222',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 10px',
          borderBottom: '1px solid #1e1e1e',
          background: '#0d0d0d',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            letterSpacing: '0.15em',
            color: '#555555',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        {rightContent}
      </div>
      {/* Panel body */}
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}
