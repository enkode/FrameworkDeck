import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../api/types'

export type { Theme }

const THEMES: Theme[] = ['reel', 'phosphor', 'amber', 'framework']
export { THEMES }

interface AppState {
  theme: Theme
  setTheme: (t: Theme) => void

  connected: boolean
  setConnected: (c: boolean) => void

  activeChannels: string[]
  toggleChannel: (ch: string) => void
  setChannels: (chs: string[]) => void

  pauseScope: boolean
  togglePause: () => void

  timeWindow: number // seconds visible on scope
  setTimeWindow: (s: number) => void

  apiBase: string
  setApiBase: (url: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'reel',
      setTheme: (theme) => {
        if (theme === 'reel') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
        set({ theme })
      },

      connected: false,
      setConnected: (connected) => set({ connected }),

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

      timeWindow: 300, // 5 minutes
      setTimeWindow: (timeWindow) => set({ timeWindow }),

      apiBase: 'http://127.0.0.1:8090',
      setApiBase: (apiBase) => set({ apiBase }),
    }),
    {
      name: 'framework-deck-prefs',
      partialize: (s) => ({
        theme: s.theme,
        activeChannels: s.activeChannels,
        timeWindow: s.timeWindow,
        apiBase: s.apiBase,
      }),
    }
  )
)
