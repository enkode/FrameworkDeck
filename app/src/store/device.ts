import { create } from 'zustand'
import { hid } from '../services/HIDService'
import { storageService } from '../services/StorageService'
import { log } from '../services/Logger'

interface PermittedDevice {
  productId: number
  productName: string
  device: HIDDevice
}

interface DeviceState {
  isConnected: boolean
  isConnecting: boolean
  connectedProductId: number | null
  connectedProductName: string | null
  protocolVersion: number
  hasPerKeyRGB: boolean
  restoreComplete: boolean
  permittedDevices: PermittedDevice[]
  activeLayer: number

  // Actions
  setActiveLayer: (layer: number) => void
  markRestoreComplete: () => void
  connectDevice: () => Promise<void>
  connectToDevice: (device: PermittedDevice) => Promise<void>
  switchDevice: (targetDevice?: PermittedDevice) => Promise<void>
  disconnectDevice: () => void
  refreshPermittedDevices: () => Promise<void>
  syncFromHID: () => void
  init: () => () => void
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectedProductId: null,
  connectedProductName: null,
  protocolVersion: 0,
  hasPerKeyRGB: false,
  restoreComplete: false,
  permittedDevices: [],
  activeLayer: 0,

  setActiveLayer: (layer) => set({ activeLayer: layer }),
  markRestoreComplete: () => set({ restoreComplete: true }),

  syncFromHID: () => {
    set({
      isConnected: hid.isDeviceConnected(),
      connectedProductId: hid.getConnectedProductId(),
      connectedProductName: hid.getConnectedProductName(),
      protocolVersion: hid.getDetectedProtocolVersion(),
      hasPerKeyRGB: hid.hasPerKeySupport,
    })
  },

  refreshPermittedDevices: async () => {
    const devices = await hid.getPermittedDevices()
    set({
      permittedDevices: devices.map((d) => ({
        productId: d.productId,
        productName: d.productName ?? `Device 0x${d.productId.toString(16)}`,
        device: d,
      })),
    })
  },

  connectDevice: async () => {
    set({ isConnecting: true })
    try {
      await hid.requestDevice()
    } finally {
      set({ isConnecting: false })
      await get().refreshPermittedDevices()
    }
  },

  connectToDevice: async (target) => {
    set({ isConnecting: true })
    try {
      if (get().isConnected) hid.disconnect()
      await hid.openDevice(target.device)
    } finally {
      set({ isConnecting: false })
    }
  },

  switchDevice: async (targetDevice?) => {
    set({ isConnecting: true })
    try {
      const currentPid = hid.getConnectedProductId()
      hid.disconnect()
      if (targetDevice) {
        await hid.openDevice(targetDevice.device)
      } else {
        const permitted = await hid.getPermittedDevices()
        const other = permitted.find((d) => d.productId !== currentPid)
        if (other) {
          await hid.openDevice(other)
        } else {
          await hid.requestDevice()
        }
      }
    } finally {
      set({ isConnecting: false })
      await get().refreshPermittedDevices()
    }
  },

  disconnectDevice: () => {
    hid.disconnect()
  },

  init: () => {
    // Sync initial state
    get().syncFromHID()
    get().refreshPermittedDevices()

    // Listen for changes
    const unsubscribe = hid.onConnectionChange(() => {
      get().syncFromHID()
      set({ restoreComplete: false })
      get().refreshPermittedDevices()
    })

    // Auto-reconnect to a previously-permitted device on page load
    if (!hid.isDeviceConnected()) {
      hid.autoConnect()
    }

    // Re-apply RGB settings when waking from sleep
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (!hid.isDeviceConnected()) return
      const pid = hid.getConnectedProductId()
      if (pid === null) return

      await new Promise((r) => setTimeout(r, 500))
      if (!hid.isDeviceConnected()) return

      log.device('Page visible — re-applying saved RGB settings after wake')
      const stored = storageService.loadDeviceState(pid)
      if (stored?.rgbSettings) {
        const { brightness, effectId, speed, hue, saturation } = stored.rgbSettings
        try {
          await hid.setRGBBrightness(brightness)
          await hid.setRGBEffect(effectId)
          await hid.setRGBEffectSpeed(speed)
          await hid.setRGBColor(hue, saturation)
          log.device('RGB settings re-applied after wake')
        } catch (err) {
          log.warnDevice(`Failed to re-apply RGB settings after wake: ${err}`)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  },
}))
