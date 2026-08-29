import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// 環境変数の設定ミスを安全に調査するための一時的な診断エンドポイント。
// 実際の鍵の値は一切返さない（長さ・先頭数文字・JWTのメタ情報のみ）。
function inspectKey(key: string | undefined) {
  if (!key) return { present: false };

  const trimmed = key.trim();
  const hasWhitespace = trimmed !== key;
  const parts = trimmed.split(".");

  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
      const payload = JSON.parse(payloadJson);
      return {
        present: true,
        length: key.length,
        hasSurroundingWhitespace: hasWhitespace,
        format: "jwt",
        prefix: trimmed.slice(0, 12),
        jwtRole: payload.role ?? null,
        jwtRef: payload.ref ?? null,
        jwtIss: payload.iss ?? null,
      };
    } catch {
      return {
        present: true,
        length: key.length,
        hasSurroundingWhitespace: hasWhitespace,
        format: "jwt-shaped-but-unparsable",
        prefix: trimmed.slice(0, 12),
      };
    }
  }

  return {
    present: true,
    length: key.length,
    hasSurroundingWhitespace: hasWhitespace,
    format: trimmed.startsWith("sb_secret_") ? "sb_secret" : "unknown",
    prefix: trimmed.slice(0, 12),
  };
}

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlRefMatch = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/);

  const result: Record<string, unknown> = {
    supabaseUrl: {
      present: Boolean(url),
      value: url ?? null,
      hasSurroundingWhitespace: url ? url.trim() !== url : false,
      extractedRef: urlRefMatch ? urlRefMatch[1] : null,
    },
    serviceRoleKey: inspectKey(key),
  };

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("monthly_performance")
      .select("id", { count: "exact", head: true });
    result.testQuery = error
      ? { ok: false, message: error.message, code: error.code ?? null }
      : { ok: true };
  } catch (e) {
    result.testQuery = {
      ok: false,
      message: e instanceof Error ? e.message : "unknown error",
    };
  }

  return NextResponse.json(result);
}
