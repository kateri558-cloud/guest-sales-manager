import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  isValidYearMonth,
  parseMonthlyPerformancePayload,
  recordToRow,
  rowToRecord,
  toDbDate,
} from "@/lib/monthlyPerformance";

export async function GET(request: NextRequest) {
  const yearMonth = request.nextUrl.searchParams.get("yearMonth");

  if (!yearMonth || !isValidYearMonth(yearMonth)) {
    return NextResponse.json(
      { error: "年月の形式が不正です（YYYY-MM）。" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "サーバー設定エラーです。" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("monthly_performance")
    .select("year_month, order_sales, male_count, male_sales, female_count, female_sales")
    .eq("year_month", toDbDate(yearMonth))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data ? rowToRecord(data) : null });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const parsed = parseMonthlyPerformancePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "サーバー設定エラーです。" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("monthly_performance")
    .upsert(recordToRow(parsed.data), { onConflict: "year_month" })
    .select("year_month, order_sales, male_count, male_sales, female_count, female_sales")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: rowToRecord(data) });
}
