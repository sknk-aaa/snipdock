# SnipDock — Windows 移行引継ぎドキュメント

作成日: 2026-05-23  
作業環境: WSL2 (Ubuntu) → Windows 側 Claude Code へ引継ぎ

---

## 現在の実装状況

**フェーズ: UIプロトタイプ完成 / Tauriバックエンド未着手**

| 領域 | 状態 |
|---|---|
| Tauri 2.x プロジェクト初期化 | ✅ 完了 |
| React + TypeScript フロントエンド | ✅ 完了 |
| 全画面 UI 実装 (デザイン準拠) | ✅ 完了 |
| i18n (ja/en) | ✅ 完了 |
| Rust バックエンド (トレイ・ホットキー等) | ❌ 未着手 |
| データ永続化 (JSON ファイル) | ❌ 未着手 (現在は localStorage) |
| グローバルホットキー | ❌ 未着手 |
| システムトレイ常駐 | ❌ 未着手 |
| フォーカスロスト自動クローズ | ❌ 未着手 |
| Proライセンス検証 | ❌ 未着手 |

`npm run build` は**エラーなし**で通過済み。

---

## 実行済みコマンド (WSL上)

```bash
# Rust インストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Vite React TS テンプレートをコピー (create-vite が TTY を要求したため /tmp 経由)
cd /tmp && npm create vite@latest snipdock-temp -- --template react-ts
cp -r /tmp/snipdock-temp/. /home/aaa/project/SnipDock/

# 依存インストール
npm install
npm install --save-dev @tauri-apps/cli@2
npm install @tauri-apps/api@2
npm install tailwindcss @tailwindcss/vite
npm install highlight.js uuid i18next react-i18next
npm install --save-dev @types/uuid

# Tauri 初期化 (--ci フラグで非対話)
npx tauri init --ci \
  --app-name "SnipDock" \
  --window-title "SnipDock" \
  --frontend-dist "../dist" \
  --dev-url "http://localhost:5173" \
  --before-dev-command "npm run dev" \
  --before-build-command "npm run build"
```

---

## ファイル構成

### 新規作成ファイル

```
src/
  App.tsx                    # メインアプリ・状態管理
  main.tsx                   # エントリポイント
  types.ts                   # 型定義
  index.css                  # デザインCSS変数・全コンポーネントスタイル
  components/
    DropdownMenu.tsx          # コンテキストメニュー
    ProModal.tsx              # Proアップグレードモーダル
    SectionGroup.tsx          # Sectionコンポーネント
    SettingsView.tsx          # Settings画面
    SnippetCard.tsx           # Snippetカード
    Toast.tsx                 # Toast通知 (Undo付き)
    Toggle.tsx                # トグルスイッチ
    TopBar.tsx                # 上部ツールバー
  lib/
    i18n.ts                   # i18next 初期化
  locales/
    ja.json                   # 日本語翻訳
    en.json                   # 英語翻訳
src-tauri/
  src/
    main.rs                   # Tauri エントリポイント (デフォルトのまま)
    lib.rs                    # Tauri ビルダー (デフォルトのまま)
  tauri.conf.json             # Tauri 設定 (カスタム済み)
  Cargo.toml                  # Rust 依存 (デフォルトのまま)
  capabilities/default.json   # Tauri パーミッション
```

### 変更済みファイル (テンプレートから差分あり)

| ファイル | 変更内容 |
|---|---|
| `index.html` | タイトル変更、Google Fonts (IBM Plex Sans, JetBrains Mono) 追加 |
| `vite.config.ts` | `@tailwindcss/vite` プラグイン追加、Tauri 向けビルド設定 |
| `package.json` | 依存追加 (name は "snipdock-temp" のまま → 要変更) |
| `src-tauri/tauri.conf.json` | identifier・ウィンドウ設定・装飾なし・透明・alwaysOnTop |
| `src/App.tsx` | 完全書き換え |
| `src/main.tsx` | i18n import 追加 |
| `src/index.css` | 完全書き換え (Tailwind + デザイン CSS 変数) |

### 不要な生成物 (残っているが使っていない)

- `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` — Vite テンプレートの残骸
- `src/App.css` — 削除済み
- `public/icons.svg` — Vite テンプレートの残骸

---

## Tauri 初期化状況

- `tauri init --ci` で初期化済み
- `src-tauri/src/lib.rs` と `main.rs` はデフォルト状態（何も追加していない）
- `tauri.conf.json` のみカスタム済み:
  - `identifier: "com.snipdock.app"`
  - `decorations: false` (タイトルバーなし)
  - `transparent: true` (frosted glass のため)
  - `alwaysOnTop: true`
  - `skipTaskbar: true`
  - `visible: false` (起動時に非表示 → ホットキーで表示する想定)

**Cargo.lock は未生成**（Windows 側で `cargo build` 時に初めて生成される）。

---

## npm install 実行状況

- WSL 上で `npm install` は完了済み
- `node_modules/` は `.gitignore` に含まれており **コミットされていない**
- Windows 側で `npm install` の再実行が必要

---

## Rust インストール状況

- WSL 上で `rustup` インストール済み (rustc 1.95.0)
- **Windows 側では別途インストールが必要**
- Windows 用インストーラー: https://rustup.rs
- Tauri 2.x が要求する追加要件:
  - Visual Studio C++ Build Tools (または Visual Studio)
  - WebView2 (Windows 11 標準搭載、Windows 10 は要インストール)

---

## Claude Design 関連ファイル

デザインソースは以下に一時展開した（コミット対象外）:

```
/tmp/design_out/copy-win/README.md
/tmp/design_out/copy-win/chats/chat1.md       # デザイン経緯・反復履歴
/tmp/design_out/copy-win/project/copy-win UI.html  # デザイン HTML プロトタイプ
```

**これらは /tmp に展開されたもので、git には含まれない。**  
デザインプロトタイプの URL: `https://api.anthropic.com/v1/design/h/lRrPa5VNg1trpWZtb7XgUw?open_file=copy-win+UI.html`

---

## SPEC.md との差分・気づいた点

### 実装時に SPEC から変更した点

| 項目 | SPEC | 実装 | 理由 |
|---|---|---|---|
| 言語リスト | Plain/Bash/PowerShell/JSON/YAML/SQL/JavaScript/Python | 同じ | デザインの ts/go/rust は除外済み |
| アクセントカラー | 記載なし | blue/purple/green/amber から選択可 | デザインに準拠して追加 |
| 背景透明度 | 記載なし | Settings で調整可 | デザインに準拠して追加 |
| Proモーダル文言 | "Free版では20個まで保存できます。Proで無制限に。" | 同等 + 機能リスト | SPEC + デザインを統合 |

### SPEC と未調整の点（次の Claude への申し送り）

- **`package.json` の `name` が `"snipdock-temp"`** → `"snipdock"` に要変更
- **ホットキーの UI 編集機能が未実装** — Settings 画面に表示はあるが、クリックして変更する UX がない
- **Section の削除確認ダイアログが未実装** — SPEC 3.3 は「確認ダイアログ表示後に削除」と記載。現在は直接削除 + Undo Toast
- **データ構造の `order` フィールド管理が未整備** — 追加時のインクリメントは実装済みだが、削除後の再採番なし
- **初回ヒントが Toast ではなくバナー** — SPEC 3.5 は「画面上部に1回だけ表示」→ バナーで正しいが位置・見た目の確認推奨
- **`src/lib/highlight.ts` が未作成** — SPEC には記載あるが、現在シンタックスハイライトは未実装（コードは `<span>` 表示のみ）

---

## UI 実装状況

### 実装済み機能

- **メイン画面**
  - Section の折りたたみ / 展開
  - Snippet のインライン編集 (click → textarea → blur で保存)
  - Copy ボタン (編集中ドラフトのコピー対応)
  - コピー後「Copied!」フィードバック
  - Section / Snippet の追加（Free 制限チェック付き）
  - Section / Snippet の削除 + Undo Toast (5秒)
  - Section のリネーム（インライン）
  - Snippet のピン留め（Section 内上位固定）
  - 言語ドロップダウン (Plain/Bash/PowerShell/JS/Python/JSON/YAML/SQL)
  - 空状態の表示（Section 0件、Snippet 0件）
  - 初回ヒントバナー (Ctrl+Shift+Space)

- **Settings 画面**
  - ホットキー表示（`kbd` 表示のみ、変更 UI 未実装）
  - 自動起動 / コピー後閉じる トグル
  - アクセントカラー選択（4色）
  - 背景透明度スライダー
  - 言語切替 (日本語 / English)
  - Export / Import 行（Pro バッジ表示、無効状態）
  - バージョン・プランステータス表示
  - Proアップグレード誘導ブロック

- **Pro モーダル**
  - SPEC 準拠の機能リスト（無制限・ドラッグ・Export/Import・優先サポート）
  - `[Proにアップグレード]` ボタン（ストア連携は未実装）

- **Toast**
  - コピー通知（1.5秒）
  - 削除通知 + Undo ボタン（5秒）

- **i18n**
  - OS 言語を自動判定（ja/en）
  - Settings から手動切替
  - 全 UI テキスト翻訳済み

- **状態永続化**
  - localStorage（Tauri storage 統合前の dev 用）

---

## 未実装部分（SPEC.md 実装順序より）

以下は Rust バックエンド実装フェーズに相当する:

1. **システムトレイ常駐** (SPEC §2.1)
   - トレイアイコン表示
   - 左クリック / 右クリックメニュー (Open / Settings / Quit)
   - タスクバー非表示

2. **グローバルホットキー** (SPEC §9)
   - `tauri-plugin-global-shortcut` で `Ctrl+Shift+Space`
   - マウスカーソル位置にウィンドウ表示

3. **フォーカスロスト自動クローズ** (SPEC §2.2)
   - Tauri ウィンドウの blur イベント検知
   - Settings 画面中は閉じない
   - 編集中は保存してから閉じる

4. **JSON ファイルストレージ** (SPEC §6)
   - `%APPDATA%\SnipDock\data.json` への読み書き
   - `data.json.bak` バックアップ
   - localStorage → Tauri storage への差し替え

5. **シンタックスハイライト** (SPEC §5)
   - `highlight.js` の最小インポート設定
   - `src/lib/highlight.ts` の作成

6. **ドラッグ並び替え** (SPEC §3.3, §3.4, Pro機能)
   - `dnd-kit` の組み込み

7. **自動起動設定の実効化** (SPEC §2.3)
   - `tauri-plugin-autostart`

8. **Pro ライセンス検証** (SPEC §8.2)
   - Microsoft Store `StoreContext.GetAppLicenseAsync()`
   - `windows` crate WinRT バインディング

9. **Export / Import** (SPEC §8.1, Pro機能)

10. **MSIX パッケージング** (SPEC §16 step 15)

---

## Windows 側へ移行すべきファイル

**Git で管理済み（clone すれば全て取得可能）:**

```
git clone <repo> または git pull
```

以下が含まれる:
- `SPEC.md` — 仕様書
- `src/` — 全 React コンポーネント・型定義・i18n
- `src-tauri/` — Tauri 設定・Rust ソース（初期状態）
- `package.json`, `package-lock.json` — 依存定義
- `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`
- `index.html`

**git に含まれない（再実行が必要）:**
- `node_modules/` → `npm install`
- `src-tauri/target/` → `cargo build` 時に自動生成
- `dist/` → `npm run build` 時に生成

---

## 不要な生成物

削除してよいファイル（機能に影響なし）:

```
src/assets/hero.png       # Vite テンプレートの残骸
src/assets/react.svg      # 同上
src/assets/vite.svg       # 同上
public/icons.svg          # Vite テンプレートの残骸
```

---

## Windows 側で最初にやるべきこと

### 環境セットアップ

```powershell
# 1. Rust インストール (まだの場合)
# https://rustup.rs からインストーラーをダウンロード・実行

# 2. Visual Studio Build Tools (C++ ワークロード必須)
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# 3. Node.js 18+ がなければインストール

# 4. リポジトリをクローン or 既存ディレクトリを Windows 側にコピー
cd C:\path\to\SnipDock

# 5. npm インストール
npm install

# 6. 動作確認 (Vite dev server のみ、Tauri なし)
npm run dev
# ブラウザで http://localhost:5173 を開いて UI を確認

# 7. Tauri ビルド確認
npm run tauri dev
# (初回は Rust の依存クレートダウンロードで数分かかる)
```

### 確認すべき動作

- [ ] `npm run dev` でブラウザ表示される
- [ ] Section / Snippet の追加・削除・編集が動く
- [ ] Settings 画面が開く
- [ ] Toast が表示される
- [ ] Pro モーダルが表示される (+ Section 5個超えで自動表示)
- [ ] `npm run tauri dev` でウィンドウが起動する

---

## 推奨実装順（Windows 側で再開する際）

SPEC.md §16 の実装順序に従い、以下の順で進める。

### 次にやるべき作業

1. **`package.json` の `name` を `"snipdock"` に修正**

2. **Tauri: システムトレイ常駐 + タスクバー非表示**
   - `src-tauri/Cargo.toml` に `tauri-plugin-shell` と tray 依存を追加
   - `src-tauri/src/tray.rs` を新規作成
   - `tauri.conf.json` に tray icon 設定を追加

3. **Tauri: グローバルホットキー**
   - `Cargo.toml` に `tauri-plugin-global-shortcut` を追加
   - `src-tauri/src/hotkey.rs` を新規作成
   - Rust 側でホットキー登録 → ウィンドウ show/hide

4. **Tauri: マウス位置にウィンドウ表示**
   - `src-tauri/src/window.rs` を新規作成
   - `tauri-plugin-positioner` または手動カーソル座標取得

5. **Tauri: フォーカスロスト自動クローズ**
   - Tauri の `on_window_event` で `Focused(false)` を検知
   - フロントエンドへ IPC コマンドで「保存して閉じる」通知

6. **JSON ストレージ**
   - `src-tauri/src/storage.rs` を新規作成
   - `%APPDATA%\SnipDock\data.json` 読み書き + `.bak` バックアップ
   - Tauri command として `load_data` / `save_data` を公開
   - `src/App.tsx` の localStorage を Tauri invoke に差し替え

7. **シンタックスハイライト**
   - `src/lib/highlight.ts` 作成 (highlight.js 最小インポート)
   - `SnippetCard.tsx` の `<span className="code-display">` に適用

8. **ドラッグ並び替え (Pro)**
   - `dnd-kit` を `SectionGroup.tsx` と `App.tsx` に組み込み
