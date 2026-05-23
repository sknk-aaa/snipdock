# SnipDock — ローカル検証用サイドロードスクリプト
# 使い方: .\scripts\sideload-msix.ps1 [-Version 0.1.0.0]
param(
    [string]$Version = '0.1.0.0'
)
$ErrorActionPreference = 'Stop'

$publisher    = 'CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E'
$root         = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outDir       = Join-Path $root '_out'
$storeMsix    = Join-Path $outDir "SnipDock_${Version}_x64_store.msix"
$sideloadMsix = Join-Path $outDir "SnipDock_${Version}_x64_sideload.msix"
$certPath     = Join-Path $outDir 'SnipDock_LocalSideload.cer'

if (-not (Test-Path $storeMsix)) {
    Write-Error "Store MSIX not found. Run: .\scripts\build-msix.ps1 first."
}

# ── 1. 証明書の準備 ────────────────────────────────────────────
$cert = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.Subject -eq $publisher } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1

if (-not $cert) {
    Write-Host "自己署名証明書を作成します..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $publisher `
        -CertStoreLocation Cert:\CurrentUser\My `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature `
        -HashAlgorithm SHA256
}

Export-Certificate -Cert $cert -FilePath $certPath -Force | Out-Null
Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\TrustedPeople | Out-Null
Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\Root          | Out-Null

# LocalMachine への信頼登録（管理者権限が必要）
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes(
    "Import-Certificate -FilePath '$certPath' -CertStoreLocation Cert:\LocalMachine\Root | Out-Null; " +
    "Import-Certificate -FilePath '$certPath' -CertStoreLocation Cert:\LocalMachine\TrustedPeople | Out-Null"
))
Start-Process powershell.exe `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded) `
    -Verb RunAs -Wait

# ── 2. Store MSIX をコピーして署名 ────────────────────────────
Copy-Item -LiteralPath $storeMsix -Destination $sideloadMsix -Force

$signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match 'x64' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $signtool) { Write-Error "signtool.exe not found. Install Windows SDK." }

& $signtool sign /fd SHA256 /sha1 $cert.Thumbprint $sideloadMsix
& $signtool verify /pa /v $sideloadMsix

# ── 3. 既存版をアンインストールして再インストール ─────────────
Get-Process SnipDock -ErrorAction SilentlyContinue | Stop-Process -Force
Get-AppxPackage | Where-Object { $_.Name -eq 'KanekoApps.SnipDock' } | ForEach-Object {
    Remove-AppxPackage -Package $_.PackageFullName
}

Add-AppxPackage -Path $sideloadMsix
Get-AppxPackage -Name KanekoApps.SnipDock

Write-Host ""
Write-Host "インストール完了。スタートメニューから SnipDock を起動してください。" -ForegroundColor Green
