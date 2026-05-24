/// Microsoft Store ライセンス検証。
/// デバッグビルドは常に false（Store 外での実行のため）。
/// リリースビルドは WinRT の StoreContext で判定。
#[cfg(target_os = "windows")]
pub fn is_pro() -> bool {
    #[cfg(debug_assertions)]
    {
        false
    }
    #[cfg(not(debug_assertions))]
    {
        use windows::Services::Store::StoreContext;
        StoreContext::GetDefault()
            .and_then(|ctx| ctx.GetAppLicenseAsync())
            .and_then(|op| op.get())
            .and_then(|lic| lic.IsActive())
            .unwrap_or(false)
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_pro() -> bool {
    false
}
