/**
 * Generates a self-executing .cmd script that automatically clones, compiles,
 * and prepares the nucleardog per-key RGB firmware for Framework 16 devices.
 *
 * The script includes an interactive device selection menu with USB detection,
 * so it works for any supported target without needing separate downloads.
 *
 * Uses a polyglot .cmd format: batch header launches PowerShell with
 * -ExecutionPolicy Bypass, so the user just double-clicks the file.
 * The batch portion is hidden inside a PowerShell block comment.
 */

export type BuildTarget = 'ansi' | 'macropad';

interface BuildTargetConfig {
    keyboard: string;
    keymap: string;
    outputFile: string;
    label: string;
}

const BUILD_TARGETS: Record<BuildTarget, BuildTargetConfig> = {
    ansi: {
        keyboard: 'framework/ansi',
        keymap: 'default',
        outputFile: 'framework_ansi_default.uf2',
        label: 'Framework 16 ANSI Keyboard',
    },
    macropad: {
        keyboard: 'framework/macropad',
        keymap: 'default',
        outputFile: 'framework_macropad_default.uf2',
        label: 'Framework 16 RGB Macropad',
    },
};

const REPO_URL = 'https://gitlab.com/nucleardog/qmk_firmware_fw16';
const QMK_MSYS_URL = 'https://github.com/qmk/qmk_distro_msys/releases/latest/download/QMK_MSYS.exe';

export function generateBuildScript(): string {
    return `@echo off
title Framework Firmware Builder
set "SRCFILE=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content $env:SRCFILE -Encoding UTF8; $n = 0; foreach($l in $c){ $n++; if($l -match '^# === PS ==='){ break } }; & ([scriptblock]::Create(($c[$n..($c.Count-1)] -join [char]10)))"
echo.
echo   Press any key to close this window...
pause >nul
exit /b
# === PS ===
# ============================================================
# Framework Per-Key RGB Firmware Builder
# ============================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Log all output to Desktop for debugging
$logFile = Join-Path ([Environment]::GetFolderPath("Desktop")) "fw_build_log.txt"
try { Start-Transcript -Path $logFile -Force | Out-Null } catch {}
Write-Host "  Log: $logFile" -ForegroundColor DarkGray

function Write-Step($num, $total, $msg) {
    Write-Host ""
    Write-Host "  [$num/$total] $msg" -ForegroundColor Cyan
    Write-Host ("  " + "-" * 48) -ForegroundColor DarkGray
}

function Exit-WithError($msg) {
    Write-Host ""
    Write-Host "  ERROR: $msg" -ForegroundColor Red
    try { Stop-Transcript | Out-Null } catch {}
    exit 1
}

function ConvertTo-MsysPath($winPath) {
    $p = $winPath -replace '\\\\', '/'
    if ($p -match '^([A-Za-z]):(.*)') {
        return "/" + $Matches[1].ToLower() + $Matches[2]
    }
    return $p
}

try {

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Magenta
Write-Host "    Framework Per-Key RGB Firmware Builder"     -ForegroundColor Magenta
Write-Host "  ============================================" -ForegroundColor Magenta

# ----------------------------------------------------------
# Device selection menu with USB detection
# ----------------------------------------------------------
Write-Host ""
Write-Host "  Scanning for connected Framework devices..." -ForegroundColor DarkGray

$fwDevices = @(Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue |
    Where-Object { $_.DeviceID -match 'VID_32AC' } |
    Select-Object -ExpandProperty DeviceID)

$ansiConnected = $false
$macropadConnected = $false
foreach ($devId in $fwDevices) {
    if ($devId -match 'PID_0012') { $ansiConnected = $true }
    if ($devId -match 'PID_0013') { $macropadConnected = $true }
}

if ($ansiConnected) { $tag1 = " [CONNECTED]" } else { $tag1 = "" }
if ($macropadConnected) { $tag2 = " [CONNECTED]" } else { $tag2 = "" }
if ($ansiConnected) { $color1 = "Green" } else { $color1 = "Gray" }
if ($macropadConnected) { $color2 = "Green" } else { $color2 = "Gray" }

Write-Host ""
Write-Host "  Which device are you building firmware for?" -ForegroundColor White
Write-Host ""
Write-Host "    [1] Framework 16 ANSI Keyboard$tag1" -ForegroundColor $color1
Write-Host "    [2] Framework 16 RGB Macropad$tag2"  -ForegroundColor $color2
Write-Host ""

$choice = Read-Host "  Enter choice (1 or 2)"

switch ($choice) {
    "1" {
        $keyboard    = "framework/ansi"
        $keymap      = "default"
        $outputFile  = "framework_ansi_default.uf2"
        $targetLabel = "Framework 16 ANSI Keyboard"
    }
    "2" {
        $keyboard    = "framework/macropad"
        $keymap      = "default"
        $outputFile  = "framework_macropad_default.uf2"
        $targetLabel = "Framework 16 RGB Macropad"
    }
    default {
        Exit-WithError "Invalid choice '$choice'. Please run the script again and enter 1 or 2."
    }
}

Write-Host ""
Write-Host "  Target: $targetLabel" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------
# Step 1: Check for Git
# ----------------------------------------------------------
Write-Step 1 5 "Checking prerequisites..."

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Exit-WithError "Git not found. Install from https://git-scm.com (check 'Add to PATH' during install)."
}
Write-Host "    Git: $($gitCmd.Source)" -ForegroundColor Green

# ----------------------------------------------------------
# Step 2: Clone firmware repository
# ----------------------------------------------------------
Write-Step 2 5 "Preparing firmware source code..."

$repoDir = Join-Path $HOME "qmk_firmware_fw16"

if (Test-Path (Join-Path $repoDir ".git")) {
    Write-Host "    Repository exists at $repoDir" -ForegroundColor Gray
    Write-Host "    Pulling latest changes..." -ForegroundColor Gray
    try {
        & git -C $repoDir pull --ff-only 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } catch {
        Write-Host "    Pull note: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    if (Test-Path $repoDir) {
        Write-Host "    Removing incomplete clone..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $repoDir
    }
    Write-Host "    Cloning from GitLab (~230 MB, may take a few minutes)..." -ForegroundColor Gray
    & git clone ${REPO_URL} $repoDir
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Failed to clone repository."
    }
}
Write-Host "    Repository ready: $repoDir" -ForegroundColor Green

# ----------------------------------------------------------
# Step 3: Find or install QMK MSYS
# ----------------------------------------------------------
Write-Step 3 5 "Finding QMK MSYS build environment..."

$msysSearchPaths = @(
    "C:\\QMK_MSYS",
    (Join-Path $HOME "QMK_MSYS"),
    (Join-Path $env:LOCALAPPDATA "QMK_MSYS"),
    "C:\\msys64",
    (Join-Path $HOME ".qmk_msys\\msys64"),
    (Join-Path $HOME "scoop\\apps\\msys2\\current")
)

function Find-MsysDir {
    foreach ($p in $msysSearchPaths) {
        if (Test-Path (Join-Path $p "usr\\bin\\bash.exe")) {
            return $p
        }
    }
    return $null
}

$msysDir = Find-MsysDir

if (-not $msysDir) {
    Write-Host "    QMK MSYS not found. Downloading installer..." -ForegroundColor Yellow
    Write-Host "    Source: ${QMK_MSYS_URL}" -ForegroundColor Gray
    Write-Host "    (This is a ~900 MB download)" -ForegroundColor Gray
    Write-Host ""

    $installerPath = Join-Path $env:TEMP "QMK_MSYS_installer.exe"

    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile("${QMK_MSYS_URL}", $installerPath)
        Write-Host "    Download complete." -ForegroundColor Green
    } catch {
        Write-Host "    Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Exit-WithError "Could not download QMK MSYS. Download manually from: ${QMK_MSYS_URL}"
    }

    Write-Host ""
    Write-Host "    ================================================" -ForegroundColor Yellow
    Write-Host "    The QMK MSYS installer will now open."             -ForegroundColor Yellow
    Write-Host "    Install to the DEFAULT location (C:\\QMK_MSYS)."    -ForegroundColor Yellow
    Write-Host "    This script will continue after install completes." -ForegroundColor Yellow
    Write-Host "    ================================================" -ForegroundColor Yellow
    Write-Host ""

    Start-Process -FilePath $installerPath -Wait

    # Re-search after installation
    $msysDir = Find-MsysDir

    if (-not $msysDir) {
        Write-Host ""
        Write-Host "    Could not auto-detect QMK MSYS after installation." -ForegroundColor Yellow
        $customPath = Read-Host "    Enter the install path (or press Enter to abort)"
        if ($customPath -and (Test-Path (Join-Path $customPath "usr\\bin\\bash.exe"))) {
            $msysDir = $customPath
        } else {
            Exit-WithError "QMK MSYS not found. Install from https://msys.qmk.fm and re-run this script."
        }
    }

    Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
}

Write-Host "    QMK MSYS: $msysDir" -ForegroundColor Green

# ----------------------------------------------------------
# Step 4: Compile firmware via MSYS2 MINGW64
# ----------------------------------------------------------
Write-Step 4 5 "Compiling firmware (this takes several minutes)..."

$repoMsysPath = ConvertTo-MsysPath $repoDir

# Write a bash build script to temp
$bashBody = @"
#!/bin/bash
set -e
echo ""
echo "=== MSYS2 MINGW64 Build Environment ==="
echo ""
echo "[1/2] Running qmk setup..."
qmk setup -H '$repoMsysPath' -y 2>&1 || true
echo ""
echo "[2/2] Compiling $keyboard ($keymap keymap)..."
cd '$repoMsysPath'
qmk compile -kb $keyboard -km $keymap
echo ""
echo "=== Build complete ==="
"@

$bashFile = Join-Path $env:TEMP "fw_build.sh"
# Ensure Unix line endings
$bashBody.Replace("\`r\`n", "\`n") | Set-Content -Path $bashFile -Encoding UTF8 -NoNewline

$bashFileMsys = ConvertTo-MsysPath $bashFile
$bashExe = Join-Path $msysDir "usr\\bin\\bash.exe"

Write-Host "    Launching MSYS2 MINGW64 shell..." -ForegroundColor Gray
Write-Host "    (Build output will appear below)" -ForegroundColor Gray
Write-Host ""

# Set MINGW64 environment and run bash login shell directly
$env:MSYSTEM = "MINGW64"
$env:CHERE_INVOKING = "1"
& $bashExe -l -c "bash '$bashFileMsys'"
$buildExit = $LASTEXITCODE

Remove-Item $bashFile -Force -ErrorAction SilentlyContinue

if ($buildExit -ne 0) {
    Write-Host ""
    Write-Host "    Build exited with code $buildExit" -ForegroundColor Yellow
    Write-Host "    Checking for output anyway..." -ForegroundColor Yellow
}

# ----------------------------------------------------------
# Step 5: Find and deliver the .uf2 file
# ----------------------------------------------------------
Write-Step 5 5 "Looking for compiled firmware..."

# Search in these locations (QMK may output to different places)
$searchDirs = @($repoDir)

# MSYS2 home might differ from Windows home
$msysHome = Join-Path $msysDir "home\\$env:USERNAME\\qmk_firmware_fw16"
if (Test-Path $msysHome) { $searchDirs += $msysHome }

$uf2File = $null
foreach ($dir in $searchDirs) {
    # Search for exact target file (non-recursive first, then recursive)
    $uf2File = Get-ChildItem -Path $dir -Filter $outputFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $uf2File) {
        $uf2File = Get-ChildItem -Path $dir -Filter $outputFile -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }
    if ($uf2File) { break }
}

if ($uf2File) {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "    BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "    File:  $($uf2File.Name)" -ForegroundColor Cyan
    Write-Host "    Size:  $([math]::Round($uf2File.Length / 1024)) KB" -ForegroundColor Cyan
    Write-Host "    Path:  $($uf2File.FullName)" -ForegroundColor Gray
    Write-Host ""

    # Copy to Desktop
    $desktop = [Environment]::GetFolderPath("Desktop")
    $dest = Join-Path $desktop $uf2File.Name
    Copy-Item $uf2File.FullName $dest -Force
    Write-Host "    Copied to Desktop!" -ForegroundColor Green
    Write-Host "    $dest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. Go back to the app and click 'I have the .uf2 file'" -ForegroundColor Gray
    Write-Host "    2. Follow the bootloader entry instructions" -ForegroundColor Gray
    Write-Host "    3. Copy the .uf2 file to the RPI-RP2 drive" -ForegroundColor Gray
    Write-Host "    4. Reconnect in the app to verify per-key RGB" -ForegroundColor Gray
    Write-Host ""

    explorer.exe /select,$dest
} else {
    Write-Host ""
    Write-Host "    No .uf2 file found -- the build may have failed." -ForegroundColor Red
    Write-Host "    Check the build output above for errors." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Expected: $outputFile" -ForegroundColor Gray
    Write-Host "    In: $repoDir" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    Manual fallback:" -ForegroundColor White
    Write-Host "    1. Open 'QMK MSYS' from your Start Menu" -ForegroundColor Gray
    Write-Host "    2. cd $repoMsysPath" -ForegroundColor Gray
    Write-Host "    3. qmk compile -kb $keyboard -km $keymap" -ForegroundColor Gray
}

} catch {
    Write-Host ""
    Write-Host "  UNEXPECTED ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  $($_.InvocationInfo.PositionMessage)" -ForegroundColor DarkGray
}

try { Stop-Transcript | Out-Null } catch {}
`;
}

export function downloadBuildScript(): void {
    const script = generateBuildScript();
    // Ensure Windows (CRLF) line endings for cmd.exe compatibility
    const winScript = script.replace(/\n/g, '\r\n');
    const blob = new Blob([winScript], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-firmware.cmd';
    document.body.appendChild(a);
    a.click();
    // Delay cleanup to ensure download initiates before URL is revoked
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
}

export { BUILD_TARGETS };
