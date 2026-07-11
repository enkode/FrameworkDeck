import { fs } from '../../utils/font'
import { useAppStore } from '../../store/app'
import { MODULES, modulesForPlatform } from '../../types/navigation'
import type { ModuleId } from '../../types/navigation'
import { usePlatform } from '../../hooks/usePlatform'
import {
  Activity, Keyboard, Fan, Zap, BatteryFull, LayoutGrid, Cpu, Settings, MonitorCog, RefreshCw
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Activity, Keyboard, Fan, Zap, BatteryFull, LayoutGrid, Cpu, Settings, MonitorCog, RefreshCw,
}

export function NavRail() {
  const { activeModule, setActiveModule, navExpanded, setNavExpanded, connected, updateAvailable } = useAppStore()
  const platform = usePlatform()

  const available = modulesForPlatform(platform)
  const monitorModules = available.filter((m) => m.category === 'monitor')
  const hardwareModules = available.filter((m) => m.category === 'hardware')
  const configModules = available.filter((m) => m.category === 'config')

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
            <span style={{ color: 'var(--cream-dim)', fontSize: fs(9) }}>DECK v2.3</span>
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
        <NavGroup modules={monitorModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} badgeFor={updateAvailable ? 'updates' : null} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        <NavGroup modules={hardwareModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} badgeFor={updateAvailable ? 'updates' : null} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        <NavGroup modules={configModules} activeModule={activeModule} onSelect={setActiveModule} expanded={navExpanded} badgeFor={updateAvailable ? 'updates' : null} />
      </div>
    </nav>
  )
}

function NavGroup({ modules, activeModule, onSelect, expanded, badgeFor }: {
  modules: typeof MODULES
  activeModule: ModuleId
  onSelect: (id: ModuleId) => void
  expanded: boolean
  badgeFor?: ModuleId | null
}) {
  return (
    <>
      {modules.map((mod) => {
        const Icon = ICON_MAP[mod.icon]
        const isActive = activeModule === mod.id
        const hasBadge = badgeFor === mod.id
        return (
          <button
            key={mod.id}
            onClick={() => onSelect(mod.id)}
            title={hasBadge ? `${mod.label} — update available` : mod.label}
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
              position: 'relative',
            }}
            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-panel-2)' }}
            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {Icon && <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />}
              {hasBadge && (
                <span style={{
                  position: 'absolute', top: -2, right: -3,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--tan)', boxShadow: '0 0 5px var(--tan)',
                }} />
              )}
            </span>
            {expanded && <span style={{ whiteSpace: 'nowrap' }}>{mod.label}</span>}
          </button>
        )
      })}
    </>
  )
}
