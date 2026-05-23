mod commands;
mod hotkey;
mod storage;
mod tray;
mod window;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            tray::setup(app.handle())?;

            if let Some(w) = app.get_webview_window("main") {
                let _ = w.minimize();
            }

            let saved_hotkey = {
                let data = storage::load(app.handle());
                data["settings"]["hotkey"]
                    .as_str()
                    .unwrap_or("ctrl+shift+space")
                    .to_string()
            };
            hotkey::register(app.handle(), &saved_hotkey);

            let handle = app.handle().clone();
            let main_window = app.get_webview_window("main").unwrap();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = handle.emit("window-blur", ());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_data,
            commands::save_data,
            commands::update_hotkey,
            commands::set_autostart,
            commands::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
