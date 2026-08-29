"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MonthlyInputForm.module.css";
import {
  createEmptyMonthlySalesFormData,
  type MonthlySalesFormData,
} from "@/types/monthlySales";
import { formatYen, toNumber } from "@/lib/number";
import type { MonthlyPerformanceRecord } from "@/lib/monthlyPerformance";

type NumericField =
  | "orderSales"
  | "maleCount"
  | "maleSales"
  | "femaleCount"
  | "femaleSales";

type LoadStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "found" }
  | { type: "new" }
  | { type: "error"; message: string };

type SaveResult =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

const recordToFormFields = (
  record: MonthlyPerformanceRecord
): Omit<MonthlySalesFormData, "yearMonth"> => ({
  orderSales: record.orderSales === null ? "" : String(record.orderSales),
  maleCount: String(record.maleCount),
  maleSales: String(record.maleSales),
  femaleCount: String(record.femaleCount),
  femaleSales: String(record.femaleSales),
});

export default function MonthlyInputForm() {
  const [formData, setFormData] = useState<MonthlySalesFormData>(
    createEmptyMonthlySalesFormData()
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ type: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult>(null);

  // 年月の切り替えが連続した場合に、古いレスポンスが後から反映されるのを防ぐ
  const requestIdRef = useRef(0);

  const totalCount = useMemo(
    () => toNumber(formData.maleCount) + toNumber(formData.femaleCount),
    [formData.maleCount, formData.femaleCount]
  );

  const totalSales = useMemo(
    () => toNumber(formData.maleSales) + toNumber(formData.femaleSales),
    [formData.maleSales, formData.femaleSales]
  );

  useEffect(() => {
    if (!formData.yearMonth) return;

    const requestId = ++requestIdRef.current;

    fetch(`/api/monthly-performance?yearMonth=${formData.yearMonth}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "データの取得に失敗しました。");
        return body.record as MonthlyPerformanceRecord | null;
      })
      .then((record) => {
        if (requestId !== requestIdRef.current) return; // 古いリクエストは無視

        if (record) {
          setFormData((prev) => ({ ...prev, ...recordToFormFields(record) }));
          setLoadStatus({ type: "found" });
        } else {
          setFormData((prev) => ({
            ...prev,
            orderSales: "",
            maleCount: "",
            maleSales: "",
            femaleCount: "",
            femaleSales: "",
          }));
          setLoadStatus({ type: "new" });
        }
      })
      .catch((error: Error) => {
        if (requestId !== requestIdRef.current) return;
        setLoadStatus({ type: "error", message: error.message });
      });
  }, [formData.yearMonth]);

  const handleYearMonthChange = (value: string) => {
    setSaveResult(null);
    setLoadStatus(value ? { type: "loading" } : { type: "idle" });
    setFormData((prev) => ({ ...prev, yearMonth: value }));
  };

  const handleNumericChange = (field: NumericField, rawValue: string) => {
    setSaveResult(null);
    // 数字のみを受け付ける（空文字は許可して未入力を表現）
    const sanitized = rawValue.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.yearMonth || isSaving) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/monthly-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth: formData.yearMonth,
          orderSales: formData.orderSales === "" ? null : toNumber(formData.orderSales),
          maleCount: toNumber(formData.maleCount),
          maleSales: toNumber(formData.maleSales),
          femaleCount: toNumber(formData.femaleCount),
          femaleSales: toNumber(formData.femaleSales),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "保存に失敗しました。");

      setLoadStatus({ type: "found" });
      setSaveResult({ type: "success", message: "保存しました。" });
    } catch (error) {
      setSaveResult({
        type: "error",
        message: error instanceof Error ? error.message : "保存に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusText = !formData.yearMonth
    ? null
    : loadStatus.type === "loading"
      ? "読み込み中..."
      : loadStatus.type === "found"
        ? "登録済みのデータを読み込みました。内容を確認し、必要に応じて修正してください。"
        : loadStatus.type === "new"
          ? "この年月のデータはまだありません。新規登録になります。"
          : loadStatus.type === "error"
            ? loadStatus.message
            : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>参列売上管理</h1>
          <p className={styles.subtitle}>月次入力</p>
          <Link href="/monthly-list" className={styles.navLink}>
            月別一覧を見る →
          </Link>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <span className={styles.sectionLabel}>対象月</span>
            <div className={styles.field}>
              <label htmlFor="yearMonth">年月</label>
              <input
                id="yearMonth"
                type="month"
                required
                value={formData.yearMonth}
                onChange={(e) => handleYearMonthChange(e.target.value)}
              />
              {statusText && (
                <p
                  className={
                    loadStatus.type === "error"
                      ? styles.statusTextError
                      : styles.statusText
                  }
                >
                  {statusText}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="orderSales">月受注売上（円）</label>
              <input
                id="orderSales"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={formData.orderSales}
                onChange={(e) =>
                  handleNumericChange("orderSales", e.target.value)
                }
              />
            </div>
          </section>

          <section className={styles.section}>
            <span className={styles.sectionLabel}>男性</span>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="maleCount">施工着数（件）</label>
                <input
                  id="maleCount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.maleCount}
                  onChange={(e) =>
                    handleNumericChange("maleCount", e.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="maleSales">施工売上（円）</label>
                <input
                  id="maleSales"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.maleSales}
                  onChange={(e) =>
                    handleNumericChange("maleSales", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <span className={styles.sectionLabel}>女性</span>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="femaleCount">施工着数（件）</label>
                <input
                  id="femaleCount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.femaleCount}
                  onChange={(e) =>
                    handleNumericChange("femaleCount", e.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="femaleSales">施工売上（円）</label>
                <input
                  id="femaleSales"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.femaleSales}
                  onChange={(e) =>
                    handleNumericChange("femaleSales", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <div className={styles.summary}>
            <span className={styles.summaryLabel}>自動計算</span>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>施工着数合計</span>
              <span className={styles.summaryValue}>{totalCount}件</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>施工売上合計</span>
              <span className={styles.summaryValue}>
                {formatYen(totalSales)}
              </span>
            </div>
          </div>

          <button type="submit" className={styles.submit} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存する"}
          </button>

          {saveResult && (
            <p
              className={
                saveResult.type === "success" ? styles.toast : styles.toastError
              }
              role="status"
            >
              {saveResult.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
