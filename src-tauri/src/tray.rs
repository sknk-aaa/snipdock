use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::window;

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit SnipDock", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &settings, &quit])?;

    let icon = app.default_window_icon().cloned()
        .ok_or_else(|| tauri::Error::Anyhow(anyhow::anyhow!("no app icon")))?;

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("SnipDock")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => window::show_at_cursor(app),
            "settings" => {
                window::show_at_cursor(app);
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.emit("open-settings", ());
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                window::toggle(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
