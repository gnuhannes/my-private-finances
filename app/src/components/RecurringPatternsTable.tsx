import { useTranslation } from "react-i18next";
import type { RecurringPattern } from "../lib/api/recurringPatterns";
import styles from "./RecurringPatternsTable.module.css";

type Props = {
  items: RecurringPattern[];
  formatAmount: (v: string) => string;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onToggleConfirmed?: (id: number, confirmed: boolean) => void;
};

export function RecurringPatternsTable({
  items,
  formatAmount,
  onToggleActive,
  onToggleConfirmed,
}: Props) {
  const { t } = useTranslation();

  function confidenceLabel(confidence: string): string {
    const v = parseFloat(confidence);
    if (v >= 0.85) return t("recurringTable.confidenceHigh");
    if (v >= 0.7) return t("recurringTable.confidenceMedium");
    return t("recurringTable.confidenceLow");
  }

  function frequencyLabel(f: string): string {
    const key = `recurringTable.frequencies.${f}` as const;
    return t(key, { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) });
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>{t("recurringTable.title")}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("recurringTable.tablePayee")}</th>
            <th className={styles.right}>{t("recurringTable.tableAmount")}</th>
            <th>{t("recurringTable.tableFrequency")}</th>
            <th>{t("recurringTable.tableConfidence")}</th>
            <th>{t("recurringTable.tableLastSeen")}</th>
            <th>{t("recurringTable.tableCount")}</th>
            {(onToggleActive || onToggleConfirmed) && (
              <th>{t("recurringTable.tableActions")}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className={!p.is_active ? styles.inactive : undefined}>
              <td>{p.payee}</td>
              <td className={styles.right}>{formatAmount(p.typical_amount)}</td>
              <td>{frequencyLabel(p.frequency)}</td>
              <td>
                <span
                  className={`${styles.badge} ${
                    parseFloat(p.confidence) >= 0.85
                      ? styles.badgeHigh
                      : parseFloat(p.confidence) >= 0.7
                        ? styles.badgeMedium
                        : styles.badgeLow
                  }`}
                >
                  {confidenceLabel(p.confidence)}
                </span>
              </td>
              <td>{p.last_seen}</td>
              <td>{p.occurrence_count}</td>
              {(onToggleActive || onToggleConfirmed) && (
                <td>
                  <div className={styles.actions}>
                    {onToggleActive && (
                      <button type="button" onClick={() => onToggleActive(p.id, !p.is_active)}>
                        {p.is_active ? t("recurringTable.dismiss") : t("recurringTable.restore")}
                      </button>
                    )}
                    {onToggleConfirmed && !p.user_confirmed && (
                      <button type="button" onClick={() => onToggleConfirmed(p.id, true)}>
                        {t("recurringTable.confirm")}
                      </button>
                    )}
                    {p.user_confirmed && (
                      <span className={styles.confirmed}>{t("recurringTable.confirmed")}</span>
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
