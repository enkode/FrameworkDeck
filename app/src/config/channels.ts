import type { TelemetrySample } from '../api/types'

export interface Channel {
  id: string
  label: string
  unit: string
  min: number
  max: number
  color: string     // 'var(--ch1)' — use directly in HTML inline styles
  glowColor: string // 'var(--ch1-glow)' — use directly in HTML inline styles
  colorVar: string  // '--ch1' — resolve with getComputedStyle for canvas
  glowVar: string   // '--ch1-glow'
  getValue: (sample: TelemetrySample) => number | null
  formatValue: (v: number) => string
}

const SLOTS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8']

export const getChannelColor = (idx: number) => {
  const slot = SLOTS[idx % SLOTS.length]
  return {
    color: `var(--${slot})`,
    glowColor: `var(--${slot}-glow)`,
    colorVar: `--${slot}`,
    glowVar: `--${slot}-glow`,
  }
}

// Preferred display order for temp sensors
const TEMP_KEY_ORDER = [
  'APU', 'F75303_CPU', 'F75303_DDR', 'F75303_Local',
  'dGPU temp', 'dGPU AMB', 'dGPU VR', 'dGPU VRAM',
  'CPU', 'GPU',
]

const TEMP_LABELS: Record<string, string> = {
  'APU': 'APU',
  'F75303_CPU': 'CPU-EC',
  'F75303_DDR': 'DDR',
  'F75303_Local': 'EC',
  'dGPU temp': 'dGPU',
  'dGPU AMB': 'GPU-AMB',
  'dGPU VR': 'GPU-VR',
  'dGPU VRAM': 'VRAM',
  'CPU': 'CPU',
  'GPU': 'GPU',
}

export function buildChannels(sampleKeys: string[], rpmCount: number): Channel[] {
  const channels: Channel[] = []
  let colorIdx = 0

  const orderedKeys = [
    ...TEMP_KEY_ORDER.filter((k) => sampleKeys.includes(k)),
    ...sampleKeys.filter((k) => !TEMP_KEY_ORDER.includes(k)),
  ]

  for (const key of orderedKeys) {
    const col = getChannelColor(colorIdx++)
    const label = TEMP_LABELS[key] ?? key.replace(/[_\s]+/g, '-').toUpperCase().slice(0, 8)
    channels.push({
      id: key,
      label,
      unit: '°C',
      min: 20,
      max: 105,
      ...col,
      getValue: (s) => s.temps[key] ?? null,
      formatValue: (v) => `${Math.round(v)}°`,
    })
  }

  for (let i = 0; i < rpmCount; i++) {
    const col = getChannelColor(colorIdx++)
    channels.push({
      id: `fan_${i}`,
      label: rpmCount > 1 ? `FAN-${i + 1}` : 'FAN',
      unit: 'rpm',
      min: 0,
      max: 6000,
      ...col,
      getValue: (s) => s.rpms[i] ?? null,
      formatValue: (v) => `${Math.round(v)}`,
    })
  }

  return channels
}

// Fallback used before first sample arrives
export const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'APU',
    label: 'APU',
    unit: '°C',
    min: 20,
    max: 105,
    ...getChannelColor(0),
    getValue: (s) => s.temps['APU'] ?? null,
    formatValue: (v) => `${Math.round(v)}°`,
  },
  {
    id: 'fan_0',
    label: 'FAN',
    unit: 'rpm',
    min: 0,
    max: 6000,
    ...getChannelColor(3),
    getValue: (s) => s.rpms[0] ?? null,
    formatValue: (v) => `${Math.round(v)}`,
  },
]
