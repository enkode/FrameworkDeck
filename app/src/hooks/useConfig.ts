import useSWR, { useSWRConfig } from 'swr'
import { apiFetch, apiPost } from '../api/client'
import type { Config } from '../api/types'

export function useConfig() {
  const { mutate } = useSWRConfig()
  const swr = useSWR<Config>(
    'config',
    () => apiFetch<Config>('/config'),
    { refreshInterval: 5000 }
  )

  const updateConfig = async (patch: Partial<Config>) => {
    if (!swr.data) return
    const updated = { ...swr.data, ...patch }
    await apiPost('/config', updated)
    mutate('config')
  }

  const updateFanDuty = async (duty: number) => {
    if (!swr.data) return
    await updateConfig({
      fan: {
        ...swr.data.fan,
        mode: 'Manual',
        manual: { duty_pct: duty },
      },
    })
  }

  const setFanMode = async (mode: 'Disabled' | 'Manual' | 'Curve') => {
    if (!swr.data) return
    await updateConfig({ fan: { ...swr.data.fan, mode } })
  }

  return { ...swr, updateConfig, updateFanDuty, setFanMode }
}
