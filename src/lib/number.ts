// 数値の変換・フォーマットに関するユーティリティ

/** 文字列を数値に変換する。空文字や不正値は 0 として扱う。 */
export const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 数値を日本語の桁区切り（カンマ）付き文字列に変換する。 */
export const formatNumber = (value: number): string =>
  value.toLocaleString("ja-JP");

/** 円表示のフォーマット。 */
export const formatYen = (value: number): string => `¥${formatNumber(value)}`;
