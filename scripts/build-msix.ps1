# SnipDock — Store 用 MSIX ビルドスクリプト
# 使い方: .\scripts\build-msix.ps1 [-Version 0.1.0.0]
param(
    [string]$Version = '0.1.0.0'
)
$ErrorActionPreference = 'Stop'

$root    = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outDir  = Join-Path $root '_out'
$stage   = Join-Path $outDir "msix_stage_$Version"
$msix    = Join-Path $outDir "SnipDock_${Version}_x64_store.msix"
$exe     = Join-Path $root 'src-tauri\target\release\SnipDock.exe'

# ── 1. Release ビルドの確認 ────────────────────────────────────
if (-not (Test-Path $exe)) {
    Write-Error "Release build not found. Run: npm run tauri build"
}

# ── 2. ステージングディレクトリ準備 ───────────────────────────
New-Item -ItemType Directory -Force -Path $outDir  | Out-Null
Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stage   | Out-Null

# EXE コピー
Copy-Item -Path $exe -Destination $stage -Force

# AppxManifest (Version を書き換えて配置)
$manifest = Get-Content (Join-Path $root 'AppxManifest.xml') -Raw
$manifest  = $manifest -replace 'Version="[^"]*"', "Version=""$Version"""
$manifest | Set-Content (Join-Path $stage 'AppxManifest.xml') -Encoding UTF8

# アイコン assets
$assetsDir  = Join-Path $stage 'assets'
$iconsDir   = Join-Path $root 'src-tauri\icons'
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

@(
    'Square30x30Logo.png',
    'Square44x44Logo.png',
    'Square71x71Logo.png',
    'Square89x89Logo.png',
    'Square107x107Logo.png',
    'Square142x142Logo.png',
    'Square150x150Logo.png',
    'Square284x284Logo.png',
    'Square310x310Logo.png',
    'StoreLogo.png'
) | ForEach-Object {
    Copy-Item -Path (Join-Path $iconsDir $_) -Destination (Join-Path $assetsDir $_) -Force
}

# ── 3. makeappx.exe を検索 ─────────────────────────────────────
$makeappx = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter 'makeappx.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match 'x64' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $makeappx) {
    Write-Error "makeappx.exe not found. Install Windows SDK (Windows Kits 10)."
}

# ── 4. MSIX 作成 ───────────────────────────────────────────────
Remove-Item -LiteralPath $msix -ErrorAction SilentlyContinue
& $makeappx pack /d $stage /p $msix /overwrite
if ($LASTEXITCODE -ne 0) { Write-Error "makeappx failed." }

Write-Host ""
Write-Host "Store MSIX: $msix" -ForegroundColor Green
Write-Host "Partner Center の Packages にアップロードしてください。" -ForegroundColor Cyan
