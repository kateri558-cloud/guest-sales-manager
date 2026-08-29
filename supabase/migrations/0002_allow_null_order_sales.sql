-- 月受注売上(order_sales)を「未入力」の状態(NULL)で保存できるようにする
-- 実行方法: SupabaseダッシュボードのSQL Editorに貼り付けて実行してください。
-- 既存のデータ(order_salesに0などの値が入っている行)には影響しません。

alter table public.monthly_performance
  alter column order_sales drop not null;

alter table public.monthly_performance
  alter column order_sales drop default;
