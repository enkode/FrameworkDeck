import { THEMES, useAppStore } from '../store/app'
import type { Theme } from '../store/app'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'

const THEME_META: Record<Theme, { label: string; desc: string; accent: string }> = {
  reel:      { label: 'REEL',  desc: 'Teenage Engineering — cream/red/blue', accent: '#e8e0d0' },
  phosphor:  { label: 'PHOS',  desc: 'Tektronix classic — phosphor green',   accent: '#00ff41' },
  amber:     { label: 'AMBR',  desc: 'HP terminal — amber on black',         accent: '#ffaa00' },
  framework: { label: 'FW',    desc: 'Framework blue — cool tech',           accent: '#3388ff' },
}

const mono: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ ...mono, fontSize: 10, color: '#666666', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 0',
        background: active ? 'var(--blue-dim)' : 'transparent',
        border: `1px solid ${active ? 'var(--blue)' : '#2a2a2a'}`,
        color: active ? 'var(--blue)' : '#555555',
        ...mono,
        fontSize: 11,
        cursor: 'pointer',
        letterSpacing: '0.05em',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export function SettingsModule() {
  const {
    theme, setTheme,
    fontScale, setFontScale,
    useFahrenheit, setUseFahrenheit,
    reducedMotion, setReducedMotion,
    highContrast, setHighContrast,
    yAutoScale, setYAutoScale,
    tempWarnC, setTempWarnC,
    apiBase, setApiBase,
  } = useAppStore()

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg)',
      padding: '24px 32px',
    }}>
      {/* Module header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...mono, fontSize: 14, color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          SETTINGS
        </h2>
        <div style={{ ...mono, fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
          Application preferences and display configuration
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1000 }}>

        {/* ── THEME ─────────────────────────────── */}
        <Panel label="THEME">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {THEMES.map((t) => {
                const meta = THEME_META[t]
                const active = theme === t
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      padding: '10px 12px',
                      background: active ? '#1e1e1e' : 'transparent',
                      border: `1px solid ${active ? meta.accent : '#1e1e1e'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <LEDIndicator active={active} color={meta.accent} size={6} />
                      <span style={{ ...mono, fontSize: 11, color: active ? meta.accent : '#555555', letterSpacing: '0.1em' }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ ...mono, fontSize: 9, color: active ? '#666666' : '#333333' }}>
                      {meta.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>

        {/* ── DISPLAY ───────────────────────────── */}
        <Panel label="DISPLAY">
          <div style={{ padding: '12px 14px' }}>
            {/* Font scale */}
            <SettingRow label="PANEL TEXT SIZE">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ ...mono, fontSize: 9, color: '#333333' }}>80%</span>
                <span style={{ ...mono, fontSize: 11, color: 'var(--cream)' }}>{Math.round(fontScale * 100)}%</span>
                <span style={{ ...mono, fontSize: 9, color: '#333333' }}>150%</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.5}
                step={0.05}
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cream)', cursor: 'pointer' }}
              />
            </SettingRow>

            {/* Temperature unit */}
            <SettingRow label="TEMPERATURE UNIT">
              <div style={{ display: 'flex', gap: 3 }}>
                <ToggleButton active={!useFahrenheit} onClick={() => setUseFahrenheit(false)}>°C</ToggleButton>
                <ToggleButton active={useFahrenheit} onClick={() => setUseFahrenheit(true)}>°F</ToggleButton>
              </div>
            </SettingRow>
          </div>
        </Panel>

        {/* ── ACCESSIBILITY ─────────────────────── */}
        <Panel label="ACCESSIBILITY">
          <div style={{ padding: '12px 14px' }}>
            {/* High contrast */}
            <SettingRow label="HIGH CONTRAST">
              <div style={{ display: 'flex', gap: 3 }}>
                <ToggleButton active={!highContrast} onClick={() => setHighContrast(false)}>OFF</ToggleButton>
                <ToggleButton active={highContrast} onClick={() => setHighContrast(true)}>ON</ToggleButton>
              </div>
              <div style={{ ...mono, fontSize: 8, color: '#2a2a2a', marginTop: 6 }}>
                Increases text contrast and border visibility
              </div>
            </SettingRow>

            {/* Reduced motion */}
            <SettingRow label="REDUCED MOTION">
              <div style={{ display: 'flex', gap: 3 }}>
                <ToggleButton active={!reducedMotion} onClick={() => setReducedMotion(false)}>OFF</ToggleButton>
                <ToggleButton active={reducedMotion} onClick={() => setReducedMotion(true)}>ON</ToggleButton>
              </div>
              <div style={{ ...mono, fontSize: 8, color: '#2a2a2a', marginTop: 6 }}>
                Disables animations, transitions, and CRT effects
              </div>
            </SettingRow>
          </div>
        </Panel>

        {/* ── OSCILLOSCOPE ──────────────────────── */}
        <Panel label="OSCILLOSCOPE">
          <div style={{ padding: '12px 14px' }}>
            {/* Y-scale */}
            <SettingRow label="Y-AXIS SCALE">
              <div style={{ display: 'flex', gap: 3 }}>
                <ToggleButton active={!yAutoScale} onClick={() => setYAutoScale(false)}>FIXED</ToggleButton>
                <ToggleButton active={yAutoScale} onClick={() => setYAutoScale(true)}>AUTO</ToggleButton>
              </div>
              <div style={{ ...mono, fontSize: 8, color: '#2a2a2a', marginTop: 6 }}>
                AUTO zooms Y-axis to fit live data range
              </div>
            </SettingRow>

            {/* Temperature warning */}
            <SettingRow label="TEMP WARNING THRESHOLD">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ ...mono, fontSize: 9, color: '#333333' }}>{useFahrenheit ? '158°F' : '70°C'}</span>
                <span style={{ ...mono, fontSize: 11, color: tempWarnC >= 90 ? '#cc2222' : '#c09060' }}>
                  {useFahrenheit ? `${Math.round(tempWarnC * 9 / 5 + 32)}°F` : `${tempWarnC}°C`}
                </span>
                <span style={{ ...mono, fontSize: 9, color: '#333333' }}>{useFahrenheit ? '212°F' : '100°C'}</span>
              </div>
              <input
                type="range"
                min={70}
                max={100}
                step={5}
                value={tempWarnC}
                onChange={(e) => setTempWarnC(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#cc2222', cursor: 'pointer' }}
              />
            </SettingRow>
          </div>
        </Panel>

        {/* ── SERVICE ───────────────────────────── */}
        <Panel label="SERVICE">
          <div style={{ padding: '12px 14px' }}>
            <SettingRow label="API ENDPOINT">
              <input
                type="text"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#0d0d0d',
                  border: '1px solid #2a2a2a',
                  color: 'var(--cream)',
                  ...mono,
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ ...mono, fontSize: 8, color: '#2a2a2a', marginTop: 6 }}>
                framework-control REST API base URL
              </div>
            </SettingRow>
          </div>
        </Panel>
      </div>
    </div>
  )
}
