import type { ReactNode } from 'react'
import { fs } from '../../utils/font'

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
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
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
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: fs(9),
            letterSpacing: '0.15em',
            color: 'var(--gray)',
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
