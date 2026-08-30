// 前年（または前回）比較の共通ロジック。
// 月別一覧・上期進捗など、前年比較が必要な複数の画面から利用する。

export interface YoYComparison {
  /** 比較対象となる前年（前回）のデータが存在するか */
  hasPrevious: boolean;
  /** 差分 (当期 - 前期)。比較対象が無い、または当期・前期のいずれかが未入力の場合はnull */
  diff: number | null;
  /** 比率 (当期 / 前期 * 100)。比較対象が無い、未入力、または前期値が0の場合はnull */
  ratioPercent: number | null;
}

/**
 * 当期・前期の値から差分・比率を計算する。
 * current/previousのどちらかがnull（未入力）、またはpreviousが未登録(undefined)の場合は
 * diff・ratioPercentともにnull（画面では「－」として表示する）。
 */
export const computeYoY = (
  current: number | null,
  previous: number | null | undefined
): YoYComparison => {
  if (previous === undefined) {
    return { hasPrevious: false, diff: null, ratioPercent: null };
  }
  if (current === null || previous === null) {
    return { hasPrevious: true, diff: null, ratioPercent: null };
  }
  return {
    hasPrevious: true,
    diff: current - previous,
    ratioPercent: previous === 0 ? null : (current / previous) * 100,
  };
};
