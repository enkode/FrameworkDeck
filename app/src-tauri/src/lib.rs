// Rust backend for Framework Deck.
//
// API calls go through these commands so the WebView never sends an Origin
// header to the framework-control service — bypassing its CORS allowlist entirely.
// The token is read from the same env var the service uses, falling back to the
// known install default.

mod graphics;
mod updates;

use std::sync::OnceLock;
use tauri::Manager;

const SERVICE_BASE: &str = "http://127.0.0.1:30912";
const DEFAULT_TOKEN: &str = "4c07a4f2-0e64-4c43-bcb0-093cd55a55b6";

fn service_base() -> String {
    std::env::var("FRAMEWORK_CONTROL_URL").unwrap_or_else(|_| SERVICE_BASE.to_string())
}

fn token() -> String {
    std::env::var("FRAMEWORK_CONTROL_TOKEN").unwrap_or_else(|_| DEFAULT_TOKEN.to_string())
}

// One pooled client for the app's whole lifetime — the oscilloscope polls at
// 500ms, so per-request clients would re-open a TCP connection twice a second.
fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(reqwest::Client::new)
}

fn map_send_err(e: reqwest::Error) -> String {
    if e.is_connect() || e.is_timeout() {
        // Structured marker the frontend matches on instead of locale-dependent text.
        "SERVICE_UNREACHABLE".to_string()
    } else {
        e.to_string()
    }
}

fn map_status(status: reqwest::StatusCode) -> String {
    if status.as_u16() == 401 {
        "HTTP 401 — token rejected; set FRAMEWORK_CONTROL_TOKEN to match the service".to_string()
    } else {
        format!("HTTP {}", status.as_u16())
    }
}

/// Which OS the backend was compiled for ("windows" | "linux" | "macos").
/// The frontend uses this to hide platform-specific modules.
#[tauri::command]
fn get_platform() -> &'static str {
    std::env::consts::OS
}

#[tauri::command]
async fn api_get(path: String) -> Result<String, String> {
    let url = format!("{}{}", service_base(), path);
    let resp = client()
        .get(&url)
        .header("Authorization", format!("Bearer {}", token()))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(map_send_err)?;

    let status = resp.status();
    if !status.is_success() {
        return Err(map_status(status));
    }
    if status.as_u16() == 204 {
        return Ok("null".to_string());
    }
    resp.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn api_post(path: String, body: String) -> Result<String, String> {
    let url = format!("{}{}", service_base(), path);
    let resp = client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", token()))
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(map_send_err)?;

    let status = resp.status();
    if !status.is_success() {
        return Err(map_status(status));
    }
    if status.as_u16() == 204 {
        return Ok("null".to_string());
    }
    resp.text().await.map_err(|e| e.to_string())
}

/// Save text content to the user's Downloads directory and return the full path.
/// Used for the firmware build script — webkit2gtk on Linux has no download
/// handler, so blob-anchor downloads silently do nothing there.
#[tauri::command]
fn save_to_downloads(app: tauri::AppHandle, filename: String, contents: String) -> Result<String, String> {
    // Only a bare filename — never let the frontend pick the directory.
    if filename.is_empty()
        || filename.contains('/')
        || filename.contains('\\')
        || filename.contains("..")
        || filename.starts_with('.')
    {
        return Err("invalid filename".to_string());
    }
    let dir = app
        .path()
        .download_dir()
        .map_err(|e| format!("cannot resolve Downloads directory: {}", e))?;
    let path = dir.join(&filename);
    std::fs::write(&path, contents).map_err(|e| format!("write failed: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_platform,
            api_get,
            api_post,
            save_to_downloads,
            updates::get_device_info,
            updates::get_installed_drivers,
            updates::fetch_framework_releases,
            graphics::get_graphics_state,
            graphics::get_dxgkrnl_events,
            graphics::get_gpu_preferences,
            graphics::set_gpu_preference,
            graphics::remove_gpu_preference,
            graphics::find_known_exes,
            graphics::open_amd_adrenalin,
            graphics::open_nvidia_control_panel,
            graphics::open_windows_graphics_settings,
            graphics::recover_dgpu,
            graphics::run_nvidia_smi,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Framework Deck");
}
