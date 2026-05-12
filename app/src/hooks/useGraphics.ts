import useSWR from 'swr'
import {
  getGraphicsState,
  getDxgkrnlEvents,
  getGpuPreferences,
  runNvidiaSmi,
  type GraphicsState,
  type DxgKrnlEvent,
  type GpuPreference,
  type NvidiaSmiResult,
} from '../api/graphics'

export function useGraphicsState() {
  return useSWR<GraphicsState>(
    'graphics-state',
    () => getGraphicsState(),
    { refreshInterval: 5000, revalidateOnFocus: true }
  )
}

export function useDxgkrnlEvents(minutes = 60, maxEvents = 50) {
  return useSWR<DxgKrnlEvent[]>(
    ['dxgkrnl-events', minutes, maxEvents],
    () => getDxgkrnlEvents(minutes, maxEvents),
    { refreshInterval: 10000 }
  )
}

export function useGpuPreferences() {
  return useSWR<GpuPreference[]>(
    'gpu-preferences',
    () => getGpuPreferences(),
    { refreshInterval: 0, revalidateOnFocus: true }
  )
}

export function useNvidiaSmi() {
  return useSWR<NvidiaSmiResult>(
    'nvidia-smi',
    () => runNvidiaSmi(),
    { refreshInterval: 0, revalidateOnFocus: false }
  )
}
