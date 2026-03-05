import { useRef, useEffect, useCallback, useState } from 'react'
import type { TelemetrySample } from '../../api/types'
import type { Channel } from '../../config/channels'

interface Props {
  history: TelemetrySample[]
  channels: Channel[]
  activeChannels: string[]
  timeWindow: number // seconds
  paused: boolean
}

interface HoverInfo {
  x: number
  y: number
  values: { label: string; value: string; color: string }[]
  timeAgo: string
}

export function OscilloscopeView({ history, channels, activeChannels, timeWindow, paused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const activeChList = channels.filter((c) => activeChannels.includes(c.id))

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

    // Layout constants
    const LEFT_PAD = 52  // y-axis labels
    const RIGHT_PAD = 64 // current value labels
    const traceW = W - LEFT_PAD - RIGHT_PAD
    const LANE_H = H / channelCount

    // Clear
    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(0, 0, W, H)

    activeChList.forEach((ch, chIdx) => {
      const laneTop = chIdx * LANE_H
      const TOP_PAD = 16
      const BOT_PAD = 20
      const traceH = LANE_H - TOP_PAD - BOT_PAD

      // Lane separator (not on first)
      if (chIdx > 0) {
        ctx.strokeStyle = '#222222'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, laneTop)
        ctx.lineTo(W, laneTop)
        ctx.stroke()
      }

      // Graticule horizontal lines (4 divisions)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 0.5
      for (let i = 1; i < 4; i++) {
        const y = laneTop + TOP_PAD + (traceH * i) / 4
        ctx.beginPath()
        ctx.moveTo(LEFT_PAD, y)
        ctx.lineTo(LEFT_PAD + traceW, y)
        ctx.stroke()
      }

      // Graticule vertical lines (10 divisions)
      for (let i = 1; i < 10; i++) {
        const x = LEFT_PAD + (traceW * i) / 10
        ctx.beginPath()
        ctx.moveTo(x, laneTop + TOP_PAD)
        ctx.lineTo(x, laneTop + TOP_PAD + traceH)
        ctx.stroke()
      }

      // Y-axis scale labels
      ctx.fillStyle = '#444444'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      const range = ch.max - ch.min
      const unitSuffix = ch.unit === '°C' ? '°' : ch.unit === 'rpm' ? 'k' : ch.unit
      if (ch.unit === 'rpm') {
        ctx.fillText(`${(ch.max / 1000).toFixed(1)}k`, LEFT_PAD - 4, laneTop + TOP_PAD + 4)
        ctx.fillText(`${((ch.min + range / 2) / 1000).toFixed(1)}k`, LEFT_PAD - 4, laneTop + TOP_PAD + traceH / 2 + 4)
        ctx.fillText('0', LEFT_PAD - 4, laneTop + TOP_PAD + traceH + 4)
      } else {
        ctx.fillText(`${ch.max}${unitSuffix}`, LEFT_PAD - 4, laneTop + TOP_PAD + 4)
        ctx.fillText(`${Math.round(ch.min + range / 2)}${unitSuffix}`, LEFT_PAD - 4, laneTop + TOP_PAD + traceH / 2 + 4)
        ctx.fillText(`${ch.min}${unitSuffix}`, LEFT_PAD - 4, laneTop + TOP_PAD + traceH + 4)
      }

      // Channel label (left column)
      ctx.save()
      ctx.fillStyle = ch.color
      ctx.font = `bold 10px JetBrains Mono, monospace`
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
        ctx.beginPath()
        ctx.strokeStyle = ch.color
        ctx.shadowColor = ch.glowColor
        ctx.shadowBlur = 4
        ctx.lineWidth = 1.5
        ctx.lineJoin = 'round'

        let started = false
        for (const sample of samples) {
          const val = ch.getValue(sample)
          if (val === null) continue

          const xFrac = (sample.ts_ms - startMs) / (timeWindow * 1000)
          const x = LEFT_PAD + xFrac * traceW
          const clamped = Math.max(ch.min, Math.min(ch.max, val))
          const yFrac = 1 - (clamped - ch.min) / (ch.max - ch.min)
          const y = laneTop + TOP_PAD + traceH * yFrac

          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      ctx.restore()

      // Current value readout (right column)
      const lastSample = samples[samples.length - 1]
      if (lastSample) {
        const curVal = ch.getValue(lastSample)
        if (curVal !== null) {
          ctx.fillStyle = ch.color
          ctx.font = '11px JetBrains Mono, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(ch.formatValue(curVal), W - RIGHT_PAD + 6, laneTop + LANE_H / 2 + 4)

          // Dashed level line from trace edge to readout
          const clamped = Math.max(ch.min, Math.min(ch.max, curVal))
          const yFrac = 1 - (clamped - ch.min) / (ch.max - ch.min)
          const levelY = laneTop + TOP_PAD + traceH * yFrac
          ctx.save()
          ctx.strokeStyle = ch.color
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

    // Left border line
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(LEFT_PAD, 0)
    ctx.lineTo(LEFT_PAD, H)
    ctx.stroke()

    // Right border line
    ctx.beginPath()
    ctx.moveTo(W - RIGHT_PAD, 0)
    ctx.lineTo(W - RIGHT_PAD, H)
    ctx.stroke()

    // Time axis labels (bottom)
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
  }, [history, activeChList, timeWindow, paused])

  // Canvas resize + animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    const interval = setInterval(draw, 100)
    return () => {
      clearInterval(interval)
      ro.disconnect()
    }
  }, [draw])

  // Hover handler — find closest sample and show values
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
        return { label: ch.label, value: val != null ? ch.formatValue(val) : '--', color: ch.color }
      })

      setHover({ x: mouseX, y: mouseY, values, timeAgo })
    },
    [history, activeChList, timeWindow]
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      />

      {/* Hover tooltip */}
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: hover.x + 12,
            top: Math.min(hover.y, (canvasRef.current?.clientHeight ?? 400) - 120),
            background: '#161616',
            border: '1px solid #2a2a2a',
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 100,
          }}
        >
          <div style={{ color: '#444444', fontSize: 9, fontFamily: 'monospace', marginBottom: 4 }}>
            {hover.timeAgo}
          </div>
          {hover.values.map((v) => (
            <div key={v.label} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: v.color, fontSize: 10, fontFamily: 'monospace' }}>{v.label}</span>
              <span style={{ color: '#e8e0d0', fontSize: 10, fontFamily: 'monospace' }}>{v.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scanlines overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
          zIndex: 5,
        }}
      />
    </div>
  )
}
