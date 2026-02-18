import type { BudgetComparison } from "../lib/api/reports";
import styles from "./BudgetVsActualTable.module.css";

type Props = {
  items: BudgetComparison[];
  formatAmount: (v: string) => string;
};

export function BudgetVsActualTable({ items, formatAmount }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>Budget vs Actual</div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Category</th>
            <th className={styles.amount}>Budgeted</th>
            <th className={styles.amount}>Actual</th>
            <th className={styles.amount}>Remaining</th>
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
