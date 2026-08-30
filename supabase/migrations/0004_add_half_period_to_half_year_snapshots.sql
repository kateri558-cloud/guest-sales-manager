-- half_year_snapshots に「半期」(上期/下期)を追加する
-- 実行方法: SupabaseダッシュボードのSQL Editorに貼り付けて実行してください。
--
-- 既存データは削除・変更されません。half_periodは既存行に対してはNULLのまま
-- 追加されます（NOT NULL制約は付けません）。既存のスナップショットがある場合は、
-- 「施工月ベース進捗」画面でその日付を開き直し、半期を選んで再保存すると
-- half_periodが設定されます。

alter table public.half_year_snapshots
  add column if not exists half_period text
    check (half_period in ('h1', 'h2'));

comment on column public.half_year_snapshots.half_period is
  '半期 (h1=上期, h2=下期)。既存データはNULLのまま追加されるため、画面から再保存して設定する。';
