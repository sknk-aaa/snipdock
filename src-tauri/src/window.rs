use tauri::{AppHandle, Manager, PhysicalPosition};

pub fn show_at_cursor(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let (cx, cy) = cursor_position();

    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten());

    if let Some(mon) = monitor {
        let mp = mon.position();
        let ms = mon.size();
        let ws = window.outer_size().unwrap_or_default();

        let x = (cx - ws.width as i32 / 2)
            .max(mp.x)
            .min(mp.x + ms.width as i32 - ws.width as i32);
        let y = (cy - 20)
            .max(mp.y)
            .min(mp.y + ms.height as i32 - ws.height as i32);

        let _ = window.set_position(PhysicalPosition::new(x, y));
    }

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn hide(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

pub fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let minimized = window.is_minimized().unwrap_or(false);
    let visible = window.is_visible().unwrap_or(false);
    if visible && !minimized {
        let _ = window.minimize();
    } else {
        show_at_cursor(app);
    }
}

#[cfg(target_os = "windows")]
fn cursor_position() -> (i32, i32) {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    unsafe { GetCursorPos(&mut p) };
    (p.x, p.y)
}

#[cfg(not(target_os = "windows"))]
fn cursor_position() -> (i32, i32) {
    (0, 0)
}
