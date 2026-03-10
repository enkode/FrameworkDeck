import { fs } from '../../utils/font'
import { useAppStore } from '../../store/app'
import { MODULES } from '../../types/navigation'
import type { ModuleId } from '../../types/navigation'
import {
  Activity, Keyboard, Fan, Zap, BatteryFull, LayoutGrid, Cpu, Settings
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Activity, Keyboard, Fan, Zap, BatteryFull, LayoutGrid, Cpu, Settings,
}

export function NavRail() {
  const { activeModule, setActiveModule, navExpanded, setNavExpanded, connected } = useAppStore()

  const monitorModules = MODULES.filter((m) => m.category === 'monitor')
  const hardwareModules = MODULES.filter((m) => m.category === 'hardware')
  const configModules = MODULES.filter((m) => m.category === 'config')

  return (
    <nav
      onMouseEnter={() => setNavExpanded(true)}
      onMouseLeave={() => setNavExpanded(false)}
      style={{
        width: navExpanded ? 160 : 48,
        minWidth: navExpanded ? 160 : 48,
        height: '100%',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 150ms ease, min-width 150ms ease',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Logo area */}
      <div style={{
        padding: '12px 8px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
      }}>
        <div style={{
          width: 32, height: 32, minWidth: 32,
          borderRadius: 6,
          background: 'var(--tan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700, fontSize: fs(14), color: 'var(--bg)',
        }}>
          FD
        </div>
        {navExpanded && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fs(11), color: 'var(--cream)', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
            FRAMEWORK<br />
            <span style={{ color: 'var(--cream-dim)', fontSize: fs(9) }}>DECK v2.0</span>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, minWidth: 8, borderRadius: '50%',
          background: connected ? 'var(--green)' : 'var(--red)',
          boxShadow: connected ? '0 0 6px var(--green)' : '0 0 6px var(--red)',
        }} />
        {navExpanded && (
          <span style={{ fontSize: fs(9), color: 'var(--cream-dim)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {connected ? 'ONLINE' : 'OFFLINE'}
          </span>
        )}
      </div>

      {/* Module groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        <NavGroup modules={monitorModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        <NavGroup modules={hardwareModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        <NavGroup modules={configModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} />
      </div>
    </nav>
  )
}

function NavGroup({ modules, activeModule, onSelect, expanded }: {
  modules: typeof MODULES
  activeModule: ModuleId
  onSelect: (id: ModuleId) => void
  expanded: boolean
}) {
  return (
    <>
      {modules.map((mod) => {
        const Icon = ICON_MAP[mod.icon]
        const isActive = activeModule === mod.id
        return (
          <button
            key={mod.id}
            onClick={() => onSelect(mod.id)}
            title={mod.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: isActive ? 'var(--bg-panel-2)' : 'transparent',
              color: isActive ? 'var(--cream)' : 'var(--cream-dim)',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: fs(10),
              letterSpacing: '0.08em',
              textAlign: 'left',
              borderLeft: isActive ? '2px solid var(--tan)' : '2px solid transparent',
              transition: 'background 100ms, color 100ms',
            }}
            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-panel-2)' }}
            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            {Icon && <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />}
            {expanded && <span style={{ whiteSpace: 'nowrap' }}>{mod.label}</span>}
          </button>
        )
      })}
    </>
  )
}
