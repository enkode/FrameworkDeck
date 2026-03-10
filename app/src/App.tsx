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
import { InputModulesModule } from './modules/InputModulesModule'

function AppInner() {
  const { theme, activeModule, reducedMotion, highContrast, fontScale, uiScale } = useAppStore()

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
      case 'input-modules':
        return <InputModulesModule />
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
