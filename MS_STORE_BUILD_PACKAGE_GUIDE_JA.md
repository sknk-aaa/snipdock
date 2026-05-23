# Microsoft Store ビルド・パッケージ手順メモ

Last updated: 2026-05-23

このメモは、Folderly を Microsoft Store に出すために実際に使ったビルド・MSIX 作成・ローカル検証の流れを、別アプリでも Codex に参考として渡せる形に整理したものです。

## このアプリの前提

Folderly は以下の構成です。

- C# / .NET 8 / WPF の Windows デスクトップアプリ
- `src/Folderly.Package/Folderly.Package.wapproj` を使った Windows Application Packaging Project
- Store 提出形式は MSIX
- `runFullTrust` を使う Desktop Bridge アプリ
- Explorer の右クリックメニュー用に packaged COM extension を含む
- 対象は `Windows 10/11 Desktop`
- アーキテクチャは現状 `x64`

通常の「単体 exe を zip で出す」方式ではなく、`wapproj` で Release ビルドした成果物を MSIX に詰めて Partner Center にアップロードします。

## Store に必要な主なファイル

重要なのはこの 2 つです。

- `src/Folderly.Package/Folderly.Package.wapproj`
- `src/Folderly.Package/Package.appxmanifest`

`Package.appxmanifest` の `Identity` は Partner Center の Product identity と一致させます。

```xml
<Identity
  Name="KanekoApps.Folderly"
  Publisher="CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E"
  Version="1.0.16.0"
  ProcessorArchitecture="x64" />
```

Folderly の現在値は以下です。

- Package identity name: `KanekoApps.Folderly`
- Publisher: `CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E`
- Publisher display name: `Kaneko Apps`
- Version: `1.0.16.0`
- Store upload package: `_out/Folderly_1.0.16.0_x64_store.msix`

別アプリでは、必ず Partner Center でアプリを作成してから、Partner Center に表示される identity / publisher を manifest に反映します。

## バージョン番号の注意

Microsoft Store では、Windows 10/11 向けパッケージの 4 桁目は Store 側で使われるため、提出するパッケージでは `0` にします。

Folderly では以下のように直しました。

- NG: `1.0.0.16`
- OK: `1.0.16.0`

リリースごとに上げるなら、`1.0.17.0`, `1.0.18.0` のように 3 桁目を増やす運用がわかりやすいです。

## 1. テスト

まず通常のテストを通します。

```powershell
dotnet test .\tests\Folderly.Tests\Folderly.Tests.csproj --filter "FullyQualifiedName!~CheckPath_NoWriteAccess_IsDenied"
```

`CheckPath_NoWriteAccess_IsDenied` は Windows の権限挙動に依存するため、このローカル確認では除外しています。

## 2. Release x64 ビルド

`Folderly.Package.wapproj` を `Release|x64` でビルドします。

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" `
  .\src\Folderly.Package\Folderly.Package.wapproj `
  /t:Restore,Build `
  /p:Configuration=Release `
  /p:Platform=x64 `
  /p:RuntimeIdentifier=win-x64 `
  /p:SelfContained=false
```

成功すると、主な成果物はここに出ます。

```text
src\Folderly.Package\bin\x64\Release\
```

Folderly では `Folderly.exe` だけでなく、`Folderly.ContextMenu.comhost.dll`, `WebView2Loader.dll`, `e_sqlite3.dll` なども必要です。`wapproj` 側にコピー用 Target を追加して、MSIX に必要な DLL が入るようにしています。

## 3. Store 用 MSIX を作る

この環境では Visual Studio の `Publish` / `Store` / `Create App Packages` が表示されなかったため、`makeappx.exe` で手動作成しています。

```powershell
$ErrorActionPreference = 'Stop'
$version = '1.0.16.0'
$root = (Resolve-Path .).Path
$outDir = Join-Path $root '_out'
$stage = Join-Path $outDir "store_msix_stage_$version"
$msix = Join-Path $outDir "Folderly_$($version)_x64_store.msix"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item -Path (Join-Path $root 'src\Folderly.Package\bin\x64\Release\*') -Destination $stage -Recurse -Force
Copy-Item -Path (Join-Path $root 'src\Folderly.Package\Package.appxmanifest') -Destination (Join-Path $stage 'AppxManifest.xml') -Force
Copy-Item -Path (Join-Path $root 'src\Folderly.Package\Images') -Destination (Join-Path $stage 'Images') -Recurse -Force

$makeappx = 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe'
& $makeappx pack /d $stage /p $msix /overwrite
```

できあがるファイル:

```text
_out\Folderly_1.0.16.0_x64_store.msix
```

これを Partner Center の Packages にアップロードします。

## Store 用 MSIX とローカル検証用 MSIX は分ける

ここがかなり重要です。

Store に上げる MSIX は、Microsoft Store 側で署名されます。ローカル Windows に直接インストールして確認する場合は、別途署名済みの sideload 用コピーを作ります。

- Store upload: `_out\Folderly_1.0.16.0_x64_store.msix`
- Local test: `_out\Folderly_1.0.16.0_x64_sideload.msix`

Store 用ファイルを直接いじらず、コピーしてからローカル用に署名します。

## 4. ローカル検証用に署名してインストール

署名証明書の Subject は、manifest の Publisher と一致している必要があります。

Folderly の場合:

```text
CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E
```

検証用スクリプト:

```powershell
$ErrorActionPreference = 'Stop'
$publisher = 'CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E'
$root = (Resolve-Path .).Path
$storeMsix = Join-Path $root '_out\Folderly_1.0.16.0_x64_store.msix'
$sideloadMsix = Join-Path $root '_out\Folderly_1.0.16.0_x64_sideload.msix'
$certPath = Join-Path $root '_out\Folderly_LocalSideload.cer'

$cert = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $publisher } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $cert) {
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
Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null

$elevated = "Import-Certificate -FilePath '$certPath' -CertStoreLocation Cert:\LocalMachine\Root | Out-Null; " +
            "Import-Certificate -FilePath '$certPath' -CertStoreLocation Cert:\LocalMachine\TrustedPeople | Out-Null"
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($elevated))
Start-Process powershell.exe `
  -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) `
  -Verb RunAs `
  -Wait

Copy-Item -LiteralPath $storeMsix -Destination $sideloadMsix -Force
$signtool = 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe'
& $signtool sign /fd SHA256 /sha1 $cert.Thumbprint $sideloadMsix
& $signtool verify /pa /v $sideloadMsix

Get-Process Folderly -ErrorAction SilentlyContinue | Stop-Process -Force
Get-AppxPackage | Where-Object {
  $_.Name -eq 'Folderly.FolderlyApp' -or
  $_.Name -eq 'KanekoApps.Folderly'
} | ForEach-Object {
  Remove-AppxPackage -Package $_.PackageFullName
}

Add-AppxPackage -Path $sideloadMsix
Get-AppxPackage -Name KanekoApps.Folderly
```

`signtool verify` が通るのに `Add-AppxPackage` が `0x800B0109` で失敗する場合は、証明書が `LocalMachine\Root` と `LocalMachine\TrustedPeople` に入っていない可能性が高いです。

## 5. MSIX の中身を確認する

必要なら MSIX を展開して manifest を確認します。

```powershell
$msix = '_out\Folderly_1.0.16.0_x64_store.msix'
$verify = '_out\verify_store_msix_manifest_1.0.16.0'
$makeappx = 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe'

Remove-Item -LiteralPath $verify -Recurse -Force -ErrorAction SilentlyContinue
& $makeappx unpack /p $msix /d $verify
Get-Content (Join-Path $verify 'AppxManifest.xml')
```

確認したいポイント:

- `Identity Name` が Partner Center と一致している
- `Publisher` が Partner Center と一致している
- `Version` の 4 桁目が `0`
- `ProcessorArchitecture` が `x64`
- `Executable` が実際の exe 名と一致している
- 必要な DLL / 画像 / assets が入っている
- `runFullTrust` など restricted capability が必要最小限になっている

## 6. Partner Center で必要だった設定

Folderly では以下を設定しました。

- Packages: `_out\Folderly_1.0.16.0_x64_store.msix`
- Device family: `Windows 10/11 Desktop` のみ
- Category: `Utilities & tools`
- Privacy Policy URL: `https://sknk-aaa.github.io/folderly/`
- Support URL: `https://sknk-aaa.github.io/folderly/#support`
- Price: 300 JPY
- Trial: 7 days
- Age rating: ローカルデスクトップユーティリティとして回答
- Restricted capability explanation: `runFullTrust` の理由を記入

`runFullTrust` の説明文は `docs/STORE_SUBMISSION.md` に現在の提出用テキストがあります。

## 7. 別アプリで Codex に渡すときのチェックリスト

別の Windows アプリを Store に出すときは、Codex にこの順番で確認させるとよいです。

1. アプリ形式を確認する
   - WPF / WinUI / WinForms / Electron / Tauri など
   - MSIX 化できる構成か
   - `wapproj` があるか、なければ追加するか

2. Partner Center の Product identity を manifest に反映する
   - `Identity Name`
   - `Publisher`
   - `PublisherDisplayName`
   - `Package family name`

3. manifest を Store 用に整える
   - `Version` は `x.y.z.0`
   - `ProcessorArchitecture` を決める
   - `TargetDeviceFamily` は必要なものだけ
   - capabilities は必要最小限
   - アプリ名、説明、ロゴパスを確認

4. Release ビルドする
   - `MSBuild.exe <PackageProject>.wapproj /t:Restore,Build /p:Configuration=Release /p:Platform=x64`
   - exe / DLL / native DLL / assets が出力に入るか確認

5. MSIX を作る
   - Visual Studio で `Create App Packages` が使えるならそれを使う
   - 使えない場合は `makeappx pack`

6. ローカル検証する
   - Store 用 MSIX をコピー
   - manifest の Publisher と同じ Subject の証明書で署名
   - 証明書を信頼ストアに入れる
   - `Add-AppxPackage`
   - 起動、主要機能、アンインストールを確認

7. Partner Center にアップロードする
   - Packages
   - Listing
   - Privacy / Support URL
   - Pricing / Trial
   - Age rating
   - Restricted capability explanation
   - Screenshots

## よくある詰まり

- `Package.appxmanifest` の `Publisher` が Partner Center と違う
- Store 提出なのに `1.0.0.16` のように 4 桁目を増やしている
- ローカル sideload の証明書 Subject が manifest の Publisher と違う
- `signtool verify` は通るが、証明書が端末に信頼されておらず `Add-AppxPackage` が失敗する
- 古い package identity のアプリが残っていて、新ビルドを入れたつもりでも古い方が起動している
- 必要な native DLL が MSIX の root に入っていない
- Visual Studio の UI に Store packaging が出ないので、そこで止まる

## Codex への依頼テンプレ

別アプリで使うなら、こんな依頼がよいです。

```text
この Windows アプリを Microsoft Store に出したい。
Folderly の docs/MS_STORE_BUILD_PACKAGE_GUIDE_JA.md を参考にして、
このリポジトリの構成を確認し、Store 用 MSIX を作れる状態にして。

やってほしいこと:
- アプリ形式と packaging project の有無を確認
- Partner Center の Product identity を入れる場所を特定
- Package.appxmanifest の必要項目を整理
- Release ビルド手順を作成
- Store 用 MSIX 作成手順を作成
- ローカル sideload 検証手順を作成
- Partner Center で入力する項目のチェックリストを作成

Store 用とローカル検証用の MSIX は分けること。
MSIX の version は x.y.z.0 にすること。
```

## 参考

- Microsoft Learn: Sign your MSIX package - end-to-end guide
  https://learn.microsoft.com/en-us/windows/msix/package/sign-msix-package-guide
- Microsoft Learn: Code signing options for Windows app developers
  https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options
- Microsoft Learn: Upload MSIX app packages
  https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/upload-app-packages
- Microsoft Learn: App package requirements
  https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/supported-languages
