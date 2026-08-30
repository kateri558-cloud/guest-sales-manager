-- 「上期進捗」画面が読み書きするテーブル（monthly_performanceとは別テーブル）
-- 実行方法: SupabaseダッシュボードのSQL Editorに貼り付けて実行してください。

create table if not exists public.half_year_snapshots (
  id bigint generated always as identity primary key,
  -- スナップショット日。同じ日付は1件のみ（UNIQUE制約で重複登録を防ぎ、再保存は上書きになる）
  snapshot_date date not null unique,
  -- 期（西暦4桁、例: 2026）
  fiscal_year integer not null,
  -- 男性用 着数（モーニング・紋付・シャツ・小物）
  male_qty integer not null,
  -- 男性用 売上（円）
  male_sales bigint not null,
  -- 女性用 着数（フォーマルドレス・留袖・列席・小物）
  female_qty integer not null,
  -- 女性用 売上（円）
  female_sales bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.half_year_snapshots is '参列売上管理: 上期進捗スナップショット';
comment on column public.half_year_snapshots.snapshot_date is 'スナップショット日（月末など）';
comment on column public.half_year_snapshots.fiscal_year is '期（西暦4桁、例: 2026）';
comment on column public.half_year_snapshots.male_qty is '男性用 着数（モーニング・紋付・シャツ・小物）';
comment on column public.half_year_snapshots.male_sales is '男性用 売上（円）';
comment on column public.half_year_snapshots.female_qty is '女性用 着数（フォーマルドレス・留袖・列席・小物）';
comment on column public.half_year_snapshots.female_sales is '女性用 売上（円）';

-- updated_at を更新のたびに自動更新する
create or replace function public.set_half_year_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists half_year_snapshots_set_updated_at on public.half_year_snapshots;

create trigger half_year_snapshots_set_updated_at
before update on public.half_year_snapshots
for each row
execute function public.set_half_year_snapshots_updated_at();

-- RLSを有効化する。ポリシーは追加しないため、
-- anon/authenticatedロールからは一切アクセスできず、
-- サーバー側でservice_role keyを使ったアクセスのみ許可される。
alter table public.half_year_snapshots enable row level security;
