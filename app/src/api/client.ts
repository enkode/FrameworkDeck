// API client for framework-control service REST API

const getBase = () =>
  (import.meta.env.VITE_API_BASE as string | undefined) || 'http://127.0.0.1:8090'

const getToken = () =>
  (import.meta.env.VITE_API_TOKEN as string | undefined) || ''

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBase()}/api${path}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
