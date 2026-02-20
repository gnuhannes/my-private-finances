import { useTranslation } from "react-i18next";
import type { BudgetComparison } from "../lib/api/reports";
import styles from "./BudgetVsActualTable.module.css";

type Props = {
  items: BudgetComparison[];
  formatAmount: (v: string) => string;
};

export function BudgetVsActualTable({ items, formatAmount }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <div className={styles.title}>{t("budgetVsActual.title")}</div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("budgetVsActual.tableCategory")}</th>
            <th className={styles.amount}>{t("budgetVsActual.tableBudgeted")}</th>
            <th className={styles.amount}>{t("budgetVsActual.tableActual")}</th>
            <th className={styles.amount}>{t("budgetVsActual.tableRemaining")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const remaining = Number(item.remaining);
            const isOver = remaining < 0;
            return (
              <tr key={item.category_id}>
                <td>{item.category_name}</td>
                <td className={styles.amount}>{formatAmount(item.budgeted)}</td>
                <td className={styles.amount}>{formatAmount(item.actual)}</td>
                <td className={`${styles.amount} ${isOver ? styles.over : styles.under}`}>
                  {formatAmount(item.remaining)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
