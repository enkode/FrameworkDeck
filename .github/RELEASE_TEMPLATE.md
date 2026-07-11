## What's New

See the [CHANGELOG](https://github.com/enkode/FrameworkDeck/blob/main/CHANGELOG.md) for the full list of changes in this release.

## Download

| Platform | Installer | Notes |
|----------|-----------|-------|
| **Windows 11/10** (64-bit) | `Framework.Deck_x.x.x_x64-setup.exe` | Recommended NSIS installer |
| **Windows 11/10** (64-bit) | `Framework.Deck_x.x.x_x64_en-US.msi` | MSI for enterprise/managed deployments |
| **Linux** (64-bit) | `Framework_Deck_x.x.x_amd64.AppImage` | Universal AppImage, runs on any distro, no install needed |
| **Debian / Ubuntu** | `Framework_Deck_x.x.x_amd64.deb` | Native .deb (`sudo apt install ./Framework_Deck_*.deb`) |
| **Fedora / RHEL** | `Framework_Deck-x.x.x-1.x86_64.rpm` | Native .rpm (`sudo dnf install ./Framework_Deck-*.rpm`) |

> **Requires:** [framework-control](https://github.com/ozturkkl/framework-control) service running for telemetry features (oscilloscope, fan, power, battery, system info).

### Linux Notes

- **AppImage:** Make it executable (`chmod +x *.AppImage`) and run directly. No install needed.
- **Keyboard configurator:** WebHID is a Chromium-only API. It works natively on Windows (WebView2); Linux's webkit2gtk WebView does not implement WebHID yet, so on Linux use the VIA web configurator (usevia.app) in Chrome/Chromium for key remapping. Your keymaps live on the keyboard itself, so they apply everywhere.
- **framework-control on Linux:** Follow the [framework-control Linux setup](https://github.com/ozturkkl/framework-control#linux) instructions. The service uses `ectool` for hardware access.

## Upgrading

Install over the previous version; your settings and saved configs are preserved.

## Full Changelog

See [CHANGELOG.md](https://github.com/enkode/FrameworkDeck/blob/main/CHANGELOG.md) for complete history.
