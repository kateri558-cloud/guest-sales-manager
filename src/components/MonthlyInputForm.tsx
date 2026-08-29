"use client";

import { useMemo, useState } from "react";
import styles from "./MonthlyInputForm.module.css";
import {
  createEmptyMonthlySalesFormData,
  type MonthlySalesFormData,
} from "@/types/monthlySales";
import { formatYen, toNumber } from "@/lib/number";

type NumericField =
  | "orderSales"
  | "maleCount"
  | "maleSales"
  | "femaleCount"
  | "femaleSales";

export default function MonthlyInputForm() {
  const [formData, setFormData] = useState<MonthlySalesFormData>(
    createEmptyMonthlySalesFormData()
  );
  const [savedMessage, setSavedMessage] = useState(false);

  const totalCount = useMemo(
    () => toNumber(formData.maleCount) + toNumber(formData.femaleCount),
    [formData.maleCount, formData.femaleCount]
  );

  const totalSales = useMemo(
    () => toNumber(formData.maleSales) + toNumber(formData.femaleSales),
    [formData.maleSales, formData.femaleSales]
  );

  const handleYearMonthChange = (value: string) => {
    setSavedMessage(false);
    setFormData((prev) => ({ ...prev, yearMonth: value }));
  };

  const handleNumericChange = (field: NumericField, rawValue: string) => {
    setSavedMessage(false);
    // 数字のみを受け付ける（空文字は許可して未入力を表現）
    const sanitized = rawValue.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // まだSupabase接続前のため、この段階では保存メッセージのみ表示する
    setSavedMessage(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>参列売上管理</h1>
          <p className={styles.subtitle}>月次入力</p>
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

          <button type="submit" className={styles.submit}>
            保存する
          </button>

          {savedMessage && (
            <p className={styles.toast} role="status">
              入力内容を確認しました（保存機能は次のステップで実装予定です）
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
