import useSWR from 'swr'
import { apiFetch } from '../api/client'
import type { TelemetrySample, ThermalData } from '../api/types'
import { useAppStore } from '../store/app'

// Cap history buffer to prevent unbounded memory growth
const MAX_HISTORY_SAMPLES = 7200 // ~60 min at 2 samples/sec

export function useThermalHistory() {
  const paused = useAppStore((s) => s.pauseScope)
  return useSWR<TelemetrySample[]>(
    paused ? null : 'thermal/history',
    async () => {
      const data = await apiFetch<TelemetrySample[]>('/thermal/history')
      if (data && data.length > MAX_HISTORY_SAMPLES) {
        return data.slice(-MAX_HISTORY_SAMPLES)
      }
      return data
    },
    { refreshInterval: 500, dedupingInterval: 400 }
  )
}

export function useCurrentThermal() {
  return useSWR<ThermalData>(
    'thermal',
    () => apiFetch<ThermalData>('/thermal'),
    { refreshInterval: 1000 }
  )
}
