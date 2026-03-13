import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Suggestion } from "../lib/api/ml";
import { formatMoneyString } from "../utils/money";
import styles from "./SuggestionsTable.module.css";

type Props = {
  items: Suggestion[];
  onAccept: (transactionId: number, categoryId: number) => void;
  onSkip: (transactionId: number) => void;
};

type SortKey = "booking_date" | "payee" | "category_name" | "confidence" | "amount";
type SortDir = "asc" | "desc";

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.8) return styles.badgeHigh;
  if (confidence >= 0.6) return styles.badgeMedium;
  return styles.badgeLow;
}

function sortSuggestions(items: Suggestion[], key: SortKey, dir: SortDir): Suggestion[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "booking_date":
        cmp = a.booking_date.localeCompare(b.booking_date);
        break;
      case "payee":
        cmp = (a.payee ?? "").localeCompare(b.payee ?? "");
        break;
      case "category_name":
        cmp = a.category_name.localeCompare(b.category_name);
        break;
      case "confidence":
        cmp = a.confidence - b.confidence;
        break;
      case "amount":
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function SuggestionsTable({ items, onAccept, onSkip }: Props) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = sortSuggestions(items, sortKey, sortDir);

  const indicator = (key: SortKey) => {
    if (key !== sortKey) return <span className={styles.sortIndicator}>⇅</span>;
    return (
      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
    );
  };

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => handleSort("booking_date")}
              >
                {t("suggestionsTable.tableDate")}
                {indicator("booking_date")}
              </button>
            </th>
            <th>
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => handleSort("payee")}
              >
                {t("suggestionsTable.tablePayee")}
                {indicator("payee")}
              </button>
            </th>
            <th>{t("suggestionsTable.tablePurpose")}</th>
            <th>
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => handleSort("category_name")}
              >
                {t("suggestionsTable.tableSuggestedCategory")}
                {indicator("category_name")}
              </button>
            </th>
            <th>
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => handleSort("confidence")}
              >
                {t("suggestionsTable.tableConfidence")}
                {indicator("confidence")}
              </button>
            </th>
            <th className={styles.right}>
              <button
                type="button"
                className={`${styles.sortBtn} ${styles.right}`}
                onClick={() => handleSort("amount")}
              >
                {t("suggestionsTable.tableAmount")}
                {indicator("amount")}
              </button>
            </th>
            <th>{t("suggestionsTable.tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.transaction_id}>
              <td className={styles.date}>{s.booking_date}</td>
              <td className={styles.payee}>{s.payee ?? "—"}</td>
              <td className={styles.purpose}>{s.purpose ?? "—"}</td>
              <td className={styles.category}>{s.category_name}</td>
              <td>
                <span className={`${styles.badge} ${confidenceBadgeClass(s.confidence)}`}>
                  {Math.round(s.confidence * 100)}%
                </span>
              </td>
              <td className={`${styles.right} ${styles.amount}`}>
                {formatMoneyString(s.amount, "EUR")}
              </td>
              <td>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.acceptBtn}
                    onClick={() => onAccept(s.transaction_id, s.category_id)}
                  >
                    {t("suggestionsTable.accept")}
                  </button>
                  <button
                    type="button"
                    className={styles.skipBtn}
                    onClick={() => onSkip(s.transaction_id)}
                  >
                    {t("suggestionsTable.skip")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
