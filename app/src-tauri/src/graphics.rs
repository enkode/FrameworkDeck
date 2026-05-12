// Graphics module commands.
//
// All commands are Windows-only. They wrap PowerShell invocations to query the
// PnP tree, event log, and HKCU registry, and to launch external GPU control
// panels. On non-Windows targets the commands return an "unsupported" error so
// the frontend can hide the module gracefully and the build still succeeds for
// Linux packaging.
//
// PowerShell launches are -NoProfile -NonInteractive and emit JSON via
// ConvertTo-Json so the Rust side just forwards the stdout to the WebView.

#[cfg(target_os = "windows")]
mod win {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    // CREATE_NO_WINDOW prevents PowerShell from flashing a console window
    // for every IPC call.
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    pub fn run_ps(script: &str) -> Result<String, String> {
        let output = Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("powershell launch failed: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("powershell exit {}: {}", output.status, stderr.trim()));
        }

        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        if stdout.trim().is_empty() {
            Ok("null".to_string())
        } else {
            Ok(stdout)
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn unsupported() -> Result<String, String> {
    Err("Graphics module is Windows-only".to_string())
}

/// Enumerate display-class PnP devices plus their problem codes, driver INF,
/// version, and PCIe link state.
#[tauri::command]
pub fn get_graphics_state() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$devices = Get-PnpDevice -Class Display -PresentOnly -ErrorAction SilentlyContinue
$result = @()
foreach ($d in $devices) {
    $props = @{}
    try {
        $p = Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName `
            'DEVPKEY_Device_DriverVersion','DEVPKEY_Device_DriverInfPath',`
            'DEVPKEY_Device_DriverDate','DEVPKEY_Device_LocationInfo',`
            'DEVPKEY_PciDevice_CurrentLinkSpeed','DEVPKEY_PciDevice_CurrentLinkWidth',`
            'DEVPKEY_PciDevice_MaxLinkSpeed','DEVPKEY_PciDevice_MaxLinkWidth',`
            'DEVPKEY_Device_LastArrivalDate' -ErrorAction SilentlyContinue
        foreach ($x in $p) { $props[$x.KeyName] = "$($x.Data)" }
    } catch {}
    $result += [pscustomobject]@{
        instanceId  = $d.InstanceId
        name        = $d.FriendlyName
        status      = "$($d.Status)"
        problem     = "$($d.Problem)"
        problemCode = [int]$d.ConfigManagerErrorCode
        class       = $d.Class
        driverVer   = $props['DEVPKEY_Device_DriverVersion']
        driverInf   = $props['DEVPKEY_Device_DriverInfPath']
        driverDate  = $props['DEVPKEY_Device_DriverDate']
        location    = $props['DEVPKEY_Device_LocationInfo']
        linkCur     = "$($props['DEVPKEY_PciDevice_CurrentLinkSpeed']) x$($props['DEVPKEY_PciDevice_CurrentLinkWidth'])"
        linkMax     = "$($props['DEVPKEY_PciDevice_MaxLinkSpeed']) x$($props['DEVPKEY_PciDevice_MaxLinkWidth'])"
        lastArrival = $props['DEVPKEY_Device_LastArrivalDate']
    }
}
$services = @{}
foreach ($svc in 'nvlddmkm','amdkmdag','amdkmdap') {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) { $services[$svc] = @{ status = "$($s.Status)"; startType = "$($s.StartType)" } }
}
[pscustomobject]@{
    devices = $result
    services = $services
    ts = [int][double]::Parse((Get-Date -UFormat %s))
} | ConvertTo-Json -Depth 5 -Compress
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Pull recent DxgKrnl-Admin events. Returns up to `max_events` entries from
/// the last `minutes` minutes. This is the channel that contains the
/// StartAdapter_AddAdapterFailed messages.
#[tauri::command]
pub fn get_dxgkrnl_events(minutes: u32, max_events: u32) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let script = format!(
            r#"
$start = (Get-Date).AddMinutes(-{minutes})
try {{
    $events = Get-WinEvent -LogName 'Microsoft-Windows-DxgKrnl-Admin' -MaxEvents {max_events} -ErrorAction Stop |
        Where-Object {{ $_.TimeCreated -ge $start }} |
        Select-Object @{{n='ts';e={{[int][double]::Parse(($_.TimeCreated.ToUniversalTime() - (Get-Date '1970-01-01').ToUniversalTime()).TotalSeconds)}}}},`
                      @{{n='id';e={{[int]$_.Id}}}},`
                      @{{n='level';e={{"$($_.LevelDisplayName)"}}}},`
                      @{{n='provider';e={{"$($_.ProviderName)"}}}},`
                      @{{n='message';e={{"$($_.Message)"}}}}
}} catch {{
    $events = @()
}}
# -InputObject + @() guarantees array serialization even for 0 or 1 elements;
# pipe-to-ConvertTo-Json unwraps single items.
ConvertTo-Json -InputObject @($events) -Depth 4 -Compress
"#,
            minutes = minutes,
            max_events = max_events,
        );
        return win::run_ps(&script);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (minutes, max_events);
        unsupported()
    }
}

/// Read all per-application GPU preference entries from
/// HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences. Value names are exe
/// paths; data is "GpuPreference=N;" where N ∈ {0,1,2}.
#[tauri::command]
pub fn get_gpu_preferences() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$path = 'HKCU:\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'
$result = @()
if (Test-Path $path) {
    $k = Get-Item $path
    foreach ($name in $k.Property) {
        if ($name -eq 'DirectXUserGlobalSettings') { continue }
        $raw = (Get-ItemProperty -Path $path -Name $name).$name
        $pref = 0
        if ($raw -match 'GpuPreference=(\d+)') { $pref = [int]$Matches[1] }
        $exists = Test-Path -LiteralPath $name
        $result += [pscustomobject]@{
            exe         = $name
            raw         = "$raw"
            preference  = $pref
            fileExists  = [bool]$exists
        }
    }
}
ConvertTo-Json -InputObject @($result) -Depth 3 -Compress
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Write a single per-app GPU preference. preference: 0=Auto, 1=Power saving, 2=High performance.
#[tauri::command]
pub fn set_gpu_preference(exe: String, preference: u32) -> Result<String, String> {
    if !(0..=2).contains(&preference) {
        return Err("preference must be 0, 1, or 2".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        let script = format!(
            r#"
$path = 'HKCU:\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'
if (-not (Test-Path $path)) {{ New-Item -Path $path -Force | Out-Null }}
$exe = @'
{exe}
'@
$value = "GpuPreference={pref};"
New-ItemProperty -Path $path -Name $exe -Value $value -PropertyType String -Force | Out-Null
'ok'
"#,
            exe = exe,
            pref = preference,
        );
        return win::run_ps(&script);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = exe;
        unsupported()
    }
}

/// Remove a per-app GPU preference.
#[tauri::command]
pub fn remove_gpu_preference(exe: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let script = format!(
            r#"
$path = 'HKCU:\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'
$exe = @'
{exe}
'@
if (Test-Path $path) {{
    Remove-ItemProperty -Path $path -Name $exe -ErrorAction SilentlyContinue
}}
'ok'
"#,
            exe = exe,
        );
        return win::run_ps(&script);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = exe;
        unsupported()
    }
}

/// Best-effort search of common install roots for known game/app executables
/// to populate the per-app prefs editor.
#[tauri::command]
pub fn find_known_exes() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$candidates = @(
    'Diablo IV.exe',
    'Battle.net.exe',
    'Battle.net Launcher.exe',
    'Overwatch.exe',
    'Steam.exe',
    'steamwebhelper.exe',
    'Cyberpunk2077.exe',
    'eldenring.exe',
    'StarCitizen.exe',
    'wow.exe',
    'HearthstoneBeta.exe',
    'Hearthstone.exe',
    'Code.exe',
    'Antigravity.exe',
    'chrome.exe',
    'msedge.exe',
    'Discord.exe',
    'obs64.exe',
    'blender.exe',
    'ollama.exe',
    'ollama app.exe'
)
$roots = @(
    'C:\Program Files',
    'C:\Program Files (x86)',
    "$env:LOCALAPPDATA\Programs",
    'D:\',
    'D:\Games',
    'D:\SteamLibrary\steamapps\common'
) | Where-Object { Test-Path $_ }
$found = @{}
foreach ($r in $roots) {
    foreach ($exe in $candidates) {
        Get-ChildItem -Path $r -Filter $exe -Recurse -Depth 4 -File -ErrorAction SilentlyContinue |
            ForEach-Object { $found[$_.FullName] = $true }
    }
}
ConvertTo-Json -InputObject @($found.Keys | Sort-Object) -Compress
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Launch AMD Adrenalin (Radeon Software).
#[tauri::command]
pub fn open_amd_adrenalin() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$paths = @(
    "$env:ProgramFiles\AMD\CNext\CNext\RadeonSoftware.exe",
    "${env:ProgramFiles(x86)}\AMD\CNext\CNext\RadeonSoftware.exe"
)
$launched = $false
foreach ($p in $paths) {
    if (Test-Path $p) {
        Start-Process -FilePath $p
        $launched = $true
        break
    }
}
if (-not $launched) {
    try { Start-Process 'RadeonSoftware'; $launched = $true } catch {}
}
if ($launched) { 'ok' } else { throw 'AMD Adrenalin (Radeon Software) not found' }
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Launch NVIDIA Control Panel / NVIDIA App.
#[tauri::command]
pub fn open_nvidia_control_panel() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$launched = $false
try {
    Start-Process 'nvidia-app:'
    $launched = $true
} catch {}
if (-not $launched) {
    $paths = @(
        "$env:ProgramFiles\NVIDIA Corporation\Control Panel Client\nvcplui.exe",
        "${env:ProgramFiles(x86)}\NVIDIA Corporation\Control Panel Client\nvcplui.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { Start-Process -FilePath $p; $launched = $true; break }
    }
}
if (-not $launched) {
    try { Start-Process 'control.exe' -ArgumentList 'nvcpl.cpl'; $launched = $true } catch {}
}
if ($launched) { 'ok' } else { throw 'NVIDIA Control Panel / NVIDIA App not found' }
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Open Windows Settings → System → Display → Graphics (per-app GPU prefs UI).
#[tauri::command]
pub fn open_windows_graphics_settings() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
Start-Process 'ms-settings:display-advancedgraphics'
'ok'
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}

/// Elevated dGPU recovery cycle. Triggers a UAC prompt via -Verb RunAs and
/// blocks until the elevated child process exits.
#[tauri::command]
pub fn recover_dgpu(instance_id: String) -> Result<String, String> {
    if instance_id.is_empty() {
        return Err("instance_id is required".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        let safe_id = instance_id.replace('\'', "''");
        let script = format!(
            r#"
$inner = @'
$id = '{id}'
pnputil /remove-device $id
Start-Sleep -Seconds 2
pnputil /scan-devices
Start-Sleep -Seconds 4
'@
$tmp = Join-Path $env:TEMP "fwdeck-recover-$([guid]::NewGuid().ToString('N')).ps1"
$inner | Out-File -FilePath $tmp -Encoding UTF8
try {{
    Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$tmp) -Verb RunAs -Wait
    'ok'
}} finally {{
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}}
"#,
            id = safe_id,
        );
        return win::run_ps(&script);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = instance_id;
        unsupported()
    }
}

/// Capture nvidia-smi output (or a friendly stub if unavailable).
#[tauri::command]
pub fn run_nvidia_smi() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$smi = "$env:SystemRoot\System32\nvidia-smi.exe"
if (-not (Test-Path $smi)) {
    [pscustomobject]@{ available = $false; output = 'nvidia-smi.exe not present' } | ConvertTo-Json -Compress
    return
}
try {
    $out = & $smi 2>&1 | Out-String
    [pscustomobject]@{ available = $true; output = $out.Trim() } | ConvertTo-Json -Compress
} catch {
    [pscustomobject]@{ available = $false; output = "$_" } | ConvertTo-Json -Compress
}
"#;
        return win::run_ps(SCRIPT);
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsupported()
    }
}
