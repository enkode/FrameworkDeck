# Framework Deck

The all-in-one desktop companion for Framework laptops. Oscilloscope-style telemetry, keyboard/macropad configurator, fan curves, power management, and battery health — unified in one industrial-grade interface.

**Design language:** Tektronix MSO meets Teenage Engineering. Multi-channel waveform display, stacked sensor traces, cream/red/blue palette on near-black. Minimal, precise, industrial.

Built with Tauri 2 + React 19 + TypeScript + Tailwind CSS.

---

## Features

### Dashboard — Live Telemetry Oscilloscope
- Multi-channel waveform traces (Canvas-based, custom drawn)
- Per-channel enable/disable with colored LEDs
- Configurable time window: 1m / 5m / 10m / 30m
- Hover cursor with exact value tooltip
- CRT scanline overlay effect
- Auto-discovers all sensor channels from connected device

### Keyboard Configurator
- Full key remapping (6 layers) via VIA protocol over WebHID
- Per-key RGB lighting control (with [custom firmware](#firmware-options))
- Global RGB effects, brightness, speed, and color
- Firmware management with UF2 validation and guided flashing
- Config backup & restore (JSON export/import)
- Config history with named snapshots
- Multi-device switching (keyboard + macropad)
- Auto-restore RGB settings on reconnect and sleep/wake
- Shift+click range selection, Ctrl+click multi-select
- Custom key group presets (FPS, MOBA, WASD, etc.)

### Control Panels
- **Fan Control** — AUTO / MANUAL / CURVE modes, drag slider for duty %
- **Power** — TDP and thermal limit nudge controls, AC/Battery profiles
- **Battery** — SoC cell visualization, health bar, charge limit control
- **Presets** — SILENT / BALANCED / PERFORM / TURBO one-click profiles

### Themes
Four switchable color themes (live, no reload):

| Theme | Palette |
|-------|---------|
| REEL  | Cream/red/blue on #0d0d0d (Teenage Engineering, default) |
| PHOS  | Phosphor green on #040904 (Tektronix classic) |
| AMBR  | Amber on #0a0700 (HP terminal) |
| FW    | Framework blue on #070b12 |

### Accessibility
- Font scaling (0.8x – 1.5x)
- High contrast mode
- Reduced motion (disables all animations)
- Keyboard-navigable UI

---

## Architecture

```
Framework Deck/
├── app/                          # Tauri 2 + React 19 application
│   ├── src/
│   │   ├── api/                  # REST client for framework-control service
│   │   ├── store/                # Zustand state (app prefs, device state)
│   │   ├── hooks/                # SWR data-fetching hooks (thermal, power, etc.)
│   │   ├── modules/              # Top-level module views
│   │   │   ├── DashboardModule   # Oscilloscope telemetry dashboard
│   │   │   ├── KeyboardModule    # HID keyboard/macropad configurator
│   │   │   └── PlaceholderModule # Coming-soon module template
│   │   ├── services/             # HID, config, storage, logging services
│   │   ├── components/
│   │   │   ├── display/          # OscilloscopeView, ChannelSelector
│   │   │   ├── panels/           # DeviceHeader, FanPanel, PowerPanel, BatteryPanel
│   │   │   ├── keyboard/         # VirtualKeyboard, ColorPicker, KeymapFlow, etc.
│   │   │   ├── nav/              # NavRail (module navigation)
│   │   │   └── layout/           # Panel, ControlsPanel, StatusBar
│   │   ├── data/                 # Key definitions, firmware catalog, presets
│   │   ├── types/                # VIA protocol types, navigation types
│   │   ├── utils/                # Keycodes, color, UF2, formatting
│   │   └── layouts/              # AppShell (NavRail + content)
│   ├── src-tauri/                # Tauri 2 Rust backend
│   └── ...
└── repo/
    └── framework-control/        # Upstream Rust telemetry service (backend)
```

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (for Tauri)
- [framework-control](repo/framework-control/README.md) service (for telemetry features)

### Install & Run

```bash
cd app
npm install
npm run dev          # Vite dev server (browser mode, HID works in Chromium)
```

For the full desktop experience with Tauri:
```bash
npm run tauri dev    # Launches native window with WebHID support
```

### Build

```bash
npm run tauri build  # Creates Windows installer (.msi / .nsis)
```

---

## Hardware Support

### Telemetry (via framework-control service)
- Framework Laptop 13 (AMD / Intel)
- Framework Laptop 16 (AMD Ryzen 7040 / AI 300)
- APU, GPU, CPU temperatures
- EC thermal sensors (F75303)
- Fan RPM (1 or 2 fans)
- Power draw

### Keyboard Configurator (via WebHID)
- Framework Laptop 16 ANSI Keyboard (PID 0x0012)
- Framework Laptop 16 RGB Macropad (PID 0x0013)
- VIA Protocol V2 and V3 (auto-detected)
- Per-key RGB via [nucleardog rgb_remote](https://gitlab.com/nucleardog/qmk_firmware_fw16) firmware

---

## Firmware Options

The keyboard configurator supports multiple QMK firmware variants:

| Firmware | Per-Key RGB | VIA | Pre-built |
|----------|-------------|-----|-----------|
| [Official Framework QMK](https://github.com/FrameworkComputer/qmk_firmware) | Global only | V3 | Yes |
| [nucleardog rgb_remote](https://gitlab.com/nucleardog/qmk_firmware_fw16) | Yes (host-controlled) | V3 | Build from source |
| [tagno25 OpenRGB](https://github.com/tagno25/qmk_firmware) | Yes (via OpenRGB app) | No | Yes |
| [Shandower81 CORY](https://github.com/Shandower81/CORY-FRAMEWORK-RGB-KEYBOARD) | Baked-in per-layer | Partial | Yes |

The app includes a one-click build script generator for the nucleardog firmware (Windows, automatic QMK MSYS setup).

---

## Development

```bash
cd app
npm run dev          # Dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
npm run tauri dev    # Tauri dev mode (native window)
npm run tauri build  # Tauri production build
```

### Adding themes
Edit `src/index.css` — add a `[data-theme="yourtheme"]` block with CSS custom properties. Add the theme ID to `THEMES` in `src/store/app.ts`.

### Adding keyboard definitions
Add a new file in `src/data/definitions/` following the `framework16.ts` pattern. Each definition needs matrix positions, LED indices, and VIA layout data.

---

## Roadmap

- [ ] Fan curve visual editor
- [ ] LED Matrix display module (Framework 16)
- [ ] System information panel (BIOS, EC firmware, display)
- [ ] Settings module (theme picker, font scale, accessibility)
- [ ] Expansion card detection
- [ ] Linux support (ectool integration)
- [ ] CSV/JSON telemetry export
- [ ] Multi-device LAN discovery

---

## Credits

### Backend & Hardware
- [ozturkkl/framework-control](https://github.com/ozturkkl/framework-control) — Rust service wrapping the official `framework_tool` CLI
- [FrameworkComputer/inputmodule-rs](https://github.com/FrameworkComputer/inputmodule-rs) — Official Framework input module library
- [FrameworkComputer/EmbeddedController](https://github.com/FrameworkComputer/EmbeddedController) — EC firmware and documentation
- [FrameworkComputer/qmk_firmware](https://github.com/FrameworkComputer/qmk_firmware) — Official QMK firmware for Framework keyboards

### Community Firmware
- [nucleardog](https://gitlab.com/nucleardog/qmk_firmware_fw16) — Per-key RGB firmware with rgb_remote protocol
- [tagno25](https://github.com/tagno25/qmk_firmware) — OpenRGB per-key firmware
- [Shandower81](https://github.com/Shandower81/CORY-FRAMEWORK-RGB-KEYBOARD) — CORY per-layer RGB keymap

### VIA Protocol Reference
- [the-via/keyboards](https://github.com/the-via/keyboards) — VIA keyboard definitions
- [FrameworkComputer/the-via-keyboards](https://github.com/FrameworkComputer/the-via-keyboards) — Framework-specific VIA definitions

---

## License

MIT
