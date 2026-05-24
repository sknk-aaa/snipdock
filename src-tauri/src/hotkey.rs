use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::window;

/// "Ctrl+Alt+Space" → "ctrl+alt+Space"
/// モディファイアは小文字化、キー名は元の大文字小文字を維持する。
fn app_to_shortcut(hotkey: &str) -> String {
    let parts: Vec<&str> = hotkey.split('+').collect();
    if parts.len() < 2 {
        return hotkey.to_string();
    }
    let modifiers: Vec<String> = parts[..parts.len() - 1]
        .iter()
        .map(|m| m.to_lowercase())
        .collect();
    let key = parts.last().unwrap();
    format!("{}+{}", modifiers.join("+"), key)
}

pub fn register(app: &AppHandle, hotkey: &str) {
    let key_str = app_to_shortcut(hotkey);
    let handle = app.clone();

    let result = app
        .global_shortcut()
        .on_shortcut(key_str.as_str(), move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                window::toggle(&handle);
            }
        });

    if let Err(e) = result {
        log::warn!("Failed to register hotkey '{}': {}", hotkey, e);
    }
}

pub fn update(app: &AppHandle, new_hotkey: &str) {
    let _ = app.global_shortcut().unregister_all();
    register(app, new_hotkey);
}
