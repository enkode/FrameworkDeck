# Framework Deck

An industrial-style control dashboard for Framework laptops — oscilloscope-inspired UI with live telemetry, fan control, power management, and battery monitoring.

**Design language:** Tektronix MSO meets Teenage Engineering. Multi-channel waveform display, stacked sensor traces, cream/red/blue palette on near-black. Minimal, precise, industrial.

---

## Architecture

```
Framework Deck/
├── app/                    # New UI (React + TypeScript + Vite)
│   ├── src/
│   │   ├── api/            # REST client + TypeScript types
│   │   ├── store/          # Zustand state (theme, channels, prefs)
│   │   ├── hooks/          # SWR data-fetching hooks
│   │   ├── config/         # Channel definitions
│   │   ├── utils/          # Value formatters
│   │   └── components/
│   │       ├── display/    # OscilloscopeView, ChannelSelector
│   │       ├── panels/     # DeviceHeader, FanPanel, PowerPanel, BatteryPanel
│   │       ├── analog/     # LEDIndicator
│   │       └── layout/     # Panel, ControlsPanel, StatusBar
└── repo/
    └── framework-control/  # Upstream Rust service (backend, untouched)
        ├── service/        # Tokio + Poem REST API (port 8090)
        └── web/            # Original Svelte UI (replaced by app/)
```

## Quick Start

### 1. Start the backend service

Follow the [framework-control installation guide](repo/framework-control/README.md).

On Windows, the service runs at `http://127.0.0.1:8090`.

### 2. Configure API token

Create `app/.env.local`:
```env
VITE_API_BASE=http://127.0.0.1:8090
VITE_API_TOKEN=your-bearer-token-here
```

The token is found in the framework-control service `.env` file as `FRAMEWORK_CONTROL_TOKEN`.

### 3. Run the UI

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5174

---

## Features

### Oscilloscope Display
- Multi-channel waveform traces (Canvas-based, custom drawn)
- Per-channel enable/disable with colored LEDs
- Configurable time window: 1m / 5m / 10m / 30m
- Hover cursor with exact value tooltip
- Pause/resume live data
- CRT scanline overlay effect
- Auto-discovers all sensor channels from connected device

### Control Panels
- **Fan Control** — AUTO / MANUAL / CURVE modes, drag slider for duty %
- **Power** — TDP and thermal limit nudge controls (±5W/°C), AC/Battery profiles
- **Battery** — SoC cell visualization, health bar, charge limit control
- **Presets** — SILENT / BALANCED / PERFORM / TURBO one-click profiles

### Themes
Four switchable color themes (live, no reload):
| Theme | Palette |
|-------|---------|
| REEL | Cream/red/blue on #0d0d0d (Teenage Engineering, default) |
| PHOS | Phosphor green on #040904 (Tektronix classic) |
| AMBR | Amber on #0a0700 (HP terminal) |
| FW | Framework blue on #070b12 |

### Status Bar
- Live min/max/current per channel
- Sample count
- Run/Stop/Offline indicator

---

## Hardware Support

Connects to any Framework laptop running the `framework-control` service:
- Framework Laptop 13 (AMD / Intel)
- Framework Laptop 16 (AMD Ryzen 7040/AI 300)

Channels auto-discovered from device:
- APU, GPU, CPU temperatures
- Framework EC thermal sensors (F75303)
- Fan RPM (1 or 2 fans)
- Power draw (derived from mA × mV)

---

## Development

```bash
cd app
npm run dev       # dev server with HMR + API proxy to :8090
npm run build     # production build
npm run preview   # preview production build
```

### Adding channels

Edit `src/config/channels.ts` — add new entries to `buildChannels()` or `DEFAULT_CHANNELS`. Each channel needs `id`, `label`, `unit`, `min`, `max`, and a `getValue(sample)` function.

### Adding themes

Edit `src/index.css` — add a `[data-theme="yourtheme"]` block with CSS custom properties. Add the theme ID to `THEMES` in `src/store/app.ts` and a label in `DeviceHeader.tsx`.

---

## Roadmap

- [ ] Electron packaging (standalone desktop app)
- [ ] LED Matrix control panel (Framework 16)
- [ ] Alert thresholds with visual channel flash
- [ ] CSV/JSON telemetry export
- [ ] Fan curve visual editor
- [ ] Multi-device discovery (LAN scanning)
- [ ] Extended statistics (percentiles, history export)
- [ ] Input module control (Framework 16 Numpad, Macropad)

---

## Credits

Backend: [ozturkkl/framework-control](https://github.com/ozturkkl/framework-control) — Rust service wrapping the official `framework_tool` CLI.

Framework hardware resources:
- [FrameworkComputer/inputmodule-rs](https://github.com/FrameworkComputer/inputmodule-rs)
- [FrameworkComputer/EmbeddedController](https://github.com/FrameworkComputer/EmbeddedController)
