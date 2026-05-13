// Typed Tauri IPC wrappers for the Windows-only graphics commands.
//
// All commands return JSON strings from Rust; we parse and type them here.
// On non-Windows the Rust side returns an error which we surface as a
// rejected promise — the UI shows a "Windows only" empty state instead.

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function invokeJson<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new Error('Graphics module requires the Tauri runtime')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  const raw = await invoke<string>(cmd, args)
  if (raw === 'null' || raw === '' || raw == null) {
    return undefined as unknown as T
  }
  return JSON.parse(raw) as T
}

// ---- Types ----

export interface DisplayDevice {
  instanceId: string
  name: string
  status: string
  problem: string
  problemCode: number
  class: string
  driverVer: string
  driverInf: string
  driverDate: string
  location: string
  linkCur: string
  linkMax: string
  lastArrival: string
}

export interface ServiceInfo {
  status: string
  startType: string
}

export interface GraphicsState {
  devices: DisplayDevice[]
  services: Record<string, ServiceInfo>
  ts: number
}

export interface DxgKrnlEvent {
  ts: number
  id: number
  level: string
  provider: string
  message: string
}

export type GpuPreferenceValue = 0 | 1 | 2  // Auto | Power saving | High performance

export interface GpuPreference {
  exe: string
  raw: string
  preference: GpuPreferenceValue
  fileExists: boolean
}

export interface NvidiaSmiResult {
  available: boolean
  output: string
}

// ---- Commands ----

export const getGraphicsState = () =>
  invokeJson<GraphicsState>('get_graphics_state')

export const getDxgkrnlEvents = (minutes: number, maxEvents: number) =>
  invokeJson<DxgKrnlEvent[]>('get_dxgkrnl_events', { minutes, maxEvents })

export const getGpuPreferences = () =>
  invokeJson<GpuPreference[]>('get_gpu_preferences')

export const setGpuPreference = (exe: string, preference: GpuPreferenceValue) =>
  invokeJson<string>('set_gpu_preference', { exe, preference })

export const removeGpuPreference = (exe: string) =>
  invokeJson<string>('remove_gpu_preference', { exe })

export const findKnownExes = () =>
  invokeJson<string[]>('find_known_exes')

export const openAmdAdrenalin = () =>
  invokeJson<string>('open_amd_adrenalin')

export const openNvidiaControlPanel = () =>
  invokeJson<string>('open_nvidia_control_panel')

export const openWindowsGraphicsSettings = () =>
  invokeJson<string>('open_windows_graphics_settings')

export const recoverDgpu = (instanceId: string) =>
  invokeJson<string>('recover_dgpu', { instanceId })

export const runNvidiaSmi = () =>
  invokeJson<NvidiaSmiResult>('run_nvidia_smi')

export const GPU_PREFERENCE_LABEL: Record<GpuPreferenceValue, string> = {
  0: 'AUTO',
  1: 'POWER SAVING',
  2: 'HIGH PERFORMANCE',
}

export const PROBLEM_CODE_LABEL: Record<number, string> = {
  0:  'OK',
  1:  'NOT_CONFIGURED',
  10: 'CANT_START',
  18: 'NEED_REINSTALL',
  19: 'REGISTRY',
  22: 'DISABLED',
  28: 'DRIVER_NOT_INSTALLED',
  43: 'FAILED_POST_START',
  45: 'PHANTOM',
  47: 'DISABLED_SERVICE',
}
