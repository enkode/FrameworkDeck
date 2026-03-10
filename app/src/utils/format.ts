export const fmtTemp = (c: number | undefined | null): string =>
  c != null ? `${Math.round(c)}°` : '--°'

// Unit-aware temperature formatter: converts to °F when fahrenheit=true
export const fmtTempUnit = (c: number | undefined | null, fahrenheit = false): string => {
  if (c == null) return fahrenheit ? '--°F' : '--°C'
  if (fahrenheit) return `${Math.round(c * 9 / 5 + 32)}°F`
  return `${Math.round(c)}°C`
}

// Convert °C to °F
export const cToF = (c: number): number => c * 9 / 5 + 32

export const fmtRPM = (rpm: number | undefined | null): string =>
  rpm != null ? `${Math.round(rpm)}` : '---'

export const fmtWatts = (w: number | undefined | null): string =>
  w != null ? `${Math.abs(w).toFixed(1)}W` : '--W'

export const fmtPct = (p: number | undefined | null): string =>
  p != null ? `${Math.round(p)}%` : '--%'

export const fmtCRate = (c: number | undefined | null): string =>
  c != null ? `${c.toFixed(2)}C` : '--C'

export const fmtMah = (mah: number | undefined | null): string =>
  mah != null ? `${Math.round(mah)}mAh` : '---'

export const fmtMilliAmps = (ma: number | undefined | null): string => {
  if (ma == null) return '--A'
  const a = Math.abs(ma) / 1000
  return `${a.toFixed(2)}A`
}

export const fmtMilliVolts = (mv: number | undefined | null): string => {
  if (mv == null) return '--V'
  return `${(mv / 1000).toFixed(2)}V`
}

export const sensorLabel = (key: string): string => {
  const map: Record<string, string> = {
    apu_temp: 'APU',
    gpu_temp: 'GPU',
    cpu_temp: 'CPU',
    dgpu_temp: 'dGPU',
    f75303_cpu: 'CPU-EC',
    f75303_ddr: 'DDR',
    f75303_local: 'EC',
    dgpu_amb: 'dGPU-AMB',
    dgpu_vr: 'dGPU-VR',
    dgpu_vram: 'VRAM',
    fan_0: 'FAN-0',
    fan_1: 'FAN-1',
  }
  return map[key.toLowerCase()] ?? key.toUpperCase()
}

// Derived watts from mA and mV
export const calcWatts = (ma: number | undefined, mv: number | undefined): number | null => {
  if (ma == null || mv == null) return null
  return (ma * mv) / 1_000_000
}
