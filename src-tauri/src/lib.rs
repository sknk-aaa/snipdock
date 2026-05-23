mod commands;
mod hotkey;
mod storage;
mod tray;
mod window;

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::{Duration, Instant};
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
            let focused = Arc::new(AtomicBool::new(false));
            let focused_clone = focused.clone();
            let last_focused = Arc::new(std::sync::Mutex::new(Instant::now()));
            let last_focused_clone = last_focused.clone();
            let main_window = app.get_webview_window("main").unwrap();
            main_window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::Focused(true) => {
                        focused_clone.store(true, Ordering::SeqCst);
                        *last_focused_clone.lock().unwrap() = Instant::now();
                    }
                    tauri::WindowEvent::Focused(false) => {
                        if !focused_clone.swap(false, Ordering::SeqCst) {
                            return;
                        }
                        // フォーカス取得直後(300ms以内)のblurは無視
                        if last_focused.lock().unwrap().elapsed() < Duration::from_millis(300) {
                            return;
                        }
                        if let Some(w) = handle.get_webview_window("main") {
                            if w.is_minimized().unwrap_or(false) {
                                return;
                            }
                        }
                        let _ = handle.emit("window-blur", ());
                    }
                    _ => {}
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
