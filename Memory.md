# Memory — プロジェクト引き継ぎドキュメント

最終更新: 2026-05-09

---

## プロジェクト概要

トンネル工事現場向けの**システム障害・現場案件の記録・管理 Web アプリ**。  
ゼネコン・現場単位で発生した障害と対応履歴をスレッド形式で記録し、フリーワード検索で過去案件を検索できる。

- リポジトリ: `https://github.com/take1116livefreely-web/vercel-test.git`
- ローカルパス: `c:\work\Codex\TroubleShooting\vercel-test`
- デプロイ: GitHub `main` → Vercel 自動デプロイ

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| AI | Anthropic Claude（Haiku 4.5） |

---

## フォルダ構成

```
vercel-test/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── page.tsx              # 案件一覧
│   │   │   ├── incidents/[id]/       # 案件詳細・対応履歴・AI診断
│   │   │   ├── incidents/new/        # 新規案件登録
│   │   │   ├── contacts/             # 連絡先一覧
│   │   │   ├── documents/            # 共有書類（AI学習候補）
│   │   │   └── admin/
│   │   │       ├── users/            # ユーザー管理
│   │   │       ├── categories/       # カテゴリ管理
│   │   │       └── stats/            # 統計・AI使用量（developer限定）
│   │   └── api/
│   │       ├── incidents/[id]/
│   │       │   ├── ai-diagnosis/     # AI診断（trouble限定・developer限定）
│   │       │   └── favorite/         # お気に入りトグル
│   │       ├── admin/                # ユーザー・カテゴリ管理API
│   │       └── shared-documents/     # 共有書類API
│   ├── components/
│   │   ├── FavoriteButton.tsx        # お気に入りボタン（新規追加）
│   │   ├── Pagination.tsx
│   │   └── SimpleNav.tsx
│   └── lib/
│       ├── mailer.ts                 # Brevo SMTP 招待メール
│       └── supabase/
├── supabase/
│   └── schema.sql                    # DB定義（最新コミットで大幅更新済み）
├── data/                             # CSVインポートデータ（git管理外）
├── docs/                             # 画面アセット等（git管理外）
├── scripts/                          # CSVインポート用スクリプト（git管理外）
├── CLAUDE.md
└── Memory.md                         # ← このファイル
```

---

## 必要な環境変数

`.env.local`（ローカル）および Vercel プロジェクト Settings → Environment Variables に設定：

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーサイドのみ（admin操作用） |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo SMTPログイン |
| `SMTP_PASS` | Brevo SMTPキー |
| `SMTP_FROM` | 送信元メールアドレス |
| `ANTHROPIC_API_KEY` | AI診断機能（Claude Haiku 4.5） |

---

## 現在の状態（2026-05-09）

### 最新コミット
`977a8a5 docs: CLAUDE.md を現行仕様に同期`

### 直近の主な変更（GitHub から取得済み）
- `short_id` とお気に入り機能を追加（`FavoriteButton.tsx`）
- AI診断を `trouble` 限定・ボタン二重押し防止・エラーハンドリング追加
- AI診断ログ保存の Vercel 関数終了タイミング問題を修正（`waitUntil` 対応）
- `supabase/schema.sql` を大幅更新（Codex指摘対応）

### ローカルのみのファイル（git untracked）
- `CLAUDE_CODE_HANDOFF_2026-05-06.md` — Codex から Claude Code への申し送り書
- `data/` — CSVインポートデータ（incidents / responses の過去データ）
- `docs/` — 画面アセット等
- `scripts/` — CSV インポート用 PowerShell スクリプト

---

## 完了済み作業

- ✅ 案件一覧・詳細・新規登録・対応履歴スレッド
- ✅ ステータス管理（open / in_progress / closed）・解決内容モーダル
- ✅ フリーワード検索（スペース区切り AND、pg_trgm インデックス）
- ✅ 連絡先一覧（電話番号名寄せ）
- ✅ 電話番号自動入力（ゼネコン+現場+担当者で照合）
- ✅ ユーザー管理（招待フォーム・Brevo SMTP メール送信）
- ✅ カテゴリ・システム名マスタ管理
- ✅ ページネーション（20件/ページ）
- ✅ 編集・削除の権限制御（作成者本人 / admin / developer）
- ✅ 共有書類ページ（`/documents`、`ai_training` ON/OFF フラグ）
- ✅ AI診断機能（`/api/incidents/[id]/ai-diagnosis`、trouble限定、developer限定）
- ✅ 統計ページ（`/admin/stats`、AI使用量ログ）
- ✅ `short_id` とお気に入り機能
- ✅ supabase/schema.sql を現行コードと同期

---

## 残タスク・既知の課題

### 高優先度
- 【完了 2026-05-09】**同ジャンル・同システムの解決済み事例を診断プロンプトに追加** — `ai-diagnosis/route.ts` で category + device で絞った closed 案件（resolution あり）を最大3件取得し Few-shot として差し込む実装を追加
- 【未着手】**AI学習データ（共有書類）の診断への活用** — `ai_training` フラグはあるが診断プロンプトに未使用。  
  PDFテキスト抽出・チャンク保存・system/category絞り込みのRAG設計が必要
- 【未着手】**プロンプトキャッシュ効果の検証** — 現在の `SYSTEM_PROMPT` が 4096 tokens 未満のためキャッシュ不効。  
  長い静的コンテキスト（診断フォーマット、設備マニュアル要約等）を追加するか、キャッシュ指定を外す

### 中優先度
- 【未着手】`ai_usage_logs` に `cache_creation_input_tokens` / `cache_read_input_tokens` を追加保存  
  （現在は input/output tokens のみ）
- 【未着手】統計画面の単価計算をキャッシュ有無に対応させる
- 【未着手】CLAUDE.md に `/documents`・`/admin/stats`・AI診断API・`ANTHROPIC_API_KEY`・お気に入り機能を追記

### 低優先度
- 【未着手】`incident_type` の AI 診断制限（現在 developer なら `other` でも診断可能）
- 【未着手】AI 診断の出力フォーマット固定化・`max_tokens` 調整（現在 1200 → 512-700 推奨）

---

## よく使うコマンド

```bash
npm run dev      # 開発サーバー起動（http://localhost:3000）
npm run build    # ビルド確認
npm run lint     # ESLint
git push origin main  # Vercel 自動デプロイトリガー
```
