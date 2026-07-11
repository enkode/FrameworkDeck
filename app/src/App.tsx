import { useEffect } from 'react'
import { SWRConfig } from 'swr'
import { useAppStore } from './store/app'
import { AppShell } from './layouts/AppShell'
import { DashboardModule } from './modules/DashboardModule'
import { KeyboardModule } from './modules/KeyboardModule'
import { SettingsModule } from './modules/SettingsModule'
import { FanModule } from './modules/FanModule'
import { SystemModule } from './modules/SystemModule'
import { PowerModule } from './modules/PowerModule'
import { BatteryModule } from './modules/BatteryModule'
import { GraphicsModule } from './modules/GraphicsModule'
import { InputModulesModule } from './modules/InputModulesModule'
import { UpdatesModule } from './modules/UpdatesModule'
import { usePlatform } from './hooks/usePlatform'
import { autoCheck } from './services/UpdatesService'
import { openExternal } from './utils/openExternal'

function AppInner() {
  const { theme, activeModule, reducedMotion, highContrast, fontScale, uiScale, setUpdateAvailable } = useAppStore()
  const platform = usePlatform()

  // Throttled (24h) launch-time check for new Framework BIOS/driver releases
  useEffect(() => {
    autoCheck().then((s) => {
      if (s && s.biosUpdateAvailable !== null) setUpdateAvailable(s.biosUpdateAvailable)
    }).catch(() => { /* offline or KB unreachable — badge just stays off */ })
  }, [setUpdateAvailable])

  // Tauri (wry) drops target="_blank" window requests — especially on Linux
  // webkit2gtk. Intercept every external anchor click once, globally, and
  // route it through the opener plugin so links open in the system browser.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href^="http"]')
      if (!anchor) return
      e.preventDefault()
      openExternal((anchor as HTMLAnchorElement).href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Apply theme + accessibility attributes on mount and change
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'reel') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    root.setAttribute('data-reduced-motion', String(reducedMotion))
    root.setAttribute('data-high-contrast', String(highContrast))
    root.style.setProperty('--font-scale', String(fontScale))
    root.style.setProperty('--ui-scale', String(uiScale))
  }, [theme, reducedMotion, highContrast, fontScale, uiScale])

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />
      case 'keyboard':
        return <KeyboardModule />
      case 'fan':
        return <FanModule />
      case 'power':
        return <PowerModule />
      case 'battery':
        return <BatteryModule />
      case 'graphics':
        // Windows-only module; a persisted activeModule from a Windows session
        // must not strand a Linux user on a broken tab.
        return platform === 'windows' ? <GraphicsModule /> : <DashboardModule />
      case 'input-modules':
        return <InputModulesModule />
      case 'updates':
        return <UpdatesModule />
      case 'system':
        return <SystemModule />
      case 'settings':
        return <SettingsModule />
      default:
        return <DashboardModule />
    }
  }

  return (
    <AppShell>
      {renderModule()}
    </AppShell>
  )
}

export default function App() {
  return (
    <SWRConfig value={{ errorRetryCount: 3, errorRetryInterval: 2000 }}>
      <AppInner />
    </SWRConfig>
  )
}
