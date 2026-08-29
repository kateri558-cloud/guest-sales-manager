import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * サーバー側専用のSupabaseクライアント。
 * service_role keyを使うためRLSを完全にバイパスする。
 * Route Handlers / Server Actionsなど、サーバー上でのみ呼び出すこと。
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabaseの環境変数(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)が設定されていません。.env.localを確認してください。"
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
