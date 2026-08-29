"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./MonthlyListView.module.css";
import { formatNumber, formatPercent, formatSignedYen, formatYen } from "@/lib/number";
import {
  formatYearMonthLabel,
  type MonthlyPerformanceListItem,
  type YoYComparison,
} from "@/lib/monthlyPerformance";

type LoadState =
  | { type: "loading" }
  | { type: "loaded"; items: MonthlyPerformanceListItem[] }
  | { type: "error"; message: string };

function YoYSummary({ yoy }: { yoy: YoYComparison }) {
  const diffClass =
    yoy.diff === null
      ? undefined
      : yoy.diff > 0
        ? styles.yoyPositive
        : yoy.diff < 0
          ? styles.yoyNegative
          : undefined;

  return (
    <div className={styles.yoyRow}>
      <span className={diffClass}>
        前年差 {yoy.diff === null ? "－" : formatSignedYen(yoy.diff)}
      </span>
      <span className={diffClass}>
        前年比 {yoy.ratioPercent === null ? "－" : formatPercent(yoy.ratioPercent)}
      </span>
    </div>
  );
}

export default function MonthlyListView() {
  const [state, setState] = useState<LoadState>({ type: "loading" });

  useEffect(() => {
    fetch("/api/monthly-performance/list")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "一覧の取得に失敗しました。");
        return body.items as MonthlyPerformanceListItem[];
      })
      .then((items) => setState({ type: "loaded", items }))
      .catch((error: Error) => setState({ type: "error", message: error.message }));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>参列売上管理</h1>
          <p className={styles.subtitle}>月別一覧・前年比較</p>
          <Link href="/" className={styles.navLink}>
            ← 月次入力へ戻る
          </Link>
        </header>

        {state.type === "loading" && <p className={styles.statusText}>読み込み中...</p>}

        {state.type === "error" && <p className={styles.statusTextError}>{state.message}</p>}

        {state.type === "loaded" && state.items.length === 0 && (
          <p className={styles.statusText}>
            まだデータが登録されていません。月次入力画面から登録してください。
          </p>
        )}

        {state.type === "loaded" && state.items.length > 0 && (
          <div className={styles.list}>
            {state.items.map((item) => (
              <div key={item.yearMonth} className={styles.monthCard}>
                <span className={styles.monthTitle}>
                  {formatYearMonthLabel(item.yearMonth)}
                </span>

                <div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>月受注売上</span>
                    <span className={styles.metricValue}>{formatYen(item.orderSales)}</span>
                  </div>
                  <YoYSummary yoy={item.orderSalesYoY} />
                </div>

                <hr className={styles.divider} />

                <div className={styles.genderGrid}>
                  <div className={styles.genderItem}>
                    <span className={styles.genderLabel}>男性 施工着数</span>
                    <span className={styles.genderValue}>
                      {formatNumber(item.maleCount)}件
                    </span>
                  </div>
                  <div className={styles.genderItem}>
                    <span className={styles.genderLabel}>男性 施工売上</span>
                    <span className={styles.genderValue}>{formatYen(item.maleSales)}</span>
                  </div>
                  <div className={styles.genderItem}>
                    <span className={styles.genderLabel}>女性 施工着数</span>
                    <span className={styles.genderValue}>
                      {formatNumber(item.femaleCount)}件
                    </span>
                  </div>
                  <div className={styles.genderItem}>
                    <span className={styles.genderLabel}>女性 施工売上</span>
                    <span className={styles.genderValue}>{formatYen(item.femaleSales)}</span>
                  </div>
                </div>

                <div className={styles.totalsBlock}>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>施工着数合計</span>
                    <span className={styles.metricValue}>
                      {formatNumber(item.totalCount)}件
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>施工売上合計</span>
                    <span className={styles.metricValue}>{formatYen(item.totalSales)}</span>
                  </div>
                  <YoYSummary yoy={item.totalSalesYoY} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
