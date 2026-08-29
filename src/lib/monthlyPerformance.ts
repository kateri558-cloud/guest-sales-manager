// monthly_performance テーブルとやり取りするための共通の型・変換処理
// クライアント（フォーム）とサーバー（APIルート）の双方から利用する

export interface MonthlyPerformanceRecord {
  /** 対象年月 (YYYY-MM 形式) */
  yearMonth: string;
  /** 月受注売上 (円) */
  orderSales: number;
  /** 男性 施工着数 (件) */
  maleCount: number;
  /** 男性 施工売上 (円) */
  maleSales: number;
  /** 女性 施工着数 (件) */
  femaleCount: number;
  /** 女性 施工売上 (円) */
  femaleSales: number;
}

interface MonthlyPerformanceRow {
  year_month: string;
  order_sales: number;
  male_count: number;
  male_sales: number;
  female_count: number;
  female_sales: number;
}

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isValidYearMonth = (value: string): boolean =>
  YEAR_MONTH_PATTERN.test(value);

/** "2026-08" -> "2026-08-01" (DB保存用) */
export const toDbDate = (yearMonth: string): string => `${yearMonth}-01`;

/** "2026-08-01" -> "2026-08" (フォーム表示用) */
export const fromDbDate = (date: string): string => date.slice(0, 7);

export const rowToRecord = (row: MonthlyPerformanceRow): MonthlyPerformanceRecord => ({
  yearMonth: fromDbDate(row.year_month),
  orderSales: row.order_sales,
  maleCount: row.male_count,
  maleSales: row.male_sales,
  femaleCount: row.female_count,
  femaleSales: row.female_sales,
});

export const recordToRow = (record: MonthlyPerformanceRecord): MonthlyPerformanceRow => ({
  year_month: toDbDate(record.yearMonth),
  order_sales: record.orderSales,
  male_count: record.maleCount,
  male_sales: record.maleSales,
  female_count: record.femaleCount,
  female_sales: record.femaleSales,
});

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** POSTリクエストのボディを検証し、型付きのレコードに変換する */
export const parseMonthlyPerformancePayload = (
  body: unknown
): { ok: true; data: MonthlyPerformanceRecord } | { ok: false; error: string } => {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "リクエストの形式が不正です。" };
  }

  const candidate = body as Record<string, unknown>;

  if (typeof candidate.yearMonth !== "string" || !isValidYearMonth(candidate.yearMonth)) {
    return { ok: false, error: "年月の形式が不正です（YYYY-MM）。" };
  }

  const numericFields: (keyof Omit<MonthlyPerformanceRecord, "yearMonth">)[] = [
    "orderSales",
    "maleCount",
    "maleSales",
    "femaleCount",
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
      yearMonth: candidate.yearMonth,
      orderSales: candidate.orderSales as number,
      maleCount: candidate.maleCount as number,
      maleSales: candidate.maleSales as number,
      femaleCount: candidate.femaleCount as number,
      femaleSales: candidate.femaleSales as number,
    },
  };
};
