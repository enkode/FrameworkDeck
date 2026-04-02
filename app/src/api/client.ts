// API client for framework-control service REST API.
//
// Routing strategy:
//   Tauri (dev or packaged): invoke Rust commands → reqwest makes HTTP call with
//     no CORS headers, bypassing the service's origin allowlist entirely.
//   Browser dev: Vite proxy strips Origin and forwards /api/* → 127.0.0.1:30912.

// Tauri injects __TAURI_INTERNALS__ into every WebView it controls.
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const getBase = () =>
  (import.meta.env.VITE_API_BASE as string | undefined) || ''

const getToken = () =>
  (import.meta.env.VITE_API_TOKEN as string | undefined) || ''

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // In Tauri: use Rust IPC — no CORS, no Origin header, no token leakage in JS
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core')
    const method = (options?.method ?? 'GET').toUpperCase()
    const apiPath = `/api${path}`
    try {
      let result: string
      if (method === 'POST') {
        const body = (options?.body as string | undefined) ?? '{}'
        result = await invoke<string>('api_post', { path: apiPath, body })
      } else {
        result = await invoke<string>('api_get', { path: apiPath })
      }
      if (result === 'null' || result === '' || result == null) {
        return undefined as unknown as T
      }
      return JSON.parse(result) as T
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`API ${path}: ${msg.includes('Connection') ? 'Service unreachable — is framework-control running?' : msg}`)
    }
  }

  // Browser / Electron: regular fetch
  const url = `${getBase()}/api${path}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const detail = res.status === 0 ? 'Network error — service may be offline'
      : res.status === 401 ? 'Unauthorized — check API token in settings'
      : res.status === 404 ? 'Endpoint not found — check API version compatibility'
      : `${res.status} ${res.statusText}`
    throw new Error(`API ${path}: ${detail}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
