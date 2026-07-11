# Framework Deck v2.3.0: Updates module, real Linux support, in-app service install

*Draft for posting at https://community.frame.work/t/framework-deck-all-in-one-desktop-companion-for-framework-laptops-windows-linux/81286 as a reply. Post after the v2.3.0 tag/release is live.*

---

**v2.3.0 is up:** https://github.com/enkode/FrameworkDeck/releases/latest

This one is a big Linux release. I moved my own daily driver (Framework 16, Ryzen AI 300) from Windows to Fedora, pointed the app at it, and found out the hard way how much of "works on Linux" was actually true. Short version: not much. It is now.

## Honest bug report against myself

Two things I have to own up to before the shiny stuff:

- **Every Linux build before this one was dead on arrival.** The keyboard configurator's WebHID code ran at startup without checking if WebHID exists. It doesn't exist in webkit2gtk (it's a Chromium-only API), so the whole app white-screened on every Linux machine before React even started. Windows never hit it because WebView2 is Chromium. Fixed, and the keyboard page now shows a proper explanation plus workarounds on Linux (usevia.app in Chrome, udev rule included) instead of a dead Connect button.
- **The oscilloscope was quietly burning most of a CPU core.** The redraw throttle compared wall-clock time against a sample timestamp, which is always true, so it repainted the full canvas with glow effects at 60fps instead of the intended ~5fps. On Linux software rendering that pegged a core and heated the laptop. Fixed the throttle, replaced the expensive canvas glow, and let GNOME use GPU rendering (the DMA-BUF workaround now only applies to KDE and other compositors where the EGL bug was reported). Measured before/after: 93% of a core down to under 20% on a loaded system, near zero idle.

## New: Updates module

The thing I always wanted: the app now knows exactly which Framework device you have (DMI/SMBIOS) and checks Framework's Knowledge Base for the latest vetted BIOS and Driver Bundle for that specific generation.

- **Installed vs. latest BIOS** side by side, with release dates, release notes link, and direct downloads (EXE and EFI zip).
- **Full Driver Bundle contents.** Every driver in the latest bundle (chipset, GPU, audio, WiFi, fingerprint, EC, all 17 of them on my FW16) with versions and Framework's own "updated in this bundle" flag.
- **Windows: per-driver comparison.** Each bundle component gets matched against what's actually installed and marked UPDATE AVAILABLE / CURRENT / NEWER. It understands vendor version weirdness, like NVIDIA's installed `32.0.15.9649` really being `596.49`.
- **Linux: fwupd aware.** Kernel and firmware inventory from fwupd, plus the `fwupdmgr` commands, since Framework ships Linux BIOS updates through LVFS.
- **Daily auto-check** with a badge on the nav rail when a newer BIOS ships for your device. No more manually refreshing the KB page.

## New: one-click backend install

Telemetry and fan/power control come from the excellent [framework-control](https://github.com/ozturkkl/framework-control) service by @ozturkkl. Previously the app just told you to go install it. Now every page that needs it has an INSTALL SERVICE button: on Linux it downloads the release, verifies the SHA256, and enables the systemd service behind one polkit prompt; on Windows it fetches the MSI. And when the service is missing, controls are now clearly disabled instead of looking clickable and doing nothing.

## Quality of life

- Fan curves react faster to load spikes (ramp rate was too conservative; a sudden compile or game launch now gets full airflow in seconds).
- Battery page offers ENABLE CHARGE LIMIT seeded from whatever limit your EC already has, instead of a confusing "not available" message.
- Fonts are bundled now. The app no longer phones Google Fonts on launch and renders identically offline.
- Settings persistence actually works (embarrassing v2 bug: wrong Tauri marker meant your config never saved to disk on any platform).
- .deb installs cleanly on Debian 12+ and Ubuntu 23.04+ (dropped a dead libappindicator dependency), the Linux binary is properly named `framework-deck`, and the app lands in the right desktop menu category.

## @PSierra117

Your CachyOS report from May is still open and I'm sorry it sat. The DMA-BUF workaround clearly wasn't enough on your setup. Two asks for v2.3.0: (1) try the new AppImage as-is, and (2) if it's still beige/black, run it from a terminal with `WEBKIT_DISABLE_COMPOSITING_MODE=1 ./Framework_Deck_*.AppImage` and paste the terminal output as text (screenshots crop the interesting lines). If the compositing flag fixes KDE reliably I'll bake it in as a KDE-specific default the same way GNOME got its own path this release.

## Download

- Windows: `.exe` or `.msi`
- Linux: `.AppImage`, `.deb`, `.rpm`

https://github.com/enkode/FrameworkDeck/releases/latest

Tested this release on Fedora 44 (GNOME Wayland) daily-driving a FW16 Ryzen AI 300. Windows regression testing was lighter this round, so if something broke for you on Windows, shout.
