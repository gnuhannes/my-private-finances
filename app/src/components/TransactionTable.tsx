import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionItem } from "../lib/api";
import type { Category } from "../lib/api/categories";
import { CategorySelect, type CategorySuggestion } from "./CategorySelect";
import { SplitTransactionDialog } from "./SplitTransactionDialog";
import { useTransactionSplits } from "../hooks/useTransactionSplits";
import { formatMoneyString, EMPTY_CELL } from "../utils/money";
import styles from "./TransactionTable.module.css";

type Props = {
  items: TransactionItem[];
  currency: string;
  categories: Category[];
  onCategoryChange: (transactionId: number, categoryId: number | null) => void;
  suggestions?: Map<number, CategorySuggestion>;
};

function categoryName(categories: Category[], id: number | null): string {
  if (id === null) return "";
  return categories.find((c) => c.id === id)?.name ?? "";
}

function SplitPreviewRow({
  transactionId,
  currency,
  categories,
  colSpan,
}: {
  transactionId: number;
  currency: string;
  categories: Category[];
  colSpan: number;
}) {
  const { data: splits } = useTransactionSplits(transactionId, true);

  return (
    <tr className={styles.previewRow}>
      <td colSpan={colSpan}>
        <ul className={styles.previewList}>
          {(splits ?? []).map((s) => (
            <li key={s.id}>
              <span>{s.category_name ?? categoryName(categories, s.category_id)}</span>
              <span>{formatMoneyString(s.amount, currency)}</span>
            </li>
          ))}
        </ul>
      </td>
    </tr>
  );
}

export function TransactionTable({
  items,
  currency,
  categories,
  onCategoryChange,
  suggestions,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [splitTarget, setSplitTarget] = useState<TransactionItem | null>(null);

  if (items.length === 0) {
    return <p className={styles.empty}>{t("transactionTable.noTransactions")}</p>;
  }

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const colSpan = 6;

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("transactionTable.tableDate")}</th>
            <th>{t("transactionTable.tablePayee")}</th>
            <th>{t("transactionTable.tablePurpose")}</th>
            <th>{t("transactionTable.tableNotes")}</th>
            <th>{t("transactionTable.tableCategory")}</th>
            <th className={styles.amount}>{t("transactionTable.tableAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => {
            const isSplit = tx.split_count > 0;
            const isExpanded = expanded.has(tx.id);
            return (
              <Fragment key={tx.id}>
                <tr>
                  <td>{tx.booking_date}</td>
                  <td>{tx.payee ?? EMPTY_CELL}</td>
                  <td>{tx.purpose ?? EMPTY_CELL}</td>
                  <td>{tx.notes ?? EMPTY_CELL}</td>
                  <td>
                    {isSplit ? (
                      <div className={styles.categoryCell}>
                        <button
                          type="button"
                          className={styles.splitChip}
                          onClick={() => setSplitTarget(tx)}
                        >
                          {t("split.chip", { count: tx.split_count })}
                        </button>
                        <button
                          type="button"
                          className={styles.expandBtn}
                          onClick={() => toggleExpanded(tx.id)}
                          aria-expanded={isExpanded}
                          aria-label={t("split.togglePreview")}
                        >
                          {isExpanded ? "▴" : "▾"}
                        </button>
                      </div>
                    ) : (
                      <div className={styles.categoryCell}>
                        <CategorySelect
                          categories={categories}
                          value={tx.category_id ?? null}
                          onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
                          allowEmpty
                          suggestion={suggestions?.get(tx.id)}
                          size="sm"
                        />
                        {!tx.is_transfer && (
                          <button
                            type="button"
                            className={styles.splitBtn}
                            onClick={() => setSplitTarget(tx)}
                          >
                            {t("split.splitAction")}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={styles.amount}>{formatMoneyString(tx.amount, currency)}</td>
                </tr>
                {isSplit && isExpanded && (
                  <SplitPreviewRow
                    transactionId={tx.id}
                    currency={currency}
                    categories={categories}
                    colSpan={colSpan}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <SplitTransactionDialog
        open={splitTarget !== null}
        onClose={() => setSplitTarget(null)}
        transaction={splitTarget}
        categories={categories}
      />
    </div>
  );
}
