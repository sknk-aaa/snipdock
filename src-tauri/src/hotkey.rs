use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::window;

fn app_to_shortcut(hotkey: &str) -> String {
    hotkey.to_lowercase()
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
