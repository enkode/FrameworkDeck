import useSWR from 'swr'
import { useEffect } from 'react'
import { apiFetch } from '../api/client'
import type { Health } from '../api/types'
import { useAppStore } from '../store/app'

export function useHealth() {
  const setConnected = useAppStore((s) => s.setConnected)

  const { data, error } = useSWR<Health>(
    'health',
    () => apiFetch<Health>('/health'),
    { refreshInterval: 1000, dedupingInterval: 800, shouldRetryOnError: true }
  )

  useEffect(() => {
    setConnected(!!data?.cli_present && !error)
  }, [data, error, setConnected])

  return {
    health: data,
    connected: !!data?.cli_present && !error,
    cliPresent: data?.cli_present ?? false,
    version: data?.service_version,
  }
}
