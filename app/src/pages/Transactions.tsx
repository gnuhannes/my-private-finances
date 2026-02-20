import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactions } from "../hooks/useTransactions";
import { useUpdateTransactionCategory } from "../hooks/useUpdateTransactionCategory";
import { TransactionTable } from "../components/TransactionTable";
import { Pagination } from "../components/Pagination";
import styles from "./Transactions.module.css";

const PAGE_SIZE = 50;

export default function Transactions() {
  const { t } = useTranslation();
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: categories } = useCategories();

  const [accountId, setAccountId] = useLocalStorage<number | "all">(
    "pref.transactions.accountId",
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const txQuery = useTransactions({
    accountId,
    limit: PAGE_SIZE,
    offset,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    categoryFilter: uncategorizedOnly ? "uncategorized" : undefined,
    q: searchQ || undefined,
    amountMin: amountMin || undefined,
    amountMax: amountMax || undefined,
  });

  const updateCategory = useUpdateTransactionCategory();

  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const currency =
    accountId === "all"
      ? (accounts?.[0]?.currency ?? "EUR")
      : (accounts?.find((a) => a.id === accountId)?.currency ?? "EUR");

  if (isLoading) return <div className={styles.status}>{t("common.loadingAccounts")}</div>;
  if (error) return <div className={styles.error}>{t("common.failedAccounts")}</div>;
  if (!accounts || accounts.length === 0) return <div>{t("common.noAccountsYet")}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("transactions.title")}</h1>
      <p className={styles.subtitle}>{t("transactions.subtitle")}</p>

      <div className={styles.controlsRow}>
        <label className={styles.control}>
          <span>{t("common.account")}</span>
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value === "all" ? "all" : Number(e.target.value));
              setOffset(0);
            }}
          >
            <option value="all">{t("common.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>{t("transactions.search")}</span>
          <input
            type="search"
            placeholder={t("transactions.payeeOrPurpose")}
            value={searchQ}
            className={styles.searchInput}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.control}>
          <span>{t("common.from")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.control}>
          <span>{t("common.to")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.control}>
          <span>{t("transactions.minAmount")}</span>
          <input
            type="number"
            step="0.01"
            placeholder="-200.00"
            value={amountMin}
            className={styles.amountInput}
            onChange={(e) => {
              setAmountMin(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.control}>
          <span>{t("transactions.maxAmount")}</span>
          <input
            type="number"
            step="0.01"
            placeholder="-10.00"
            value={amountMax}
            className={styles.amountInput}
            onChange={(e) => {
              setAmountMax(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.checkboxControl}>
          <input
            type="checkbox"
            checked={uncategorizedOnly}
            onChange={(e) => {
              setUncategorizedOnly(e.target.checked);
              setOffset(0);
            }}
          />
          <span>{t("transactions.uncategorizedOnly")}</span>
        </label>
      </div>

      {txQuery.isLoading && (
        <div className={styles.status}>{t("transactions.loadingTransactions")}</div>
      )}

      {txQuery.isError && (
        <div className={styles.error}>
          {t("transactions.failedTransactions", { error: (txQuery.error as Error).message })}
        </div>
      )}

      {txQuery.data && (
        <div className={styles.section}>
          <TransactionTable
            items={txQuery.data.items}
            currency={currency}
            categories={categories ?? []}
            onCategoryChange={(transactionId, categoryId) => {
              updateCategory.mutate({ id: transactionId, categoryId });
            }}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPrevious={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            onNext={() => setOffset((o) => o + PAGE_SIZE)}
          />
        </div>
      )}
    </div>
  );
}
