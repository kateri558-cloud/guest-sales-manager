// 月次入力画面で扱うデータの型定義

export interface MonthlySalesFormData {
  /** 対象年月 (YYYY-MM 形式) */
  yearMonth: string;
  /** 月受注売上 (円) */
  orderSales: string;
  /** 男性 施工着数 (件) */
  maleCount: string;
  /** 男性 施工売上 (円) */
  maleSales: string;
  /** 女性 施工着数 (件) */
  femaleCount: string;
  /** 女性 施工売上 (円) */
  femaleSales: string;
}

export const createEmptyMonthlySalesFormData = (): MonthlySalesFormData => ({
  yearMonth: "",
  orderSales: "",
  maleCount: "",
  maleSales: "",
  femaleCount: "",
  femaleSales: "",
});
