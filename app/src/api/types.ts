// TypeScript types mirroring the framework-control Rust service models

export interface Health {
  cli_present: boolean
  service_version?: string
}

export interface ThermalData {
  temps: Record<string, number>
  rpms: number[]
}

export interface TelemetrySample {
  ts_ms: number
  temps: Record<string, number>
  rpms: number[]
}

export interface BatteryInfo {
  percentage?: number
  ac_present: boolean
  charging: boolean
  present_rate_ma: number
  present_voltage_mv: number
  charge_input_current_ma?: number
  charger_voltage_mv?: number
  last_full_charge_capacity_mah: number
  design_capacity_mah: number
  cycle_count?: number
  charge_limit_max_pct?: number
  remaining_capacity_mah: number
}

export interface PowerCapabilities {
  supports_tdp: boolean
  supports_thermal: boolean
  supports_epp: boolean
  supports_governor: boolean
  supports_frequency: boolean
  tdp_min?: number
  tdp_max?: number
  thermal_min?: number
  thermal_max?: number
  available_governors?: string[]
  available_epp?: string[]
  min_freq_mhz?: number
  max_freq_mhz?: number
}

export interface PowerData {
  battery?: BatteryInfo
  ac_present: boolean
  soc?: number
  present_rate_ma?: number
  present_rate_w?: number
}

export interface SystemInfo {
  cpu_name?: string
  cpu_cores?: number
  memory_total_mb?: number
  os_name?: string
  dgpu_name?: string
}

export interface VersionInfo {
  mainboard_type?: string
  bios_version?: string
  ec_version?: string
}

export type FanMode = 'Disabled' | 'Manual' | 'Curve'

export interface FanCurvePoint {
  temp: number
  duty: number
}

export interface FanControlConfig {
  mode: FanMode
  manual?: { duty_pct: number }
  curve?: {
    sensors: string[]
    points: [number, number][]
    poll_ms: number
    hysteresis_c: number
    rate_limit_pct_per_step: number
  }
  calibration?: {
    points: [number, number][]
    updated_at: number
  }
}

export interface SettingU32 {
  enabled: boolean
  value: number
}

export interface SettingString {
  enabled: boolean
  value: string
}

export interface PowerProfile {
  tdp_watts?: SettingU32
  thermal_limit_c?: SettingU32
  epp_preference?: SettingString
  governor?: SettingString
  min_freq_mhz?: SettingU32
  max_freq_mhz?: SettingU32
}

export interface PowerConfig {
  ac: PowerProfile
  battery: PowerProfile
}

export interface BatteryConfig {
  charge_limit_max_pct?: SettingU32
  charge_rate_c?: { enabled: boolean; value: number }
  charge_rate_soc_threshold_pct?: number
}

export interface TelemetryConfig {
  poll_ms: number
  retain_seconds: number
}

export interface Config {
  fan: FanControlConfig
  power: PowerConfig
  battery: BatteryConfig
  telemetry: TelemetryConfig
  ui?: { theme?: string }
}

export type Theme = 'reel' | 'phosphor' | 'amber' | 'framework'
