import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  isValidSnapshotDate,
  parseHalfYearSnapshotPayload,
  recordToRow,
  rowToRecord,
} from "@/lib/halfYearSnapshot";

export async function GET(request: NextRequest) {
  const snapshotDate = request.nextUrl.searchParams.get("date");

  if (!snapshotDate || !isValidSnapshotDate(snapshotDate)) {
    return NextResponse.json(
      { error: "スナップショット日の形式が不正です（YYYY-MM-DD）。" },
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
    .from("half_year_snapshots")
    .select("snapshot_date, fiscal_year, male_qty, male_sales, female_qty, female_sales")
    .eq("snapshot_date", snapshotDate)
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

  const parsed = parseHalfYearSnapshotPayload(body);
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
    .from("half_year_snapshots")
    .upsert(recordToRow(parsed.data), { onConflict: "snapshot_date" })
    .select("snapshot_date, fiscal_year, male_qty, male_sales, female_qty, female_sales")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: rowToRecord(data) });
}
