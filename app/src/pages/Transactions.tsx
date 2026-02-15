import { useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { TransactionTable } from "../components/TransactionTable";
import { Pagination } from "../components/Pagination";
import styles from "./Transactions.module.css";

const PAGE_SIZE = 50;

export default function Transactions() {
  const { data: accounts, isLoading, error } = useAccounts();

  const [accountId, setAccountId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);

  const selectedAccountId = accountId ?? (accounts && accounts.length > 0 ? accounts[0].id : null);

  const txQuery = useTransactions({
    accountId: selectedAccountId,
    limit: PAGE_SIZE,
    offset,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const currency = accounts?.find((a) => a.id === selectedAccountId)?.currency ?? "EUR";

  if (isLoading) return <div className={styles.status}>Loading accounts…</div>;
  if (error) return <div className={styles.error}>Failed to load accounts.</div>;
  if (!accounts || accounts.length === 0) return <div>No accounts yet.</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Transactions</h1>
      <p className={styles.subtitle}>Browse and filter transactions for an account.</p>

      <div className={styles.controlsRow}>
        <label className={styles.control}>
          <span>Account</span>
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => {
              setAccountId(e.target.value === "" ? null : Number(e.target.value));
              setOffset(0);
            }}
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.name} ({a.currency})
              </option>
            ))}
          </select>
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
      </div>

      {txQuery.isLoading && <div className={styles.status}>Loading transactions…</div>}

      {txQuery.isError && (
        <div className={styles.error}>
          Failed to load transactions: {(txQuery.error as Error).message}
        </div>
      )}

      {txQuery.data && (
        <div className={styles.section}>
          <TransactionTable items={txQuery.data.items} currency={currency} />
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
