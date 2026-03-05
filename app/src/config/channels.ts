import type { TelemetrySample } from '../api/types'

export interface Channel {
  id: string
  label: string
  unit: string
  min: number
  max: number
  color: string       // CSS variable or hex
  glowColor: string   // for canvas shadowColor
  getValue: (sample: TelemetrySample) => number | null
  formatValue: (v: number) => string
}

export const CHANNEL_COLORS: Record<string, { color: string; glow: string }> = {
  ch1: { color: '#e8e0d0', glow: 'rgba(232,224,208,0.6)' },
  ch2: { color: '#cc2222', glow: 'rgba(204,34,34,0.7)' },
  ch3: { color: '#2255aa', glow: 'rgba(34,85,170,0.7)' },
  ch4: { color: '#c09060', glow: 'rgba(192,144,96,0.6)' },
  ch5: { color: '#448844', glow: 'rgba(68,136,68,0.6)' },
  ch6: { color: '#aa44aa', glow: 'rgba(170,68,170,0.6)' },
  ch7: { color: '#44aaaa', glow: 'rgba(68,170,170,0.6)' },
  ch8: { color: '#aaaa44', glow: 'rgba(170,170,68,0.6)' },
}

const COLOR_KEYS = Object.keys(CHANNEL_COLORS)
export const getChannelColor = (idx: number) =>
  CHANNEL_COLORS[COLOR_KEYS[idx % COLOR_KEYS.length]]

// Default channels — extended dynamically when device data arrives
export const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'apu_temp',
    label: 'APU',
    unit: '°C',
    min: 20,
    max: 100,
    color: CHANNEL_COLORS.ch1.color,
    glowColor: CHANNEL_COLORS.ch1.glow,
    getValue: (s) => s.temps['apu_temp'] ?? null,
    formatValue: (v) => `${Math.round(v)}°`,
  },
  {
    id: 'gpu_temp',
    label: 'GPU',
    unit: '°C',
    min: 20,
    max: 100,
    color: CHANNEL_COLORS.ch2.color,
    glowColor: CHANNEL_COLORS.ch2.glow,
    getValue: (s) => s.temps['gpu_temp'] ?? s.temps['dgpu_temp'] ?? null,
    formatValue: (v) => `${Math.round(v)}°`,
  },
  {
    id: 'cpu_temp',
    label: 'CPU',
    unit: '°C',
    min: 20,
    max: 100,
    color: CHANNEL_COLORS.ch3.color,
    glowColor: CHANNEL_COLORS.ch3.glow,
    getValue: (s) => s.temps['cpu_temp'] ?? null,
    formatValue: (v) => `${Math.round(v)}°`,
  },
  {
    id: 'fan_0',
    label: 'FAN',
    unit: 'rpm',
    min: 0,
    max: 5000,
    color: CHANNEL_COLORS.ch4.color,
    glowColor: CHANNEL_COLORS.ch4.glow,
    getValue: (s) => s.rpms[0] ?? null,
    formatValue: (v) => `${Math.round(v)}`,
  },
]

// Build channel list dynamically from known sensor keys in a sample
export function buildChannels(sampleKeys: string[], rpmCount: number): Channel[] {
  const channels: Channel[] = []
  let colorIdx = 0

  const tempKeys = [
    'apu_temp', 'gpu_temp', 'cpu_temp', 'dgpu_temp',
    'f75303_cpu', 'f75303_ddr', 'f75303_local',
    'dgpu_amb', 'dgpu_vr', 'dgpu_vram',
  ]

  for (const key of tempKeys) {
    if (!sampleKeys.includes(key)) continue
    const col = getChannelColor(colorIdx++)
    const label = key
      .replace('_temp', '')
      .replace('f75303_', '')
      .replace('dgpu_', 'GPU-')
      .toUpperCase()

    channels.push({
      id: key,
      label,
      unit: '°C',
      min: 20,
      max: 100,
      color: col.color,
      glowColor: col.glow,
      getValue: (s) => s.temps[key] ?? null,
      formatValue: (v) => `${Math.round(v)}°`,
    })
  }

  for (let i = 0; i < rpmCount; i++) {
    const col = getChannelColor(colorIdx++)
    channels.push({
      id: `fan_${i}`,
      label: `FAN${rpmCount > 1 ? `-${i}` : ''}`,
      unit: 'rpm',
      min: 0,
      max: 5000,
      color: col.color,
      glowColor: col.glow,
      getValue: (s) => s.rpms[i] ?? null,
      formatValue: (v) => `${Math.round(v)}`,
    })
  }

  return channels.length > 0 ? channels : DEFAULT_CHANNELS
}
