# Changelog

All notable changes to Framework Deck are documented here.

Format: `[version] YYYY-MM-DD — description`

---

## Framework Deck

### [2.1.0] 2026-04-01 — Performance, LED Matrix, & Quality of Life

**Oscilloscope rendering improvements:**
- Switched from `setInterval(100ms)` to `requestAnimationFrame` — smoother trace rendering with smart dirty-checking (only redraws when data changes or 200ms elapses)
- CSS variable resolution now cached with 2s TTL — eliminates `getComputedStyle` calls every frame
- Cache auto-invalidates on theme change
- Tooltip now flips horizontally when near right edge and clamps vertically — no more off-screen tooltips
- Scanlines overlay respects reduced motion preference
- Added ARIA label to oscilloscope container for accessibility

**LED Matrix editor overhaul:**
- 6 new built-in patterns: diagonal, stripes, vertical stripes, diamond, rain, FW logo
- Transform operations: flip horizontal, flip vertical, invert, shift left, shift right
- Full undo/redo with Ctrl+Z/Ctrl+Y keyboard shortcuts (30-step history)
- Save/load custom patterns to localStorage with named entries
- Export/import patterns via clipboard (compact hex encoding)
- Delete saved patterns

**Status bar improvements:**
- Live data rate indicator (samples per second)
- Session uptime counter

**API client hardening:**
- Removed hardcoded API token from frontend source (now env-only via `VITE_API_TOKEN`)
- Descriptive error messages: network errors, auth failures, 404s now explain what went wrong
- Tauri IPC errors detect connection issues and suggest checking if service is running

**History buffer management:**
- Frontend history capped at 7200 samples (~60 min at 2 sps) to prevent unbounded memory growth

**Offline screen:**
- Shows actionable troubleshooting info (binary name, default endpoint, settings pointer)

---

### [2.0.1] 2026-03-13 — Linux Support & CI

**feat: add Linux installer builds and cross-platform CI**
- Linux builds: `.AppImage` (universal), `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL)
- GitHub Actions release workflow now builds Windows + Linux installers on every tag push
- Tauri bundle targets set to `"all"` — builds all available package formats per platform
- Linux-specific bundle config: deb/rpm dependency declarations, AppImage media framework bundling
- Updated README: Linux download table, Linux install instructions, Linux build-from-source prerequisites
- Updated release template with Linux package descriptions and notes
- Added bug report and feature request issue templates

---

### [2.0.0] 2026-03-10 — Accessibility & Display System

**feat: comprehensive font scaling, UI zoom, and accessibility system** (`d4e48a7`)
- Independent text size slider (60%–200%) scales all text without affecting layout
- UI Zoom slider (75%–200%) scales the entire interface proportionally (CSS zoom)
- Quick Size Presets: S / M / L / XL / XXL apply both text and zoom together
- High contrast mode — increases text contrast and border visibility
- Reduced motion — disables all animations, transitions, and CRT scanline effects
- `fs()` helper utility for font size in all canvas and inline style contexts
- Settings module now has three columns: Theme, Display, Units, Accessibility, Oscilloscope, Service

---

### [1.4.0] 2026-03-09 — Build fixes and cleanup

**fix: audit cleanup and Tauri build fixes** (`b35e051`)
- Fixed Tauri capability permissions for log and store plugins
- Removed unused imports and dead code identified in audit
- Build pipeline verified clean on Windows

---

### [1.3.0] 2026-03-09 — Input Modules / LED Matrix

**feat: add Input Modules module with LED Matrix pattern editor** (`f7962fd`)
- LED Matrix paint interface for Framework 16 display panel (306 LEDs)
- Click or drag to activate/deactivate individual LEDs
- Pattern presets: CLEAR, FILL, CHECKER, BORDER, CROSS, WAVE
- Live LED count indicator (X/306 active)
- Module slot inventory — shows what's physically installed in each slot (expansion cards, LED matrix, spacers)

---

### [1.2.0] 2026-03-09 — Power Management & Battery Health

**feat: add Power Management and Battery Health modules** (`0bb4a46`)
- Power Management: TDP limit slider (5–145W, 5W steps), live TDP readout, thermal limit control with safety warning, AC/Battery profile switching
- Battery Health: state of charge with segmented bar, health % with visual indicator, design vs. current max capacity, capacity loss in mAh, live voltage/current, cycle count
- Charge limit control — cap battery charging to extend lifespan (configurable %, e.g. 80% or 95%)
- Power source detection: AC/Battery with charger voltage, current, and input current

---

### [1.1.0] 2026-03-09 — Settings, Fan Control, System Info

**feat: add Settings, Fan Control, and System Info modules** (`e2935e2`)
- Settings: 4 color themes (REEL/PHOS/AMBR/FW), oscilloscope Y-axis mode (FIXED/AUTO), temperature warning threshold, temperature units (°C/°F), API endpoint configuration
- Fan Control: AUTO / MANUAL / CURVE modes, manual duty % slider, live RPM readout
- System Information: hardware specs (CPU, GPU, memory, OS), BIOS version and date, EC firmware build, EC image type, power state capabilities, current TDP, full battery detail

---

### [1.0.0] 2026-03-09 — Input Architect Merge

**feat: combine Framework Deck + Framework HID into unified super tool** (`ad721a7`)
- Absorbed all Framework Input Architect features into the Keyboard module
- Full VIA key remapping (6 layers, 100+ QMK keycodes, modifier combos, layer switching)
- Per-key RGB control via nucleardog rgb_remote firmware
- Config snapshots: save, restore, export, auto-history
- Multi-device switching: keyboard and macropad simultaneously connected
- Auto-reconnect after sleep/wake with RGB settings restored
- LED diagnostics, health check, centralized logging
- Guided firmware flash workflow with UF2 validator and one-click build script
- In-app help and guides

---

### [0.1.0] 2026-03-04 — Initial Framework Deck Prototype

**feat: initial Framework Deck prototype — oscilloscope UI** (`ff373a4`)
- Multi-channel oscilloscope telemetry dashboard using Canvas API
- Stacked channel lanes with per-channel color coding
- Channel auto-discovery from framework-control REST API
- Configurable time window: 1m / 5m / 10m / 30m
- Hover cursor with exact value tooltip
- CRT scanline overlay effect
- 4 color themes: REEL, PHOS, AMBR, FW
- Live status bar showing current value of all active channels
- Tauri 2 desktop shell with React 19 + TypeScript + Tailwind

---

## Input Architect (archived — merged into Framework Deck v1.0.0)

> Input Architect was a standalone WebHID configurator for the Framework 16 keyboard and macropad.
> Development ran from March 3–9, 2026 (v0.1 through v0.15).
> All features were absorbed into Framework Deck's Keyboard module on March 9, 2026.
> The original repository (`enkode/input-architect`) is now archived.

### [0.15.0] 2026-03-09
- Layer mapping from LayerSelector: click Map, pick type (MO/TG/TO), click key

### [0.15.0] 2026-03-09
- Layer switching keycodes (MO, TG, TO) in keycode categories
- Linux rendering fix
- Safety wording updates for firmware flashing

### [0.14.1] 2026-03-08
- Persistent config storage — configs survive app updates and reinstalls

### [0.14.0] 2026-03-08
- Unified config save: EEPROM + localStorage + named snapshot in one click
- Per-key brightness scaling — proportional adjustment across mixed color selections
- Custom key presets — save and name your own key group selections
- Major UI overhaul

### [0.13.1] 2026-03-07
- Fix: removed misleading global color bleeding onto unselected keys on virtual keyboard

### [0.13.0] 2026-03-07
- Cross-row Shift+click range selection
- Config restore snapshots — roll back to any previous lighting configuration
- Logger cleanup
- 9 bug fixes

### [0.12.5] 2026-03-07
- Fix: stop global backlight color from tinting all keys in per-key mode

### [0.12.4] 2026-03-07
- Dynamic text contrast on selected keys
- Tinted background for active per-key colors

### [0.12.3] 2026-03-07
- Fix: stop global color bleeding onto non-selected keys in per-key mode

### [0.12.2] 2026-03-07
- Fix: per-key color display accuracy
- Fix: multi-key batch write reliability

### [0.12.1] 2026-03-06
- Key group presets: Letters, Numbers, F-Keys, WASD, FPS Kit, MOBA, Arrows, Modifiers
- Per-key RGB colors persist after app close (stored in firmware RAM until power cycle)

### [0.12.0] 2026-03-06
- Centralized logging with timestamps and categories
- Full code audit and dead code cleanup
- In-app Help panel with guides

### [0.11.0] 2026-03-06
- Shift+click range selection for keys
- Fix: gap-click detection accuracy
- Trimmed RGB effect list to reliably supported effects only

### [0.10.8] 2026-03-06
- Per-key color cleanup on app close
- Firmware page improvements
- UI cleanup

### [0.10.7] 2026-03-06
- LED test UX improvements
- Editable slider values — click the number to type exact values
- Manual config backup capability
- Dim key glow for very low brightness colors
- Multiple per-key RGB fixes

### [0.10.6] 2026-03-06
- Config history snapshots
- Settings tab
- Fix: restore ordering

### [0.10.5] 2026-03-06
- Contextual per-key mode — auto-switches based on key selection state

### [0.10.4] 2026-03-06
- Improved color preview on virtual keyboard
- Better key color visualization

### [0.10.3] 2026-03-06
- Auto-reconnect and re-apply all RGB settings after sleep/wake cycles

### [0.10.2] 2026-03-04
- Fix: dim key colors on virtual keyboard display

### [0.10.1] 2026-03-04
- Fix: virtual keyboard color accuracy
- Fix: color picker sync with device state
- Fix: LED test sequence

### [0.10.0] 2026-03-04
- Multi-device switching: connect keyboard and macropad separately, switch with one click
- Persistent diagnostic logs

### [0.9.0] 2026-03-04
- Fix: LED test with readback verification
- Auto-save and auto-restore RGB settings on connect

### [0.8.0] 2026-03-04
- Interactive LED test with troubleshooting flow
- Lighting reset capability

### [0.7.0] 2026-03-04
- Connection health check diagnostic

### [0.6.0] 2026-03-04
- Config persistence: backup/restore
- Auto-save per-key RGB

### [0.5.0] 2026-03-04
- Improved keyboard layout accuracy
- Per-key color visualization on virtual keyboard

### [0.4.0] 2026-03-04
- Multi-LED support for large keys (space bar, enter, shift, etc.)

### [0.3.0] 2026-03-04
- Fix: device switching
- Auto-reconnect on page load

### [0.2.0] 2026-03-04
- Fix: save false negatives
- Improved device reconnection

### [0.1.0] 2026-03-03 — Initial release
- Framework Laptop 16 input module configurator
- Tauri desktop packaging
- Lighting diagnostics panel
- VIA key remapping
- Per-key RGB (with nucleardog firmware)
- Firmware flash workflow
