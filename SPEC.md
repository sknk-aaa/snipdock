# Snippet Launcher 設計書

開発者向けの常駐型スニペットコピーアプリ。
「開く → Copy → 閉じる」が高速な、Raycast風ミニランチャー。

---

## 1. 技術スタック

| 項目 | 採用技術 |
|---|---|
| フレームワーク | Tauri 2.x |
| バックエンド | Rust |
| フロントエンド | React + TypeScript |
| スタイル | Tailwind CSS |
| UIコンポーネント | shadcn/ui |
| シンタックスハイライト | highlight.js(言語は最小限のみインポート) |
| ドラッグ並び替え | dnd-kit |
| 国際化 | i18next + react-i18next |
| データ保存 | JSONファイル |
| 配布形式 | MSIX (Microsoft Store) |

---

## 2. アプリ構成

### 2.1 常駐方式
- **システムトレイ常駐**(右下の通知領域)
- **タスクバー非表示**(アプリ起動中もタスクバーにボタンを表示しない)
- トレイアイコン左クリック または `Ctrl+Shift+Space` でウィンドウ表示
- トレイアイコン右クリックでメニュー: `Open` / `Settings` / `Quit`

### 2.2 ウィンドウ挙動
- 単一ウィンドウのみ(複数禁止)
- 表示位置: **マウスカーソル位置**
- サイズ変更可能(サイズと位置を記憶)
- 表示中は常に最前面
- **フォーカスロストで自動クローズ**(Raycast方式)
  - ただし Settings 画面を開いている時は閉じない
  - 編集中(Snippet入力中)は保存してから閉じる
- `Esc` キーで閉じる
- `Ctrl+Shift+Space` でトグル(表示/非表示)

### 2.3 自動起動
- Windows起動時の自動スタート: **デフォルトOFF**
- Settings で切替可能

---

## 3. 画面構成

### 3.1 メインウィンドウ
```
┌──────────────────────────────────────┐
│ [+ Section] [+ Snippet]        [⚙]   │ ← 上部バー
├──────────────────────────────────────┤
│ ▼ Git                          ⋯    │ ← Section ヘッダー
│   ┌──────────────────────────────┐  │
│   │ git status        Plain ▼  │  │ ← Snippet
│   │                     [Copy] ⋯│  │
│   └──────────────────────────────┘  │
│                                      │
│ ▼ Docker                       ⋯    │
│   ┌──────────────────────────────┐  │
│   │ docker compose up -d  Bash▼ │  │
│   │                     [Copy] ⋯│  │
│   └──────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 3.2 上部バー
3ボタンのみ:
- `[+ Section]` — 新規Section追加
- `[+ Snippet]` — 新規Snippet追加(現在開いているSection、なければ最初のSectionに追加)
- `[⚙ Settings]` — 設定画面を開く

### 3.3 Section
- 折りたたみ可能(ヘッダークリックで開閉)
- ドラッグで並び替え可能(Pro機能、無料版は追加順固定)
- 右側に `⋯` メニュー:
  - `Rename` — インライン編集
  - `Delete` — 確認ダイアログ表示後に削除

### 3.4 Snippet
- コードブロック表示(等幅フォント、自動高さ調整)
- 言語ドロップダウン(右上): `Plain ▼` `Bash ▼` など
- 右側に `[Copy]` ボタンと `⋯` メニュー
- `⋯` メニュー:
  - `Pin` — ピン留め(Section内の上部に固定)
  - `Delete` — 削除(Undo Toast 5秒表示)
- クリックで即編集モード(分離なし)
- `Enter` で改行 / `Tab` でインデント / プレーンテキストのみ
- 保存タイミング: blur時
- ドラッグで並び替え可能(Pro機能)
- Section間移動も可能(Pro機能)

### 3.5 初回起動時の状態
プリセットとして以下4 Section / 4 Snippet を投入:

| Section | Snippet | 言語 |
|---|---|---|
| Git | `git status` | Bash |
| Node | `npm run dev` | Bash |
| Docker | `docker compose up -d` | Bash |
| AI | `Please review this code and explain potential bugs.` | Plain |

画面上部に1回だけ表示するヒント:
> `Ctrl + Shift + Space` でいつでも開けます

### 3.6 空状態(0件時)
- Section が0件: プレースホルダー「`+ Section` で追加」を中央表示
- Section内 Snippet が0件: 「`+ Snippet` で追加」表示

---

## 4. Copy 仕様

- `[Copy]` ボタン押下でクリップボードへコピー
- 改行を含むコマンドは1コマンドとして全文コピー
- 編集中(blur前)に Copy 押下 → 編集中の内容をコピー
- Toast 表示「✔ Copied」(1.5秒)
- Settings:
  - 「Copy後閉じる」ON → Toast表示せず即閉じる
  - 「Copy後閉じる」OFF → Toast表示、ウィンドウは開いたまま

---

## 5. シンタックスハイライト

- ライブラリ: **highlight.js**(必要言語のみインポート)
- 対応言語: **Plain / Bash / PowerShell / JSON / YAML / SQL / JavaScript / Python**
- デフォルト言語: **Plain**
- Snippetごとに手動指定(右上ドロップダウン)
- 重いエディタ(Monaco等)は使用しない

---

## 6. データ保存

### 6.1 保存場所
`%APPDATA%\SnippetLauncher\data.json`

### 6.2 バックアップ
- 保存時に直前データを `data.json.bak` に退避(1世代のみ)

### 6.3 データ構造
```json
{
  "version": 1,
  "settings": {
    "hotkey": "Ctrl+Shift+Space",
    "closeAfterCopy": false,
    "autoStart": false,
    "language": "ja",
    "windowWidth": 480,
    "windowHeight": 600
  },
  "sections": [
    {
      "id": "uuid",
      "name": "Git",
      "collapsed": false,
      "order": 0,
      "snippets": [
        {
          "id": "uuid",
          "content": "git status",
          "language": "bash",
          "pinned": false,
          "order": 0
        }
      ]
    }
  ]
}
```

---

## 7. Undo

- 削除操作のみUndo対応
- Toast に「Undo」ボタン表示、**5秒間有効**
- **直近1回のみ**(新しい削除があれば前のUndoは破棄)
- Snippet / Section どちらの削除にも対応

---

## 8. Pro / Free 制限

### 8.1 制限値
| 項目 | Free | Pro |
|---|---|---|
| Section数 | 5 | 無制限 |
| Snippet数 | 20 | 無制限 |
| 並び替え(ドラッグ) | 不可 | 可能 |
| シンタックスハイライト | 可能 | 可能 |
| Export / Import | 不可 | 可能 |

※ ハイライトは Free でも有効(機能差別化に使わない)

### 8.2 Pro判定
- **Microsoft Store ライセンス検証のみ**
- `Windows.Services.Store.StoreContext.GetAppLicenseAsync()` をRust側から呼び出し
- ライセンスキー方式は併用しない

### 8.3 Proモーダル
- トリガー: `+ Section` / `+ Snippet` ボタン押下時に制限超過していたら表示
- ボタン: `[Upgrade]` のみ
- 文言例:
  - EN: "Free version supports up to 20 snippets. Upgrade to Pro for unlimited."
  - JA: "Free版では20個まで保存できます。Proで無制限に。"

---

## 9. ホットキー

- デフォルト: `Ctrl+Shift+Space`
- Settings で変更可能
- グローバルホットキー: Tauri の `tauri-plugin-global-shortcut` を使用

---

## 10. デザイン

- ダークテーマベース
- Raycast / VSCode / Linear 系の洗練されたミニマル
- 半透明背景も検討可
- アニメーション最小限
- 余計な装飾なし
- 軽く見える印象を優先
- 別途 Claude Design で作成されたデザイン案に従う

---

## 11. 国際化(i18n)

- ライブラリ: i18next + react-i18next
- ファイル: `locales/ja.json` / `locales/en.json`
- OS言語自動判定 → Settings で手動切替可能
- 翻訳対象: UIラベル / Toast / モーダル / 確認ダイアログ / 空状態
- 翻訳しない: サンプルSnippet本文、Section名(Git/Node/Docker/AI)、言語名

---

## 12. Settings 画面

設定項目:
- ホットキー(変更可能)
- Copy後に閉じる(ON/OFF)
- Windows起動時に自動起動(ON/OFF)
- 言語(日本語 / English)
- テーマ(ダークのみ、将来拡張用)
- データのエクスポート / インポート(Pro機能)
- アプリ情報・バージョン
- Pro ステータス表示

---

## 13. 不要な機能(スコープ外)

- コマンド実行
- クラウド同期
- ログイン
- AI生成
- チーム共有
- 検索
- タグ
- フォルダ階層
- 複数画面
- Markdown 表示

---

## 14. パフォーマンス目標

- 起動時間: 0.2秒以内(ホットキー押下から表示まで)
- メモリ使用量: 100MB以下(常駐時)
- バイナリサイズ: 20MB以下

---

## 15. プロジェクト構成

```
snippet-launcher/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── tray.rs         # トレイ常駐
│   │   ├── hotkey.rs       # グローバルホットキー
│   │   ├── window.rs       # ウィンドウ制御(マウス位置/フォーカスロスト)
│   │   ├── storage.rs      # JSONファイル読み書き + bak
│   │   ├── license.rs      # Microsoft Store ライセンス検証
│   │   └── commands.rs     # Tauri commands
│   ├── tauri.conf.json
│   └── Cargo.toml
├── src/                    # React frontend
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── Section.tsx
│   │   ├── Snippet.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── ProModal.tsx
│   │   └── Toast.tsx
│   ├── hooks/
│   │   ├── useStorage.ts
│   │   ├── useHotkey.ts
│   │   └── useLicense.ts
│   ├── locales/
│   │   ├── ja.json
│   │   └── en.json
│   ├── lib/
│   │   ├── highlight.ts    # highlight.js 設定
│   │   └── i18n.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── README.md
```

---

## 16. 実装順序(推奨)

1. **Tauriプロジェクト初期化** + トレイ常駐 + タスクバー非表示
2. **グローバルホットキー** + マウス位置でウィンドウ表示 + フォーカスロスト処理
3. **JSONストレージ**(読み書き + bak)
4. **メイン画面UI**(Section / Snippet 表示)
5. **Snippet編集 + Copy機能**
6. **追加 / 削除 / Undo**
7. **シンタックスハイライト**
8. **Settings画面**
9. **i18n 対応**
10. **ドラッグ並び替え**(Pro機能)
11. **Pro ライセンス検証**(Microsoft Store連携)
12. **Pro モーダル + 制限処理**
13. **Export / Import**(Pro機能)
14. **サンプルデータ投入 + 初回ヒント表示**
15. **MSIXパッケージング + Microsoft Store提出準備**

---

## 17. テスト観点(最低限)

- ホットキー押下 → 0.2秒以内に表示されるか
- フォーカスロストで閉じるか(Settings時は閉じないか)
- 編集中の Copy が編集内容を反映するか
- 改行を含むコマンドが正しくコピーされるか
- データ保存時に .bak が作られるか
- 5秒以内のUndoが効くか
- Free制限超過時にProモーダルが出るか
- マルチモニター環境でマウス位置に正しく出るか
- 言語切替が反映されるか
