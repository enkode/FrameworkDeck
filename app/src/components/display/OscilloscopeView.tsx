import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { fs } from '../../utils/font'
import type { TelemetrySample } from '../../api/types'
import type { Channel } from '../../config/channels'
import { useAppStore } from '../../store/app'

interface Props {
  history: TelemetrySample[]
  channels: Channel[]
  activeChannels: string[]
  timeWindow: number
  paused: boolean
}

interface HoverInfo {
  x: number
  y: number
  canvasW: number
  values: { label: string; value: string; color: string }[]
  timeAgo: string
}

// Cache resolved CSS vars to avoid getComputedStyle every frame
const cssVarCache = new Map<string, { value: string; ts: number }>()
const CSS_CACHE_TTL = 2000 // refresh every 2s

function resolveCssVar(varName: string): string {
  const now = Date.now()
  const cached = cssVarCache.get(varName)
  if (cached && now - cached.ts < CSS_CACHE_TTL) return cached.value
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#888888'
  cssVarCache.set(varName, { value, ts: now })
  return value
}

// Invalidate cache on theme change
export function invalidateColorCache() {
  cssVarCache.clear()
}

const MIN_LANE_H = 90  // minimum pixels per channel lane before scrolling kicks in

export function OscilloscopeView({ history, channels, activeChannels, timeWindow, paused }: Props) {
  const { tempWarnC, useFahrenheit, yAutoScale, reducedMotion, theme } = useAppStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [canvasHeight, setCanvasHeight] = useState(0)
  const lastDrawnTsRef = useRef(0)
  const rafRef = useRef<number>(0)

  // Invalidate color cache when theme changes
  useEffect(() => { invalidateColorCache() }, [theme])

  const activeChList = useMemo(
    () => channels.filter((c) => activeChannels.includes(c.id)),
    [channels, activeChannels]
  )

  const cToF = (c: number) => c * 9 / 5 + 32

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const channelCount = activeChList.length
    if (channelCount === 0) {
      ctx.fillStyle = '#0d0d0d'
      ctx.fillRect(0, 0, W, H)
      return
    }

    const now = Date.now()
    const startMs = now - timeWindow * 1000
    const samples = history.filter((s) => s.ts_ms >= startMs)

    const LEFT_PAD = 52
    const RIGHT_PAD = 64
    const traceW = W - LEFT_PAD - RIGHT_PAD
    const LANE_H = H / channelCount

    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(0, 0, W, H)

    activeChList.forEach((ch, chIdx) => {
      const laneTop = chIdx * LANE_H
      const TOP_PAD = 16
      const BOT_PAD = 20
      const traceH = LANE_H - TOP_PAD - BOT_PAD

      // Compute display min/max — auto-scale zooms around actual data
      let dispMin = ch.min
      let dispMax = ch.max
      if (yAutoScale && samples.length > 1) {
        const vals = samples
          .map((s) => ch.getValue(s))
          .filter((v): v is number => v !== null)
        if (vals.length > 0) {
          const dataMin = Math.min(...vals)
          const dataMax = Math.max(...vals)
          const dataRange = Math.max(dataMax - dataMin, 1)
          const pad = Math.max(dataRange * 0.25, ch.unit === 'rpm' ? 100 : 2)
          dispMin = Math.max(ch.min, dataMin - pad)
          dispMax = Math.min(ch.max, dataMax + pad)
          if (dispMax - dispMin < 2) { dispMin -= 1; dispMax += 1 }
        }
      }
      const dispRange = Math.max(dispMax - dispMin, 0.001)

      const isTemp = ch.unit === '°C'
      const showF = isTemp && useFahrenheit

      // Lane separator
      if (chIdx > 0) {
        ctx.strokeStyle = '#222222'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, laneTop)
        ctx.lineTo(W, laneTop)
        ctx.stroke()
      }

      // Graticule
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 0.5
      for (let i = 1; i < 4; i++) {
        const y = laneTop + TOP_PAD + (traceH * i) / 4
        ctx.beginPath()
        ctx.moveTo(LEFT_PAD, y)
        ctx.lineTo(LEFT_PAD + traceW, y)
        ctx.stroke()
      }
      for (let i = 1; i < 10; i++) {
        const x = LEFT_PAD + (traceW * i) / 10
        ctx.beginPath()
        ctx.moveTo(x, laneTop + TOP_PAD)
        ctx.lineTo(x, laneTop + TOP_PAD + traceH)
        ctx.stroke()
      }

      // Y-axis labels
      ctx.fillStyle = '#444444'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'right'

      const fmtLabel = (v: number) => {
        if (ch.unit === 'rpm') return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
        return showF ? `${Math.round(cToF(v))}°` : `${Math.round(v)}°`
      }
      ctx.fillText(fmtLabel(dispMax), LEFT_PAD - 4, laneTop + TOP_PAD + 4)
      ctx.fillText(fmtLabel(dispMin + dispRange / 2), LEFT_PAD - 4, laneTop + TOP_PAD + traceH / 2 + 4)
      ctx.fillText(fmtLabel(dispMin), LEFT_PAD - 4, laneTop + TOP_PAD + traceH + 4)

      // Channel label
      const chColor = resolveCssVar(ch.colorVar)
      ctx.save()
      ctx.fillStyle = chColor
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(ch.label, 4, laneTop + LANE_H / 2 + 3)
      ctx.restore()

      // Clip trace area
      ctx.save()
      ctx.beginPath()
      ctx.rect(LEFT_PAD, laneTop, traceW, LANE_H)
      ctx.clip()

      // Draw trace
      if (samples.length > 1) {
        const traceColor = resolveCssVar(ch.colorVar)
        const glowColor = resolveCssVar(ch.glowVar)
        ctx.beginPath()
        ctx.strokeStyle = traceColor
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 4
        ctx.lineWidth = 1.5
        ctx.lineJoin = 'round'

        let started = false
        for (const sample of samples) {
          const val = ch.getValue(sample)
          if (val === null) continue
          const xFrac = (sample.ts_ms - startMs) / (timeWindow * 1000)
          const x = LEFT_PAD + xFrac * traceW
          const clamped = Math.max(dispMin, Math.min(dispMax, val))
          const yFrac = 1 - (clamped - dispMin) / dispRange
          const y = laneTop + TOP_PAD + traceH * yFrac
          if (!started) { ctx.moveTo(x, y); started = true }
          else { ctx.lineTo(x, y) }
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Warning threshold line (temp channels)
      if (isTemp && tempWarnC >= dispMin && tempWarnC <= dispMax) {
        const warnYFrac = 1 - (tempWarnC - dispMin) / dispRange
        const warnY = laneTop + TOP_PAD + traceH * warnYFrac
        ctx.save()
        ctx.strokeStyle = '#cc2222'
        ctx.globalAlpha = 0.35
        ctx.setLineDash([3, 5])
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(LEFT_PAD, warnY)
        ctx.lineTo(LEFT_PAD + traceW, warnY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.restore()
      }

      ctx.restore()

      // Current value readout (right column)
      const lastSample = samples[samples.length - 1]
      if (lastSample) {
        const curVal = ch.getValue(lastSample)
        if (curVal !== null) {
          const displayVal = showF
            ? `${Math.round(cToF(curVal))}°F`
            : ch.formatValue(curVal)
          ctx.fillStyle = chColor
          ctx.font = '11px JetBrains Mono, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(displayVal, W - RIGHT_PAD + 6, laneTop + LANE_H / 2 + 4)

          // Level line
          const clamped = Math.max(dispMin, Math.min(dispMax, curVal))
          const yFrac = 1 - (clamped - dispMin) / dispRange
          const levelY = laneTop + TOP_PAD + traceH * yFrac
          ctx.save()
          ctx.strokeStyle = chColor
          ctx.globalAlpha = 0.3
          ctx.setLineDash([2, 4])
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(LEFT_PAD + traceW, levelY)
          ctx.lineTo(W - RIGHT_PAD + 2, levelY)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
          ctx.restore()
        }
      }
    })

    // Border lines
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(LEFT_PAD, 0)
    ctx.lineTo(LEFT_PAD, H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W - RIGHT_PAD, 0)
    ctx.lineTo(W - RIGHT_PAD, H)
    ctx.stroke()

    // Time labels
    ctx.fillStyle = '#3a3a3a'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`-${timeWindow}s`, LEFT_PAD + 2, H - 3)
    ctx.textAlign = 'right'
    ctx.fillText('NOW', W - RIGHT_PAD - 2, H - 3)
    ctx.textAlign = 'center'
    ctx.fillText(`-${Math.round(timeWindow / 2)}s`, LEFT_PAD + traceW / 2, H - 3)

    // Paused overlay
    if (paused) {
      ctx.fillStyle = 'rgba(232,224,208,0.04)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(232,224,208,0.25)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('── PAUSED ──', W / 2, 18)
    }
  }, [history, activeChList, timeWindow, paused, tempWarnC, useFahrenheit, yAutoScale])

  // Resize + animation loop using requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const count = Math.max(activeChList.length, 1)
      const containerH = container.clientHeight
      const laneH = Math.max(MIN_LANE_H, containerH / count)
      const h = Math.ceil(laneH * count)
      canvas.width = container.clientWidth
      canvas.height = h
      setCanvasHeight(h)
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    // Use rAF loop that only redraws when data has changed or enough time passed
    let running = true
    const loop = () => {
      if (!running) return
      const lastTs = history.length > 0 ? history[history.length - 1].ts_ms : 0
      const now = Date.now()
      // Redraw if new data arrived or 200ms elapsed (for time cursor advancement)
      if (lastTs !== lastDrawnTsRef.current || now - lastDrawnTsRef.current > 200) {
        draw()
        lastDrawnTsRef.current = lastTs || now
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [draw, activeChList.length, history])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const LEFT_PAD = 52
      const RIGHT_PAD = 64
      const traceW = canvas.width - LEFT_PAD - RIGHT_PAD

      if (mouseX < LEFT_PAD || mouseX > canvas.width - RIGHT_PAD) {
        setHover(null)
        return
      }

      const now = Date.now()
      const startMs = now - timeWindow * 1000
      const samples = history.filter((s) => s.ts_ms >= startMs)
      if (samples.length === 0) { setHover(null); return }

      const xFrac = (mouseX - LEFT_PAD) / traceW
      const targetTs = startMs + xFrac * (timeWindow * 1000)
      let closest = samples[0]
      let minDist = Math.abs(samples[0].ts_ms - targetTs)
      for (const s of samples) {
        const d = Math.abs(s.ts_ms - targetTs)
        if (d < minDist) { minDist = d; closest = s }
      }

      const timeAgo = `${Math.round((now - closest.ts_ms) / 1000)}s ago`
      const values = activeChList.map((ch) => {
        const val = ch.getValue(closest)
        let formatted = '--'
        if (val !== null) {
          if (ch.unit === '°C' && useFahrenheit) {
            formatted = `${Math.round(val * 9 / 5 + 32)}°F`
          } else {
            formatted = ch.formatValue(val)
          }
        }
        return { label: ch.label, value: formatted, color: ch.color }
      })

      setHover({ x: mouseX, y: mouseY, canvasW: canvas.width, values, timeAgo })
    },
    [history, activeChList, timeWindow, useFahrenheit]
  )

  // Compute tooltip position — flip when near edges
  const tooltipStyle = useMemo(() => {
    if (!hover) return {}
    const tooltipW = 160
    const tooltipH = 24 + hover.values.length * 20
    // Flip horizontally when near right edge
    const left = hover.x + tooltipW + 20 > hover.canvasW
      ? hover.x - tooltipW - 8
      : hover.x + 12
    // Clamp vertically
    const top = Math.max(4, Math.min(hover.y, (canvasHeight || 400) - tooltipH - 8))
    return { left, top }
  }, [hover, canvasHeight])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Oscilloscope displaying ${activeChList.map(c => c.label).join(', ')} over ${timeWindow} seconds`}
      style={{ width: '100%', height: '100%', position: 'relative', overflowY: 'auto' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      />

      {/* Hover tooltip — flips when near edges */}
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: tooltipStyle.left,
            top: tooltipStyle.top,
            background: '#161616',
            border: '1px solid #2a2a2a',
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 100,
          }}
        >
          <div style={{ color: '#444444', fontSize: fs(9), fontFamily: 'monospace', marginBottom: 4 }}>
            {hover.timeAgo}
          </div>
          {hover.values.map((v) => (
            <div key={v.label} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: v.color, fontSize: fs(10), fontFamily: 'monospace' }}>{v.label}</span>
              <span style={{ color: '#e8e0d0', fontSize: fs(10), fontFamily: 'monospace' }}>{v.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scanlines overlay — respects reduced motion preference */}
      {!reducedMotion && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: canvasHeight || '100%',
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
            zIndex: 5,
          }}
        />
      )}
    </div>
  )
}
