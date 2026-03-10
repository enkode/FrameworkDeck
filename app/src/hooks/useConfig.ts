import useSWR, { useSWRConfig } from 'swr'
import { apiFetch, apiPost } from '../api/client'
import { log } from '../services/Logger'
import type { Config, FanMode } from '../api/types'

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
    // Optimistic: update UI immediately before server confirms
    mutate('config', updated, false)
    try {
      await apiPost('/config', updated)
    } catch (err) {
      log.warnDevice(`Config update failed: ${err}`)
    }
    // Re-validate to get server's authoritative copy
    mutate('config')
  }

  const updateFanDuty = async (duty: number) => {
    if (!swr.data) return
    await updateConfig({
      fan: {
        ...swr.data.fan,
        mode: 'manual' as FanMode,
        manual: { duty_pct: duty },
      },
    })
  }

  const setFanMode = async (mode: FanMode) => {
    if (!swr.data) return
    await updateConfig({ fan: { ...swr.data.fan, mode } })
  }

  return { ...swr, updateConfig, updateFanDuty, setFanMode }
}
