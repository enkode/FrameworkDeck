import { useEffect, useState } from 'react'
import { getPlatform, platformSync, type Platform } from '../utils/platform'

/**
 * Resolved OS platform, or null on the very first render before the Tauri
 * IPC round-trip completes (cached afterwards, so null is a one-time state).
 */
export function usePlatform(): Platform | null {
  const [platform, setPlatform] = useState<Platform | null>(platformSync())
  useEffect(() => {
    if (platform) return
    let alive = true
    getPlatform().then((p) => { if (alive) setPlatform(p) })
    return () => { alive = false }
  }, [platform])
  return platform
}
