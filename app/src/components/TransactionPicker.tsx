import { useTranslation } from "react-i18next";
import { useTransactions } from "../hooks/useTransactions";
import type { Account } from "../lib/api/accounts";
import type { TransactionItem } from "../lib/api/transactions";
import { formatMoneyString } from "../utils/money";
import styles from "./TransactionPicker.module.css";

type Props = {
  label: string;
  hint: string;
  /** Only negative-amount transactions are pickable for "negative", only positive for "positive". */
  polarity: "negative" | "positive";
  accounts: Account[];
  /** The account chosen on the other side — excluded from this side's account list. */
  excludeAccountId: number | null;
  accountId: number | "";
  onAccountChange: (id: number | "") => void;
  query: string;
  onQueryChange: (q: string) => void;
  selected: TransactionItem | null;
  onSelect: (tx: TransactionItem | null) => void;
};

export function TransactionPicker({
  label,
  hint,
  polarity,
  accounts,
  excludeAccountId,
  accountId,
  onAccountChange,
  query,
  onQueryChange,
  selected,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const results = useTransactions({
    accountId: accountId === "" ? null : accountId,
    q: query || undefined,
    limit: 20,
  });

  const account = accounts.find((a) => a.id === accountId);
  const matches = (results.data?.items ?? []).filter((tx) => {
    if (tx.is_transfer) return false;
    const amount = Number(tx.amount);
    return polarity === "negative" ? amount < 0 : amount > 0;
  });

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>{label}</legend>
      <p className={styles.hint}>{hint}</p>

      {selected ? (
        <div className={styles.selectedCard}>
          <div className={styles.selectedInfo}>
            <span className={styles.selectedAccount}>{account?.name}</span>
            <span className={styles.selectedDate}>{selected.booking_date}</span>
            <span className={styles.selectedPayee}>{selected.payee ?? "—"}</span>
            <span className={styles.selectedAmount}>
              {formatMoneyString(selected.amount, account?.currency ?? "EUR")}
            </span>
          </div>
          <button type="button" className={styles.changeBtn} onClick={() => onSelect(null)}>
            {t("transfers.manual.change")}
          </button>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            <span>{t("transfers.manual.account")}</span>
            <select
              value={accountId}
              onChange={(e) => onAccountChange(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">{t("transfers.manual.selectAccount")}</option>
              {accounts
                .filter((a) => a.id !== excludeAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>

          {accountId !== "" && (
            <>
              <input
                type="search"
                className={styles.searchInput}
                placeholder={t("transfers.manual.searchPlaceholder")}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
              />

              {results.isLoading && <p className={styles.status}>{t("transfers.loading")}</p>}
              {results.isError && (
                <p className={styles.error}>{t("transfers.manual.searchFailed")}</p>
              )}
              {results.data && matches.length === 0 && (
                <p className={styles.empty}>{t("transfers.manual.noMatches")}</p>
              )}

              {matches.length > 0 && (
                <ul className={styles.results}>
                  {matches.map((tx) => (
                    <li key={tx.id}>
                      <button
                        type="button"
                        className={styles.resultRow}
                        onClick={() => onSelect(tx)}
                      >
                        <span className={styles.resultDate}>{tx.booking_date}</span>
                        <span className={styles.resultPayee}>{tx.payee ?? "—"}</span>
                        <span className={styles.resultAmount}>
                          {formatMoneyString(tx.amount, account?.currency ?? "EUR")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
