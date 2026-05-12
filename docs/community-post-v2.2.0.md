# Framework Deck v2.2.0: Graphics module + thread fixes

*Draft for posting at community.frame.work/t/.../81286. Copy/edit/post as a reply.*

---

**v2.2.0 is up:** https://github.com/enkode/FrameworkDeck/releases/latest

## New: Graphics module (Windows)

A panel for everything Windows can show or do about your GPUs that isn't "open Adrenalin and click around." Built because the Framework 16 MUX can't be toggled programmatically (AMD SmartAccess Graphics and NVIDIA Advanced Optimus are GUI-only). This module gathers up the things that *are* programmable.

- **GPU Adapters.** Live PnP state for every display device, problem codes (Code 43 etc.), driver INF/version, PCIe link state. One-click `RECOVER (UAC)` runs `pnputil /remove-device` + `/scan-devices` for hung adapters.
- **DxgKrnl-Admin diagnostics.** Surfaces `StartAdapter_AddAdapterFailed` and other adapter-start errors from the Windows event log so you can see *why* something failed instead of guessing.
- **Per-app GPU preferences.** Read/write the registry that backs Settings > Display > Graphics. AUTO-DISCOVER scans common install roots (Steam, Battle.net, etc.).
- **Quick actions.** Deep-links to AMD Adrenalin (SmartAccess), NVIDIA Control Panel / NVIDIA App, and Windows graphics settings.
- **NVIDIA-SMI.** Raw output when the driver is healthy.

Cross-vendor (NVIDIA + AMD), service status for `nvlddmkm` / `amdkmdag` visible in the header. The whole module is a no-op on Linux for now. Wayland-friendly equivalents (DRI_PRIME helpers etc.) are on the list.

![Graphics module](https://raw.githubusercontent.com/enkode/FrameworkDeck/main/docs/screenshots/framework-deck_graphics-module.png)

## Thread feedback addressed

- **@jared_kidd:** added a TL;DR at the top of the README. Six bullets, no fluff.
- **@wojciech_migas:** the `tagno25-openrgb` firmware download link was 404 (used `/releases/tag/latest`; there's no tag literally named "latest"). Fixed to `/releases/latest`. Same cleanup for the official Framework QMK link. The catalog now clearly marks which firmware is pre-built vs build-from-source.
- **@LukiG:** Framework Laptop 12 is now in the Hardware Support table. Telemetry, power, battery, and Graphics all work through `framework-control`. Input-module features (keyboard configurator, LED Matrix) are N/A since FW12 has no detachable input modules.
- **@PSierra117:** the Linux/Wayland `EGL_BAD_PARAMETER` you reported on CachyOS. The Linux build now auto-sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` at process start to work around the webkit2gtk-4.1 + Mesa DMA-BUF bug. If that's not enough, the README has fallback env vars (`WEBKIT_DISABLE_COMPOSITING_MODE=1`, `GDK_BACKEND=x11`) for the cases where it isn't.

Per-key RGB detection failure after a nucleardog flash: I couldn't reproduce without the device. If anyone hits this, please open an issue with the dump from the Firmware tab's diagnostic and we'll work through it.

## Download

- Windows: `.exe` or `.msi`
- Linux: `.AppImage`, `.deb`, `.rpm`

https://github.com/enkode/FrameworkDeck/releases/latest

Thanks for the feedback, keep it coming. Bugs, hardware-specific behavior, FW12 sensor mappings that don't show up: all useful.
