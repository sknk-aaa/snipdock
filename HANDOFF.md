# SnipDock — 開発引き継ぎ資料

## アプリ概要

Windows 向けのフローティング・スニペットランチャー。ホットキー（デフォルト `Ctrl+Shift+Space`）でカーソル位置にウィンドウを呼び出し、コマンドや定型文をクリップボードにコピーして使う。Microsoft Store で販売（Free / Pro の freemium モデル）。

---

## 技術スタック

| レイヤー | 内容 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite |
| スタイリング | カスタム CSS（`src/index.css`）、CSS variables でテーマ管理 |
| 国際化 | i18next（`src/locales/ja.json` / `en.json`） |
| ドラッグ＆ドロップ | @dnd-kit/core + @dnd-kit/sortable |
| バックエンド | Tauri 2.x（Rust）、Windows 専用 |
| ストレージ | `%APPDATA%\SnipDock\data.json`（Rust 側で読み書き、`.bak` バックアップあり） |
| ホットキー | tauri-plugin-global-shortcut |
| 自動起動 | tauri-plugin-autostart |
| ライセンス検証 | Windows WinRT `StoreContext::GetAppLicenseAsync()`（`windows` crate 0.58） |

---

## ビルド環境のセットアップ

### 必要なツール（全てインストール済みであること）

| ツール | 用途 | 確認コマンド |
|---|---|---|
| Node.js 20+ | フロントエンドビルド | `node -v` |
| Rust (stable-x86_64-pc-windows-msvc) | Tauri バックエンドのコンパイル | `rustc -V` |
| Visual Studio 2022 または 2026 | MSVC C++ コンパイラ・リンカ | — |
| Windows SDK 10.0.26100.0 | `makeappx.exe` / `signtool.exe`（MSIX ビルドに必要） | — |

### 重要: `.cargo/config.toml` について

`C:\src\SnipDock\.cargo\config.toml` に MSVC のパスをハードコードしている。
このファイルは **このマシン専用の設定** であり、他のマシンでビルドする場合は書き換えが必要。

```toml
[env]
INCLUDE = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community\\..."
LIB     = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community\\..."

[target.x86_64-pc-windows-msvc]
linker  = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community\\...\\link.exe"
```

**別マシンでビルドする場合の対応手順:**

1. VS のインストール先を確認する
   ```powershell
   # VS 2022 の場合は "17", VS 2026 は "18" がバージョン番号
   ls "C:\Program Files\Microsoft Visual Studio\"
   ```

2. MSVC のバージョン番号を確認する
   ```powershell
   ls "C:\Program Files\Microsoft Visual Studio\<バージョン>\Community\VC\Tools\MSVC\"
   # 例: 14.51.36231
   ```

3. Windows SDK のバージョンを確認する
   ```powershell
   ls "C:\Program Files (x86)\Windows Kits\10\include\"
   # 例: 10.0.26100.0
   ```

4. `.cargo/config.toml` のパスを上記の値に合わせて書き換える

---

## 開発の始め方

新規ターミナルを開くたびに `cargo` を PATH に通す必要がある（または `dev.bat` を使う）:

```powershell
# PowerShell の場合
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cd C:\src\SnipDock
npm run tauri dev
```

```bat
# または付属のバッチファイルを使う（VS の vcvarsall.bat も通してくれる）
scripts\dev.bat
```

`npm run tauri dev` を実行すると:
1. Vite が起動してフロントエンドを `http://localhost:5173` でサーブ
2. Tauri が Rust バックエンドをデバッグビルドしてウィンドウを開く
3. フロントの変更はホットリロードされる。Rust の変更はアプリの再起動が必要

---

## リリースビルドの手順

### ステップ 1: Tauri リリースビルド

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cd C:\src\SnipDock
npm run tauri build
```

完了すると以下が生成される:
- `src-tauri\target\release\SnipDock.exe` — 実行ファイル本体
- `src-tauri\target\release\bundle\` — Tauri が自動生成した各種インストーラー（NSIS等）

**所要時間**: 初回は 5〜15 分程度（Rust のコンパイルキャッシュがないため）。2回目以降は 1〜3 分。

> **注意**: デバッグビルド（`tauri dev`）では `check_license` が常に `false` を返す（Free 扱い）。  
> リリースビルドでのみ Microsoft Store のライセンス検証が走る。

### ステップ 2: MSIX パッケージの作成（Store 提出用）

Tauri 標準のバンドラーではなく、カスタムスクリプトで MSIX を作成する。

```powershell
cd C:\src\SnipDock
.\scripts\build-msix.ps1 -Version 0.1.0.0
```

バージョン番号は `Major.Minor.Patch.0` の4桁形式（Store の要件）。

**スクリプトの処理内容:**
1. `src-tauri\target\release\SnipDock.exe` が存在するか確認（なければエラー）
2. `_out\msix_stage_<Version>\` にステージングディレクトリを作成
3. `SnipDock.exe` をコピー
4. `AppxManifest.xml` のバージョン番号を書き換えてコピー
5. `src-tauri\icons\` からアイコン PNG 群を `assets\` にコピー
6. `makeappx.exe`（Windows SDK 付属）で MSIX パッケージを作成
7. 出力: `_out\SnipDock_0.1.0.0_x64_store.msix`

**前提条件**: Windows SDK がインストールされていること（`makeappx.exe` が `C:\Program Files (x86)\Windows Kits\10\bin\` 以下に存在）

### ステップ 3: ローカル動作確認（サイドロード）

Store に提出する前に手元の PC で MSIX をインストールしてテストできる。

```powershell
cd C:\src\SnipDock
.\scripts\sideload-msix.ps1 -Version 0.1.0.0
```

**スクリプトの処理内容（管理者権限を途中で要求する）:**
1. Store MSIX（`_out\SnipDock_..._store.msix`）が存在するか確認
2. 自己署名証明書を作成（初回のみ）し、`Cert:\CurrentUser\My` に保存
3. 証明書を `TrustedPeople` と `Root` ストアに登録
4. MSIX を `_out\SnipDock_..._sideload.msix` としてコピーし `signtool.exe` で署名
5. 既存の SnipDock をアンインストール
6. `Add-AppxPackage` でインストール

インストール後、スタートメニューに SnipDock が現れる。

### ステップ 4: Store への提出

1. [Partner Center](https://partner.microsoft.com/) にログイン
2. SnipDock のアプリページ → **Packages** → `_out\SnipDock_..._store.msix` をアップロード
3. 審査を通過するとストアに公開される

> **注意**: Store 経由でインストールした場合のみ `check_license` が正しく動作する。  
> サイドロード版は Free 扱いになる（StoreContext がライセンスを認識できないため）。

---

## Microsoft Store の ID 情報

`AppxManifest.xml` と `sideload-msix.ps1` に使われている値。変更不可。

| フィールド | 値 |
|---|---|
| Package/Identity/Name | `KanekoApps.SnipDock` |
| Package/Identity/Publisher | `CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E` |
| PublisherDisplayName | `Kaneko Apps` |

---

## プロジェクト構成

```
SnipDock/
├── src/                        # React フロントエンド
│   ├── App.tsx                 # ルートコンポーネント・状態管理
│   ├── types.ts                # 型定義（Snippet / Section / AppSettings）
│   ├── index.css               # 全スタイル（CSS variables でテーマ管理）
│   ├── components/
│   │   ├── TopBar.tsx          # 上部ツールバー（+Section・設定ボタン）
│   │   ├── SectionGroup.tsx    # セクション（折りたたみ・DnD・リネーム）
│   │   ├── SnippetCard.tsx     # スニペット1行カード（コピー・編集・ピン）
│   │   ├── SettingsView.tsx    # 設定画面
│   │   ├── ProModal.tsx        # Pro アップグレードモーダル
│   │   ├── Toast.tsx           # トースト通知
│   │   ├── DropdownMenu.tsx    # 汎用ドロップダウン
│   │   └── ConfirmDialog.tsx   # 削除確認ダイアログ
│   ├── lib/
│   │   ├── storage.ts          # Tauri/localStorage 抽象化
│   │   └── i18n.ts             # i18next 初期化
│   └── locales/
│       ├── ja.json             # 日本語テキスト
│       └── en.json             # 英語テキスト
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # エントリーポイント・イベント監視
│   │   ├── commands.rs         # Tauri コマンド定義
│   │   ├── window.rs           # ウィンドウ表示・非表示・位置制御
│   │   ├── hotkey.rs           # グローバルホットキー登録
│   │   ├── tray.rs             # システムトレイ
│   │   ├── storage.rs          # JSON ファイル読み書き
│   │   └── license.rs          # MS Store ライセンス検証
│   ├── icons/                  # アプリアイコン（全サイズ）
│   ├── tauri.conf.json         # Tauri 設定（ウィンドウ・バンドル設定）
│   └── Cargo.toml              # Rust 依存関係
├── AppxManifest.xml            # MSIX パッケージマニフェスト
├── scripts/
│   ├── dev.bat                 # 開発サーバー起動（Windows バッチ）
│   ├── build-msix.ps1          # Store 用 MSIX ビルド
│   └── sideload-msix.ps1       # ローカル検証用サイドロード
├── .cargo/
│   └── config.toml             # MSVC パス設定（マシン依存・要確認）
└── _out/                       # ビルド成果物出力先（gitignore）
```

---

## Rust バックエンドの仕組み

### ウィンドウ表示・非表示

- **表示**: `window.unminimize()` → `window.show()` → `window.set_position()` → `window.set_focus()`
  - `set_position()` は minimize 中に呼ぶと Windows に無視されるため、必ず unminimize の後に呼ぶ
- **非表示**: `window.minimize()`（タスクバーには常時表示）
- 起動時は `lib.rs` の `setup()` で即 `minimize()` してバックグラウンド常駐する

### フォーカスを失ったときにウィンドウを閉じる仕組み

`Focused(false)` イベントを受けても、以下のケースは無視する（誤作動防止）:
1. 直前に `Focused(true)` を受けていなかった場合（`AtomicBool` で追跡）
2. フォーカス取得から 300ms 以内（起動直後の spurious blur を無視）
3. すでに minimize 状態のとき

条件を通過した場合のみ `window-blur` イベントをフロントに送信 → フロントが `hide_window` コマンドを呼ぶ。Settings 画面を開いている間は無視。

### ホットキーのフォーマット変換

Tauri（keyboard-types crate）が受け付けるフォーマットはモディファイアが小文字:
- UI で保存: `"Ctrl+Alt+Space"`
- Tauri に渡す: `"ctrl+alt+Space"` （キー名の大文字小文字はそのまま）

`hotkey.rs` の `app_to_shortcut()` がこの変換を担っている。

### ライセンス検証

```rust
// license.rs
#[cfg(debug_assertions)]
pub fn is_pro() -> bool { false }  // デバッグビルドは常に Free

#[cfg(not(debug_assertions))]
pub fn is_pro() -> bool {
    // リリースビルドのみ StoreContext で検証
    StoreContext::GetDefault()...
}
```

`setup()` 内（メインスレッド）で同期的に呼び出している。WinRT の UI スレッド要件があるため、非同期コマンドから呼ぶとパニックする。

---

## フロントエンドの仕組み

### データフロー

```
起動時: invoke('load_data') → sections / settings / hintSeen を state に展開
変更時: useEffect → saveData() → invoke('save_data') → %APPDATA%\SnipDock\data.json
```

### Free / Pro の制限

```ts
const FREE_MAX_SECTIONS = 2;
const FREE_MAX_SNIPPETS = 5;  // 全セクション合計
```

- Pro 判定: 起動時に `invoke<boolean>('check_license')` → `isPro` state に保存
- 制限超過時: `ProModal` を表示
- Pro 限定機能: ドラッグ並び替え（`useSortable({ disabled: !isPro })`）、Export/Import

### シードデータ（初回起動時のみ表示）

```
Git セクション: git status / git log --oneline -10 / git stash
Dev セクション: npm run dev / docker compose up -d
```

データが `%APPDATA%\SnipDock\data.json` に存在する場合はシードデータは使われない。

---

## アイコンの差し替え方法

現在は Tauri デフォルトのアイコンが入っている。1024×1024 の PNG を用意して以下を実行すると `src-tauri/icons/` 以下の全ファイルが自動生成される:

```powershell
npx tauri icon your-icon.png
```

生成されるファイル（一部）:
| ファイル | 用途 |
|---|---|
| `icon.ico` | タスクバー・トレイ・Alt+Tab（16/32/48/256px を内包） |
| `Square150x150Logo.png` | スタートメニュー（中タイル） |
| `Square44x44Logo.png` | タスクバーのピン留め |
| `StoreLogo.png` | Store 掲載ページ（50×50） |

---

## リリース前の残タスク

### 必須対応

| # | 内容 | ファイル |
|---|---|---|
| 1 | ~~**アイコンの差し替え**~~ | ✅ 対応済み（`app-icon.png` → `npx tauri icon` で全サイズ生成） |
| 2 | ~~**バージョン番号の統一**~~ | ✅ 対応済み（0.1.0 に統一） |
| 3 | ~~**空セクションのテキスト修正**~~ | ✅ 対応済み |
| 4 | ~~**Cargo.toml のメタ情報**~~ | ✅ 対応済み（name: snipdock / authors: Kaneko Apps 等） |

### 動作確認（実機テスト）

リリースビルド（`npm run tauri build` → `sideload-msix.ps1`）でサイドロードし、以下を確認する。

#### Pro 機能（最優先・未確認）
> デバッグビルドは常に Free 扱いなので、必ずリリースビルドで確認すること

- [ ] セクション3個目を追加しようとすると ProModal が出る
- [ ] スニペット6個目を追加しようとすると ProModal が出る
- [ ] Free ユーザーはドラッグ並び替えができない（ハンドルが非表示）
- [ ] Free ユーザーは Export / Import ボタンを押すと ProModal が出る
- [ ] Store で購入済みアカウントで `check_license` が `true` を返す

#### 全般
- [ ] ホットキー変更 → 旧キーで開かなくなる、新キーで開ける
- [ ] autoStart ON → Windows 再起動後に自動起動する
- [ ] autoStart OFF → 自動起動しなくなる
- [ ] `closeAfterCopy` ON → コピー後にウィンドウが閉じる
- [ ] データが `%APPDATA%\SnipDock\data.json` に保存・復元される
- [ ] ウィンドウサイズを変更後に再起動しても記憶されている

### 任意対応

- `tauri.conf.json` の `"visible": true` について: 起動時に一瞬ウィンドウが表示される可能性がある（`setup()` 内で即 `minimize()` しているが、マシンによっては flash が見えることがある）。問題がある場合は `"visible": false` に変更する
- CSP が `null` のままなので本番向けに設定を検討する
- Store 掲載ページ用のスクリーンショット・説明文を準備する
