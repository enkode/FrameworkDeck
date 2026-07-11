import { isTauri } from './platform'

/**
 * Open a URL in the system browser. Tauri v2 drops target="_blank" window
 * requests (especially on Linux wry/webkit2gtk), so external links must go
 * through the opener plugin; plain window.open covers browser dev.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return
    } catch (err) {
      console.warn('[openExternal] opener plugin failed, falling back:', err)
    }
  }
  window.open(url, '_blank', 'noopener')
}
