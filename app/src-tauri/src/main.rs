// Prevents a console window from appearing on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Wayland + webkit2gtk-4.1 + recent Mesa can fail at EGL_BAD_PARAMETER when the
    // DMABuf renderer tries to negotiate. Reported on CachyOS / KDE Wayland (FW16).
    // Setting this before the webview boots is the documented workaround and is a
    // no-op on X11. Users can override by setting the var themselves.
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            // The EGL failure is reported on KDE Wayland (CachyOS); GNOME/Mesa
            // renders fine on the DMA-BUF (GPU) path and disabling it there
            // forces software compositing that costs a large slice of a core.
            // So: GNOME keeps GPU rendering, everything else gets the safe
            // workaround. Users can override by setting the var themselves.
            let desktop = std::env::var("XDG_CURRENT_DESKTOP")
                .unwrap_or_default()
                .to_uppercase();
            if !desktop.contains("GNOME") {
                // SAFETY: single-threaded here at process start before Tauri spins up.
                // (unsafe is required in edition 2024; redundant-but-harmless in 2021.)
                #[allow(unused_unsafe)]
                unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1"); }
            }
        }
    }
    framework_deck_lib::run();
}
