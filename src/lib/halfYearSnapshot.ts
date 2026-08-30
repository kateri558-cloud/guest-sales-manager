// half_year_snapshots テーブルとやり取りするための共通の型・変換処理
// クライアント（フォーム）とサーバー（APIルート）の双方から利用する

import { computeYoY, type YoYComparison } from "@/lib/yoy";

export type HalfPeriod = "h1" | "h2";

export const HALF_PERIOD_LABELS: Record<HalfPeriod, string> = {
  h1: "上期",
  h2: "下期",
};

/** 半期の表示ラベル。half_periodが未設定(null)の既存データは「未設定」と表示する */
export const formatHalfPeriodLabel = (halfPeriod: HalfPeriod | null): string =>
  halfPeriod === null ? "未設定" : HALF_PERIOD_LABELS[halfPeriod];

export const isValidHalfPeriod = (value: unknown): value is HalfPeriod =>
  value === "h1" || value === "h2";

export interface HalfYearSnapshotRecord {
  /** スナップショット日 (YYYY-MM-DD 形式) */
  snapshotDate: string;
  /** 期（西暦4桁、例: 2026） */
  fiscalYear: number;
  /** 半期。旧データ（half_period未設定）はnull */
  halfPeriod: HalfPeriod | null;
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
  half_period: string | null;
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
  halfPeriod: isValidHalfPeriod(row.half_period) ? row.half_period : null,
  maleQty: row.male_qty,
  maleSales: row.male_sales,
  femaleQty: row.female_qty,
  femaleSales: row.female_sales,
});

export const recordToRow = (record: HalfYearSnapshotRecord): HalfYearSnapshotRow => ({
  snapshot_date: record.snapshotDate,
  fiscal_year: record.fiscalYear,
  half_period: record.halfPeriod,
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

  if (!isValidHalfPeriod(candidate.halfPeriod)) {
    return { ok: false, error: "半期は上期・下期のいずれかを選択してください。" };
  }

  const numericFields: (keyof Omit<
    HalfYearSnapshotRecord,
    "snapshotDate" | "fiscalYear" | "halfPeriod"
  >)[] = ["maleQty", "maleSales", "femaleQty", "femaleSales"];

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
      halfPeriod: candidate.halfPeriod,
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
  /** 同一「期＋半期」内で直前のスナップショットとの比較。半期が未設定の場合は比較不可 */
  previousSnapshotComparison: YoYComparison;
  /** 前年（fiscal_year - 1）の同じ半期・同じ月のスナップショットとの比較 */
  previousYearSameMonth: YoYComparison;
  /** 前年度の最終スナップショット（fiscal_year - 1の同じ半期で最も新しい日付）まで、あと必要な売上額。無い場合はnull */
  remainingToLastYearFinal: number | null;
}

const totalSalesOf = (record: HalfYearSnapshotRecord): number =>
  record.maleSales + record.femaleSales;

const fiscalYearHalfKey = (fiscalYear: number, halfPeriod: HalfPeriod): string =>
  `${fiscalYear}:${halfPeriod}`;

/**
 * スナップショットの配列から、合計・単価・前回比較・前年比較・前年最終実績までの差を付与した
 * 一覧を作る（新しい日付が先頭）。
 *
 * 前回比較・前年同時期比較・前年最終実績は、いずれも「同じ期(fiscal_year)＋同じ半期(half_period)」
 * の中だけで完結させ、上期と下期の数字を混ぜない。half_periodが未設定(null)のスナップショットは
 * どのグループにも属させず、比較対象としても使わない（比較結果は「－」になる）。
 */
export const buildHalfYearSnapshotList = (
  records: HalfYearSnapshotRecord[]
): HalfYearSnapshotListItem[] => {
  const sorted = records.slice().sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));

  // 「期＋半期」ごとに日付昇順でグループ化（half_periodが分かるものだけ）
  const byFiscalYearAndHalf = new Map<string, HalfYearSnapshotRecord[]>();
  for (const record of sorted) {
    if (record.halfPeriod === null) continue;
    const key = fiscalYearHalfKey(record.fiscalYear, record.halfPeriod);
    const list = byFiscalYearAndHalf.get(key);
    if (list) {
      list.push(record);
    } else {
      byFiscalYearAndHalf.set(key, [record]);
    }
  }

  // 「期＋半期＋月」で前年同時期を引けるようにする
  const byFiscalYearHalfAndMonth = new Map<string, HalfYearSnapshotRecord>();
  for (const record of sorted) {
    if (record.halfPeriod === null) continue;
    const month = record.snapshotDate.slice(5, 7);
    byFiscalYearHalfAndMonth.set(
      `${fiscalYearHalfKey(record.fiscalYear, record.halfPeriod)}:${month}`,
      record
    );
  }

  const items = sorted.map((record): HalfYearSnapshotListItem => {
    const totalQty = record.maleQty + record.femaleQty;
    const totalSales = totalSalesOf(record);
    const maleUnitPrice = record.maleQty > 0 ? record.maleSales / record.maleQty : null;
    const femaleUnitPrice = record.femaleQty > 0 ? record.femaleSales / record.femaleQty : null;

    if (record.halfPeriod === null) {
      return {
        ...record,
        totalQty,
        totalSales,
        maleUnitPrice,
        femaleUnitPrice,
        previousSnapshotComparison: computeYoY(totalSales, undefined),
        previousYearSameMonth: computeYoY(totalSales, undefined),
        remainingToLastYearFinal: null,
      };
    }

    const sameGroupList = byFiscalYearAndHalf.get(
      fiscalYearHalfKey(record.fiscalYear, record.halfPeriod)
    ) ?? [];
    const indexInGroup = sameGroupList.findIndex(
      (item) => item.snapshotDate === record.snapshotDate
    );
    const previousSnapshot = indexInGroup > 0 ? sameGroupList[indexInGroup - 1] : undefined;
    const previousSnapshotComparison = computeYoY(
      totalSales,
      previousSnapshot ? totalSalesOf(previousSnapshot) : undefined
    );

    const month = record.snapshotDate.slice(5, 7);
    const previousYearSnapshot = byFiscalYearHalfAndMonth.get(
      `${fiscalYearHalfKey(record.fiscalYear - 1, record.halfPeriod)}:${month}`
    );
    const previousYearSameMonth = computeYoY(
      totalSales,
      previousYearSnapshot ? totalSalesOf(previousYearSnapshot) : undefined
    );

    const previousFiscalYearHalfList = byFiscalYearAndHalf.get(
      fiscalYearHalfKey(record.fiscalYear - 1, record.halfPeriod)
    );
    const previousFiscalYearFinal =
      previousFiscalYearHalfList && previousFiscalYearHalfList.length > 0
        ? previousFiscalYearHalfList[previousFiscalYearHalfList.length - 1]
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
      previousSnapshotComparison,
      previousYearSameMonth,
      remainingToLastYearFinal,
    };
  });

  // 表示は新しい日付が先頭
  return items.reverse();
};
