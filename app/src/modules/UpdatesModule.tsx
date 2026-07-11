import { useCallback, useEffect, useState } from 'react'
import { fs } from '../utils/font'
import { Panel } from '../components/layout/Panel'
import { LEDIndicator } from '../components/analog/LEDIndicator'
import { usePlatform } from '../hooks/usePlatform'
import { useAppStore } from '../store/app'
import { openExternal } from '../utils/openExternal'
import { isTauri } from '../utils/platform'
import {
  checkForUpdates, getInstalledDrivers, getLastStatus, setLastStatus, compareComponents,
  type UpdateStatus, type InstalledDriver, type LinuxInventory, type ComponentComparison,
} from '../services/UpdatesService'
import { useMemo } from 'react'
import { RefreshCw, ExternalLink, Download } from 'lucide-react'

const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

function InfoRow({ label, value, color = '#888888' }: { label: string; value?: string | number | null; color?: string }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
      <span style={{ ...mono, fontSize: fs(10), color: '#555555', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ ...mono, fontSize: fs(11), color, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function ActionButton({ label, icon: Icon, onClick, accent = false }: {
  label: string
  icon: React.ComponentType<{ size?: number }>
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...mono,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: fs(9), letterSpacing: '0.08em',
        padding: '6px 10px', marginRight: 8, marginTop: 8,
        background: accent ? 'var(--tan)' : 'transparent',
        color: accent ? 'var(--bg)' : 'var(--cream-dim)',
        border: accent ? '1px solid var(--tan)' : '1px solid var(--border)',
        borderRadius: 3, cursor: 'pointer',
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  )
}

export function UpdatesModule() {
  const platform = usePlatform()
  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable)
  const [status, setStatus] = useState<UpdateStatus | null>(getLastStatus())
  const [checking, setChecking] = useState(false)
  const [inventory, setInventory] = useState<InstalledDriver[] | LinuxInventory | null>(null)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      const s = await checkForUpdates()
      setLastStatus(s)
      setStatus(s)
      if (s.biosUpdateAvailable !== null) setUpdateAvailable(s.biosUpdateAvailable)
    } finally {
      setChecking(false)
    }
  }, [setUpdateAvailable])

  useEffect(() => {
    if (!status && isTauri) runCheck()
  }, [status, runCheck])

  useEffect(() => {
    if (!isTauri) return
    getInstalledDrivers()
      .then(setInventory)
      .catch((err) => setInventoryError(err instanceof Error ? err.message : String(err)))
  }, [])

  const dev = status?.device
  const latest = status?.latest
  const biosState =
    status?.biosUpdateAvailable === true ? { text: 'BIOS UPDATE AVAILABLE', color: 'var(--red, #cc2222)' } :
    status?.biosUpdateAvailable === false ? { text: 'BIOS UP TO DATE', color: '#22cc44' } :
    { text: 'STATUS UNKNOWN', color: '#888888' }

  const windowsDrivers = Array.isArray(inventory) ? (inventory as InstalledDriver[]) : null
  const linuxInv = !Array.isArray(inventory) && inventory ? (inventory as LinuxInventory) : null

  // Installed-vs-bundle comparison (Windows only — bundles don't apply on Linux)
  const comparisons: ComponentComparison[] | null = useMemo(() => {
    if (platform !== 'windows' || !latest?.components.length || !windowsDrivers?.length) return null
    return compareComponents(latest.components, windowsDrivers)
  }, [platform, latest, windowsDrivers])
  const updatesSuggested = comparisons?.filter((c) => c.verdict === 'update').length ?? 0

  const VERDICT_STYLE: Record<ComponentComparison['verdict'], { label: string; color: string }> = {
    update: { label: 'UPDATE AVAILABLE', color: '#cc8800' },
    current: { label: 'CURRENT', color: '#22cc44' },
    newer: { label: 'NEWER THAN BUNDLE', color: '#2255aa' },
    unknown: { label: '—', color: '#444444' },
  }
  const fwupdDevices: { Name?: string; Version?: string; Plugin?: string }[] =
    (linuxInv?.fwupd as { Devices?: { Name?: string; Version?: string; Plugin?: string }[] } | null)?.Devices?.filter((d) => d.Version) ?? []

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...mono, fontSize: fs(14), color: 'var(--cream)', letterSpacing: '0.15em', margin: 0 }}>
          FRAMEWORK UPDATES
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <LEDIndicator active={!!status && !status.error} color={status?.biosUpdateAvailable ? '#cc8800' : '#22cc44'} size={6} />
          <span style={{ ...mono, fontSize: fs(10), color: '#666666' }}>
            {checking ? 'Checking knowledgebase.frame.work…'
              : status ? `Last checked ${new Date(status.checkedAt).toLocaleString()}`
              : isTauri ? 'Not checked yet' : 'Update checks require the desktop app'}
          </span>
          <button
            onClick={runCheck}
            disabled={checking || !isTauri}
            title="Check for updates now"
            style={{
              ...mono, display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: fs(9), letterSpacing: '0.08em', padding: '3px 8px',
              background: 'transparent', color: 'var(--cream-dim)',
              border: '1px solid var(--border)', borderRadius: 3,
              cursor: checking ? 'wait' : 'pointer', marginLeft: 8,
            }}
          >
            <RefreshCw size={10} />
            {checking ? 'CHECKING' : 'CHECK NOW'}
          </button>
        </div>
        {status?.error && (
          <div style={{ ...mono, fontSize: fs(10), color: '#cc8800', marginTop: 8 }}>
            {status.error}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, maxWidth: 1100 }}>

        {/* ── This Device ─────────────────────── */}
        <Panel label="THIS DEVICE">
          <div style={{ padding: '12px 14px' }}>
            <InfoRow label="VENDOR" value={dev?.vendor} />
            <InfoRow label="PRODUCT" value={dev?.product} color="var(--cream)" />
            <InfoRow label="SKU" value={dev?.sku} />
            <InfoRow label="BOARD" value={dev?.board} />
            <InfoRow label="INSTALLED BIOS" value={dev?.biosVersion} color="var(--cream)" />
            <InfoRow label="BIOS DATE" value={dev?.biosDate} />
            {!dev && (
              <div style={{ ...mono, fontSize: fs(10), color: '#333333' }}>
                Device identity unavailable{isTauri ? '' : ' outside the desktop app'}
              </div>
            )}
          </div>
        </Panel>

        {/* ── Latest Vetted BIOS ──────────────── */}
        <Panel label="LATEST VETTED BIOS">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ ...mono, fontSize: fs(11), color: biosState.color, letterSpacing: '0.08em', marginBottom: 10 }}>
              {biosState.text}
            </div>
            <InfoRow label="GENERATION" value={latest?.generation} />
            <InfoRow label="LATEST BIOS" value={latest?.biosVersion} color="var(--cream)" />
            <InfoRow label="RELEASED" value={latest?.biosDate} />
            <InfoRow label="INSTALLED" value={dev?.biosVersion} />
            {latest && (
              <div>
                <ActionButton label="RELEASE NOTES" icon={ExternalLink} onClick={() => openExternal(latest.pageUrl)} />
                {platform === 'windows' && latest.biosExeUrl && (
                  <ActionButton label="DOWNLOAD BIOS (EXE)" icon={Download} accent={status?.biosUpdateAvailable === true} onClick={() => openExternal(latest.biosExeUrl!)} />
                )}
                {platform === 'linux' && latest.biosEfiUrl && (
                  <ActionButton label="DOWNLOAD BIOS (EFI)" icon={Download} accent={status?.biosUpdateAvailable === true} onClick={() => openExternal(latest.biosEfiUrl!)} />
                )}
              </div>
            )}
            {platform === 'linux' && (
              <div style={{ ...mono, fontSize: fs(9), color: '#555555', marginTop: 10, lineHeight: 1.5 }}>
                On Linux, Framework ships BIOS updates through LVFS:<br />
                <span style={{ color: 'var(--cream-dim)' }}>sudo fwupdmgr refresh && sudo fwupdmgr get-updates</span>
              </div>
            )}
          </div>
        </Panel>

        {/* ── Driver Bundle ───────────────────── */}
        <Panel label="DRIVER BUNDLE">
          <div style={{ padding: '12px 14px' }}>
            <InfoRow label="LATEST BUNDLE" value={latest?.bundleVersion ? `v${latest.bundleVersion}` : null} color="var(--cream)" />
            <InfoRow label="RELEASED" value={latest?.bundleDate} />
            <InfoRow label="COMPONENTS" value={latest?.components.length ? `${latest.components.length} drivers (${latest.components.filter((c) => c.changed).length} updated in this bundle)` : null} />
            {latest && (
              <div>
                <ActionButton label="RELEASE NOTES" icon={ExternalLink} onClick={() => openExternal(latest.pageUrl)} />
                {platform === 'windows' && latest.bundleUrl && (
                  <ActionButton label="DOWNLOAD DRIVER BUNDLE" icon={Download} onClick={() => openExternal(latest.bundleUrl!)} />
                )}
              </div>
            )}
            {platform !== 'windows' && (
              <div style={{ ...mono, fontSize: fs(9), color: '#555555', marginTop: 8, lineHeight: 1.5 }}>
                Bundle installers are Windows-only. On Linux the equivalents ship
                with the kernel and fwupd (below); the component list is shown
                for reference.
              </div>
            )}
            {latest && !latest.bundleVersion && (
              <div style={{ ...mono, fontSize: fs(10), color: '#333333', marginTop: 6 }}>
                No driver bundle info found on the release page
              </div>
            )}
          </div>
        </Panel>

        {/* ── Installed inventory ─────────────── */}
        {platform === 'linux' && (
          <Panel label="INSTALLED (LINUX)">
            <div style={{ padding: '12px 14px' }}>
              <InfoRow label="KERNEL" value={linuxInv?.kernel} color="var(--cream)" />
              {fwupdDevices.length > 0 ? (
                <>
                  <div style={{ ...mono, fontSize: fs(9), color: '#444444', letterSpacing: '0.1em', margin: '10px 0 6px' }}>
                    FIRMWARE (fwupd)
                  </div>
                  {fwupdDevices.map((d, i) => (
                    <InfoRow key={i} label={(d.Name ?? 'device').toUpperCase().slice(0, 28)} value={d.Version} />
                  ))}
                </>
              ) : (
                <div style={{ ...mono, fontSize: fs(10), color: '#333333', marginTop: 6 }}>
                  {linuxInv ? 'fwupd not available — install fwupd for firmware inventory' : 'Loading inventory…'}
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      {/* ── Bundle components: installed vs latest ── */}
      {latest && latest.components.length > 0 && (
        <div style={{ maxWidth: 1100, marginTop: 16 }}>
          <Panel label={
            platform === 'windows'
              ? `BUNDLE COMPONENTS — INSTALLED VS v${latest.bundleVersion ?? '?'}${updatesSuggested > 0 ? ` (${updatesSuggested} UPDATE${updatesSuggested > 1 ? 'S' : ''} SUGGESTED)` : ''}`
              : `BUNDLE COMPONENTS (v${latest.bundleVersion ?? '?'})`
          }>
            <div style={{ padding: '12px 14px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {(platform === 'windows'
                      ? ['COMPONENT', 'BUNDLE VERSION', 'INSTALLED', 'STATUS']
                      : ['COMPONENT', 'VERSION', 'CHANGED IN THIS BUNDLE']
                    ).map((h) => (
                      <th key={h} style={{ ...mono, fontSize: fs(9), color: '#444444', letterSpacing: '0.1em', textAlign: 'left', padding: '4px 10px 8px 0', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platform === 'windows' && comparisons
                    ? comparisons.map((c, i) => (
                        <tr key={i}>
                          <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream-dim)', padding: '4px 10px 4px 0' }}>{c.component.name}</td>
                          <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream)', padding: '4px 10px 4px 0', whiteSpace: 'nowrap' }}>{c.component.version}</td>
                          <td style={{ ...mono, fontSize: fs(10), color: c.installedVersion ? '#888888' : '#333333', padding: '4px 10px 4px 0', whiteSpace: 'nowrap' }}>
                            {c.installedVersion ?? 'not matched'}
                          </td>
                          <td style={{ ...mono, fontSize: fs(9), color: VERDICT_STYLE[c.verdict].color, letterSpacing: '0.06em', padding: '4px 0', whiteSpace: 'nowrap' }}>
                            {VERDICT_STYLE[c.verdict].label}
                          </td>
                        </tr>
                      ))
                    : latest.components.map((c, i) => (
                        <tr key={i}>
                          <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream-dim)', padding: '4px 10px 4px 0' }}>{c.name}</td>
                          <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream)', padding: '4px 10px 4px 0', whiteSpace: 'nowrap' }}>{c.version}</td>
                          <td style={{ ...mono, fontSize: fs(9), color: c.changed ? '#cc8800' : '#444444', letterSpacing: '0.06em', padding: '4px 0' }}>
                            {c.changed ? 'UPDATED' : 'same'}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
              {platform === 'windows' && (
                <div style={{ ...mono, fontSize: fs(9), color: '#444444', marginTop: 10, lineHeight: 1.5 }}>
                  Matching is best-effort (driver naming differs between the bundle
                  and Windows). "not matched" means no confident pairing — check the
                  installed drivers table below manually. Framework vets the bundle
                  as a whole: when in doubt, install the full bundle.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* ── Windows driver table ─────────────── */}
      {platform === 'windows' && (
        <div style={{ maxWidth: 1100, marginTop: 16 }}>
          <Panel label={`INSTALLED DRIVERS${windowsDrivers ? ` (${windowsDrivers.length})` : ''}`}>
            <div style={{ padding: '12px 14px', maxHeight: 360, overflowY: 'auto' }}>
              {inventoryError && (
                <div style={{ ...mono, fontSize: fs(10), color: '#cc8800' }}>{inventoryError}</div>
              )}
              {windowsDrivers && windowsDrivers.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['DEVICE', 'VERSION', 'DATE', 'PROVIDER', 'CLASS'].map((h) => (
                        <th key={h} style={{ ...mono, fontSize: fs(9), color: '#444444', letterSpacing: '0.1em', textAlign: 'left', padding: '4px 8px 8px 0', borderBottom: '1px solid var(--border)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {windowsDrivers.map((d, i) => (
                      <tr key={i}>
                        <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream-dim)', padding: '4px 8px 4px 0' }}>{d.name}</td>
                        <td style={{ ...mono, fontSize: fs(10), color: 'var(--cream)', padding: '4px 8px 4px 0', whiteSpace: 'nowrap' }}>{d.version}</td>
                        <td style={{ ...mono, fontSize: fs(10), color: '#666666', padding: '4px 8px 4px 0', whiteSpace: 'nowrap' }}>{d.date}</td>
                        <td style={{ ...mono, fontSize: fs(10), color: '#666666', padding: '4px 8px 4px 0' }}>{d.provider}</td>
                        <td style={{ ...mono, fontSize: fs(10), color: '#555555', padding: '4px 8px 4px 0' }}>{d.class}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : !inventoryError && (
                <div style={{ ...mono, fontSize: fs(10), color: '#333333' }}>
                  {inventory === null ? 'Loading driver inventory…' : 'No drivers found'}
                </div>
              )}
            </div>
          </Panel>
          <div style={{ ...mono, fontSize: fs(9), color: '#444444', marginTop: 8, lineHeight: 1.5 }}>
            Framework vets driver versions per device as a bundle, not per driver.
            Compare your GPU/chipset versions against the bundle release notes
            (RELEASE NOTES above) after a new bundle ships.
          </div>
        </div>
      )}
    </div>
  )
}
