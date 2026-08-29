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

/** "2026-08" -> "2026年8月" (画面表示用) */
export const formatYearMonthLabel = (yearMonth: string): string => {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
};

/** "2026-08" -> "2025-08" (前年同月のキー) */
export const previousYearMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split("-");
  return `${Number(year) - 1}-${month}`;
};

export interface YoYComparison {
  /** 前年同月のデータが存在するか */
  hasPrevious: boolean;
  /** 前年差 (当年 - 前年)。前年データが無い場合はnull */
  diff: number | null;
  /** 前年比 (当年 / 前年 * 100)。前年データが無い、または前年値が0の場合はnull */
  ratioPercent: number | null;
}

export const computeYoY = (
  current: number,
  previous: number | undefined
): YoYComparison => {
  if (previous === undefined) {
    return { hasPrevious: false, diff: null, ratioPercent: null };
  }
  return {
    hasPrevious: true,
    diff: current - previous,
    ratioPercent: previous === 0 ? null : (current / previous) * 100,
  };
};

export interface MonthlyPerformanceListItem extends MonthlyPerformanceRecord {
  /** 男性 + 女性 の施工着数合計 */
  totalCount: number;
  /** 男性 + 女性 の施工売上合計 */
  totalSales: number;
  orderSalesYoY: YoYComparison;
  totalSalesYoY: YoYComparison;
}

/** 月次レコードの配列から、施工着数合計・施工売上合計・前年比較を付与した一覧を作る（新しい月が先頭）。 */
export const buildMonthlyPerformanceList = (
  records: MonthlyPerformanceRecord[]
): MonthlyPerformanceListItem[] => {
  const byYearMonth = new Map(records.map((record) => [record.yearMonth, record]));

  return records
    .slice()
    .sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : a.yearMonth > b.yearMonth ? -1 : 0))
    .map((record) => {
      const totalCount = record.maleCount + record.femaleCount;
      const totalSales = record.maleSales + record.femaleSales;
      const previous = byYearMonth.get(previousYearMonth(record.yearMonth));
      const previousTotalSales = previous
        ? previous.maleSales + previous.femaleSales
        : undefined;

      return {
        ...record,
        totalCount,
        totalSales,
        orderSalesYoY: computeYoY(record.orderSales, previous?.orderSales),
        totalSalesYoY: computeYoY(totalSales, previousTotalSales),
      };
    });
};
