import { useTranslation } from "react-i18next";
import type { TransactionItem } from "../lib/api";
import type { Category } from "../lib/api/categories";
import { CategorySelect, type CategorySuggestion } from "./CategorySelect";
import { formatMoneyString } from "../utils/money";
import styles from "./TransactionTable.module.css";

type Props = {
  items: TransactionItem[];
  currency: string;
  categories: Category[];
  onCategoryChange: (transactionId: number, categoryId: number | null) => void;
  suggestions?: Map<number, CategorySuggestion>;
};

export function TransactionTable({
  items,
  currency,
  categories,
  onCategoryChange,
  suggestions,
}: Props) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return <p className={styles.empty}>{t("transactionTable.noTransactions")}</p>;
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("transactionTable.tableDate")}</th>
            <th>{t("transactionTable.tablePayee")}</th>
            <th>{t("transactionTable.tablePurpose")}</th>
            <th>{t("transactionTable.tableCategory")}</th>
            <th className={styles.amount}>{t("transactionTable.tableAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.booking_date}</td>
              <td>{tx.payee ?? ""}</td>
              <td>{tx.purpose ?? ""}</td>
              <td>
                <CategorySelect
                  categories={categories}
                  value={tx.category_id ?? null}
                  onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
                  allowEmpty
                  suggestion={suggestions?.get(tx.id)}
                  size="sm"
                />
              </td>
              <td className={styles.amount}>{formatMoneyString(tx.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
