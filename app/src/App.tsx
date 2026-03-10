import { useEffect } from 'react'
import { SWRConfig } from 'swr'
import { useAppStore } from './store/app'
import { AppShell } from './layouts/AppShell'
import { DashboardModule } from './modules/DashboardModule'
import { PlaceholderModule } from './modules/PlaceholderModule'
import { KeyboardModule } from './modules/KeyboardModule'
import { SettingsModule } from './modules/SettingsModule'
import { FanModule } from './modules/FanModule'
import { SystemModule } from './modules/SystemModule'

function AppInner() {
  const { theme, activeModule, reducedMotion, highContrast, fontScale } = useAppStore()

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
  }, [theme, reducedMotion, highContrast, fontScale])

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />
      case 'keyboard':
        return <KeyboardModule />
      case 'fan':
        return <FanModule />
      case 'power':
        return (
          <PlaceholderModule
            title="Power Management"
            description="TDP, thermal limits, EPP preferences, CPU governor, and frequency controls for both AC and battery profiles."
            features={[
              'TDP limit control (RyzenAdj)',
              'Thermal limit adjustment',
              'EPP preference presets',
              'CPU governor selection',
              'AC vs Battery profiles',
            ]}
          />
        )
      case 'battery':
        return (
          <PlaceholderModule
            title="Battery Health"
            description="Battery charge limit management, health monitoring, discharge rate tracking, and cycle count history."
            features={[
              'Charge limit control',
              'Battery health & capacity',
              'Charge rate (C-rate) limiting',
              'Cycle count tracking',
              'Voltage & current monitoring',
            ]}
          />
        )
      case 'input-modules':
        return (
          <PlaceholderModule
            title="Input Modules"
            description="Manage Framework Laptop 16 input modules — LED Matrix display, numpad, macropad, and expansion cards."
            features={[
              'LED Matrix pattern editor',
              'Expansion card detection',
              'Input module hot-swap status',
              'Keyboard backlight control',
              'Fingerprint LED control',
            ]}
          />
        )
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
