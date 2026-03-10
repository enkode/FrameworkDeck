import type { ReactNode } from 'react'
import { NavRail } from '../components/nav/NavRail'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <NavRail />
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}
