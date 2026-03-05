import useSWR from 'swr'
import { apiFetch } from '../api/client'
import type { TelemetrySample, ThermalData } from '../api/types'
import { useAppStore } from '../store/app'

export function useThermalHistory() {
  const paused = useAppStore((s) => s.pauseScope)
  return useSWR<TelemetrySample[]>(
    paused ? null : 'thermal/history',
    () => apiFetch<TelemetrySample[]>('/thermal/history'),
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
