import { fs } from '../utils/font'
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useHealth } from '../hooks/useHealth'
import { useThermalHistory } from '../hooks/useThermal'
import { usePower } from '../hooks/usePower'
import { useConfig } from '../hooks/useConfig'
import { useAppStore } from '../store/app'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'
import type { FanMode, FanControlConfig } from '../api/types'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

// Default curve points if none exist
const DEFAULT_CURVE: [number, number][] = [
  [30, 0], [45, 20], [55, 40], [65, 60], [75, 80], [85, 100],
]

const PRESETS: Record<string, { label: string; points: [number, number][] }> = {
  silent:   { label: 'SILENT',   points: [[30, 0], [50, 10], [60, 25], [70, 40], [80, 60], [90, 80]] },
  balanced: { label: 'BALANCED', points: [[30, 0], [45, 20], [55, 40], [65, 60], [75, 80], [85, 100]] },
  perform:  { label: 'PERFORM',  points: [[25, 10], [40, 30], [50, 50], [60, 70], [70, 90], [80, 100]] },
  cool:     { label: 'COOL',     points: [[25, 20], [35, 40], [45, 60], [55, 80], [65, 100], [75, 100]] },
}

// ── Fan Curve Canvas ─────────────────────────────────────────

interface CurveEditorProps {
  points: [number, number][]
  onPointsChange: (pts: [number, number][]) => void
  currentTemp?: number
  currentDuty?: number
  hysteresisC: number
}

function FanCurveEditor({ points, onPointsChange, currentTemp, currentDuty, hysteresisC }: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 500, h: 300 })

  // Coordinate system: temp 0-110°C on X, duty 0-100% on Y
  const pad = { l: 44, r: 16, t: 16, b: 32 }
  const plotW = size.w - pad.l - pad.r
  const plotH = size.h - pad.t - pad.b

  const tempToX = useCallback((t: number) => pad.l + (t / 110) * plotW, [plotW])
  const dutyToY = useCallback((d: number) => pad.t + plotH - (d / 100) * plotH, [plotH])
  const xToTemp = useCallback((x: number) => Math.round(Math.max(0, Math.min(110, ((x - pad.l) / plotW) * 110))), [plotW])
  const yToDuty = useCallback((y: number) => Math.round(Math.max(0, Math.min(100, ((pad.t + plotH - y) / plotH) * 100))), [plotH])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvasRef.current!.width = size.w * dpr
    canvasRef.current!.height = size.h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size.w, size.h)

    // Grid
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let t = 0; t <= 110; t += 10) {
      const x = tempToX(t)
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + plotH); ctx.stroke()
    }
    for (let d = 0; d <= 100; d += 20) {
      const y = dutyToY(d)
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + plotW, y); ctx.stroke()
    }

    // Axis labels
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.fillStyle = '#333333'
    ctx.textAlign = 'center'
    for (let t = 0; t <= 110; t += 20) {
      ctx.fillText(`${t}°`, tempToX(t), pad.t + plotH + 18)
    }
    ctx.textAlign = 'right'
    for (let d = 0; d <= 100; d += 20) {
      ctx.fillText(`${d}%`, pad.l - 6, dutyToY(d) + 3)
    }

    // Hysteresis band (subtle fill)
    if (hysteresisC > 0) {
      ctx.fillStyle = 'rgba(192, 144, 96, 0.04)'
      const sorted = [...points].sort((a, b) => a[0] - b[0])
      ctx.beginPath()
      sorted.forEach((p, i) => {
        const x = tempToX(p[0] - hysteresisC)
        const y = dutyToY(p[1])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      sorted.slice().reverse().forEach((p) => {
        ctx.lineTo(tempToX(p[0]), dutyToY(p[1]))
      })
      ctx.closePath()
      ctx.fill()
    }

    // Curve line
    const sorted = [...points].sort((a, b) => a[0] - b[0])
    ctx.strokeStyle = '#c09060'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    sorted.forEach((p, i) => {
      const x = tempToX(p[0])
      const y = dutyToY(p[1])
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Fill under curve
    ctx.fillStyle = 'rgba(192, 144, 96, 0.08)'
    ctx.beginPath()
    ctx.moveTo(tempToX(sorted[0][0]), dutyToY(0))
    sorted.forEach((p) => ctx.lineTo(tempToX(p[0]), dutyToY(p[1])))
    ctx.lineTo(tempToX(sorted[sorted.length - 1][0]), dutyToY(0))
    ctx.closePath()
    ctx.fill()

    // Points
    sorted.forEach((p) => {
      const x = tempToX(p[0])
      const y = dutyToY(p[1])
      const originalIdx = points.indexOf(p)
      const isHover = originalIdx === hoverIndex
      const isDrag = originalIdx === dragIndex

      ctx.fillStyle = isDrag ? '#ffffff' : isHover ? '#e8c080' : '#c09060'
      ctx.strokeStyle = isDrag ? '#ffffff' : '#c09060'
      ctx.lineWidth = isDrag || isHover ? 2 : 1.5
      ctx.beginPath()
      ctx.arc(x, y, isDrag ? 7 : isHover ? 6 : 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Glow
      if (isDrag || isHover) {
        ctx.shadowColor = '#c09060'
        ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      }
    })

    // Current operating point crosshair
    if (currentTemp != null) {
      const cx = tempToX(currentTemp)
      ctx.strokeStyle = '#22cc44'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, pad.t + plotH); ctx.stroke()
      ctx.setLineDash([])

      // Interpolated duty marker
      if (currentDuty != null) {
        const cy = dutyToY(currentDuty)
        ctx.fillStyle = '#22cc44'
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#22cc44'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(pad.l + plotW, cy); ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }, [points, size, hoverIndex, dragIndex, currentTemp, currentDuty, hysteresisC, tempToX, dutyToY, plotW, plotH])

  const getPointAtMouse = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let closest = -1
    let minDist = Infinity
    points.forEach((p, i) => {
      const dx = tempToX(p[0]) - mx
      const dy = dutyToY(p[1]) - my
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < minDist && d < 14) { minDist = d; closest = i }
    })
    return { closest, mx, my }
  }, [points, tempToX, dutyToY])

  const handleMouseDown = (e: React.MouseEvent) => {
    const { closest, mx, my } = getPointAtMouse(e)
    if (closest >= 0) {
      setDragIndex(closest)
    } else if (mx >= pad.l && mx <= pad.l + plotW && my >= pad.t && my <= pad.t + plotH) {
      // Add new point on double-click area
      const temp = xToTemp(mx)
      const duty = yToDuty(my)
      const newPts: [number, number][] = [...points, [temp, duty]]
      newPts.sort((a, b) => a[0] - b[0])
      onPointsChange(newPts)
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { closest, mx, my } = getPointAtMouse(e)
    setHoverIndex(closest)

    if (dragIndex !== null) {
      const temp = xToTemp(mx)
      const duty = yToDuty(my)
      const newPts = [...points] as [number, number][]
      newPts[dragIndex] = [temp, duty]
      onPointsChange(newPts)
    }
  }, [dragIndex, points, getPointAtMouse, xToTemp, yToDuty, onPointsChange])

  const handleMouseUp = () => setDragIndex(null)

  const handleDoubleClick = (e: React.MouseEvent) => {
    const { closest } = getPointAtMouse(e)
    if (closest >= 0 && points.length > 2) {
      const newPts = points.filter((_, i) => i !== closest)
      onPointsChange(newPts)
    }
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: dragIndex !== null ? 'grabbing' : hoverIndex !== null ? 'grab' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setDragIndex(null); setHoverIndex(null) }}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}

// ── RPM Gauge ────────────────────────────────────────────────

function RPMGauge({ rpm, max = 5000 }: { rpm: number; max?: number }) {
  const pct = Math.min(100, (rpm / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ ...mono, fontSize: fs(10), color: '#555555', letterSpacing: '0.08em' }}>FAN RPM</span>
        <span style={{ ...mono, fontSize: fs(14), color: rpm > 4000 ? '#cc2222' : '#c09060' }}>
          {Math.round(rpm)} <span style={{ fontSize: fs(9), color: '#444444' }}>rpm</span>
        </span>
      </div>
      <div style={{ height: 8, background: '#0d0d0d', border: '1px solid #1e1e1e', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: rpm > 4000 ? '#cc2222' : '#c09060', transition: 'width 0.3s' }} />
        {[25, 50, 75].map((t) => (
          <div key={t} style={{ position: 'absolute', left: `${t}%`, top: 0, height: '100%', width: 1, background: '#222222', pointerEvents: 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ ...mono, fontSize: fs(8), color: '#333333' }}>0</span>
        <span style={{ ...mono, fontSize: fs(8), color: '#333333' }}>{max}</span>
      </div>
    </div>
  )
}

// ── Module ───────────────────────────────────────────────────

export function FanModule() {
  const { connected } = useHealth()
  const { data: history = [] } = useThermalHistory()
  const { data: power } = usePower()
  const { data: config, updateConfig, updateFanDuty, setFanMode } = useConfig()
  const { useFahrenheit } = useAppStore()

  const fanConfig = config?.fan
  const mode: FanMode = fanConfig?.mode ?? 'disabled'
  const duty = fanConfig?.manual?.duty_pct ?? 0
  const [pendingDuty, setPendingDuty] = useState<number | null>(null)
  const displayDuty = pendingDuty ?? duty

  // Live curve points (editable copy)
  const serverCurvePoints = fanConfig?.curve?.points
  const [localCurvePoints, setLocalCurvePoints] = useState<[number, number][]>(
    serverCurvePoints ?? DEFAULT_CURVE
  )
  const [curveModified, setCurveModified] = useState(false)

  // Sync from server when config arrives
  useEffect(() => {
    if (serverCurvePoints && !curveModified) {
      setLocalCurvePoints(serverCurvePoints)
    }
  }, [serverCurvePoints, curveModified])

  const [hysteresisC, setHysteresisC] = useState(fanConfig?.curve?.hysteresis_c ?? 3)
  const [rateLimitPct, setRateLimitPct] = useState(fanConfig?.curve?.rate_limit_pct_per_step ?? 5)

  // Current fan RPM(s)
  const lastSample = history[history.length - 1]
  const rpms = lastSample?.rpms ?? []
  const currentTemp = useMemo(() => {
    if (!lastSample) return undefined
    const temps = Object.values(lastSample.temps)
    return temps.length > 0 ? Math.max(...temps) : undefined
  }, [lastSample])

  // Interpolate duty from curve for current temp
  const interpolatedDuty = useMemo(() => {
    if (currentTemp == null || localCurvePoints.length < 2) return undefined
    const sorted = [...localCurvePoints].sort((a, b) => a[0] - b[0])
    if (currentTemp <= sorted[0][0]) return sorted[0][1]
    if (currentTemp >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTemp >= sorted[i][0] && currentTemp <= sorted[i + 1][0]) {
        const t = (currentTemp - sorted[i][0]) / (sorted[i + 1][0] - sorted[i][0])
        return sorted[i][1] + t * (sorted[i + 1][1] - sorted[i][1])
      }
    }
    return undefined
  }, [currentTemp, localCurvePoints])

  const handleDutyChange = (v: number) => {
    setPendingDuty(v)
    updateFanDuty(v).finally(() => setPendingDuty(null))
  }

  const handleCurvePointsChange = (pts: [number, number][]) => {
    setLocalCurvePoints(pts)
    setCurveModified(true)
  }

  const applyCurve = async () => {
    if (!config) return
    const curveConfig: FanControlConfig['curve'] = {
      sensors: fanConfig?.curve?.sensors ?? ['APU'],
      points: [...localCurvePoints].sort((a, b) => a[0] - b[0]),
      poll_ms: fanConfig?.curve?.poll_ms ?? 1000,
      hysteresis_c: hysteresisC,
      rate_limit_pct_per_step: rateLimitPct,
    }
    await updateConfig({
      fan: { ...config.fan, mode: 'curve', curve: curveConfig },
    })
    setCurveModified(false)
  }

  const loadPreset = (key: string) => {
    setLocalCurvePoints(PRESETS[key].points)
    setCurveModified(true)
  }

  const MODES: FanMode[] = ['disabled', 'manual', 'curve']
  const MODE_LABELS: Record<FanMode, string> = { disabled: 'AUTO', manual: 'MANUAL', curve: 'CURVE' }

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplate: `"header header" auto "curve sidebar" 1fr / 1fr 280px`,
      background: 'var(--bg)',
      gap: 0,
    }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{
        gridArea: 'header',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: 46,
        gap: 14,
      }}>
        <span style={{ ...mono, fontSize: fs(12), color: 'var(--cream)', letterSpacing: '0.15em' }}>
          FAN CONTROL
        </span>

        <div style={{ width: 1, height: 22, background: 'var(--border-2)' }} />

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 2 }}>
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setFanMode(m)}
              style={{
                padding: '4px 12px',
                background: mode === m ? '#1e1e1e' : 'transparent',
                border: `1px solid ${mode === m ? '#c09060' : '#1e1e1e'}`,
                color: mode === m ? '#c09060' : '#444444',
                ...mono, fontSize: fs(10), letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* RPM readout */}
        {rpms.map((rpm, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LEDIndicator active={rpm > 0} color="#c09060" pulse={rpm > 0} size={6} />
            <span style={{ ...mono, fontSize: fs(11), color: '#c09060' }}>
              {Math.round(rpm)} rpm
            </span>
            {rpms.length > 1 && (
              <span style={{ ...mono, fontSize: fs(9), color: '#444444' }}>FAN {i + 1}</span>
            )}
          </div>
        ))}

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LEDIndicator active={connected} color={connected ? '#22cc44' : '#cc2222'} size={6} />
          <span style={{ ...mono, fontSize: fs(10), color: connected ? '#22cc44' : '#444444' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ── Main: Curve Editor ──────────────────── */}
      <div style={{
        gridArea: 'curve',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {mode === 'curve' ? (
          <>
            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  style={{
                    padding: '4px 12px',
                    background: 'transparent',
                    border: '1px solid #1e1e1e',
                    color: '#555555',
                    ...mono, fontSize: fs(9), letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#c09060'; e.currentTarget.style.color = '#c09060' }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#555555' }}
                >
                  {preset.label}
                </button>
              ))}

              <div style={{ flex: 1 }} />

              {curveModified && (
                <button
                  onClick={applyCurve}
                  style={{
                    padding: '4px 16px',
                    background: '#1a1200',
                    border: '1px solid #c09060',
                    color: '#c09060',
                    ...mono, fontSize: fs(10), letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  APPLY
                </button>
              )}
            </div>

            {/* Canvas */}
            <div style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid #1e1e1e',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <FanCurveEditor
                points={localCurvePoints}
                onPointsChange={handleCurvePointsChange}
                currentTemp={currentTemp}
                currentDuty={interpolatedDuty}
                hysteresisC={hysteresisC}
              />
            </div>

            {/* Instructions */}
            <div style={{ ...mono, fontSize: fs(9), color: '#333333', marginTop: 8, display: 'flex', gap: 16 }}>
              <span>Click to add point</span>
              <span>Drag to move</span>
              <span>Double-click to remove</span>
            </div>
          </>
        ) : mode === 'manual' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 500, margin: '0 auto', width: '100%' }}>
            <Panel label="MANUAL DUTY">
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>DUTY CYCLE</span>
                  <span style={{ ...mono, fontSize: fs(20), color: '#c09060' }}>{displayDuty}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={displayDuty}
                  onChange={(e) => handleDutyChange(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#c09060', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ ...mono, fontSize: fs(9), color: '#333333' }}>0%</span>
                  <span style={{ ...mono, fontSize: fs(9), color: '#333333' }}>100%</span>
                </div>

                <div style={{
                  marginTop: 16, padding: '8px 10px',
                  background: '#1a0e00', border: '1px solid #2e1800',
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <span style={{ color: '#cc8800', fontSize: fs(10), flexShrink: 0 }}>!</span>
                  <span style={{ ...mono, fontSize: fs(9), color: '#664400', lineHeight: 1.5 }}>
                    Manual mode overrides EC fan control. Setting duty to 0% may cause thermal throttling or shutdown.
                  </span>
                </div>
              </div>
            </Panel>

            {/* RPM gauges */}
            <div style={{ marginTop: 16 }}>
              {rpms.map((rpm, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <RPMGauge rpm={rpm} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Auto mode */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ ...mono, fontSize: fs(12), color: 'var(--cream)', letterSpacing: '0.15em' }}>
              EC AUTO CONTROL
            </div>
            <div style={{ ...mono, fontSize: fs(10), color: 'var(--gray)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
              The embedded controller manages fan speed automatically based on thermal sensor readings.
              Switch to CURVE mode to define a custom temperature-to-duty mapping, or MANUAL for direct duty cycle control.
            </div>
            {/* RPM gauges */}
            <div style={{ width: '100%', maxWidth: 400, marginTop: 16 }}>
              {rpms.map((rpm, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <RPMGauge rpm={rpm} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────── */}
      <div style={{
        gridArea: 'sidebar',
        borderLeft: '1px solid var(--border)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {/* Curve parameters (only in curve mode) */}
        {mode === 'curve' && (
          <Panel label="CURVE PARAMETERS">
            <div style={{ padding: '10px 12px' }}>
              {/* Hysteresis */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ ...mono, fontSize: fs(10), color: '#666666' }}>HYSTERESIS</span>
                  <span style={{ ...mono, fontSize: fs(11), color: 'var(--cream)' }}>
                    {useFahrenheit ? `${Math.round(hysteresisC * 9 / 5)}°F` : `${hysteresisC}°C`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={hysteresisC}
                  onChange={(e) => { setHysteresisC(parseInt(e.target.value)); setCurveModified(true) }}
                  style={{ width: '100%', accentColor: 'var(--cream)', cursor: 'pointer' }}
                />
                <div style={{ ...mono, fontSize: fs(8), color: '#2a2a2a', marginTop: 4 }}>
                  Prevents rapid fan speed oscillation near curve breakpoints
                </div>
              </div>

              {/* Rate limit */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ ...mono, fontSize: fs(10), color: '#666666' }}>RATE LIMIT</span>
                  <span style={{ ...mono, fontSize: fs(11), color: 'var(--cream)' }}>{rateLimitPct}%/step</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={rateLimitPct}
                  onChange={(e) => { setRateLimitPct(parseInt(e.target.value)); setCurveModified(true) }}
                  style={{ width: '100%', accentColor: 'var(--cream)', cursor: 'pointer' }}
                />
                <div style={{ ...mono, fontSize: fs(8), color: '#2a2a2a', marginTop: 4 }}>
                  Max duty change per poll cycle (smooths transitions)
                </div>
              </div>

              {/* Point list */}
              <div style={{ marginTop: 8, borderTop: '1px solid #1a1a1a', paddingTop: 8 }}>
                <div style={{ ...mono, fontSize: fs(9), color: '#555555', letterSpacing: '0.1em', marginBottom: 6 }}>
                  BREAKPOINTS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                  <span style={{ ...mono, fontSize: fs(8), color: '#333333' }}>TEMP</span>
                  <span style={{ ...mono, fontSize: fs(8), color: '#333333' }}>DUTY</span>
                  {[...localCurvePoints].sort((a, b) => a[0] - b[0]).map((p, i) => (
                    <React.Fragment key={i}>
                      <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>
                        {useFahrenheit ? `${Math.round(p[0] * 9 / 5 + 32)}°F` : `${p[0]}°C`}
                      </span>
                      <span style={{ ...mono, fontSize: fs(10), color: '#c09060' }}>{p[1]}%</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Live temps */}
        <Panel label="LIVE TEMPERATURES">
          <div style={{ padding: '10px 12px' }}>
            {lastSample ? Object.entries(lastSample.temps).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>{key}</span>
                <span style={{ ...mono, fontSize: fs(11), color: val > 80 ? '#cc2222' : val > 60 ? '#c09060' : '#888888' }}>
                  {useFahrenheit ? `${Math.round(val * 9 / 5 + 32)}°F` : `${Math.round(val)}°C`}
                </span>
              </div>
            )) : (
              <div style={{ ...mono, fontSize: fs(10), color: '#333333' }}>No data</div>
            )}
          </div>
        </Panel>

        {/* Power draw */}
        {power?.battery && (
          <Panel label="POWER">
            <div style={{ padding: '10px 12px' }}>
              {power.battery.present_rate_ma != null && power.battery.present_voltage_mv != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>DRAW</span>
                  <span style={{ ...mono, fontSize: fs(11), color: '#888888' }}>
                    {Math.abs((power.battery.present_rate_ma * power.battery.present_voltage_mv) / 1_000_000).toFixed(1)}W
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>SOURCE</span>
                <span style={{ ...mono, fontSize: fs(10), color: power.battery.ac_present ? '#2255aa' : '#c09060' }}>
                  {power.battery.ac_present ? 'AC' : 'BATTERY'}
                </span>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
