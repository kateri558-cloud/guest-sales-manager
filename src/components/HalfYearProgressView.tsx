"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./HalfYearProgressView.module.css";
import {
  createEmptyHalfYearSnapshotFormData,
  type HalfYearSnapshotFormData,
} from "@/types/halfYearSnapshotForm";
import { formatNumber, formatPercent, formatSignedYen, formatYen, toNumber } from "@/lib/number";
import {
  buildHalfYearSnapshotList,
  formatSnapshotDateLabel,
  type HalfYearSnapshotRecord,
  type HalfYearSnapshotListItem,
} from "@/lib/halfYearSnapshot";

type NumericField = "fiscalYear" | "maleQty" | "maleSales" | "femaleQty" | "femaleSales";

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

type ListState =
  | { type: "loading" }
  | { type: "loaded"; items: HalfYearSnapshotListItem[] }
  | { type: "error"; message: string };

const recordToFormFields = (
  record: HalfYearSnapshotRecord
): Omit<HalfYearSnapshotFormData, "snapshotDate"> => ({
  fiscalYear: String(record.fiscalYear),
  maleQty: String(record.maleQty),
  maleSales: String(record.maleSales),
  femaleQty: String(record.femaleQty),
  femaleSales: String(record.femaleSales),
});

export default function HalfYearProgressView() {
  const [formData, setFormData] = useState<HalfYearSnapshotFormData>(
    createEmptyHalfYearSnapshotFormData()
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ type: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult>(null);
  const [listState, setListState] = useState<ListState>({ type: "loading" });

  const requestIdRef = useRef(0);

  const fetchList = () => {
    fetch("/api/half-year-snapshots/list")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "一覧の取得に失敗しました。");
        return body.items as HalfYearSnapshotListItem[];
      })
      .then((items) => setListState({ type: "loaded", items }))
      .catch((error: Error) => setListState({ type: "error", message: error.message }));
  };

  const reloadList = () => {
    setListState({ type: "loading" });
    fetchList();
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (!formData.snapshotDate) return;

    const requestId = ++requestIdRef.current;

    fetch(`/api/half-year-snapshots?date=${formData.snapshotDate}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "データの取得に失敗しました。");
        return body.record as HalfYearSnapshotRecord | null;
      })
      .then((record) => {
        if (requestId !== requestIdRef.current) return;

        if (record) {
          setFormData((prev) => ({ ...prev, ...recordToFormFields(record) }));
          setLoadStatus({ type: "found" });
        } else {
          setFormData((prev) => ({
            ...prev,
            fiscalYear: "",
            maleQty: "",
            maleSales: "",
            femaleQty: "",
            femaleSales: "",
          }));
          setLoadStatus({ type: "new" });
        }
      })
      .catch((error: Error) => {
        if (requestId !== requestIdRef.current) return;
        setLoadStatus({ type: "error", message: error.message });
      });
  }, [formData.snapshotDate]);

  const preview = useMemo(() => {
    if (!formData.snapshotDate || listState.type !== "loaded") return undefined;

    const otherRecords: HalfYearSnapshotRecord[] = listState.items
      .filter((item) => item.snapshotDate !== formData.snapshotDate)
      .map((item) => ({
        snapshotDate: item.snapshotDate,
        fiscalYear: item.fiscalYear,
        maleQty: item.maleQty,
        maleSales: item.maleSales,
        femaleQty: item.femaleQty,
        femaleSales: item.femaleSales,
      }));

    const currentRecord: HalfYearSnapshotRecord = {
      snapshotDate: formData.snapshotDate,
      fiscalYear: toNumber(formData.fiscalYear),
      maleQty: toNumber(formData.maleQty),
      maleSales: toNumber(formData.maleSales),
      femaleQty: toNumber(formData.femaleQty),
      femaleSales: toNumber(formData.femaleSales),
    };

    return buildHalfYearSnapshotList([...otherRecords, currentRecord]).find(
      (item) => item.snapshotDate === formData.snapshotDate
    );
  }, [formData, listState]);

  const handleSnapshotDateChange = (value: string) => {
    setSaveResult(null);
    setLoadStatus(value ? { type: "loading" } : { type: "idle" });
    setFormData((prev) => ({ ...prev, snapshotDate: value }));
  };

  const handleNumericChange = (field: NumericField, rawValue: string) => {
    setSaveResult(null);
    const sanitized = rawValue.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.snapshotDate || isSaving) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/half-year-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotDate: formData.snapshotDate,
          fiscalYear: toNumber(formData.fiscalYear),
          maleQty: toNumber(formData.maleQty),
          maleSales: toNumber(formData.maleSales),
          femaleQty: toNumber(formData.femaleQty),
          femaleSales: toNumber(formData.femaleSales),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "保存に失敗しました。");

      setLoadStatus({ type: "found" });
      setSaveResult({ type: "success", message: "保存しました。" });
      reloadList();
    } catch (error) {
      setSaveResult({
        type: "error",
        message: error instanceof Error ? error.message : "保存に失敗しました。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusText = !formData.snapshotDate
    ? null
    : loadStatus.type === "loading"
      ? "読み込み中..."
      : loadStatus.type === "found"
        ? "登録済みのデータを読み込みました。内容を確認し、必要に応じて修正してください。"
        : loadStatus.type === "new"
          ? "この日付のデータはまだありません。新規登録になります。"
          : loadStatus.type === "error"
            ? loadStatus.message
            : null;

  const remainingLabel = (remaining: number | null) => {
    if (remaining === null) return "－";
    if (remaining > 0) return `あと${formatYen(remaining)}`;
    return `達成（${formatYen(Math.abs(remaining))}超過）`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>参列売上管理</h1>
          <p className={styles.subtitle}>上期進捗</p>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              ← 月次入力へ
            </Link>
            <Link href="/monthly-list" className={styles.navLink}>
              月別一覧へ
            </Link>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <span className={styles.sectionLabel}>対象スナップショット</span>
            <div className={styles.field}>
              <label htmlFor="snapshotDate">スナップショット日</label>
              <input
                id="snapshotDate"
                type="date"
                required
                value={formData.snapshotDate}
                onChange={(e) => handleSnapshotDateChange(e.target.value)}
              />
              {statusText && (
                <p
                  className={
                    loadStatus.type === "error" ? styles.statusTextError : styles.statusText
                  }
                >
                  {statusText}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="fiscalYear">期（西暦4桁）</label>
              <input
                id="fiscalYear"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="2026"
                value={formData.fiscalYear}
                onChange={(e) => handleNumericChange("fiscalYear", e.target.value)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <span className={styles.sectionLabel}>男性用（モーニング・紋付・シャツ・小物）</span>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="maleQty">着数（件）</label>
                <input
                  id="maleQty"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.maleQty}
                  onChange={(e) => handleNumericChange("maleQty", e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="maleSales">売上（円）</label>
                <input
                  id="maleSales"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.maleSales}
                  onChange={(e) => handleNumericChange("maleSales", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <span className={styles.sectionLabel}>女性用（フォーマルドレス・留袖・列席・小物）</span>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="femaleQty">着数（件）</label>
                <input
                  id="femaleQty"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.femaleQty}
                  onChange={(e) => handleNumericChange("femaleQty", e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="femaleSales">売上（円）</label>
                <input
                  id="femaleSales"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData.femaleSales}
                  onChange={(e) => handleNumericChange("femaleSales", e.target.value)}
                />
              </div>
            </div>
          </section>

          <div className={styles.summary}>
            <span className={styles.summaryLabel}>自動計算</span>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>合計着数</span>
              <span className={styles.summaryValue}>
                {preview ? `${formatNumber(preview.totalQty)}件` : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>合計売上</span>
              <span className={styles.summaryValue}>
                {preview ? formatYen(preview.totalSales) : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>男性用単価</span>
              <span className={styles.summaryValue}>
                {preview?.maleUnitPrice != null ? formatYen(Math.round(preview.maleUnitPrice)) : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>女性用単価</span>
              <span className={styles.summaryValue}>
                {preview?.femaleUnitPrice != null
                  ? formatYen(Math.round(preview.femaleUnitPrice))
                  : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>前回からの増加額</span>
              <span className={styles.summaryValue}>
                {preview?.increaseFromPrevious != null
                  ? formatSignedYen(preview.increaseFromPrevious)
                  : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>前年同時期差額</span>
              <span className={styles.summaryValue}>
                {preview?.previousYearSameMonth.diff != null
                  ? formatSignedYen(preview.previousYearSameMonth.diff)
                  : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>前年同時期比</span>
              <span className={styles.summaryValue}>
                {preview?.previousYearSameMonth.ratioPercent != null
                  ? formatPercent(preview.previousYearSameMonth.ratioPercent)
                  : "－"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryName}>前年最終実績まで</span>
              <span className={styles.summaryValue}>
                {remainingLabel(preview?.remainingToLastYearFinal ?? null)}
              </span>
            </div>
          </div>

          <button type="submit" className={styles.submit} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存する"}
          </button>

          {saveResult && (
            <p
              className={saveResult.type === "success" ? styles.toast : styles.toastError}
              role="status"
            >
              {saveResult.message}
            </p>
          )}
        </form>

        <div className={styles.listSection}>
          <h2 className={styles.listHeading}>スナップショット一覧</h2>

          {listState.type === "loading" && <p className={styles.statusText}>読み込み中...</p>}
          {listState.type === "error" && (
            <p className={styles.statusTextError}>{listState.message}</p>
          )}
          {listState.type === "loaded" && listState.items.length === 0 && (
            <p className={styles.statusText}>まだデータが登録されていません。</p>
          )}

          {listState.type === "loaded" && listState.items.length > 0 && (
            <div className={styles.list}>
              {listState.items.map((item) => (
                <div key={item.snapshotDate} className={styles.snapshotCard}>
                  <div className={styles.snapshotHeader}>
                    <span className={styles.snapshotDate}>
                      {formatSnapshotDateLabel(item.snapshotDate)}
                    </span>
                    <span className={styles.snapshotFiscalYear}>{item.fiscalYear}期</span>
                  </div>

                  <div className={styles.genderGrid}>
                    <div className={styles.genderItem}>
                      <span className={styles.genderLabel}>男性 着数</span>
                      <span className={styles.genderValue}>
                        {formatNumber(item.maleQty)}件
                      </span>
                    </div>
                    <div className={styles.genderItem}>
                      <span className={styles.genderLabel}>男性 売上</span>
                      <span className={styles.genderValue}>{formatYen(item.maleSales)}</span>
                    </div>
                    <div className={styles.genderItem}>
                      <span className={styles.genderLabel}>女性 着数</span>
                      <span className={styles.genderValue}>
                        {formatNumber(item.femaleQty)}件
                      </span>
                    </div>
                    <div className={styles.genderItem}>
                      <span className={styles.genderLabel}>女性 売上</span>
                      <span className={styles.genderValue}>{formatYen(item.femaleSales)}</span>
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  <div className={styles.totalsBlock}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryName}>合計売上</span>
                      <span className={styles.summaryValue}>{formatYen(item.totalSales)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryName}>前年同時期比</span>
                      <span className={styles.summaryValue}>
                        {item.previousYearSameMonth.ratioPercent != null
                          ? formatPercent(item.previousYearSameMonth.ratioPercent)
                          : "－"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
