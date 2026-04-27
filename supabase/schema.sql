-- =============================================
-- 現場対応管理アプリ Supabase スキーマ
-- Supabase ダッシュボードの SQL Editor で実行する
-- =============================================

-- ユーザーテーブル（auth.users と連動）
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- 案件テーブル
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  general_contractor text not null,
  site_name text not null,
  content text not null,
  created_by uuid references public.users(id) not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- タグ検索用 GIN インデックス
create index incidents_tags_idx on public.incidents using gin(tags);

-- 対応履歴テーブル（追記のみ、更新・削除なし）
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  content text not null,
  responder_id uuid references public.users(id) not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index responses_incident_id_idx on public.responses(incident_id);
create index responses_tags_idx on public.responses using gin(tags);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.users enable row level security;
alter table public.incidents enable row level security;
alter table public.responses enable row level security;

-- users: ログインユーザーは全員閲覧可、自分のレコードのみ更新可
create policy "users: read all" on public.users for select using (auth.uid() is not null);
create policy "users: update own" on public.users for update using (auth.uid() = id);

-- incidents: ログインユーザーは全件閲覧・登録可
create policy "incidents: read all" on public.incidents for select using (auth.uid() is not null);
create policy "incidents: insert" on public.incidents for insert with check (auth.uid() is not null);

-- responses: ログインユーザーは全件閲覧・追記可、削除・更新は不可
create policy "responses: read all" on public.responses for select using (auth.uid() is not null);
create policy "responses: insert" on public.responses for insert with check (auth.uid() is not null);

-- =============================================
-- 招待後に users レコードを自動作成するトリガー
-- （inviteUserByEmail で upsert するので補助的に用意）
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
