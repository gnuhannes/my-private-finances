import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateTransaction, useTransactions } from "../hooks/useTransactions";
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
  /** The other side's already-selected leg, if any — used to prefill the "create" form. */
  otherLeg?: TransactionItem | null;
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
  otherLeg = null,
}: Props) {
  const { t } = useTranslation();
  const results = useTransactions({
    accountId: accountId === "" ? null : accountId,
    q: query || undefined,
    limit: 20,
  });
  const createMutation = useCreateTransaction();

  const [creating, setCreating] = useState(false);
  const [createDate, setCreateDate] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createPayee, setCreatePayee] = useState("");
  const [createPurpose, setCreatePurpose] = useState("");

  const account = accounts.find((a) => a.id === accountId);
  const isCashAccount = account?.account_type === "cash";
  const matches = (results.data?.items ?? []).filter((tx) => {
    if (tx.is_transfer) return false;
    const amount = Number(tx.amount);
    return polarity === "negative" ? amount < 0 : amount > 0;
  });

  function resetCreateForm() {
    setCreating(false);
    setCreateDate("");
    setCreateAmount("");
    setCreatePayee("");
    setCreatePurpose("");
    createMutation.reset();
  }

  function openCreateForm() {
    setCreateDate(otherLeg?.booking_date ?? "");
    setCreateAmount(otherLeg ? Math.abs(Number(otherLeg.amount)).toFixed(2) : "");
    setCreatePayee("");
    setCreatePurpose("");
    setCreating(true);
  }

  async function handleCreateSubmit() {
    if (accountId === "" || !createDate || !createAmount) return;
    const signedAmount = polarity === "negative" ? `-${createAmount}` : createAmount;
    const newTx = await createMutation.mutateAsync({
      accountId,
      bookingDate: createDate,
      amount: signedAmount,
      currency: account?.currency,
      payee: createPayee,
      purpose: createPurpose,
    });
    onSelect(newTx);
    resetCreateForm();
  }

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
              onChange={(e) => {
                onAccountChange(e.target.value === "" ? "" : Number(e.target.value));
                resetCreateForm();
              }}
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

          {accountId !== "" && creating && (
            <div className={styles.createForm}>
              <label className={styles.field}>
                <span>{t("transfers.manual.createDate")}</span>
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>{t("transfers.manual.createAmount")}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>{t("transfers.manual.createPayee")}</span>
                <input
                  type="text"
                  value={createPayee}
                  onChange={(e) => setCreatePayee(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>{t("transfers.manual.createPurpose")}</span>
                <input
                  type="text"
                  value={createPurpose}
                  onChange={(e) => setCreatePurpose(e.target.value)}
                />
              </label>

              {createMutation.isError && (
                <p className={styles.error}>{t("transfers.manual.createFailed")}</p>
              )}

              <div className={styles.createActions}>
                <button type="button" onClick={resetCreateForm}>
                  {t("transfers.manual.cancel")}
                </button>
                <button
                  type="button"
                  disabled={!createDate || !createAmount || createMutation.isPending}
                  onClick={handleCreateSubmit}
                >
                  {createMutation.isPending
                    ? t("transfers.manual.creatingTx")
                    : t("transfers.manual.createSubmit")}
                </button>
              </div>
            </div>
          )}

          {accountId !== "" && !creating && (
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

              {isCashAccount && (
                <button type="button" className={styles.createToggle} onClick={openCreateForm}>
                  {t("transfers.manual.createNew")}
                </button>
              )}
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
