import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { buildMonthlyPerformanceList, rowToRecord } from "@/lib/monthlyPerformance";

export async function GET() {
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
    .order("year_month", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = (data ?? []).map(rowToRecord);
  return NextResponse.json({ items: buildMonthlyPerformanceList(records) });
}
