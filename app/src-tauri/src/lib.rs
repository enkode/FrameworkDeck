// Rust backend for Framework Deck.
//
// API calls go through these commands so the WebView never sends an Origin
// header to the framework-control service — bypassing its CORS allowlist entirely.
// The token is read from the same env var the service uses, falling back to the
// known install default.

const SERVICE_BASE: &str = "http://127.0.0.1:30912";
const DEFAULT_TOKEN: &str = "4c07a4f2-0e64-4c43-bcb0-093cd55a55b6";

fn token() -> String {
    std::env::var("FRAMEWORK_CONTROL_TOKEN").unwrap_or_else(|_| DEFAULT_TOKEN.to_string())
}

fn client() -> reqwest::Client {
    reqwest::Client::new()
}

#[tauri::command]
async fn api_get(path: String) -> Result<String, String> {
    let url = format!("{}{}", SERVICE_BASE, path);
    let resp = client()
        .get(&url)
        .header("Authorization", format!("Bearer {}", token()))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status.as_u16()));
    }
    if status.as_u16() == 204 {
        return Ok("null".to_string());
    }
    resp.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn api_post(path: String, body: String) -> Result<String, String> {
    let url = format!("{}{}", SERVICE_BASE, path);
    let resp = client()
        .post(&url)
        .header("Authorization", format!("Bearer {}", token()))
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status.as_u16()));
    }
    if status.as_u16() == 204 {
        return Ok("null".to_string());
    }
    resp.text().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![api_get, api_post])
        .run(tauri::generate_context!())
        .expect("error while running Framework Deck");
}
