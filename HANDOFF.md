# SnipDock — 開発引き継ぎ資料

## アプリ概要

Windows 向けのフローティング・スニペットランチャー。ホットキー（デフォルト `Ctrl+Shift+Space`）で画面上に呼び出し、コマンドや定型文をクリップボードにコピーして使う。Microsoft Store で販売（Free / Pro の freemium モデル）。

---

## 技術スタック

| レイヤー | 内容 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite |
| スタイリング | カスタム CSS（`src/index.css`）、CSS variables でテーマ管理。Tailwind は依存に入っているが実質未使用 |
| 国際化 | i18next（`src/locales/ja.json` / `en.json`） |
| ドラッグ＆ドロップ | @dnd-kit/core + @dnd-kit/sortable |
| バックエンド | Tauri 2.x（Rust） |
| ストレージ | `%APPDATA%\SnipDock\data.json`（Rust 側で読み書き、`.bak` バックアップあり） |
| ホットキー | tauri-plugin-global-shortcut |
| 自動起動 | tauri-plugin-autostart |
| ライセンス検証 | Windows WinRT `StoreContext::GetAppLicenseAsync()`（`windows` crate 0.58） |

---

## Rust バックエンド構成（`src-tauri/src/`）

| ファイル | 役割 |
|---|---|
| `lib.rs` | エントリーポイント。プラグイン初期化・トレイ設定・ライセンス取得・フォーカスイベント監視 |
| `commands.rs` | `load_data` / `save_data` / `update_hotkey` / `set_autostart` / `hide_window` / `check_license` |
| `window.rs` | `show_at_cursor`（カーソル位置に表示）/ `hide`（minimize）/ `toggle` |
| `hotkey.rs` | グローバルホットキー登録・更新。フォーマット変換: `"Ctrl+Alt+Space"` → `"ctrl+alt+Space"` |
| `tray.rs` | システムトレイアイコン・メニュー（Open / Settings / Quit） |
| `storage.rs` | JSON ファイル読み書き |
| `license.rs` | リリースビルドのみ StoreContext で検証。デバッグビルドは常に `false` |

### ウィンドウの表示・非表示の仕組み

- **非表示** = `window.minimize()`（タスクバーに残る）
- **表示** = `window.unminimize()` → `window.show()` → `window.set_position()` → `window.set_focus()`
- `set_position()` は minimize 中に呼ぶと Windows に無視されるため、unminimize 後に呼ぶ必要がある
- 起動時は `lib.rs` の `setup()` で即 `minimize()` してバックグラウンド常駐

### フォーカスロスト → ウィンドウ非表示の仕組み

`Focused(false)` イベントを受けたとき、以下の条件を満たす場合のみ `window-blur` イベントをフロントに送信：
1. 直前に `Focused(true)` を受けていた（`AtomicBool`）
2. フォーカス取得から 300ms 以上経過している（起動直後の spurious blur を無視）
3. ウィンドウがすでに minimize 状態でない

フロント側（`App.tsx`）は `window-blur` を受けて `hide_window` コマンドを呼ぶ。Settings 画面を開いている間は無視。

---

## フロントエンド構成（`src/`）

| ファイル | 役割 |
|---|---|
| `App.tsx` | ルートコンポーネント。状態管理・データ保存・Tauri イベントリスン |
| `types.ts` | `Snippet` / `Section` / `AppSettings` 等の型定義 |
| `lib/storage.ts` | Tauri 環境と Web 環境（開発用 localStorage）を抽象化 |
| `lib/i18n.ts` | i18next 初期化。言語検出なし、デフォルト英語 |
| `components/TopBar.tsx` | `+ Section` ボタン・設定ボタン |
| `components/SectionGroup.tsx` | セクションの折りたたみ・リネーム・スニペット DnD |
| `components/SnippetCard.tsx` | 1行フレックスレイアウト。コピー・ピン留め・編集・削除 |
| `components/SettingsView.tsx` | 設定画面（ホットキー録音・外観・データ） |
| `components/ProModal.tsx` | Pro アップグレードモーダル |
| `components/Toast.tsx` | 下部トースト通知（Undo 付き） |
| `components/DropdownMenu.tsx` | 汎用ドロップダウン |
| `components/ConfirmDialog.tsx` | セクション削除確認ダイアログ |

### データフロー

```
Tauri invoke load_data
  → App.tsx の useState に展開
  → sections / settings / hintSeen
  → 変更のたびに saveData() → Tauri invoke save_data
```

### Free / Pro の制限

```ts
const FREE_MAX_SECTIONS = 2;
const FREE_MAX_SNIPPETS = 5;  // 全セクション合計
```

- Pro 判定: `invoke<boolean>('check_license')` → `isPro` state
- 制限超過時: `ProModal` を表示
- Pro 限定機能: ドラッグ並び替え（`useSortable` の `disabled: !isPro`）、Export/Import

### シードデータ（初回起動時のみ表示）

```
Git セクション: git status / git log --oneline -10 / git stash
Dev セクション: npm run dev / docker compose up -d
```

---

## ビルド・リリースフロー

```powershell
# 開発
npm run tauri dev

# リリースビルド
npm run tauri build
# → src-tauri\target\release\SnipDock.exe

# MSIX パッケージ（Store 提出用）
.\scripts\build-msix.ps1
# → _out\SnipDock_x.y.z.0_x64_store.msix

# ローカル検証（サイドロード）
.\scripts\sideload-msix.ps1
```

### Microsoft Store Identity

| フィールド | 値 |
|---|---|
| Package/Identity/Name | `KanekoApps.SnipDock` |
| Package/Identity/Publisher | `CN=F27FAE8B-A689-44D3-AB88-09E593D2DA9E` |
| PublisherDisplayName | `Kaneko Apps` |

---

## リリース前の残タスク

### 必須対応

#### 1. アプリアイコンの差し替え
現在はデフォルトの Tauri アイコン。1024×1024 PNG を用意して以下を実行：
```powershell
npx tauri icon your-icon.png
```
`src-tauri/icons/` 以下の全ファイルが自動生成される。

#### 2. バージョン番号の統一
`package.json` が `"0.0.0"`、`tauri.conf.json` が `"0.1.0"` でずれている。両方を正式バージョンに揃える。

#### 3. `empty.noSnippets` テキストの修正
`src/locales/ja.json` と `en.json` の `empty.noSnippets` が「+ Snippet で追加」になっているが、そのボタンはもう存在しない。各セクションヘッダーの `+` を指すよう修正が必要。

```json
// ja.json
"noSnippets": "ヘッダーの + からスニペットを追加"

// en.json  
"noSnippets": "Click + in the section header to add"
```

#### 4. Cargo.toml のメタ情報
```toml
[package]
name = "app"          # → "snipdock" に変更推奨
description = "A Tauri App"  # → 正式な説明文に変更
authors = ["you"]     # → 実際の名前に変更
license = ""          # → "MIT" 等を設定
```

### 動作確認（実機テスト）

- [ ] ホットキー変更 → 旧キーで開けなくなる、新キーで開ける
- [ ] autoStart ON/OFF の登録・解除が機能する
- [ ] `closeAfterCopy` が実際にウィンドウを閉じる
- [ ] データが `%APPDATA%\SnipDock\data.json` に保存・復元される
- [ ] ウィンドウサイズが再起動後も記憶される
- [ ] **リリースビルドで `check_license` が正しく動作する**（デバッグビルドは常に `false`）
- [ ] ドラッグ並び替えが Pro ユーザーのみ動作する

### 任意対応

- CSP を `null` から適切な設定に変更（セキュリティ強化）
- `tauri.conf.json` の `"visible": true` について: 起動時に一瞬ウィンドウが表示される可能性あり（setup で即 minimize しているが環境によっては flash が出るかもしれない）。問題がある場合は `"visible": false` に変更して `show_at_cursor` 経由のみで表示する方式に切り替える
- Store 掲載ページ用のスクリーンショット・説明文の準備

---

## 既知の設計上の注意点

- **ホットキーフォーマット**: Tauri に渡す際はモディファイアを小文字・キー名はそのままの大小文字で。例: `"Ctrl+Alt+Space"` → `"ctrl+alt+Space"`。`hotkey.rs` の `app_to_shortcut()` が変換している
- **ウィンドウ非表示 = minimize**: `hide()` は `window.minimize()` を呼ぶ。`window.close()` や `window.hide()` は使わない（タスクバー常時表示のため）
- **ライセンス検証はメインスレッドで**: `StoreContext` は WinRT の UI スレッド要件があるため、`setup()` 内（メインスレッド）で同期的に呼び出している。非同期コマンドから呼ぶとパニックする
- **DPI 対応**: ウィンドウサイズは `scaleFactor()` + `toLogical()` で論理ピクセルに変換して保存
