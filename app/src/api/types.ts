// TypeScript types matching the actual framework-control v0.5.1 API responses

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

// --- Battery (nested under /api/power → battery) ---
export interface BatteryInfo {
  ac_present: boolean
  battery_present?: boolean
  charge_input_current_ma?: number
  charge_limit_max_pct?: number
  charge_limit_min_pct?: number
  charger_current_ma?: number
  charger_voltage_mv?: number
  charging?: boolean | null
  discharging?: boolean
  cycle_count?: number
  design_capacity_mah?: number
  design_voltage_mv?: number
  last_full_charge_capacity_mah?: number
  percentage?: number
  present_rate_ma?: number
  present_voltage_mv?: number
  remaining_capacity_mah?: number
  soc_pct?: number
}

// --- Power control (nested under /api/power → power_control) ---
export interface PowerCapabilities {
  supports_tdp: boolean
  supports_thermal: boolean
  supports_epp: boolean
  supports_governor: boolean
  supports_frequency_limits: boolean
  tdp_min_watts?: number
  tdp_max_watts?: number
  available_epp_preferences?: string[] | null
  available_governors?: string[] | null
  frequency_min_mhz?: number | null
  frequency_max_mhz?: number | null
}

export interface PowerCurrentState {
  tdp_limit_watts?: number | null
  thermal_limit_c?: number | null
  epp_preference?: string | null
  governor?: string | null
  min_freq_mhz?: number | null
  max_freq_mhz?: number | null
}

// Full /api/power response
export interface PowerApiResponse {
  battery?: BatteryInfo
  power_control?: {
    capabilities: PowerCapabilities
    current_state: PowerCurrentState
  }
}

// --- System (/api/system) ---
export interface SystemInfo {
  cpu?: string           // "AMD Ryzen AI 9 HX 370 w/ Radeon 890M"
  dgpu?: string          // "NVIDIA GeForce RTX 5070 Laptop GPU"
  memory_total_mb?: number
  os?: string
}

// --- Versions (/api/versions) ---
export interface VersionInfo {
  mainboard_type?: string
  mainboard_revision?: string
  uefi_version?: string
  uefi_release_date?: string
  ec_build_version?: string
  ec_current_image?: string
}

// --- Fan mode (lowercase as returned by service) ---
export type FanMode = 'disabled' | 'manual' | 'curve'

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
  calibration?: { points: [number, number][]; updated_at: number } | null
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
  ac: PowerProfile | null
  battery: PowerProfile | null
}

export interface BatteryConfig {
  charge_limit_max_pct?: SettingU32
  charge_rate_c?: { enabled: boolean; value: number }
  charge_rate_soc_threshold_pct?: number | null
}

export interface Config {
  fan: FanControlConfig
  power: PowerConfig
  battery: BatteryConfig
  telemetry: { poll_ms: number; retain_seconds: number }
  ui?: { theme?: string }
  updates?: { auto_install?: boolean }
}

export type Theme = 'reel' | 'phosphor' | 'amber' | 'framework'
