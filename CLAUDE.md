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

## 変更履歴

### 2026-04-29

#### 1. ユーザー管理画面の表示順改善

`src/app/(app)/admin/users/page.tsx` にて、ユーザー一覧を取得後に **管理者（admin）をメンバー（member）より上位に表示** するソートを追加。

```typescript
const users = (usersResult.data as AppUser[] | null)?.sort((a, b) => {
  if (a.role === b.role) return 0
  return a.role === 'admin' ? -1 : 1
})
```

#### 2. 案件一覧の検索ボタン追加

`src/app/(app)/page.tsx` の検索バー右側に **「検索」ボタン** を追加。
スマートフォンなどからも検索を実行しやすくなった。

```tsx
<div className="flex gap-2">
  <input type="text" name="q" ... className="flex-1 ..." />
  <button type="submit" className="bg-blue-600 ... px-4 py-2 rounded-lg whitespace-nowrap">検索</button>
</div>
```

#### 3. 一括ユーザー登録スクリプトの作成

管理画面のフォームを使わずに、CSV（Excelから変換）をもとに複数ユーザーを一括登録するための Node.js スクリプトを作成。

| ファイル | 用途 |
|---|---|
| `scripts/bulk-invite.js` | テスト用スクリプト（1名のみ） |
| `scripts/bulk-invite-production.js` | 本番用スクリプト（38名） |

**動作フロー（1ユーザーあたり）：**
1. `admin.auth.admin.inviteUserByEmail` でアカウント作成
2. `admin.auth.admin.updateUserById` でパスワード設定 + メール確認済みにする
3. `admin.from('users').upsert` で `users` テーブルに名前・ロールを登録
4. nodemailer + Brevo SMTP でログイン情報メールを送信
5. 各ユーザー間に 1.5 秒のディレイ（レート制限対策）

**実行方法：**

```bash
cd C:\WorkSpace\ClaudeCode\vercel-test
node scripts/bulk-invite-production.js
```

- `.env.local` から Supabase・SMTP の認証情報を自動読み込み
- `NEXT_PUBLIC_SUPABASE_URL`・`SUPABASE_SERVICE_ROLE_KEY`・SMTP 関連の環境変数が必要
- スクリプトは Vercel にデプロイされないローカル専用ツール

### 2026-04-30

#### 1. ページネーション実装

案件一覧（`/`）に 20件/ページのページネーションを追加。

**仕様：**
- 1ページ 20件、登録日の新しい順（固定）
- URL クエリパラメータで状態管理（例：`/?page=2&q=#清水`）
- 検索すると自動的に page=1 に戻る
- 1ページのみの場合はナビを非表示

**追加コンポーネント：**

| ファイル | 役割 |
|---|---|
| `src/components/SimpleNav.tsx` | 検索ヒント右の「← 前へ」「次へ →」のみのシンプルナビ |
| `src/components/Pagination.tsx` | 一覧下部の「← 前へ  1 2 [3] … 12  次へ →」ナビ |

**ページ番号の省略ルール（Pagination）：**
- 総ページ ≦ 7：全ページ番号を表示
- 総ページ ＞ 7：現在ページの前後2つ＋先頭・末尾を表示し、間を「…」で省略

**表示情報：**
- 案件一覧上部に「全 237 件（12 ページ）」を表示
- 検索時は「`#清水` の検索結果：43 件（3 ページ）」形式

**Supabase クエリ：**
```typescript
// 総件数取得
const { count } = await supabase
  .from('incidents')
  .select('*', { count: 'exact', head: true })

// ページ分割取得
const { data } = await supabase
  .from('incidents')
  .select('...')
  .range(from, to)  // from = (page-1)*20, to = from+19
```

#### 2. 案件・対応履歴の編集・削除機能追加

投稿者本人と管理者が自分の投稿を編集・削除できるようになった。

**追加ファイル：**
- `src/app/api/incidents/[id]/route.ts` — PATCH（編集）/ DELETE（削除）エンドポイント
- `src/app/(app)/incidents/[id]/IncidentActions.tsx` — 案件ヘッダー + インライン編集フォーム（クライアント）

**更新ファイル：**
- `src/app/api/responses/[id]/route.ts` — PATCH（編集）を追加（DELETE は既存）
- `src/app/(app)/incidents/[id]/ResponseList.tsx` — インライン編集フォームを追加
- `src/app/(app)/incidents/[id]/page.tsx` — 案件ヘッダー部分を `IncidentActions` コンポーネントに切り出し

権限ルール：投稿者本人と管理者のみ編集・削除可能。案件削除時は紐付く対応履歴も CASCADE 削除。

#### 2. 招待メールにパスワードを記載

これまでの招待メール（Supabase デフォルト）にはパスワードが含まれておらず、招待されたユーザーがログインできない問題があった。

**対応：** nodemailer + Brevo SMTP を使い、アカウント作成後に独自のログイン情報メールを送信するよう変更。

- **追加ファイル：** `src/lib/mailer.ts`（`sendInviteEmail` 関数）
- **更新ファイル：** `src/app/api/admin/invite/route.ts`（`sendInviteEmail` 呼び出しを追加）
- **必要な環境変数：** `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`
- Vercel への環境変数追加場所：プロジェクト（vercel-test）→ Settings → Environment Variables（チーム全体の設定ではない）

### 2026-05-01

#### 1. 案件に現場担当者・電話番号フィールドを追加

**要 Supabase migration（未実施の場合は SQL Editor で実行）：**
```sql
ALTER TABLE incidents
  ADD COLUMN site_contact text,
  ADD COLUMN phone_number text;
```

- 両フィールドとも任意入力（NULL 許容）
- 新規登録フォーム・編集フォームに追加
- 現場担当者の入力欄右に「様」を固定表示
- 電話番号ラベルに「（ハイフンなしで入力してください）」と表示
- 案件詳細では値がある場合のみ「田中太郎 様」「09012345678」の形式で表示

**変更ファイル：**

| ファイル | 変更内容 |
|---|---|
| `src/lib/supabase/types.ts` | `site_contact`, `phone_number` を型定義に追加 |
| `src/app/(app)/incidents/new/page.tsx` | 登録フォームにフィールド追加 |
| `src/app/(app)/incidents/[id]/IncidentActions.tsx` | 表示・編集フォームにフィールド追加 |
| `src/app/(app)/incidents/[id]/page.tsx` | 新フィールドを IncidentActions に渡す |
| `src/app/api/incidents/[id]/route.ts` | PATCH で新フィールドを更新対象に追加 |

#### 2. 連絡先一覧ページを追加

`/contacts` で、登録された案件から現場担当者・電話番号を集約して一覧表示。

**仕様：**
- ゼネコン名・現場名・担当者名でのスペース区切り AND 検索
- 検索バーのプレースホルダー：`例）大林　新笹子　中村`
- 重複除外条件：同じ「現場名・電話番号・苗字（スペース前の部分）」の組み合わせのみ
- 電話番号は `tel:` リンク（スマホからタップ発信）
- 全ユーザーに表示（管理者限定ではない）
- ナビバーに「連絡先」リンクを追加

**追加ファイル：**

| ファイル | 役割 |
|---|---|
| `src/app/(app)/contacts/page.tsx` | サーバーコンポーネント（データ取得） |
| `src/app/(app)/contacts/ContactsClient.tsx` | クライアントコンポーネント（検索・表示） |

**更新ファイル：**
- `src/components/Navbar.tsx` — 「連絡先」リンクを追加

#### 3. スマホ表示のレイアウト崩れ修正

- 電話番号ラベルを「電話番号（ハイフンなし）」に短縮
- 現場担当者・電話番号の行をモバイルで縦積み、PC幅（sm以上）で横並びに変更（`grid-cols-1 sm:grid-cols-2`）
- 対象ファイル：`src/app/(app)/incidents/new/page.tsx`、`src/app/(app)/incidents/[id]/IncidentActions.tsx`

---

## Key Conventions

- ハッシュタグは入力・保存時に `#` を除いたワードのみを配列に保存する（表示時に `#` を付ける）。
- ゼネコン名・現場名は `incidents` のカラムとして持ちつつ、タグ配列にも自動で追加して検索対象にする。
- Vercel の環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみで使用し、クライアントには露出させない。
- TypeScript のビルドエラーは `next.config.js` の `ignoreBuildErrors: true` で回避している（Supabase v2.49 の型問題）。ESLint も同様に `ignoreDuringBuilds: true`。
