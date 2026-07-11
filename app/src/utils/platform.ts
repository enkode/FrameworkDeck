// Platform detection for platform-gated UI (Graphics module, firmware build
// scripts, WebHID availability copy, etc.).
//
// In Tauri the compiled-in OS comes from the `get_platform` Rust command; in
// plain-browser dev we fall back to the user agent.

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export type Platform = 'windows' | 'linux' | 'macos' | 'unknown'

function fromUserAgent(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (ua.includes('Windows')) return 'windows'
  if (ua.includes('Mac')) return 'macos'
  if (ua.includes('Linux') || ua.includes('X11')) return 'linux'
  return 'unknown'
}

let cached: Platform | null = null
let pending: Promise<Platform> | null = null

export function getPlatform(): Promise<Platform> {
  if (cached) return Promise.resolve(cached)
  if (pending) return pending
  pending = (async () => {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const os = await invoke<string>('get_platform')
        cached = (os === 'windows' || os === 'linux' || os === 'macos') ? os : 'unknown'
        return cached
      } catch {
        // fall through to UA sniffing
      }
    }
    cached = fromUserAgent()
    return cached
  })()
  return pending
}

/** Synchronous best-effort read — correct once getPlatform() has resolved. */
export function platformSync(): Platform | null {
  return cached
}
