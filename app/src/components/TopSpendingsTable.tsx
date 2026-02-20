import { useTranslation } from "react-i18next";
import type { TopSpending } from "../lib/api/reports";
import styles from "./TopSpendingsTable.module.css";

type Props = {
  items: TopSpending[];
  formatAmount: (v: string) => string;
};

export function TopSpendingsTable({ items, formatAmount }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <div className={styles.title}>{t("topSpendings.title")}</div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rank}>{t("topSpendings.tableRank")}</th>
            <th>{t("topSpendings.tableDate")}</th>
            <th>{t("topSpendings.tablePayee")}</th>
            <th>{t("topSpendings.tablePurpose")}</th>
            <th>{t("topSpendings.tableCategory")}</th>
            <th className={styles.amount}>{t("topSpendings.tableAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.booking_date}-${item.amount}-${i}`}>
              <td className={styles.rank}>{i + 1}</td>
              <td>{item.booking_date}</td>
              <td>{item.payee ?? ""}</td>
              <td>{item.purpose ?? ""}</td>
              <td className={item.category_name ? undefined : styles.muted}>
                {item.category_name ?? "—"}
              </td>
              <td className={styles.amount}>{formatAmount(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
