import { useTranslation } from "react-i18next";
import type { Suggestion } from "../lib/api/ml";
import { formatMoneyString } from "../utils/money";
import styles from "./SuggestionsTable.module.css";

type Props = {
  items: Suggestion[];
  onAccept: (transactionId: number, categoryId: number) => void;
  onSkip: (transactionId: number) => void;
};

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.8) return styles.badgeHigh;
  if (confidence >= 0.6) return styles.badgeMedium;
  return styles.badgeLow;
}

export function SuggestionsTable({ items, onAccept, onSkip }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("suggestionsTable.tableDate")}</th>
            <th>{t("suggestionsTable.tablePayee")}</th>
            <th>{t("suggestionsTable.tablePurpose")}</th>
            <th>{t("suggestionsTable.tableSuggestedCategory")}</th>
            <th>{t("suggestionsTable.tableConfidence")}</th>
            <th className={styles.right}>{t("suggestionsTable.tableAmount")}</th>
            <th>{t("suggestionsTable.tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
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
