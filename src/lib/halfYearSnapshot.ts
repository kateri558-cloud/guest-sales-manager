// half_year_snapshots テーブルとやり取りするための共通の型・変換処理
// クライアント（フォーム）とサーバー（APIルート）の双方から利用する

import { computeYoY, type YoYComparison } from "@/lib/yoy";

export interface HalfYearSnapshotRecord {
  /** スナップショット日 (YYYY-MM-DD 形式) */
  snapshotDate: string;
  /** 期（西暦4桁、例: 2026） */
  fiscalYear: number;
  /** 男性用 着数（モーニング・紋付・シャツ・小物） */
  maleQty: number;
  /** 男性用 売上（円） */
  maleSales: number;
  /** 女性用 着数（フォーマルドレス・留袖・列席・小物） */
  femaleQty: number;
  /** 女性用 売上（円） */
  femaleSales: number;
}

interface HalfYearSnapshotRow {
  snapshot_date: string;
  fiscal_year: number;
  male_qty: number;
  male_sales: number;
  female_qty: number;
  female_sales: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidSnapshotDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
};

export const isValidFiscalYear = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 2000 && value <= 2100;

/** "2026-08-31" -> "2026/08/31" (画面表示用) */
export const formatSnapshotDateLabel = (snapshotDate: string): string =>
  snapshotDate.replace(/-/g, "/");

export const rowToRecord = (row: HalfYearSnapshotRow): HalfYearSnapshotRecord => ({
  snapshotDate: row.snapshot_date,
  fiscalYear: row.fiscal_year,
  maleQty: row.male_qty,
  maleSales: row.male_sales,
  femaleQty: row.female_qty,
  femaleSales: row.female_sales,
});

export const recordToRow = (record: HalfYearSnapshotRecord): HalfYearSnapshotRow => ({
  snapshot_date: record.snapshotDate,
  fiscal_year: record.fiscalYear,
  male_qty: record.maleQty,
  male_sales: record.maleSales,
  female_qty: record.femaleQty,
  female_sales: record.femaleSales,
});

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** POSTリクエストのボディを検証し、型付きのレコードに変換する */
export const parseHalfYearSnapshotPayload = (
  body: unknown
): { ok: true; data: HalfYearSnapshotRecord } | { ok: false; error: string } => {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "リクエストの形式が不正です。" };
  }

  const candidate = body as Record<string, unknown>;

  if (typeof candidate.snapshotDate !== "string" || !isValidSnapshotDate(candidate.snapshotDate)) {
    return { ok: false, error: "スナップショット日の形式が不正です（YYYY-MM-DD）。" };
  }

  if (!isValidFiscalYear(candidate.fiscalYear)) {
    return { ok: false, error: "期は西暦4桁の整数で入力してください。" };
  }

  const numericFields: (keyof Omit<HalfYearSnapshotRecord, "snapshotDate" | "fiscalYear">)[] = [
    "maleQty",
    "maleSales",
    "femaleQty",
    "femaleSales",
  ];

  for (const field of numericFields) {
    if (!isNonNegativeInteger(candidate[field])) {
      return { ok: false, error: `${field}は0以上の整数で入力してください。` };
    }
  }

  return {
    ok: true,
    data: {
      snapshotDate: candidate.snapshotDate,
      fiscalYear: candidate.fiscalYear,
      maleQty: candidate.maleQty as number,
      maleSales: candidate.maleSales as number,
      femaleQty: candidate.femaleQty as number,
      femaleSales: candidate.femaleSales as number,
    },
  };
};

export interface HalfYearSnapshotListItem extends HalfYearSnapshotRecord {
  /** 男性 + 女性 の着数合計 */
  totalQty: number;
  /** 男性 + 女性 の売上合計 */
  totalSales: number;
  /** 男性用単価 (male_sales / male_qty)。male_qtyが0の場合はnull */
  maleUnitPrice: number | null;
  /** 女性用単価 (female_sales / female_qty)。female_qtyが0の場合はnull */
  femaleUnitPrice: number | null;
  /** 同一fiscal_year内で直前のスナップショットからの売上増加額。直前が無い場合はnull */
  increaseFromPrevious: number | null;
  /** 前年（fiscal_year - 1）の同じ月のスナップショットとの比較 */
  previousYearSameMonth: YoYComparison;
  /** 前年度の最終スナップショット（fiscal_year - 1で最も新しい日付）まで、あと必要な売上額。前年データが無い場合はnull */
  remainingToLastYearFinal: number | null;
}

const totalSalesOf = (record: HalfYearSnapshotRecord): number =>
  record.maleSales + record.femaleSales;

/**
 * スナップショットの配列から、合計・単価・前回比較・前年比較・前年最終実績までの差を付与した
 * 一覧を作る（新しい日付が先頭）。
 */
export const buildHalfYearSnapshotList = (
  records: HalfYearSnapshotRecord[]
): HalfYearSnapshotListItem[] => {
  const sorted = records.slice().sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));

  // fiscal_year ごとに日付昇順でグループ化（同一期内の直前スナップショット・前年度の最終実績を求めるため）
  const byFiscalYear = new Map<number, HalfYearSnapshotRecord[]>();
  for (const record of sorted) {
    const list = byFiscalYear.get(record.fiscalYear);
    if (list) {
      list.push(record);
    } else {
      byFiscalYear.set(record.fiscalYear, [record]);
    }
  }

  // 「fiscal_year + 月」で前年同時期を引けるようにする
  const byFiscalYearAndMonth = new Map<string, HalfYearSnapshotRecord>();
  for (const record of sorted) {
    const month = record.snapshotDate.slice(5, 7);
    byFiscalYearAndMonth.set(`${record.fiscalYear}-${month}`, record);
  }

  const items = sorted.map((record): HalfYearSnapshotListItem => {
    const totalQty = record.maleQty + record.femaleQty;
    const totalSales = totalSalesOf(record);
    const maleUnitPrice = record.maleQty > 0 ? record.maleSales / record.maleQty : null;
    const femaleUnitPrice = record.femaleQty > 0 ? record.femaleSales / record.femaleQty : null;

    const sameFiscalYearList = byFiscalYear.get(record.fiscalYear) ?? [];
    const indexInFiscalYear = sameFiscalYearList.findIndex(
      (item) => item.snapshotDate === record.snapshotDate
    );
    const previousSnapshot =
      indexInFiscalYear > 0 ? sameFiscalYearList[indexInFiscalYear - 1] : undefined;
    const increaseFromPrevious = previousSnapshot
      ? totalSales - totalSalesOf(previousSnapshot)
      : null;

    const month = record.snapshotDate.slice(5, 7);
    const previousYearSnapshot = byFiscalYearAndMonth.get(`${record.fiscalYear - 1}-${month}`);
    const previousYearSameMonth = computeYoY(
      totalSales,
      previousYearSnapshot ? totalSalesOf(previousYearSnapshot) : undefined
    );

    const previousFiscalYearList = byFiscalYear.get(record.fiscalYear - 1);
    const previousFiscalYearFinal =
      previousFiscalYearList && previousFiscalYearList.length > 0
        ? previousFiscalYearList[previousFiscalYearList.length - 1]
        : undefined;
    const remainingToLastYearFinal = previousFiscalYearFinal
      ? totalSalesOf(previousFiscalYearFinal) - totalSales
      : null;

    return {
      ...record,
      totalQty,
      totalSales,
      maleUnitPrice,
      femaleUnitPrice,
      increaseFromPrevious,
      previousYearSameMonth,
      remainingToLastYearFinal,
    };
  });

  // 表示は新しい日付が先頭
  return items.reverse();
};
