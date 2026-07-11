import { useState } from 'react'
import { fs } from '../../utils/font'
import { isTauri } from '../../utils/platform'
import { openExternal } from '../../utils/openExternal'
import { Download, ExternalLink } from 'lucide-react'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

type InstallState = 'idle' | 'installing' | 'done' | 'error'

/**
 * One-click installer for the framework-control backend service, shown by
 * every module that needs it. Linux: pkexec (polkit auth dialog) downloads,
 * SHA256-verifies, and enables the systemd service. Windows: downloads the
 * MSI and runs msiexec (UAC prompt).
 */
export function InstallServicePrompt() {
  const [state, setState] = useState<InstallState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const install = async () => {
    setState('installing')
    setMessage(null)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke<string>('install_framework_control')
      setState('done')
      setMessage('Service installed and started — connecting…')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  const btn: React.CSSProperties = {
    ...mono,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: fs(9), letterSpacing: '0.08em', padding: '7px 12px',
    borderRadius: 3, cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {isTauri && (
          <button
            onClick={install}
            disabled={state === 'installing' || state === 'done'}
            style={{
              ...btn,
              background: state === 'installing' ? 'transparent' : 'var(--tan)',
              color: state === 'installing' ? 'var(--cream-dim)' : 'var(--bg)',
              border: '1px solid var(--tan)',
              cursor: state === 'installing' ? 'wait' : 'pointer',
            }}
          >
            <Download size={11} />
            {state === 'installing' ? 'INSTALLING… (authorize when prompted)'
              : state === 'done' ? 'INSTALLED'
              : 'INSTALL SERVICE'}
          </button>
        )}
        <button
          onClick={() => openExternal('https://github.com/ozturkkl/framework-control')}
          style={{ ...btn, background: 'transparent', color: 'var(--cream-dim)', border: '1px solid var(--border)' }}
        >
          <ExternalLink size={11} />
          VIEW ON GITHUB
        </button>
      </div>
      {message && (
        <div style={{ ...mono, fontSize: fs(9), color: state === 'error' ? '#cc8800' : '#22cc44', maxWidth: 480, textAlign: 'center' }}>
          {message}
        </div>
      )}
    </div>
  )
}
