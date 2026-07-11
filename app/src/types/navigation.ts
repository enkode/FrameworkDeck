import type { Platform } from '../utils/platform'

export type ModuleId =
  | 'dashboard'
  | 'keyboard'
  | 'fan'
  | 'power'
  | 'battery'
  | 'graphics'
  | 'input-modules'
  | 'updates'
  | 'system'
  | 'settings'

export interface ModuleDefinition {
  id: ModuleId
  label: string
  icon: string
  shortLabel: string
  category: 'monitor' | 'hardware' | 'config'
  /** When set, the module is only offered on these platforms. */
  platforms?: Platform[]
}

export const MODULES: ModuleDefinition[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: 'Activity',     shortLabel: 'DASH', category: 'monitor' },
  { id: 'keyboard',      label: 'Keyboard',       icon: 'Keyboard',     shortLabel: 'KBD',  category: 'hardware' },
  { id: 'fan',           label: 'Fan Control',    icon: 'Fan',          shortLabel: 'FAN',  category: 'hardware' },
  { id: 'power',         label: 'Power',          icon: 'Zap',          shortLabel: 'PWR',  category: 'hardware' },
  { id: 'battery',       label: 'Battery',        icon: 'BatteryFull',  shortLabel: 'BAT',  category: 'hardware' },
  { id: 'graphics',      label: 'Graphics',       icon: 'MonitorCog',   shortLabel: 'GPU',  category: 'hardware', platforms: ['windows'] },
  { id: 'input-modules', label: 'Input Modules',  icon: 'LayoutGrid',   shortLabel: 'MOD',  category: 'hardware' },
  { id: 'updates',       label: 'Updates',        icon: 'RefreshCw',    shortLabel: 'UPD',  category: 'config' },
  { id: 'system',        label: 'System',         icon: 'Cpu',          shortLabel: 'SYS',  category: 'config' },
  { id: 'settings',      label: 'Settings',       icon: 'Settings',     shortLabel: 'CFG',  category: 'config' },
]

/** Modules available on the given platform (null = platform not yet resolved). */
export function modulesForPlatform(platform: Platform | null): ModuleDefinition[] {
  return MODULES.filter((m) => !m.platforms || (platform !== null && m.platforms.includes(platform)))
}
