import { useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactions } from "../hooks/useTransactions";
import { useUpdateTransactionCategory } from "../hooks/useUpdateTransactionCategory";
import { TransactionTable } from "../components/TransactionTable";
import { Pagination } from "../components/Pagination";
import styles from "./Transactions.module.css";

const PAGE_SIZE = 50;

export default function Transactions() {
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: categories } = useCategories();

  const [accountId, setAccountId] = useState<number | "all">("all");
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

  if (isLoading) return <div className={styles.status}>Loading accounts…</div>;
  if (error) return <div className={styles.error}>Failed to load accounts.</div>;
  if (!accounts || accounts.length === 0) return <div>No accounts yet.</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Transactions</h1>
      <p className={styles.subtitle}>Search and filter transactions across all accounts.</p>

      <div className={styles.controlsRow}>
        <label className={styles.control}>
          <span>Account</span>
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value === "all" ? "all" : Number(e.target.value));
              setOffset(0);
            }}
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>Search</span>
          <input
            type="search"
            placeholder="Payee or purpose…"
            value={searchQ}
            className={styles.searchInput}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setOffset(0);
            }}
          />
        </label>

        <label className={styles.control}>
          <span>From</span>
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
          <span>To</span>
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
          <span>Min amount</span>
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
          <span>Max amount</span>
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
          <span>Uncategorized only</span>
        </label>
      </div>

      {txQuery.isLoading && <div className={styles.status}>Loading transactions…</div>}

      {txQuery.isError && (
        <div className={styles.error}>
          Failed to load transactions: {(txQuery.error as Error).message}
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
