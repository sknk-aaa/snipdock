use tauri::AppHandle;

use crate::{hotkey, storage, window};

#[tauri::command]
pub fn load_data(app: AppHandle) -> serde_json::Value {
    storage::load(&app)
}

#[tauri::command]
pub fn save_data(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    storage::save(&app, &data)
}

#[tauri::command]
pub fn update_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    hotkey::update(&app, &hotkey);
    Ok(())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    window::hide(&app);
}

#[tauri::command]
pub fn check_license(state: tauri::State<'_, crate::ProState>) -> bool {
    state.0.load(std::sync::atomic::Ordering::SeqCst)
}
