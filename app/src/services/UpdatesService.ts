// Framework release checking.
//
// Pipeline:
//   1. `get_device_info` (Rust) — DMI on Linux, CIM on Windows → which
//      Framework device and which BIOS is installed.
//   2. Fetch Framework's KB "BIOS and Drivers Downloads" index and find the
//      table row for this device family + generation (latest BIOS/bundle dates
//      plus the per-device release page link).
//   3. Fetch the per-device release page → latest BIOS version, driver bundle
//      version/date, and direct download links.
//   4. Compare against the installed BIOS version.
//
// All fetches go through the Rust `fetch_framework_releases` command, which is
// allowlisted to frame.work domains. The KB serves its article body as
// JSON-escaped HTML inside a script tag, hence the entity-decode pass.

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../utils/platform'

const KB_INDEX_URL = 'https://knowledgebase.frame.work/en_us/bios-and-drivers-downloads-rJ3PaCexh'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // auto-check at most daily
const LAST_CHECK_KEY = 'framework-deck-update-check'

export interface DeviceInfo {
  vendor: string
  product: string
  sku: string
  board: string
  biosVersion: string
  biosDate: string
  os: string
}

export interface LatestRelease {
  family: string
  generation: string
  pageUrl: string
  biosVersion: string | null
  biosDate: string | null
  bundleVersion: string | null
  bundleDate: string | null
  biosExeUrl: string | null
  biosEfiUrl: string | null
  bundleUrl: string | null
}

export interface UpdateStatus {
  device: DeviceInfo | null
  latest: LatestRelease | null
  /** true = newer BIOS available, false = up to date, null = could not compare */
  biosUpdateAvailable: boolean | null
  checkedAt: number
  error: string | null
}

export interface InstalledDriver {
  name: string
  version: string
  date: string
  provider: string
  class: string
}

export interface LinuxInventory {
  kernel: string
  fwupd: unknown | null
}

// ── HTML wrangling ───────────────────────────────────────────

/** Decode KB pages: HTML entities (possibly double-encoded) + JSON escapes. */
function decodeKbHtml(raw: string): string {
  let s = raw
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
  }
  return s.replace(/\\"/g, '"')
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ') // leftover entities (&trade; &reg; &nbsp; …)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Lowercased alphanumerics only — tolerates ™/®/nbsp and DMI quirks like "7040Series". */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ── Device identity ──────────────────────────────────────────

export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  if (!isTauri) return null
  const raw = await invoke<string>('get_device_info')
  return JSON.parse(raw) as DeviceInfo
}

/**
 * Split a DMI product name into KB family heading + generation.
 * "Laptop 16 (AMD Ryzen AI 300 Series)" → ["Framework Laptop 16", "AMD Ryzen AI 300 Series"]
 * Early Framework 13 units report just "Laptop" → family 13.
 */
export function parseProductName(product: string): { family: string; generation: string | null } {
  const m = product.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  const base = (m ? m[1] : product).trim()
  const generation = m ? m[2].trim() : null
  let family: string
  if (/^laptop\s*16/i.test(base)) family = 'Framework Laptop 16'
  else if (/^laptop\s*13/i.test(base)) family = 'Framework Laptop 13'
  else if (/^laptop\s*12/i.test(base)) family = 'Framework Laptop 12'
  else if (/^desktop/i.test(base)) family = 'Framework Desktop'
  else if (/^laptop$/i.test(base)) family = 'Framework Laptop 13'
  else family = base
  return { family, generation }
}

// ── KB parsing ───────────────────────────────────────────────

interface IndexRow {
  generation: string
  link: string
  biosDate: string | null
  bundleDate: string | null
}

/** Parse the family section tables out of the KB index page. */
export function parseIndexRows(
  html: string,
  family: string,
  generation?: string | null,
): { rows: IndexRow[]; match: IndexRow | null } | null {
  const doc = decodeKbHtml(html)
  // Isolate the section for this family: from its <h1> to the next <h1> (or end)
  const headingRe = /<h1[^>]*>(.*?)<\/h1>/gs
  let sectionStart = -1
  let sectionEnd = doc.length
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(doc)) !== null) {
    const title = stripTags(m[1])
    if (sectionStart >= 0) { sectionEnd = m.index; break }
    if (normalize(title) === normalize(family)) sectionStart = m.index
  }
  if (sectionStart < 0) return null
  const section = doc.slice(sectionStart, sectionEnd)

  const rows: IndexRow[] = []
  const rowRe = /<tr>(.*?)<\/tr>/gs
  let r: RegExpExecArray | null
  while ((r = rowRe.exec(section)) !== null) {
    const rowHtml = r[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((c) => stripTags(c[1]))
    if (cells.length < 2) continue // header row uses <th>
    const link = rowHtml.match(/href="([^"]+)"/)?.[1] ?? null
    if (!link) continue
    rows.push({
      generation: cells[0],
      link,
      biosDate: cells[2] || null,
      bundleDate: cells[3] || null,
    })
  }
  const match = generation !== undefined
    ? rows.find((row) => generation !== null && normalize(row.generation) === normalize(generation)) ?? null
    : null
  return { rows, match }
}

/** Parse a per-device release page for versions + download links. */
export function parseDevicePage(html: string): {
  biosVersion: string | null
  bundleVersion: string | null
  bundleDate: string | null
  biosExeUrl: string | null
  biosEfiUrl: string | null
  bundleUrl: string | null
} {
  const doc = decodeKbHtml(html)

  // "…BIOS 4.01 Release" heading is authoritative; fall back to any BIOS x.xx
  const biosVersion =
    doc.match(/BIOS[ _](\d+\.\d+(?:\.\d+)?)\s*Release/i)?.[1] ??
    doc.match(/BIOS[ _](\d+\.\d+(?:\.\d+)?)/i)?.[1] ??
    null

  // "Driver Bundle (v2.00) 2026-06-04"
  const bundle = doc.match(/Driver Bundle\s*\(v?([\d.]+)\)\s*([\d/-]+)?/i)
  const links = [...doc.matchAll(/https:\/\/downloads\.frame\.work\/[^\s"'<>\\]+/g)].map((x) => x[0])
  const biosExeUrl = links.find((u) => u.includes('/bios/') && u.endsWith('.exe')) ?? null
  const biosEfiUrl = links.find((u) => u.includes('/bios/') && u.toLowerCase().includes('efi')) ?? null
  const bundleUrl = links.find((u) => u.includes('/driver/')) ?? null

  return {
    biosVersion,
    bundleVersion: bundle?.[1] ?? null,
    bundleDate: bundle?.[2] ?? null,
    biosExeUrl,
    biosEfiUrl,
    bundleUrl,
  }
}

// ── Version comparison ───────────────────────────────────────

/** Segment-wise numeric compare tolerant of leading zeros ("04.01" == "4.01"). */
export function compareBiosVersions(installed: string, latest: string): number | null {
  const a = installed.match(/\d+(?:\.\d+)*/)?.[0]?.split('.').map(Number)
  const b = latest.match(/\d+(?:\.\d+)*/)?.[0]?.split('.').map(Number)
  if (!a?.length || !b?.length || a.some(isNaN) || b.some(isNaN)) return null
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

// ── Main check ───────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  return invoke<string>('fetch_framework_releases', { url })
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  const status: UpdateStatus = {
    device: null,
    latest: null,
    biosUpdateAvailable: null,
    checkedAt: Date.now(),
    error: null,
  }
  try {
    status.device = await getDeviceInfo()
    if (!status.device || normalize(status.device.vendor) !== 'framework') {
      status.error = status.device
        ? `Not a Framework device (vendor: ${status.device.vendor || 'unknown'})`
        : 'Device info unavailable outside Tauri'
      return status
    }

    const { family, generation } = parseProductName(status.device.product)
    const indexHtml = await fetchPage(KB_INDEX_URL)
    const row = parseIndexRows(indexHtml, family, generation)?.match ?? null
    if (!row) {
      status.error = `No KB entry found for ${family}${generation ? ` (${generation})` : ''}`
      return status
    }

    const pageHtml = await fetchPage(row.link)
    const page = parseDevicePage(pageHtml)
    status.latest = {
      family,
      generation: row.generation,
      pageUrl: row.link,
      biosVersion: page.biosVersion,
      biosDate: row.biosDate,
      bundleVersion: page.bundleVersion,
      bundleDate: page.bundleDate ?? row.bundleDate,
      biosExeUrl: page.biosExeUrl,
      biosEfiUrl: page.biosEfiUrl,
      bundleUrl: page.bundleUrl,
    }

    if (page.biosVersion && status.device.biosVersion) {
      const cmp = compareBiosVersions(status.device.biosVersion, page.biosVersion)
      status.biosUpdateAvailable = cmp === null ? null : cmp < 0
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err)
  }
  return status
}

// ── Installed inventory ──────────────────────────────────────

export async function getInstalledDrivers(): Promise<InstalledDriver[] | LinuxInventory | null> {
  if (!isTauri) return null
  const raw = await invoke<string>('get_installed_drivers')
  return JSON.parse(raw)
}

// ── Launch-time auto check (throttled) ───────────────────────

let lastStatus: UpdateStatus | null = null

export function getLastStatus(): UpdateStatus | null {
  return lastStatus
}

export function setLastStatus(s: UpdateStatus): void {
  lastStatus = s
}

/**
 * Run at app start: at most one KB check per 24h. Returns the fresh (or null
 * if throttled/skipped) status so the caller can set the nav badge.
 */
export async function autoCheck(): Promise<UpdateStatus | null> {
  if (!isTauri) return null
  try {
    const last = JSON.parse(localStorage.getItem(LAST_CHECK_KEY) ?? 'null') as
      | { checkedAt: number; biosUpdateAvailable: boolean | null }
      | null
    if (last && Date.now() - last.checkedAt < CHECK_INTERVAL_MS) {
      return null
    }
  } catch { /* corrupted marker — proceed with a fresh check */ }

  const status = await checkForUpdates()
  lastStatus = status
  if (!status.error) {
    localStorage.setItem(
      LAST_CHECK_KEY,
      JSON.stringify({ checkedAt: status.checkedAt, biosUpdateAvailable: status.biosUpdateAvailable }),
    )
  }
  return status
}
