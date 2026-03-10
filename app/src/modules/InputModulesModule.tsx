import { useState, useRef, useCallback, useEffect } from 'react'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

// Framework 16 LED Matrix is 9 rows x 34 columns
const MATRIX_ROWS = 9
const MATRIX_COLS = 34

type Pattern = boolean[][]

function createEmptyPattern(): Pattern {
  return Array.from({ length: MATRIX_ROWS }, () => Array(MATRIX_COLS).fill(false))
}

const BUILTIN_PATTERNS: Record<string, () => Pattern> = {
  clear: createEmptyPattern,
  fill: () => Array.from({ length: MATRIX_ROWS }, () => Array(MATRIX_COLS).fill(true)),
  checker: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) => (r + c) % 2 === 0)
  ),
  border: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) =>
      r === 0 || r === MATRIX_ROWS - 1 || c === 0 || c === MATRIX_COLS - 1
    )
  ),
  cross: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) =>
      r === Math.floor(MATRIX_ROWS / 2) || c === Math.floor(MATRIX_COLS / 2)
    )
  ),
  wave: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) =>
      r === Math.floor(Math.sin(c / 3) * 3 + 4)
    )
  ),
}

// ── LED Matrix Editor ────────────────────────────────────────

function LEDMatrixEditor({ pattern, onPatternChange }: { pattern: Pattern; onPatternChange: (p: Pattern) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawValue, setDrawValue] = useState(true)
  const cellSize = 14
  const gap = 2
  const w = MATRIX_COLS * (cellSize + gap) + gap
  const h = MATRIX_ROWS * (cellSize + gap) + gap

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvasRef.current!.width = w * dpr
    canvasRef.current!.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, w, h)

    // Cells
    for (let r = 0; r < MATRIX_ROWS; r++) {
      for (let c = 0; c < MATRIX_COLS; c++) {
        const x = gap + c * (cellSize + gap)
        const y = gap + r * (cellSize + gap)
        const on = pattern[r][c]

        ctx.fillStyle = on ? '#e8e0d0' : '#161616'
        ctx.fillRect(x, y, cellSize, cellSize)

        if (on) {
          ctx.shadowColor = '#e8e0d0'
          ctx.shadowBlur = 4
          ctx.fillRect(x, y, cellSize, cellSize)
          ctx.shadowBlur = 0
        }
      }
    }
  }, [pattern, w, h])

  const getCellAt = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const c = Math.floor((mx - gap) / (cellSize + gap))
    const r = Math.floor((my - gap) / (cellSize + gap))
    if (r >= 0 && r < MATRIX_ROWS && c >= 0 && c < MATRIX_COLS) return { r, c }
    return null
  }, [])

  const toggleCell = useCallback((r: number, c: number, value: boolean) => {
    const newPattern = pattern.map((row) => [...row])
    newPattern[r][c] = value
    onPatternChange(newPattern)
  }, [pattern, onPatternChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    const cell = getCellAt(e)
    if (!cell) return
    const newValue = !pattern[cell.r][cell.c]
    setDrawValue(newValue)
    setIsDrawing(true)
    toggleCell(cell.r, cell.c, newValue)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const cell = getCellAt(e)
    if (cell) toggleCell(cell.r, cell.c, drawValue)
  }

  const handleMouseUp = () => setIsDrawing(false)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: w, height: h, cursor: 'crosshair', display: 'block' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

// ── Input Module Slot ────────────────────────────────────────

interface SlotInfo {
  position: string
  type: string
  name: string
  connected: boolean
}

const FRAMEWORK_16_SLOTS: SlotInfo[] = [
  { position: 'LEFT-1', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'LEFT-2', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'LEFT-3', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'RIGHT-1', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'RIGHT-2', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'RIGHT-3', type: 'expansion', name: 'Expansion Card', connected: false },
  { position: 'INPUT-1', type: 'keyboard', name: 'ANSI Keyboard', connected: false },
  { position: 'INPUT-2', type: 'spacer', name: 'Spacer (small)', connected: false },
  { position: 'INPUT-3', type: 'led-matrix', name: 'LED Matrix', connected: false },
]

// ── Module ───────────────────────────────────────────────────

export function InputModulesModule() {
  const [pattern, setPattern] = useState<Pattern>(createEmptyPattern)
  const [brightness, setBrightness] = useState(80)
  const [animating, setAnimating] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Count lit LEDs
  const litCount = pattern.reduce((sum, row) => sum + row.filter(Boolean).length, 0)
  const totalLeds = MATRIX_ROWS * MATRIX_COLS

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplate: `"header header" auto "matrix sidebar" 1fr / 1fr 280px`,
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
        <span style={{ ...mono, fontSize: 12, color: 'var(--cream)', letterSpacing: '0.15em' }}>
          INPUT MODULES
        </span>

        <div style={{ width: 1, height: 22, background: 'var(--border-2)' }} />

        <span style={{ ...mono, fontSize: 10, color: 'var(--gray)' }}>
          Framework Laptop 16
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ ...mono, fontSize: 9, color: '#333333' }}>
          Requires Tauri + inputmodule-rs backend
        </span>
      </div>

      {/* ── Main: LED Matrix Editor ─────────────── */}
      <div style={{
        gridArea: 'matrix',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        gap: 16,
      }}>
        {/* Pattern presets */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(BUILTIN_PATTERNS).map(([key, fn]) => (
            <button
              key={key}
              onClick={() => setPattern(fn())}
              style={{
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid #1e1e1e',
                color: '#555555',
                ...mono, fontSize: 9, letterSpacing: '0.08em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--cream)' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#555555' }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Matrix canvas */}
        <div style={{
          background: '#050505',
          border: '1px solid #1e1e1e',
          padding: 12,
          display: 'inline-block',
          alignSelf: 'flex-start',
        }}>
          <LEDMatrixEditor pattern={pattern} onPatternChange={setPattern} />
        </div>

        {/* Instructions */}
        <div style={{ ...mono, fontSize: 9, color: '#333333', display: 'flex', gap: 16 }}>
          <span>Click/drag to draw</span>
          <span>{litCount}/{totalLeds} LEDs active</span>
        </div>

        {/* Module Slots */}
        <div style={{ marginTop: 8 }}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--gray)', letterSpacing: '0.15em', marginBottom: 10 }}>
            MODULE SLOTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {FRAMEWORK_16_SLOTS.map((slot) => (
              <button
                key={slot.position}
                onClick={() => setSelectedSlot(slot.position === selectedSlot ? null : slot.position)}
                style={{
                  padding: '8px 12px',
                  background: selectedSlot === slot.position ? '#1e1e1e' : 'var(--bg-panel)',
                  border: `1px solid ${selectedSlot === slot.position ? 'var(--cream-dim)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LEDIndicator active={slot.connected} color={slot.connected ? '#22cc44' : '#333333'} size={5} />
                  <div>
                    <div style={{ ...mono, fontSize: 9, color: '#555555', letterSpacing: '0.08em' }}>{slot.position}</div>
                    <div style={{ ...mono, fontSize: 10, color: slot.connected ? 'var(--cream)' : '#444444' }}>{slot.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────── */}
      <div style={{
        gridArea: 'sidebar',
        borderLeft: '1px solid var(--border)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Brightness */}
        <Panel label="LED BRIGHTNESS">
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...mono, fontSize: 10, color: '#666666' }}>BRIGHTNESS</span>
              <span style={{ ...mono, fontSize: 11, color: 'var(--cream)' }}>{brightness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cream)', cursor: 'pointer' }}
            />
          </div>
        </Panel>

        {/* Animation */}
        <Panel label="ANIMATION">
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              <button
                onClick={() => setAnimating(false)}
                style={{
                  flex: 1, padding: '5px 0',
                  background: !animating ? 'var(--blue-dim)' : 'transparent',
                  border: `1px solid ${!animating ? 'var(--blue)' : '#2a2a2a'}`,
                  color: !animating ? 'var(--blue)' : '#555555',
                  ...mono, fontSize: 10, cursor: 'pointer',
                }}
              >
                STATIC
              </button>
              <button
                onClick={() => setAnimating(true)}
                style={{
                  flex: 1, padding: '5px 0',
                  background: animating ? 'var(--blue-dim)' : 'transparent',
                  border: `1px solid ${animating ? 'var(--blue)' : '#2a2a2a'}`,
                  color: animating ? 'var(--blue)' : '#555555',
                  ...mono, fontSize: 10, cursor: 'pointer',
                }}
              >
                ANIMATE
              </button>
            </div>
            <div style={{ ...mono, fontSize: 8, color: '#2a2a2a', marginTop: 6 }}>
              Animation scrolls the pattern across the matrix
            </div>
          </div>
        </Panel>

        {/* Pattern info */}
        <Panel label="PATTERN INFO">
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: '#555555' }}>GRID SIZE</span>
              <span style={{ ...mono, fontSize: 10, color: '#888888' }}>{MATRIX_COLS}x{MATRIX_ROWS}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: '#555555' }}>ACTIVE LEDS</span>
              <span style={{ ...mono, fontSize: 10, color: 'var(--cream)' }}>{litCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: '#555555' }}>TOTAL</span>
              <span style={{ ...mono, fontSize: 10, color: '#888888' }}>{totalLeds}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: 10, color: '#555555' }}>FILL</span>
              <span style={{ ...mono, fontSize: 10, color: '#888888' }}>{((litCount / totalLeds) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Panel>

        {/* Backend note */}
        <Panel label="STATUS">
          <div style={{ padding: '10px 12px' }}>
            <div style={{
              padding: '8px 10px',
              background: '#0a0e1a', border: '1px solid #1a2244',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <span style={{ color: '#4488cc', fontSize: 10, flexShrink: 0 }}>i</span>
              <span style={{ ...mono, fontSize: 9, color: '#336699', lineHeight: 1.5 }}>
                LED Matrix and expansion card detection require Tauri backend commands using the inputmodule-rs library. The pattern editor works locally — sending patterns to hardware is pending backend implementation.
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
