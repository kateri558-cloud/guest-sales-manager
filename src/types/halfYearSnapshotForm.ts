// 施工月ベース進捗の入力フォームで扱うデータの型定義

export interface HalfYearSnapshotFormData {
  /** スナップショット日 (YYYY-MM-DD 形式) */
  snapshotDate: string;
  /** 期（西暦4桁） */
  fiscalYear: string;
  /** 半期。未選択の場合は空文字 */
  halfPeriod: "" | "h1" | "h2";
  /** 男性用 着数（モーニング・紋付・シャツ・小物） */
  maleQty: string;
  /** 男性用 売上（円） */
  maleSales: string;
  /** 女性用 着数（フォーマルドレス・留袖・列席・小物） */
  femaleQty: string;
  /** 女性用 売上（円） */
  femaleSales: string;
}

export const createEmptyHalfYearSnapshotFormData = (): HalfYearSnapshotFormData => ({
  snapshotDate: "",
  fiscalYear: "",
  halfPeriod: "",
  maleQty: "",
  maleSales: "",
  femaleQty: "",
  femaleSales: "",
});
