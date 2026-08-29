-- 月次入力画面が読み書きするテーブル
-- 実行方法: SupabaseダッシュボードのSQL Editorに貼り付けて実行してください。

create table if not exists public.monthly_performance (
  id bigint generated always as identity primary key,
  -- 対象月の1日を格納する (例: 2026-08 -> 2026-08-01)。UNIQUE制約で重複登録を防ぐ。
  year_month date not null unique,
  order_sales bigint not null default 0,
  male_count integer not null default 0,
  male_sales bigint not null default 0,
  female_count integer not null default 0,
  female_sales bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.monthly_performance is '参列売上管理: 月次入力データ';
comment on column public.monthly_performance.year_month is '対象年月 (各月の1日を格納)';
comment on column public.monthly_performance.order_sales is '月受注売上 (円)';
comment on column public.monthly_performance.male_count is '男性 施工着数 (件)';
comment on column public.monthly_performance.male_sales is '男性 施工売上 (円)';
comment on column public.monthly_performance.female_count is '女性 施工着数 (件)';
comment on column public.monthly_performance.female_sales is '女性 施工売上 (円)';

-- updated_at を更新のたびに自動更新する
create or replace function public.set_monthly_performance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists monthly_performance_set_updated_at on public.monthly_performance;

create trigger monthly_performance_set_updated_at
before update on public.monthly_performance
for each row
execute function public.set_monthly_performance_updated_at();

-- RLSを有効化する。ポリシーは追加しないため、
-- anon/authenticatedロールからは一切アクセスできず、
-- サーバー側でservice_role keyを使ったアクセスのみ許可される。
alter table public.monthly_performance enable row level security;
