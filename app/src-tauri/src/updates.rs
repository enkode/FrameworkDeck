// Updates module commands.
//
// Detects the specific Framework device (DMI on Linux, CIM/WMI on Windows),
// inventories installed firmware/driver versions, and fetches Framework's
// Knowledge Base pages so the frontend can compare installed vs. latest
// vetted BIOS / driver-bundle releases. Fetches are allowlisted to
// frame.work domains only.

use serde_json::json;

#[cfg(target_os = "linux")]
fn dmi(field: &str) -> String {
    std::fs::read_to_string(format!("/sys/class/dmi/id/{}", field))
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

/// Identify the machine: vendor, product, SKU, board, BIOS version/date.
#[tauri::command]
pub fn get_device_info() -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        return Ok(json!({
            "vendor": dmi("sys_vendor"),
            "product": dmi("product_name"),
            "sku": dmi("product_sku"),
            "board": dmi("board_name"),
            "biosVersion": dmi("bios_version"),
            "biosDate": dmi("bios_date"),
            "os": "linux",
        })
        .to_string());
    }
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$bios = Get-CimInstance Win32_BIOS
$cs = Get-CimInstance Win32_ComputerSystem
$bb = Get-CimInstance Win32_BaseBoard
[pscustomobject]@{
    vendor      = "$($cs.Manufacturer)"
    product     = "$($cs.Model)"
    sku         = "$($cs.SystemSKUNumber)"
    board       = "$($bb.Product)"
    biosVersion = "$($bios.SMBIOSBIOSVersion)"
    biosDate    = "$(if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString('yyyy-MM-dd') })"
    os          = 'windows'
} | ConvertTo-Json -Compress
"#;
        return crate::graphics::win::run_ps(SCRIPT);
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("device info not supported on this platform".to_string())
    }
}

/// Installed driver/firmware inventory.
/// Windows: PnP signed drivers for hardware-relevant classes.
/// Linux: kernel version plus fwupd device firmware versions when available.
#[tauri::command]
pub fn get_installed_drivers() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$classes = @('DISPLAY','MEDIA','NET','SYSTEM','HIDCLASS','USB','BLUETOOTH','MONITOR','FIRMWARE','BIOMETRIC')
$drv = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue |
    Where-Object { $_.DeviceName -and $_.DriverVersion -and $_.DeviceClass -in $classes } |
    ForEach-Object {
        [pscustomobject]@{
            name     = "$($_.DeviceName)"
            version  = "$($_.DriverVersion)"
            date     = "$(if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') })"
            provider = "$($_.DriverProviderName)"
            class    = "$($_.DeviceClass)"
        }
    } | Sort-Object -Property name, version -Unique
ConvertTo-Json -InputObject @($drv) -Depth 3 -Compress
"#;
        return crate::graphics::win::run_ps(SCRIPT);
    }
    #[cfg(target_os = "linux")]
    {
        let kernel = std::fs::read_to_string("/proc/sys/kernel/osrelease")
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        // fwupd is the vetted firmware-update channel on Linux (Framework
        // publishes BIOS/firmware to LVFS). Surface what it knows, if present.
        let fwupd = std::process::Command::new("fwupdmgr")
            .args(["get-devices", "--json"])
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| serde_json::from_slice::<serde_json::Value>(&o.stdout).ok());

        return Ok(json!({
            "kernel": kernel,
            "fwupd": fwupd,
        })
        .to_string());
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("driver inventory not supported on this platform".to_string())
    }
}

/// Install the framework-control backend service (the telemetry/fan/power
/// provider this app fronts). Linux: downloads the release tarball, verifies
/// its SHA256, installs binary + systemd unit — all inside one pkexec (polkit
/// GUI auth) session. Windows: downloads the MSI and launches msiexec (UAC).
#[tauri::command]
pub async fn install_framework_control() -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        const SCRIPT: &str = r#"#!/usr/bin/env bash
set -euo pipefail
REPO="ozturkkl/framework-control"
TARBALL="framework-control-service-x86_64.tar.gz"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
curl -fsSL -o "$TARBALL" "https://github.com/$REPO/releases/latest/download/$TARBALL"
curl -fsSL -o SHA256SUMS "https://github.com/$REPO/releases/latest/download/SHA256SUMS"
grep "$TARBALL" SHA256SUMS | sha256sum -c -
tar -xzf "$TARBALL"
install -m 755 framework-control /usr/local/bin/framework-control
install -m 644 framework-control.service /etc/systemd/system/framework-control.service
systemctl daemon-reload
systemctl enable --now framework-control.service
sleep 2
systemctl is-active framework-control.service
"#;
        return tauri::async_runtime::spawn_blocking(|| {
            let path = std::env::temp_dir().join("fwdeck-install-framework-control.sh");
            std::fs::write(&path, SCRIPT).map_err(|e| format!("write installer: {}", e))?;
            let output = std::process::Command::new("pkexec")
                .arg("bash")
                .arg(&path)
                .output()
                .map_err(|e| format!("pkexec launch failed (is polkit available?): {}", e))?;
            let _ = std::fs::remove_file(&path);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            if output.status.success() && stdout.contains("active") {
                Ok("installed".to_string())
            } else if output.status.code() == Some(126) || output.status.code() == Some(127) {
                Err("Authorization was cancelled".to_string())
            } else {
                Err(format!(
                    "install failed (exit {:?}): {} {}",
                    output.status.code(),
                    stdout.trim(),
                    stderr.trim()
                ))
            }
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$msi = Join-Path $env:TEMP 'framework-control-service-x86_64.msi'
Invoke-WebRequest -Uri 'https://github.com/ozturkkl/framework-control/releases/latest/download/framework-control-service-x86_64.msi' -OutFile $msi
Start-Process msiexec.exe -ArgumentList '/i', $msi -Wait
'installed'
"#;
        return tauri::async_runtime::spawn_blocking(|| crate::graphics::win::run_ps(SCRIPT))
            .await
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("in-app install not supported on this platform".to_string())
    }
}

/// Fetch a Framework Knowledge Base / downloads page (HTML or JSON) so the
/// frontend can parse latest BIOS + driver-bundle versions. Restricted to
/// frame.work properties — this is not a general-purpose proxy.
#[tauri::command]
pub async fn fetch_framework_releases(url: String) -> Result<String, String> {
    const ALLOWED_PREFIXES: [&str; 4] = [
        "https://knowledgebase.frame.work/",
        "https://frame.work/",
        "https://downloads.frame.work/",
        // Framework's own short-link domain; KB index tables link through it.
        "https://fr.mw/",
    ];
    if !ALLOWED_PREFIXES.iter().any(|p| url.starts_with(p)) {
        return Err("URL not allowed: only frame.work pages can be fetched".to_string());
    }

    let resp = crate::client()
        .get(&url)
        .header("User-Agent", format!("FrameworkDeck/{}", env!("CARGO_PKG_VERSION")))
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() || e.is_timeout() {
                "NETWORK_UNREACHABLE".to_string()
            } else {
                e.to_string()
            }
        })?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status.as_u16()));
    }
    resp.text().await.map_err(|e| e.to_string())
}
