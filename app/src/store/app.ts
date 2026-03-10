import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../api/types'
import type { ModuleId } from '../types/navigation'

export type { Theme }

const THEMES: Theme[] = ['reel', 'phosphor', 'amber', 'framework']
export { THEMES }

interface AppState {
  // Theme
  theme: Theme
  setTheme: (t: Theme) => void

  // Navigation
  activeModule: ModuleId
  setActiveModule: (m: ModuleId) => void

  // Connection (framework-control service)
  connected: boolean
  setConnected: (c: boolean) => void
  cliPresent: boolean
  setCliPresent: (c: boolean) => void

  // Oscilloscope
  activeChannels: string[]
  toggleChannel: (ch: string) => void
  setChannels: (chs: string[]) => void
  pauseScope: boolean
  togglePause: () => void
  timeWindow: number
  setTimeWindow: (s: number) => void
  yAutoScale: boolean
  setYAutoScale: (v: boolean) => void
  tempWarnC: number
  setTempWarnC: (c: number) => void

  // Preferences
  apiBase: string
  setApiBase: (url: string) => void
  fontScale: number
  setFontScale: (s: number) => void
  uiScale: number
  setUiScale: (s: number) => void
  useFahrenheit: boolean
  setUseFahrenheit: (f: boolean) => void

  // Accessibility
  reducedMotion: boolean
  setReducedMotion: (v: boolean) => void
  highContrast: boolean
  setHighContrast: (v: boolean) => void

  // Nav rail
  navExpanded: boolean
  setNavExpanded: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'reel',
      setTheme: (theme) => {
        if (theme === 'reel') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
        set({ theme })
      },

      // Navigation
      activeModule: 'dashboard',
      setActiveModule: (activeModule) => set({ activeModule }),

      // Connection
      connected: false,
      setConnected: (connected) => set({ connected }),
      cliPresent: false,
      setCliPresent: (cliPresent) => set({ cliPresent }),

      // Oscilloscope
      activeChannels: ['apu_temp', 'gpu_temp', 'fan_0'],
      toggleChannel: (ch) =>
        set((s) => ({
          activeChannels: s.activeChannels.includes(ch)
            ? s.activeChannels.filter((c) => c !== ch)
            : [...s.activeChannels, ch],
        })),
      setChannels: (chs) => set({ activeChannels: chs }),
      pauseScope: false,
      togglePause: () => set((s) => ({ pauseScope: !s.pauseScope })),
      timeWindow: 300,
      setTimeWindow: (timeWindow) => set({ timeWindow }),
      yAutoScale: false,
      setYAutoScale: (yAutoScale) => set({ yAutoScale }),
      tempWarnC: 90,
      setTempWarnC: (tempWarnC) => set({ tempWarnC }),

      // Preferences
      apiBase: 'http://127.0.0.1:8090',
      setApiBase: (apiBase) => set({ apiBase }),
      fontScale: 1.0,
      setFontScale: (fontScale) => set({ fontScale }),
      uiScale: 1.0,
      setUiScale: (uiScale) => set({ uiScale }),
      useFahrenheit: false,
      setUseFahrenheit: (useFahrenheit) => set({ useFahrenheit }),

      // Accessibility
      reducedMotion: false,
      setReducedMotion: (reducedMotion) => {
        document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion))
        set({ reducedMotion })
      },
      highContrast: false,
      setHighContrast: (highContrast) => {
        document.documentElement.setAttribute('data-high-contrast', String(highContrast))
        set({ highContrast })
      },

      // Nav rail
      navExpanded: false,
      setNavExpanded: (navExpanded) => set({ navExpanded }),
    }),
    {
      name: 'framework-deck-prefs',
      partialize: (s) => ({
        theme: s.theme,
        activeModule: s.activeModule,
        activeChannels: s.activeChannels,
        timeWindow: s.timeWindow,
        apiBase: s.apiBase,
        fontScale: s.fontScale,
        uiScale: s.uiScale,
        useFahrenheit: s.useFahrenheit,
        tempWarnC: s.tempWarnC,
        yAutoScale: s.yAutoScale,
        reducedMotion: s.reducedMotion,
        highContrast: s.highContrast,
      }),
    }
  )
)
