# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

社内の現場対応管理・記録 Web アプリケーション。
ゼネコン・現場単位で発生した問題と対応履歴をスレッド形式で記録し、ハッシュタグによる AND 検索で素早く検索できる。

**デプロイ**: GitHub → Vercel（自動デプロイ）

## Tech Stack

| レイヤー | 技術 |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth（招待制・メール＋パスワード） |
| Hosting | Vercel |

## Development Commands

### Setup

```bash
npm install
cp .env.local.example .env.local
# .env.local に Supabase の URL と ANON_KEY を設定する
```

### Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm test -- path/to/test.spec.ts
```

### Lint / Format

```bash
npm run lint
npm run format
```

## Architecture

### データモデル

```
users（ユーザー）
  id (= auth.users.id), name, role (admin | member), created_at

incidents（案件）
  id, title, general_contractor, site_name, created_by (→ users.id), created_at, tags[]

responses（対応履歴）
  id, incident_id (→ incidents.id), content, responder (→ users.id), created_at, tags[]
```

- `incidents` が親。1件の問題に対して複数の `responses` がスレッド形式でぶら下がる（Gmailのスレッド返信と同じ構造）。
- `tags` は PostgreSQL の `text[]` 型。`#清水` `#モバイル` のようなハッシュタグを配列で保持する。

### ハッシュタグ検索

- 入力文字列から `#ワード` を抽出し、配列に変換する。
- Supabase の `@>` 演算子（配列の包含）を使って AND 検索を実現する。
  - 例: `tags @> ARRAY['清水','モバイル','通信不良']`
- `incidents.tags` と `responses.tags` の両方を対象に検索する。

### 認証・ユーザー管理（招待制）

- ユーザーの自己登録は無効化する（Supabase ダッシュボードで `Enable Email Signup` をオフ）。
- 管理者が `/admin/users` の招待フォームで **名前・メールアドレス・仮パスワード・ロール** を一括入力して登録する（1ステップ）。
  - `inviteUserByEmail` でアカウントを作成し、即座に `updateUserById` でパスワードと `email_confirm: true` を設定する。
  - ユーザーはメール内のリンクを踏まなくてもそのまま仮パスワードでログインできる。
- ユーザー削除は `/api/admin/delete-user` (POST) 経由で `supabase.auth.admin.deleteUser` を呼び出す。`auth.users` と連動して `users` テーブルの行も削除される（CASCADE）。
  - 自分自身は削除不可（APIとUIの両方で制限）。
  - 削除は取り消し不可。
- `users` テーブルに `role` カラム（`admin` / `member`）を持ち、Row Level Security (RLS) で管理者機能を制限する。

### 画面構成

```
/login             ログイン（未認証時のみアクセス可）
/                  トップ（案件一覧 + 検索バー）
/incidents/new     新規案件登録
/incidents/[id]    案件詳細 + 対応履歴スレッド
/admin/users       ユーザー招待・管理（admin ロールのみ）
```

### 検索フロー

1. 検索バーに `#清水 #モバイル #通信不良` と入力
2. クライアント側でハッシュタグをパースして配列化
3. Supabase RPC または `filter` で `tags @> ARRAY[...]` クエリを発行
4. 案件一覧をリアルタイムに絞り込み表示

## 招待フロー（認証コールバック）

### フロー概要

```
1. 管理者が /admin/users から招待メール送信
2. Supabase が招待メールを送付
3. ユーザーがリンクをクリック → Supabase がトークンを検証
4. /auth/callback へリダイレクト（クライアントページ）
5. トークン形式に応じてセッション確立
6. /auth/update-password へ遷移
7. パスワード設定 → / へ遷移
```

### コールバックのトークン形式

`src/app/auth/callback/page.tsx` はクライアントコンポーネントで以下3形式に対応する。

| 形式 | パラメータ | 処理 |
|---|---|---|
| ハッシュフラグメント（招待メール） | `#access_token=xxx&refresh_token=xxx` | `supabase.auth.setSession()` |
| token_hash | `?token_hash=xxx&type=invite` | `supabase.auth.verifyOtp()` |
| PKCE code | `?code=xxx` | `supabase.auth.exchangeCodeForSession()` |

- Route Handler（サーバー）はハッシュフラグメントを受け取れないため、コールバックはクライアントページとして実装している。

### Supabase 設定（必須）

- **Authentication → URL Configuration → Redirect URLs**: `https://*.vercel.app/auth/callback` を追加
- **Authentication → URL Configuration → Site URL**: 本番の Vercel URL を設定
- **Authentication → Settings → SMTP**: Resend などのカスタム SMTP を設定（Free プランはデフォルトで 2通/時 の制限あり）

### 招待メール（ログイン情報の自動送信）

招待時に nodemailer + Brevo SMTP を使って、ログイン情報を記載したカスタムメールを送信する。

**メール本文に含まれる情報：**
- ログイン URL（`/login`）
- メールアドレス
- 管理者が設定した仮パスワード

**実装ファイル：** `src/lib/mailer.ts`（`sendInviteEmail` 関数）

**フロー：**
1. `inviteUserByEmail` でアカウント作成（Supabase デフォルト招待メールも届くが無視してよい）
2. `updateUserById` でパスワード設定 + メール確認済みにする
3. `sendInviteEmail` でログイン情報メールを送信
4. メール送信が失敗してもアカウント作成自体は成功扱い（ログにエラーのみ記録）

**必要な環境変数（`.env.local` および Vercel プロジェクト Settings → Environment Variables）：**

| 変数名 | 値 |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo の SMTP ログイン（メールアドレス） |
| `SMTP_PASS` | Brevo の SMTP キー |
| `SMTP_FROM` | 送信元メールアドレス |

> **Vercel での設定場所：** チーム全体の Environment Variables ではなく、プロジェクト（vercel-test）を選択 → Settings → Environment Variables に追加する。

### 招待 API の注意点

`src/app/api/admin/invite/route.ts` の `redirectTo` は `new URL(request.url).origin` から動的生成する。環境変数（`NEXT_PUBLIC_SITE_URL`）には依存しない。

### middleware の公開パス

`src/middleware.ts` で以下は未認証でもアクセス可能にしている。

```
/login
/auth/callback
/auth/update-password
```

### 編集・削除の権限ルール

| 操作 | 投稿者本人 | 管理者 | 他のメンバー |
|---|---|---|---|
| 案件（incident）編集 | ○ | ○ | × |
| 案件（incident）削除 | ○ | ○ | × |
| 対応履歴（response）編集 | ○ | ○ | × |
| 対応履歴（response）削除 | ○ | ○ | × |

- 案件を削除すると、紐付く対応履歴もすべて CASCADE 削除される。
- 権限チェックは API ルート側（サーバー）で行う。UI のボタン表示はあくまで UX 補助。
- 案件の編集・削除ボタンは `IncidentActions` クライアントコンポーネントが担う（`canEdit` prop で制御）。
- 対応履歴の編集・削除ボタンは `ResponseList` クライアントコンポーネントが担う（`isAdmin || responder_id === currentUserId` で制御）。

#### 関連ファイル

| ファイル | 役割 |
|---|---|
| `src/app/api/incidents/[id]/route.ts` | PATCH（編集）/ DELETE（削除）エンドポイント |
| `src/app/api/responses/[id]/route.ts` | PATCH（編集）/ DELETE（削除）エンドポイント |
| `src/app/(app)/incidents/[id]/IncidentActions.tsx` | 案件ヘッダー + インライン編集フォーム（クライアント） |
| `src/app/(app)/incidents/[id]/ResponseList.tsx` | 対応履歴一覧 + インライン編集フォーム（クライアント） |

## Key Conventions

- ハッシュタグは入力・保存時に `#` を除いたワードのみを配列に保存する（表示時に `#` を付ける）。
- ゼネコン名・現場名は `incidents` のカラムとして持ちつつ、タグ配列にも自動で追加して検索対象にする。
- Vercel の環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみで使用し、クライアントには露出させない。
- TypeScript のビルドエラーは `next.config.js` の `ignoreBuildErrors: true` で回避している（Supabase v2.49 の型問題）。ESLint も同様に `ignoreDuringBuilds: true`。
