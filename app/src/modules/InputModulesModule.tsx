import { fs } from '../utils/font'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

// Framework 16 LED Matrix is 9 rows x 34 columns
const MATRIX_ROWS = 9
const MATRIX_COLS = 34
const MAX_UNDO = 30

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
  diagonal: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) => (r + c) % 4 === 0)
  ),
  stripes: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, () => r % 3 === 0)
  ),
  vstripes: () => Array.from({ length: MATRIX_ROWS }, () =>
    Array.from({ length: MATRIX_COLS }, (_, c) => c % 4 === 0)
  ),
  diamond: () => {
    const cx = Math.floor(MATRIX_COLS / 2)
    const cy = Math.floor(MATRIX_ROWS / 2)
    return Array.from({ length: MATRIX_ROWS }, (_, r) =>
      Array.from({ length: MATRIX_COLS }, (_, c) => {
        const dist = Math.abs(r - cy) * 2 + Math.abs(c - cx)
        return dist <= 10 || (dist >= 14 && dist <= 16)
      })
    )
  },
  rain: () => Array.from({ length: MATRIX_ROWS }, (_, r) =>
    Array.from({ length: MATRIX_COLS }, (_, c) =>
      (c * 7 + r * 3) % 11 < 2
    )
  ),
  fw: () => {
    // "FW" logo pattern
    const p = createEmptyPattern()
    // F
    for (let r = 1; r <= 7; r++) p[r][3] = true
    for (let c = 3; c <= 7; c++) { p[1][c] = true; p[4][c] = true }
    // W
    for (let r = 1; r <= 7; r++) { p[r][10] = true; p[r][16] = true }
    for (let r = 5; r <= 7; r++) { p[r][12] = true; p[r][14] = true }
    p[7][11] = true; p[7][13] = true; p[7][15] = true
    p[6][11] = true; p[6][15] = true
    return p
  },
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

        ctx.fillStyle = on ? 'var(--cream, #e8e0d0)' : '#161616'
        // Canvas can't resolve CSS vars, use fallback
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

// ── Pattern Storage ─────────────────────────────────────────

const STORAGE_KEY = 'framework-deck-led-patterns'

interface SavedPattern {
  name: string
  data: boolean[][]
  savedAt: number
}

function loadSavedPatterns(): SavedPattern[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistPatterns(patterns: SavedPattern[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns))
}

function exportPattern(pattern: Pattern): string {
  // Compact format: each row as a hex string
  const rows = pattern.map((row) => {
    let hex = ''
    for (let i = 0; i < row.length; i += 4) {
      let nibble = 0
      for (let b = 0; b < 4 && i + b < row.length; b++) {
        if (row[i + b]) nibble |= (1 << (3 - b))
      }
      hex += nibble.toString(16)
    }
    return hex
  })
  return JSON.stringify({ v: 1, rows: MATRIX_ROWS, cols: MATRIX_COLS, data: rows })
}

function importPattern(json: string): Pattern | null {
  try {
    const obj = JSON.parse(json)
    if (obj.v !== 1 || obj.rows !== MATRIX_ROWS || obj.cols !== MATRIX_COLS) return null
    return obj.data.map((hex: string) => {
      const row: boolean[] = []
      for (let i = 0; i < hex.length; i++) {
        const nibble = parseInt(hex[i], 16)
        for (let b = 0; b < 4 && row.length < MATRIX_COLS; b++) {
          row.push(!!(nibble & (1 << (3 - b))))
        }
      }
      while (row.length < MATRIX_COLS) row.push(false)
      return row
    })
  } catch { return null }
}

// ── Module ───────────────────────────────────────────────────

export function InputModulesModule() {
  const [pattern, setPattern] = useState<Pattern>(createEmptyPattern)
  const [brightness, setBrightness] = useState(80)
  const [animating, setAnimating] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Undo/redo
  const [undoStack, setUndoStack] = useState<Pattern[]>([])
  const [redoStack, setRedoStack] = useState<Pattern[]>([])

  const pushUndo = useCallback((prev: Pattern) => {
    setUndoStack((stack) => [...stack.slice(-MAX_UNDO), prev])
    setRedoStack([])
  }, [])

  const handlePatternChange = useCallback((newPattern: Pattern) => {
    pushUndo(pattern)
    setPattern(newPattern)
  }, [pattern, pushUndo])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    setRedoStack((stack) => [...stack, pattern])
    setPattern(undoStack[undoStack.length - 1])
    setUndoStack((stack) => stack.slice(0, -1))
  }, [undoStack, pattern])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    setUndoStack((stack) => [...stack, pattern])
    setPattern(redoStack[redoStack.length - 1])
    setRedoStack((stack) => stack.slice(0, -1))
  }, [redoStack, pattern])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // Saved patterns
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>(loadSavedPatterns)
  const [saveName, setSaveName] = useState('')

  const savePattern = () => {
    const name = saveName.trim() || `Pattern ${savedPatterns.length + 1}`
    const entry: SavedPattern = { name, data: pattern, savedAt: Date.now() }
    const updated = [...savedPatterns, entry]
    setSavedPatterns(updated)
    persistPatterns(updated)
    setSaveName('')
  }

  const deleteSavedPattern = (idx: number) => {
    const updated = savedPatterns.filter((_, i) => i !== idx)
    setSavedPatterns(updated)
    persistPatterns(updated)
  }

  // Import/Export
  const handleExport = () => {
    const data = exportPattern(pattern)
    navigator.clipboard.writeText(data)
  }

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const imported = importPattern(text)
      if (imported) {
        pushUndo(pattern)
        setPattern(imported)
      }
    } catch { /* clipboard not available */ }
  }

  // Transform operations
  const mirrorH = () => {
    pushUndo(pattern)
    setPattern(pattern.map((row) => [...row].reverse()))
  }
  const mirrorV = () => {
    pushUndo(pattern)
    setPattern([...pattern].reverse())
  }
  const invert = () => {
    pushUndo(pattern)
    setPattern(pattern.map((row) => row.map((v) => !v)))
  }
  const shiftLeft = () => {
    pushUndo(pattern)
    setPattern(pattern.map((row) => [...row.slice(1), false]))
  }
  const shiftRight = () => {
    pushUndo(pattern)
    setPattern(pattern.map((row) => [false, ...row.slice(0, -1)]))
  }

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
        <span style={{ ...mono, fontSize: fs(12), color: 'var(--cream)', letterSpacing: '0.15em' }}>
          INPUT MODULES
        </span>

        <div style={{ width: 1, height: 22, background: 'var(--border-2)' }} />

        <span style={{ ...mono, fontSize: fs(10), color: 'var(--gray)' }}>
          Framework Laptop 16
        </span>

        <div style={{ flex: 1 }} />

        {/* Undo/Redo */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={undo} disabled={undoStack.length === 0} style={headerBtnStyle(undoStack.length > 0)} title="Undo (Ctrl+Z)">
            UNDO
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} style={headerBtnStyle(redoStack.length > 0)} title="Redo (Ctrl+Y)">
            REDO
          </button>
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border-2)' }} />

        <span style={{ ...mono, fontSize: fs(9), color: '#333333' }}>
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
              onClick={() => handlePatternChange(fn())}
              style={{
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid #1e1e1e',
                color: '#555555',
                ...mono, fontSize: fs(9), letterSpacing: '0.08em',
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

        {/* Transform buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { label: 'FLIP H', fn: mirrorH },
            { label: 'FLIP V', fn: mirrorV },
            { label: 'INVERT', fn: invert },
            { label: '← SHIFT', fn: shiftLeft },
            { label: 'SHIFT →', fn: shiftRight },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid #1a1a1a',
                color: '#444444',
                ...mono, fontSize: fs(9), letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#c09060'; e.currentTarget.style.color = '#c09060' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#444444' }}
            >
              {label}
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
          <LEDMatrixEditor pattern={pattern} onPatternChange={handlePatternChange} />
        </div>

        {/* Instructions */}
        <div style={{ ...mono, fontSize: fs(9), color: '#333333', display: 'flex', gap: 16 }}>
          <span>Click/drag to draw</span>
          <span>{litCount}/{totalLeds} LEDs active</span>
          <span>Ctrl+Z undo</span>
          <span>Ctrl+Y redo</span>
        </div>

        {/* Module Slots */}
        <div style={{ marginTop: 8 }}>
          <div style={{ ...mono, fontSize: fs(9), color: 'var(--gray)', letterSpacing: '0.15em', marginBottom: 10 }}>
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
                    <div style={{ ...mono, fontSize: fs(9), color: '#555555', letterSpacing: '0.08em' }}>{slot.position}</div>
                    <div style={{ ...mono, fontSize: fs(10), color: slot.connected ? 'var(--cream)' : '#444444' }}>{slot.name}</div>
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
              <span style={{ ...mono, fontSize: fs(10), color: '#666666' }}>BRIGHTNESS</span>
              <span style={{ ...mono, fontSize: fs(11), color: 'var(--cream)' }}>{brightness}%</span>
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
                  ...mono, fontSize: fs(10), cursor: 'pointer',
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
                  ...mono, fontSize: fs(10), cursor: 'pointer',
                }}
              >
                ANIMATE
              </button>
            </div>
            <div style={{ ...mono, fontSize: fs(8), color: '#2a2a2a', marginTop: 6 }}>
              Animation scrolls the pattern across the matrix
            </div>
          </div>
        </Panel>

        {/* Pattern info */}
        <Panel label="PATTERN INFO">
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>GRID SIZE</span>
              <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>{MATRIX_COLS}x{MATRIX_ROWS}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>ACTIVE LEDS</span>
              <span style={{ ...mono, fontSize: fs(10), color: 'var(--cream)' }}>{litCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>TOTAL</span>
              <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>{totalLeds}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: fs(10), color: '#555555' }}>FILL</span>
              <span style={{ ...mono, fontSize: fs(10), color: '#888888' }}>{((litCount / totalLeds) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Panel>

        {/* Import / Export */}
        <Panel label="SHARE">
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
              <button onClick={handleExport} style={actionBtnStyle}>
                COPY
              </button>
              <button onClick={handleImport} style={actionBtnStyle}>
                PASTE
              </button>
            </div>
            <div style={{ ...mono, fontSize: fs(8), color: '#2a2a2a' }}>
              Copy pattern to clipboard or paste from clipboard
            </div>
          </div>
        </Panel>

        {/* Save / Load */}
        <Panel label="SAVED PATTERNS">
          <div style={{ padding: '10px 12px' }}>
            {/* Save form */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePattern()}
                style={{
                  flex: 1, padding: '4px 8px',
                  background: '#0d0d0d', border: '1px solid #1e1e1e',
                  color: 'var(--cream)', ...mono, fontSize: fs(9),
                  outline: 'none',
                }}
              />
              <button onClick={savePattern} style={actionBtnStyle}>
                SAVE
              </button>
            </div>

            {/* Pattern list */}
            {savedPatterns.length === 0 ? (
              <div style={{ ...mono, fontSize: fs(9), color: '#2a2a2a' }}>No saved patterns</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {savedPatterns.map((sp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handlePatternChange(sp.data)}
                      style={{
                        flex: 1, padding: '4px 8px', textAlign: 'left',
                        background: 'transparent', border: '1px solid #1a1a1a',
                        color: '#666666', ...mono, fontSize: fs(9), cursor: 'pointer',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--cream)' }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#666666' }}
                    >
                      {sp.name}
                    </button>
                    <button
                      onClick={() => deleteSavedPattern(i)}
                      style={{
                        background: 'transparent', border: '1px solid #1a1a1a',
                        color: '#333333', ...mono, fontSize: fs(9), cursor: 'pointer',
                        padding: '4px 6px',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cc2222'; e.currentTarget.style.color = '#cc2222' }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#333333' }}
                    >
                      DEL
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              <span style={{ color: '#4488cc', fontSize: fs(10), flexShrink: 0 }}>i</span>
              <span style={{ ...mono, fontSize: fs(9), color: '#336699', lineHeight: 1.5 }}>
                LED Matrix and expansion card detection require Tauri backend commands using the inputmodule-rs library. The pattern editor works locally — sending patterns to hardware is pending backend implementation.
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

const headerBtnStyle = (enabled: boolean): React.CSSProperties => ({
  padding: '3px 10px',
  background: 'transparent',
  border: `1px solid ${enabled ? '#1e1e1e' : '#141414'}`,
  color: enabled ? '#555555' : '#222222',
  ...mono, fontSize: fs(9), letterSpacing: '0.06em',
  cursor: enabled ? 'pointer' : 'default',
  opacity: enabled ? 1 : 0.5,
})

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid #1e1e1e',
  color: '#555555',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 'calc(9px * var(--font-scale, 1))',
  letterSpacing: '0.06em',
  cursor: 'pointer',
}
