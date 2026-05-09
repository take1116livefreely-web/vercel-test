# CLAUDE.md

Claude Code がこのリポジトリで作業する際のガイドライン。

## セッション開始時のルール

- **必ず `Memory.md` を読み込み**、プロジェクトの状況・ルール・残タスクを把握してから作業を開始する
- 手順・ルール・状態に変更があった場合はその都度 `Memory.md` を更新する

## Memory.md の更新ルール

- **コードを改造・追加したら必ず `Memory.md` を更新する**（完了タスク・残タスク・技術情報を反映）
- **`git push` するときは必ず `Memory.md` も一緒にコミット・プッシュする**
  - 次のセッションが前回の状態からすぐ再開できるようにするため

## 作業ルール

### 確認不要（自動実行してよい操作）
- ファイル・フォルダの一覧表示
- 既存ファイルの読み取り
- 作業内容の調査・分析
- `git status` / `git log` / `git diff` / `git fetch`

### 確認必要（実行前に確認を求める操作）
- 新規ファイルの作成・既存ファイルの書き込み・上書き
- `git commit` / `git push`
- `npm install` などパッケージのインストール
- Supabase への DDL 実行・データ変更

## プロジェクト概要

トンネル工事現場向けのシステム障害・現場案件の記録・管理 Web アプリ。
ゼネコン・現場単位で発生した障害と対応履歴をスレッド形式で記録し、フリーワード検索で過去案件を検索できる。

**デプロイ**: GitHub → Vercel（main push で自動デプロイ）

## Tech Stack

| レイヤー | 技術 |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth（自己登録なし・メール＋パスワード） |
| Hosting | Vercel |

## Development Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## データモデル

```
users
  id (= auth.users.id), name, role (developer | admin | member), created_at

incidents（案件）
  id, short_id (VARCHAR(4), UNIQUE, NOT NULL), title,
  general_contractor, site_name, site_contact, phone_number,
  content, status ('open' | 'in_progress' | 'closed'),
  category, device, incident_type ('trouble' | 'other'),
  resolution (解決内容テキスト),
  created_by → users.id (ON DELETE SET NULL),
  closed_at, closed_by → users.id (ON DELETE SET NULL),
  created_at

responses（対応履歴）— 追記のみ、削除・更新不可
  id, incident_id → incidents.id, content,
  responder_id → users.id (ON DELETE SET NULL), created_at

incident_files（添付ファイル）
  id, incident_id, response_id (NULL可), storage_path, name, mime_type, size,
  uploaded_by → users.id (ON DELETE SET NULL), created_at

incident_favorites（お気に入り）
  user_id → auth.users.id (ON DELETE CASCADE),
  incident_id → incidents.id (ON DELETE CASCADE),
  created_at
  PRIMARY KEY (user_id, incident_id)

categories（ジャンルマスタ）
  id, name, sort_order, created_at

systems（システム名マスタ）
  id, category_id → categories.id (ON DELETE CASCADE), name, sort_order, created_at

contacts（連絡先名寄せ）
  id, general_contractor, site_name, site_contact, phone_number, created_at
  UNIQUE (general_contractor, site_name, site_contact)

ai_usage_logs（AI診断使用ログ）
  id, incident_id → incidents.id, used_by → users.id,
  model, input_tokens, output_tokens, created_at
```

- ユーザー削除時、created_by / closed_by / responder_id / uploaded_by は SET NULL（データは残る）
- incidents が親、responses・incident_files・incident_favorites は CASCADE 削除

## フリーワード検索

- 検索バーにスペース区切りでキーワードを入力 → AND 検索
- 検索対象: `title`, `general_contractor`, `site_name`, `content`, `site_contact`, `short_id`
- 各キーワードで `.or("title.ilike.%kw%,general_contractor.ilike.%kw%,...")` を重ねる
- pg_trgm GIN インデックスをこれら5カラムに設定済み（`supabase/schema.sql` 参照）

## 認証・ユーザー管理

- 自己登録は無効（Supabase ダッシュボードで `Enable Email Signup` をオフ）
- 管理者が `/admin/users` の招待フォームで **名前・メール・初期パスワード・ロール** を入力して登録
  - `createUser()` でアカウント作成（`inviteUserByEmail` は Supabase デフォルトメールが飛ぶため使用しない）
  - nodemailer + Brevo SMTP でログイン情報メールを送信（`src/lib/mailer.ts` の `sendInviteEmail`）
  - ユーザーはメールのリンクを踏まなくてもそのままパスワードでログイン可能
- ユーザー削除: `/api/admin/delete-user` (POST) で `auth.admin.deleteUser` を呼ぶ
  - 自分自身の削除は不可（API・UI 両方で制御）
  - 削除は取り消し不可

### 招待メール（Brevo SMTP）

必要な環境変数（`.env.local` および Vercel プロジェクト Settings → Environment Variables）:

| 変数名 | 値 |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo の SMTP ログイン（メールアドレス） |
| `SMTP_PASS` | Brevo の SMTP キー |
| `SMTP_FROM` | 送信元メールアドレス |

> Vercel での設定：チーム全体の Environment Variables ではなく、プロジェクト（vercel-test）を選択 → Settings → Environment Variables に追加する。

### AI診断（Anthropic API）

| 変数名 | 値 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic コンソールで発行した API キー |

## ロール体系

| ロール | 説明 |
|---|---|
| `developer` | 最上位。全 admin 権限 ＋ 管理者削除・developer アカウント作成・全ユーザー権限変更 |
| `admin` | ユーザー管理・カテゴリ管理・全案件編集削除。管理者同士の削除は不可 |
| `member` | 案件登録・自分の案件編集削除・対応履歴追記 |

## 画面構成

```
/login               未認証時のみアクセス可
/                    案件一覧 + フリーワード検索 + ステータス/種別/お気に入りタブ
/incidents/new       新規案件登録
/incidents/[id]      案件詳細 + 対応履歴スレッド
/contacts            連絡先一覧（案件から電話番号を名寄せ）
/admin/users         ユーザー管理（admin/developer のみ）
/admin/categories    ジャンル・システム名マスタ管理（admin/developer のみ）
```

## 案件フィールド詳細

- **status**: `open`（未対応） / `in_progress`（対応中） / `closed`（解決済み）
  - `closed` にすると `closed_at` と `closed_by` が自動記録。再 open すると NULL にクリア
- **incident_type**: `trouble`（トラブル） / `other`（その他）
  - AI 解析時に `trouble` のみを対象にするための分類
  - 案件カードに「その他」バッジ表示（`trouble` はデフォルトなので非表示）
- **category**: ジャンル（選択式・categories テーブル管理）
- **device**: システム名（選択式・systems テーブル管理）

## 電話番号の自動入力

新規案件登録時、ゼネコン名＋現場名＋現場担当者の3つが揃った時点（400ms デバウンス）で既存案件を照合。
一致する電話番号が **1種類だけ** の場合のみ自動反映。複数候補がある場合は何もしない。
`NewIncidentForm.tsx` の `useEffect` で実装。`phoneWasAutoFilledRef` で手動上書きを検知し再上書きしない。

## カテゴリマスタ管理

- `/admin/categories` ページ（admin/developer のみ）でジャンル・システム名を追加・削除
- API ルート: `POST /api/admin/categories`、`DELETE /api/admin/categories/[id]`、`POST /api/admin/systems`、`DELETE /api/admin/systems/[id]`
- 削除は CASCADE（ジャンル削除 → 配下システム名も削除）
- 書き込みは admin client 経由のため RLS ポリシーは read のみ

## 編集・削除の権限ルール

| 操作 | 作成者本人 | admin/developer | その他 |
|---|---|---|---|
| 案件 編集 | ✓ | ✓ | ✗ |
| 案件 削除 | ✓ | ✓ | ✗ |
| 対応履歴 編集 | ✓ | ✓ | ✗ |
| 対応履歴 削除 | ✓ | ✓ | ✗ |

- 権限チェックは API ルート（サーバーサイド）で行う
- 案件削除時は紐づく対応履歴・ファイルも CASCADE 削除

## ページネーション

- 20件/ページ、登録日の新しい順
- URL クエリパラメータで状態管理（例: `/?page=2&q=清水&status=open`）
- コンポーネント: `src/components/SimpleNav.tsx`（検索バー横）、`src/components/Pagination.tsx`（一覧下部）

## middleware の公開パス

`src/middleware.ts` で以下は未認証でもアクセス可能:

```
/login
/auth/callback
/auth/update-password
```

## 認証コールバック（/auth/callback）

`src/app/auth/callback/page.tsx` はクライアントコンポーネントで以下の形式に対応:

| 形式 | パラメータ | 処理 |
|---|---|---|
| ハッシュフラグメント（招待メール） | `#access_token=xxx&refresh_token=xxx` | `supabase.auth.setSession()` |
| token_hash | `?token_hash=xxx&type=invite` | `supabase.auth.verifyOtp()` |
| PKCE code | `?code=xxx` | `supabase.auth.exchangeCodeForSession()` |

## Supabase 設定（注意）

- **Authentication → URL Configuration → Redirect URLs**: `https://*.vercel.app/auth/callback` を追加
- **Authentication → URL Configuration → Site URL**: 本番の Vercel URL を設定
- `src/app/api/admin/invite/route.ts` の `redirectTo` は `new URL(request.url).origin` から動的生成（環境変数 `NEXT_PUBLIC_SITE_URL` には依存しない）

## AI診断機能

- `developer` ロールのみ、`incident_type === 'trouble'` の案件で利用可能
- `POST /api/incidents/[id]/ai-diagnosis` → Claude (claude-haiku-4-5) へストリーミングリクエスト
- `ANTHROPIC_API_KEY` が必要（Vercel 環境変数に設定）
- 入力: 案件タイトル・ゼネコン・現場・カテゴリ・システム名・内容・解決済み対応履歴
- 出力: ストリーミングテキスト（ReadableStream）
- 使用ログは事前推定値（入力トークン≈文字数/2、出力固定800）で `ai_usage_logs` テーブルに記録

## short_id

- 案件ごとに4桁英数字（0-9, A-Z）のユニーク ID を付与
- `NewIncidentForm.tsx` の `generateShortId()` でクライアント側生成、INSERT 失敗（23505 unique_violation）時は最大10回リトライ
- 案件一覧・詳細ページのタイトル横にバッジ表示
- フリーワード検索の対象（例: `A3B7` で検索可能）

## お気に入り機能

- 各ユーザーが案件をスター登録できる（`incident_favorites` テーブル）
- `POST /api/incidents/[id]/favorite` でトグル（あれば削除・なければ挿入）
- RLS ポリシー: `auth.uid() = user_id`（自分のお気に入りのみ操作可）
- 案件一覧の「★ お気に入り」ボタンでフィルタリング可能（`?fav=1`）
- `FavoriteButton` は楽観的 UI 更新（エラー時に元に戻す）

## Key Conventions

- タグシステムは廃止済み。`tags[]` カラムはコードで使用しない
- 検索はフリーワード ilike（スペース区切り AND）のみ
- ゼネコン名・現場名は `incidents` のカラムとして持つ（正規化なし）
- `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみ使用、クライアントに露出させない
- TypeScript のビルドエラーは `next.config.js` の `ignoreBuildErrors: true` で抑制（Supabase v2.49 の型問題）。ESLint も同様に `ignoreDuringBuilds: true`
