-- =============================================
-- 現場対応管理アプリ Supabase スキーマ（現行 DB 構造）
-- 最終更新: 2026-05-06
-- Supabase ダッシュボードの SQL Editor で実行する
-- =============================================

-- =============================================
-- 拡張機能
-- =============================================
create extension if not exists pg_trgm;

-- =============================================
-- マスタテーブル
-- =============================================

-- ユーザーテーブル（auth.users と連動）
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'developer')),
  created_at timestamptz not null default now()
);

-- ジャンルマスタ（admin / developer のみ追加・削除）
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- システム名マスタ（categories に紐付け）
create table public.systems (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(category_id, name)
);

-- 連絡先マスタ（incidents から独立、全ユーザー編集・削除可能）
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  general_contractor text not null,
  site_name text not null,
  site_contact text not null,
  phone_number text,
  updated_at timestamptz not null default now(),
  unique(general_contractor, site_name, site_contact)
);

-- =============================================
-- メインテーブル
-- =============================================

-- 案件テーブル
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  general_contractor text not null,
  site_name text not null,
  site_contact text,
  phone_number text,
  content text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  incident_type text not null default 'trouble' check (incident_type in ('trouble', 'other')),
  category text,
  device text,
  resolution text,
  created_by uuid references public.users(id) on delete set null,
  closed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- フリーワード検索用 GIN インデックス（pg_trgm）
create index incidents_title_trgm_idx        on public.incidents using gin (title            gin_trgm_ops);
create index incidents_contractor_trgm_idx   on public.incidents using gin (general_contractor gin_trgm_ops);
create index incidents_site_name_trgm_idx    on public.incidents using gin (site_name         gin_trgm_ops);
create index incidents_content_trgm_idx      on public.incidents using gin (content           gin_trgm_ops);
create index incidents_site_contact_trgm_idx on public.incidents using gin (site_contact      gin_trgm_ops);

-- 対応履歴テーブル（追記のみ、更新・削除なし）
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  responder_id uuid references public.users(id) on delete set null,
  content text not null,
  action_type text,
  result_type text,
  created_at timestamptz not null default now()
);

create index responses_incident_id_idx on public.responses(incident_id);

-- 添付ファイルテーブル
-- response_id が NULL の場合は案件直接添付、非 NULL の場合は対応履歴添付
create table public.incident_files (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  response_id uuid references public.responses(id) on delete cascade,
  storage_path text not null,
  name text not null,
  mime_type text not null,
  size int not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index incident_files_incident_id_idx on public.incident_files(incident_id);

-- 共有書類テーブル（PDF 書類共有）
-- Storage bucket: shared-documents（private）
create table public.shared_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null,
  size int not null,
  system_id uuid references public.systems(id) on delete set null,
  uploaded_by uuid references public.users(id) on delete set null,
  ai_training boolean not null default false,
  created_at timestamptz not null default now()
);

-- AI 診断トークン使用ログ
create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  used_by uuid references public.users(id) on delete set null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.users           enable row level security;
alter table public.categories      enable row level security;
alter table public.systems         enable row level security;
alter table public.contacts        enable row level security;
alter table public.incidents       enable row level security;
alter table public.responses       enable row level security;
alter table public.incident_files  enable row level security;
alter table public.shared_documents enable row level security;
alter table public.ai_usage_logs   enable row level security;

-- users: ログインユーザーは全員閲覧可、自分のレコードのみ更新可
create policy "users: read all"  on public.users for select using (auth.uid() is not null);
create policy "users: update own" on public.users for update using (auth.uid() = id);

-- categories / systems: ログインユーザー全員閲覧可（書き込みは admin client 経由）
create policy "categories: read all" on public.categories for select using (auth.uid() is not null);
create policy "systems: read all"    on public.systems    for select using (auth.uid() is not null);

-- contacts: ログインユーザー全員 CRUD 可
create policy "contacts: all"  on public.contacts for all using (auth.uid() is not null);

-- incidents: ログインユーザーは全件閲覧・登録可（更新・削除は admin client 経由）
create policy "incidents: read all" on public.incidents for select using (auth.uid() is not null);
create policy "incidents: insert"   on public.incidents for insert with check (auth.uid() is not null);

-- responses: ログインユーザーは全件閲覧・追記可
create policy "responses: read all" on public.responses for select using (auth.uid() is not null);
create policy "responses: insert"   on public.responses for insert with check (auth.uid() is not null);

-- incident_files: ログインユーザーは全件閲覧・追記可
create policy "incident_files: read all" on public.incident_files for select using (auth.uid() is not null);
create policy "incident_files: insert"   on public.incident_files for insert with check (auth.uid() is not null);

-- shared_documents: ログインユーザーは全件閲覧可（書き込みは admin client 経由）
create policy "shared_documents: read all" on public.shared_documents for select using (auth.uid() is not null);

-- ai_usage_logs: admin client のみ使用
-- （RLS ポリシーなし — admin client が全操作を担当）

-- =============================================
-- 招待後に users レコードを自動作成するトリガー
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

-- =============================================
-- 初期マスタデータ
-- =============================================

insert into public.categories (name, sort_order) values
  ('測量系システム',       1),
  ('誘導系システム',       2),
  ('点群系システム',       3),
  ('現場設備インフラ系',   4);

with c as (select id, name from public.categories)
insert into public.systems (category_id, name, sort_order)
select c.id, s.name, s.sort_order from (values
  ('測量系システム', 'Lite',             1),
  ('測量系システム', 'Ass1',             2),
  ('測量系システム', 'B型',              3),
  ('測量系システム', 'A計測',            4),
  ('測量系システム', 'DIST',             5),
  ('測量系システム', '切羽観察',         6),
  ('測量系システム', 'PF計測',           7),
  ('測量系システム', '地表面沈下',       8),
  ('測量系システム', '内空断面計測',     9),
  ('測量系システム', '支保検測',        10),
  ('測量系システム', '切羽面計測',      11),
  ('測量系システム', 'セントル計測',    12),
  ('測量系システム', '鉄筋位置出し',    13),
  ('測量系システム', 'TS / トランシット', 14),
  ('測量系システム', 'Tショットマーカー', 15),
  ('誘導系システム', 'ドリルナビ',            1),
  ('誘導系システム', 'エピロックジャンボ',    2),
  ('誘導系システム', 'フルオートジャンボ',    3),
  ('誘導系システム', '支保工誘導',            4),
  ('誘導系システム', '自由断面掘削機誘導',    5),
  ('誘導系システム', 'エレクター誘導',        6),
  ('点群系システム', '3D（三脚式）',    1),
  ('点群系システム', '車載3D',          2),
  ('点群系システム', 'LiDARシステム',   3),
  ('点群系システム', 'Tショットマーカー', 4),
  ('現場設備インフラ系', '警報ボックス',           1),
  ('現場設備インフラ系', '電話ボックス',           2),
  ('現場設備インフラ系', 'UPSボックス',            3),
  ('現場設備インフラ系', 'AP / 中継APボックス',    4),
  ('現場設備インフラ系', '交換機',                 5),
  ('現場設備インフラ系', '入坑管理システム',       6),
  ('現場設備インフラ系', '監視カメラ / 切羽カメラ', 7),
  ('現場設備インフラ系', '発破放送',               8),
  ('現場設備インフラ系', 'ガス検知システム',       9),
  ('現場設備インフラ系', '濁水監視システム',      10),
  ('現場設備インフラ系', '粉塵計測システム',      11),
  ('現場設備インフラ系', '渇水・水没監視システム', 12),
  ('現場設備インフラ系', '送風機制御システム',    13),
  ('現場設備インフラ系', '非常ボタン検知ツール',  14),
  ('現場設備インフラ系', '通信確認ツール',        15),
  ('現場設備インフラ系', '制御PC / サーバーPC',   16),
  ('現場設備インフラ系', 'ルーター / NW機器',     17),
  ('現場設備インフラ系', '衛星電話',              18),
  ('現場設備インフラ系', 'IP電話 / 外線',         19),
  ('現場設備インフラ系', 'スピーカー / NWスピーカー', 20),
  ('現場設備インフラ系', '発破LINE通知',          21),
  ('現場設備インフラ系', '重機近接システム',      22),
  ('現場設備インフラ系', '車両位置表示モニター',  23),
  ('現場設備インフラ系', 'バッテリーロコ',        24)
) as s(cat_name, name, sort_order)
join c on c.name = s.cat_name;
