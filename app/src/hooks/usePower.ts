import useSWR from 'swr'
import { apiFetch } from '../api/client'
import type { PowerApiResponse, SystemInfo, VersionInfo } from '../api/types'

export function usePower() {
  return useSWR<PowerApiResponse>(
    'power',
    () => apiFetch<PowerApiResponse>('/power'),
    { refreshInterval: 2000 }
  )
}

export function useSystem() {
  return useSWR<SystemInfo>(
    'system',
    () => apiFetch<SystemInfo>('/system'),
    { refreshInterval: 30000 }
  )
}

export function useVersions() {
  return useSWR<VersionInfo>(
    'versions',
    () => apiFetch<VersionInfo>('/versions'),
    { refreshInterval: 60000 }
  )
}
