import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { PanelLeft, PanelRight, Stethoscope, ChevronDown, Plus } from 'lucide-react'
import { clsx } from 'clsx'

import { KeyboardStage } from '../components/keyboard/Stage/KeyboardStage'
import { PropertyPanel } from '../components/keyboard/Inspector/PropertyPanel'
import { FirmwarePanel } from '../components/keyboard/Firmware/FirmwarePanel'
import { FirmwareStage } from '../components/keyboard/Firmware/FirmwareStage'
import { HelpPanel } from '../components/keyboard/Sidebar/HelpPanel'
import { LayerSelector, type LayerSwitchType } from '../components/keyboard/Sidebar/LayerSelector'
import { NavigationMenu, type AppMode } from '../components/keyboard/Sidebar/NavigationMenu'

import { FRAMEWORK_16_ANSI } from '../data/definitions/framework16'
import { FRAMEWORK_MACROPAD } from '../data/definitions/macropad'
import { ANSI_KEY_PRESETS, MACROPAD_KEY_PRESETS, type KeyPreset } from '../data/key-presets'
import { parseKeyPositions, getRowRangeIndices } from '../utils/keyboardLayout'
import type { VIAKeyboardDefinition } from '../types/via'

import { useDeviceStore } from '../store/device'
import { configService } from '../services/ConfigService'
import { storageService } from '../services/StorageService'
import { log } from '../services/Logger'
import { hid, type HealthCheckResult } from '../services/HIDService'

export function KeyboardModule() {
  const {
    isConnected, isConnecting, connectedProductId, connectedProductName,
    protocolVersion, hasPerKeyRGB, permittedDevices, restoreComplete,
    activeLayer, setActiveLayer, markRestoreComplete,
    connectDevice, connectToDevice, switchDevice, disconnectDevice, init,
  } = useDeviceStore()

  // Initialize device store on mount
  useEffect(() => {
    const cleanup = init()
    return cleanup
  }, [init])

  // Initialize persistent storage
  useEffect(() => { storageService.init() }, [])

  const otherDevices = permittedDevices.filter(d => d.productId !== connectedProductId)

  const activeDefinition = !isConnected ? null
    : connectedProductId === 0x0013 ? FRAMEWORK_MACROPAD
    : FRAMEWORK_16_ANSI

  const [selectedKeyIndices, setSelectedKeyIndices] = useState<number[]>([])
  const [selectedLayer, setSelectedLayer] = useState<number>(0)
  const [activeMode, setActiveMode] = useState<AppMode>('mapping')
  const [deviceKeymap, setDeviceKeymap] = useState<number[]>([])
  const [keyColors, setKeyColors] = useState<Record<number, string>>({})
  const [customPresets, setCustomPresets] = useState<KeyPreset[]>([])
  const [pressedKeys, setPressedKeys] = useState<string[]>([])
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [anchorKeyIndex, setAnchorKeyIndex] = useState<number | null>(null)
  const [hoveredKeyIndex, setHoveredKeyIndex] = useState<number | null>(null)
  const [layerMapping, setLayerMapping] = useState<{ targetLayer: number; type: LayerSwitchType } | null>(null)
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null)
  const [healthChecking, setHealthChecking] = useState(false)
  const [showHealthLog, setShowHealthLog] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const perKeyRestoredRef = useRef(false)

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayerMapping(null)
      if (e.key === 'Shift') setIsShiftHeld(true)
      if (!e.repeat) setPressedKeys(prev => [...prev, e.code])
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(false)
      setPressedKeys(prev => prev.filter(k => k !== e.code))
    }
    const handleBlur = () => { setIsShiftHeld(false); setPressedKeys([]) }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const shiftHoverPreviewIndices = useMemo(() => {
    if (!isShiftHeld || anchorKeyIndex === null || hoveredKeyIndex === null || !activeDefinition) return []
    const keys = parseKeyPositions(activeDefinition)
    return getRowRangeIndices(anchorKeyIndex, hoveredKeyIndex, keys)
  }, [isShiftHeld, anchorKeyIndex, hoveredKeyIndex, activeDefinition])

  useEffect(() => { if (!isConnected) perKeyRestoredRef.current = false }, [isConnected])

  useEffect(() => {
    if (connectedProductId !== null) {
      setCustomPresets(storageService.loadCustomPresets(connectedProductId))
    } else {
      setCustomPresets([])
    }
  }, [connectedProductId])

  const refreshKeymap = useCallback(() => {
    if (isConnected && activeDefinition) {
      configService.readKeymap(activeDefinition, selectedLayer)
        .then(keymap => { if (keymap) setDeviceKeymap(keymap) })
        .catch(err => log.errorConfig(`Keymap read failed: ${err}`))
    }
  }, [isConnected, activeDefinition, selectedLayer])

  const restorePerKeyColorsToDevice = async (
    colors: Record<number, string>,
    definition: VIAKeyboardDefinition,
  ) => {
    const enabled = await hid.enablePerKeyMode()
    if (!enabled) return
    const colorGroups: Record<string, number[]> = {}
    for (const [keyIdx, color] of Object.entries(colors)) {
      if (!colorGroups[color]) colorGroups[color] = []
      colorGroups[color].push(Number(keyIdx))
    }
    for (const [colorStr, keyIndices] of Object.entries(colorGroups)) {
      const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/)
      if (!match) continue
      const [, r, g, b] = match.map(Number)
      const ledIndices = keyIndices.flatMap(idx => definition.ledIndices[idx] ?? [])
      if (ledIndices.length > 0) await hid.setPerKeyColor(r, g, b, ledIndices)
    }
  }

  useEffect(() => {
    setSelectedKeyIndices([])
    setDeviceKeymap([])
    refreshKeymap()

    if (isConnected && !perKeyRestoredRef.current && connectedProductId !== null && activeDefinition) {
      perKeyRestoredRef.current = true
      const stored = storageService.loadDeviceState(connectedProductId)
      if (stored?.rgbSettings || stored?.perKeyColors) {
        storageService.saveSnapshot(connectedProductId, {
          label: 'Session start',
          rgbSettings: stored.rgbSettings,
          perKeyColors: stored.perKeyColors,
        })
      }
      const doRestore = async () => {
        try {
          if (stored?.rgbSettings) {
            const { brightness, effectId, speed, hue, saturation } = stored.rgbSettings
            await hid.setRGBBrightness(brightness)
            await hid.setRGBEffect(effectId)
            await hid.setRGBEffectSpeed(speed)
            await hid.setRGBColor(hue, saturation)
          }
          if (stored?.perKeyColors && Object.keys(stored.perKeyColors).length > 0) {
            setKeyColors(stored.perKeyColors)
            if (hasPerKeyRGB) await restorePerKeyColorsToDevice(stored.perKeyColors, activeDefinition)
          }
        } catch (err) {
          log.errorConfig(`Failed to restore settings: ${err}`)
          perKeyRestoredRef.current = false
        } finally {
          markRestoreComplete()
        }
      }
      doRestore()
    } else if (isConnected && perKeyRestoredRef.current) {
      markRestoreComplete()
    }
  }, [isConnected, selectedLayer, activeDefinition, connectedProductId, hasPerKeyRGB, markRestoreComplete, refreshKeymap])

  const handleKeyColorChange = (indices: number[], color: string | null) => {
    setKeyColors(prev => {
      const next = { ...prev }
      for (const idx of indices) {
        if (color) next[idx] = color
        else delete next[idx]
      }
      if (connectedProductId !== null) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          storageService.saveDeviceState(connectedProductId!, { perKeyColors: next })
        }, 500)
      }
      return next
    })
  }

  const handlePerKeyColorsRestore = async (colors: Record<number, string>) => {
    setKeyColors(colors)
    if (connectedProductId !== null) {
      storageService.saveDeviceState(connectedProductId, { perKeyColors: colors })
    }
    if (hasPerKeyRGB && activeDefinition) {
      if (Object.keys(colors).length > 0) {
        await restorePerKeyColorsToDevice(colors, activeDefinition)
      } else {
        await hid.disablePerKeyMode()
      }
    }
  }

  const runHealthCheck = async () => {
    setHealthChecking(true)
    setShowHealthLog(true)
    try {
      const result = await hid.healthCheck()
      setHealthResult(result)
    } catch (e) {
      setHealthResult({ ok: false, deviceOpen: false, protocolResponds: false, protocolVersion: 0, rgbReadable: false, rgbBrightness: null, rgbEffect: null, rgbWriteVerify: false, perKeySupport: false, log: [`ERROR: ${e}`] })
    } finally {
      setHealthChecking(false)
    }
  }

  const handleKeySelect = async (index: number, modifiers: { ctrl: boolean; shift: boolean }) => {
    if (layerMapping && activeDefinition) {
      const { targetLayer, type } = layerMapping
      const keycodeBase = type === 'MO' ? 0x5220 : type === 'TG' ? 0x5260 : 0x5200
      const keycode = keycodeBase + targetLayer
      const pos = activeDefinition.matrixPositions[index]
      if (pos) {
        const [row, col] = pos
        await hid.setKeycode(selectedLayer, row, col, keycode)
        refreshKeymap()
      }
      setLayerMapping(null)
      return
    }
    if (modifiers.shift && anchorKeyIndex !== null && activeDefinition) {
      const keys = parseKeyPositions(activeDefinition)
      const rangeIndices = getRowRangeIndices(anchorKeyIndex, index, keys)
      setSelectedKeyIndices(prev => Array.from(new Set([...prev, ...rangeIndices])))
    } else {
      setSelectedKeyIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index])
      setAnchorKeyIndex(index)
    }
  }

  const builtInPresets = connectedProductId === 0x0013 ? MACROPAD_KEY_PRESETS : ANSI_KEY_PRESETS
  const activePresets = [...builtInPresets, ...customPresets]
  const customPresetIds = useMemo(() => new Set(customPresets.map(p => p.id)), [customPresets])

  const handleSaveCustomPreset = (label: string, indices: number[]) => {
    if (connectedProductId === null || indices.length === 0) return
    const preset = storageService.saveCustomPreset(connectedProductId, label, indices)
    setCustomPresets(prev => [...prev, preset])
  }

  const handleDeleteCustomPreset = (presetId: string) => {
    if (connectedProductId === null) return
    storageService.deleteCustomPreset(connectedProductId, presetId)
    setCustomPresets(prev => prev.filter(p => p.id !== presetId))
  }

  const handlePresetSelect = (indices: number[], ctrl: boolean) => {
    if (ctrl) {
      setSelectedKeyIndices(prev => {
        const allPresent = indices.every(i => prev.includes(i))
        if (allPresent) return prev.filter(i => !indices.includes(i))
        return Array.from(new Set([...prev, ...indices]))
      })
    } else {
      setSelectedKeyIndices(prev => {
        const allPresent = indices.every(i => prev.includes(i))
        if (allPresent && prev.length === indices.length) return []
        return [...indices]
      })
    }
  }

  // --- Render ---

  const sidebarLeft = (
    <div className="flex flex-col h-full gap-4">
      <div className="px-4 pt-4 space-y-2">
        {isConnected ? (
          <>
            <div className="w-full px-4 py-3 rounded-lg bg-success/10 text-success border border-success/20 text-center">
              <div className="flex items-center justify-center gap-2 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-success animate-[led-pulse_2s_ease-in-out_infinite]" />
                Connected
              </div>
              {connectedProductName && (
                <div className="text-[10px] text-success/70 mt-1 font-mono truncate">{connectedProductName}</div>
              )}
              {protocolVersion > 0 && (
                <div className="text-[10px] text-success/50 font-mono">VIA Protocol: {protocolVersion} ({protocolVersion >= 11 ? 'V3' : 'V2'})</div>
              )}
            </div>
            <button onClick={disconnectDevice} className="w-full px-3 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors text-xs font-semibold">
              Disconnect
            </button>
            {otherDevices.map(device => (
              <button key={device.productId} onClick={() => switchDevice(device)} disabled={isConnecting}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 text-cream-dim border border-border hover:border-primary hover:text-cream transition-colors text-xs font-semibold">
                Switch to {device.productName}
              </button>
            ))}
            <button onClick={connectDevice} disabled={isConnecting}
              className="w-full px-3 py-1.5 rounded-lg text-[10px] text-cream-dim border border-dashed border-border hover:border-primary hover:text-cream transition-colors flex items-center justify-center gap-1">
              <Plus size={10} /> Add Device
            </button>
            <button onClick={runHealthCheck} disabled={healthChecking}
              className={clsx(
                "w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors border",
                healthResult ? healthResult.ok ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                  : "bg-surface-2 text-cream-dim border-border hover:border-primary hover:text-cream",
                healthChecking && "opacity-50 cursor-wait"
              )}>
              <Stethoscope size={14} />
              {healthChecking ? 'Testing...' : healthResult ? (healthResult.ok ? 'Connection OK' : 'Issues Detected') : 'Test Connection'}
            </button>
            {healthResult && (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <button onClick={() => setShowHealthLog(!showHealthLog)} className="w-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-cream-dim hover:text-cream transition-colors">
                  <span>Health Check Log</span>
                  <ChevronDown size={10} className={clsx("ml-auto transition-transform", showHealthLog && "rotate-180")} />
                </button>
                {showHealthLog && (
                  <div className="border-t border-border px-3 py-2 max-h-48 overflow-auto font-mono text-[9px] leading-relaxed bg-background/50 space-y-0.5">
                    {healthResult.log.map((entry, i) => (
                      <div key={i} className={clsx(
                        entry.startsWith('FAIL') ? 'text-danger' :
                        entry.startsWith('WARN') ? 'text-primary' :
                        entry.startsWith('OK') ? 'text-success' :
                        'text-cream-dim'
                      )}>{entry}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {permittedDevices.map(device => (
              <button key={device.productId} onClick={() => connectToDevice(device)} disabled={isConnecting}
                className="w-full px-4 py-3 rounded-lg flex items-center justify-between gap-2 transition-all font-semibold bg-surface border border-border hover:border-primary hover:text-cream">
                <span className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-muted" />
                  {device.productName}
                </span>
                <span className="text-[10px] text-cream-dim font-mono">0x{device.productId.toString(16).padStart(4, '0')}</span>
              </button>
            ))}
            <button onClick={connectDevice} disabled={isConnecting}
              className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold shadow-lg bg-primary text-background hover:bg-primary/90 shadow-glow cursor-pointer text-sm">
              <span className="w-2 h-2 rounded-full bg-background/50" />
              {permittedDevices.length === 0 ? 'Connect Device' : 'Connect New Device'}
            </button>
            {permittedDevices.length === 0 && (
              <p className="text-[10px] text-cream-dim text-center px-2">
                Grant access to your keyboard and macropad separately for quick switching between them.
              </p>
            )}
          </>
        )}
      </div>

      {isConnected && (
        <>
          <NavigationMenu activeMode={activeMode} onModeSelect={setActiveMode} />
          <div className="flex-1" />
          {activeMode === 'mapping' && (
            <LayerSelector
              selectedLayer={selectedLayer}
              onLayerSelect={setSelectedLayer}
              onMapLayer={(targetLayer, type) => setLayerMapping({ targetLayer, type })}
              isMappingActive={layerMapping !== null}
            />
          )}
        </>
      )}
      {!isConnected && (
        <>
          <NavigationMenu activeMode={activeMode} onModeSelect={setActiveMode} />
          <div className="flex-1" />
        </>
      )}
    </div>
  )

  const sidebarRight = activeMode === 'help' ? (
    <HelpPanel />
  ) : activeMode === 'firmware' ? (
    <FirmwarePanel />
  ) : activeDefinition ? (
    <PropertyPanel
      activeMode={activeMode}
      activeDefinition={activeDefinition}
      selectedModuleId={activeDefinition.name}
      selectedKeyIndices={selectedKeyIndices}
      selectedLayer={selectedLayer}
      onConfigRestore={refreshKeymap}
      onKeymapChange={refreshKeymap}
      onKeyColorChange={handleKeyColorChange}
      keyColors={keyColors}
      onPerKeyColorsRestore={handlePerKeyColorsRestore}
      onSelectAll={() => {
        if (activeDefinition) {
          setSelectedKeyIndices(Array.from({ length: activeDefinition.matrixPositions.length }, (_, i) => i))
        }
      }}
    />
  ) : (
    <div className="p-4 h-full flex items-center justify-center text-cream-dim text-xs">
      Connect a device to get started
    </div>
  )

  const stageContent = activeMode === 'firmware' ? (
    <FirmwareStage />
  ) : activeDefinition ? (
    <KeyboardStage
      definition={activeDefinition}
      pressedKeys={pressedKeys}
      selectedKeyIndices={selectedKeyIndices}
      onKeySelect={handleKeySelect}
      onDeselectAll={() => { setSelectedKeyIndices([]); setAnchorKeyIndex(null) }}
      selectedCount={selectedKeyIndices.length}
      deviceKeymap={deviceKeymap}
      keyColors={keyColors}
      shiftHoverPreviewIndices={shiftHoverPreviewIndices}
      onKeyHover={setHoveredKeyIndex}
      activeMode={activeMode}
      presets={activePresets}
      customPresetIds={customPresetIds}
      onPresetSelect={handlePresetSelect}
      onSavePreset={handleSaveCustomPreset}
      onDeletePreset={handleDeleteCustomPreset}
      layerMappingLabel={layerMapping ? `${layerMapping.type}(${layerMapping.targetLayer})` : undefined}
      onCancelLayerMapping={() => setLayerMapping(null)}
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-cream tracking-tight">KEYBOARD CONFIGURATOR</h1>
        <p className="text-sm text-cream-dim max-w-md">
          Configure your Framework Laptop 16 keyboard and macropad.
          Remap keys, customize RGB lighting, and manage firmware.
        </p>
      </div>
      <button onClick={connectDevice}
        className="px-8 py-4 rounded-xl bg-primary text-background font-bold text-lg shadow-lg shadow-glow hover:bg-primary/90 transition-all active:scale-95">
        Connect Your Device
      </button>
      <p className="text-xs text-cream-dim">
        Supports Framework 16 ANSI Keyboard and RGB Macropad
      </p>
    </div>
  )

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-cream">
      {/* Left Sidebar */}
      <aside className={clsx("flex-shrink-0 border-r border-border bg-surface flex flex-col transition-all", leftOpen ? "w-[280px]" : "w-10")}>
        <div className="h-10 border-b border-border flex items-center justify-between px-3">
          {leftOpen && <span className="text-[9px] font-bold tracking-widest text-cream-dim uppercase">Modules</span>}
          <button onClick={() => setLeftOpen(!leftOpen)} className="p-1 hover:text-primary transition-colors">
            <PanelLeft size={14} />
          </button>
        </div>
        <div className={clsx("flex-1 overflow-auto", !leftOpen && "hidden")}>
          {sidebarLeft}
        </div>
      </aside>

      {/* Main Stage */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <div className="flex-1 overflow-hidden">
          {stageContent}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className={clsx("flex-shrink-0 border-l border-border bg-surface flex flex-col transition-all", rightOpen ? "w-[340px]" : "w-10")}>
        <div className="h-10 border-b border-border flex items-center justify-between px-3">
          <button onClick={() => setRightOpen(!rightOpen)} className="p-1 hover:text-primary transition-colors">
            <PanelRight size={14} />
          </button>
          {rightOpen && <span className="text-[9px] font-bold tracking-widest text-cream-dim uppercase">Inspector</span>}
        </div>
        <div className={clsx("flex-1 overflow-auto", !rightOpen && "hidden")}>
          {sidebarRight}
        </div>
      </aside>
    </div>
  )
}
