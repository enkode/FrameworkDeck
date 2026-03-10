export type ModuleId =
  | 'dashboard'
  | 'keyboard'
  | 'fan'
  | 'power'
  | 'battery'
  | 'input-modules'
  | 'system'
  | 'settings'

export interface ModuleDefinition {
  id: ModuleId
  label: string
  icon: string
  shortLabel: string
  category: 'monitor' | 'hardware' | 'config'
}

export const MODULES: ModuleDefinition[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: 'Activity',     shortLabel: 'DASH', category: 'monitor' },
  { id: 'keyboard',      label: 'Keyboard',       icon: 'Keyboard',     shortLabel: 'KBD',  category: 'hardware' },
  { id: 'fan',           label: 'Fan Control',    icon: 'Fan',          shortLabel: 'FAN',  category: 'hardware' },
  { id: 'power',         label: 'Power',          icon: 'Zap',          shortLabel: 'PWR',  category: 'hardware' },
  { id: 'battery',       label: 'Battery',        icon: 'BatteryFull',  shortLabel: 'BAT',  category: 'hardware' },
  { id: 'input-modules', label: 'Input Modules',  icon: 'LayoutGrid',   shortLabel: 'MOD',  category: 'hardware' },
  { id: 'system',        label: 'System',         icon: 'Cpu',          shortLabel: 'SYS',  category: 'config' },
  { id: 'settings',      label: 'Settings',       icon: 'Settings',     shortLabel: 'CFG',  category: 'config' },
]
