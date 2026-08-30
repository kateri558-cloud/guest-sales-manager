import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { buildHalfYearSnapshotList, rowToRecord } from "@/lib/halfYearSnapshot";

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
    .from("half_year_snapshots")
    .select("snapshot_date, fiscal_year, male_qty, male_sales, female_qty, female_sales")
    .order("snapshot_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = (data ?? []).map(rowToRecord);
  return NextResponse.json({ items: buildHalfYearSnapshotList(records) });
}
