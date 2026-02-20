import { useTranslation } from "react-i18next";
import type { TransferCandidate } from "../lib/api/transfers";
import { formatMoneyString } from "../utils/money";
import styles from "./TransferCandidatesTable.module.css";

type Props = {
  items: TransferCandidate[];
  onConfirm?: (id: number) => void;
  onDismiss?: (id: number) => void;
  currency?: string;
};

function confidenceBadgeClass(confidence: string): string {
  const v = parseFloat(confidence);
  if (v >= 0.95) return styles.badgeHigh;
  if (v >= 0.8) return styles.badgeMedium;
  return styles.badgeLow;
}

function confidenceLabel(confidence: string): string {
  const v = parseFloat(confidence);
  const pct = Math.round(v * 100);
  return `${pct}%`;
}

export function TransferCandidatesTable({ items, onConfirm, onDismiss, currency = "EUR" }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("transferTable.tableFromAccount")}</th>
            <th>{t("transferTable.tableDate")}</th>
            <th>{t("transferTable.tablePayee")}</th>
            <th className={styles.right}>{t("transferTable.tableAmount")}</th>
            <th>{t("transferTable.tableToAccount")}</th>
            <th>{t("transferTable.tableDate")}</th>
            <th>{t("transferTable.tableConfidence")}</th>
            {(onConfirm || onDismiss) && <th>{t("transferTable.tableActions")}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className={styles.accountName}>{c.from_leg.account_name}</td>
              <td className={styles.date}>{c.from_leg.booking_date}</td>
              <td className={styles.payee}>{c.from_leg.payee ?? "—"}</td>
              <td className={`${styles.right} ${styles.amount}`}>
                {formatMoneyString(c.from_leg.amount, currency)}
              </td>
              <td className={styles.accountName}>{c.to_leg.account_name}</td>
              <td className={styles.date}>{c.to_leg.booking_date}</td>
              <td>
                <span className={`${styles.badge} ${confidenceBadgeClass(c.confidence)}`}>
                  {confidenceLabel(c.confidence)}
                </span>
              </td>
              {(onConfirm || onDismiss) && (
                <td>
                  <div className={styles.actions}>
                    {onConfirm && (
                      <button
                        type="button"
                        className={styles.confirmBtn}
                        onClick={() => onConfirm(c.id)}
                      >
                        {t("transferTable.confirm")}
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        type="button"
                        className={styles.dismissBtn}
                        onClick={() => onDismiss(c.id)}
                      >
                        {t("transferTable.dismiss")}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
