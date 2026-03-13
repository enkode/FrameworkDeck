## What's New

<!-- Filled in at release time -->

## Download

| Platform | Installer | Notes |
|----------|-----------|-------|
| **Windows 11/10** (64-bit) | `Framework.Deck_x.x.x_x64-setup.exe` | Recommended — NSIS installer |
| **Windows 11/10** (64-bit) | `Framework.Deck_x.x.x_x64_en-US.msi` | MSI for enterprise/managed deployments |
| **Linux** (64-bit) | `framework-deck_x.x.x_amd64.AppImage` | Universal — runs on any distro, no install needed |
| **Debian / Ubuntu** | `framework-deck_x.x.x_amd64.deb` | Native .deb package (`sudo dpkg -i`) |
| **Fedora / RHEL** | `framework-deck-x.x.x-1.x86_64.rpm` | Native .rpm package (`sudo rpm -i`) |

> **Requires:** [framework-control](https://github.com/ozturkkl/framework-control) service running for telemetry features. The keyboard configurator works standalone via WebHID.

### Linux Notes

- **AppImage:** Make it executable (`chmod +x *.AppImage`) and run directly. No install needed.
- **WebHID:** The keyboard configurator requires Chromium-based WebView. Most modern Linux distros ship webkit2gtk which supports this. If key remapping doesn't connect, ensure `webkit2gtk-4.1` is installed.
- **framework-control on Linux:** Follow the [framework-control Linux setup](https://github.com/ozturkkl/framework-control#linux) instructions. The service uses `ectool` for hardware access.

## Upgrading

Install over the previous version — your settings and saved configs are preserved.

## Full Changelog

See [CHANGELOG.md](https://github.com/enkode/FrameworkDeck/blob/main/CHANGELOG.md) for complete history.
