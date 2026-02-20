import React, { useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { useNetWorth, useUpdateAccount, useCreateAccount } from "../hooks/useNetWorth";
import { NetWorthAreaChart } from "../components/NetWorthAreaChart";
import { formatCurrency, formatMoneyString } from "../utils/money";
import type { Account } from "../lib/api/accounts";
import styles from "./NetWorth.module.css";

const MONTH_OPTIONS = [6, 12, 24] as const;

type EditState = {
  opening_balance: string;
  opening_balance_date: string;
};

function AccountRow({
  account,
  summary,
  onSave,
  currency,
}: {
  account: Account;
  summary?: { current_balance: string; month_over_month_change: string } | null;
  onSave: (id: number, data: { opening_balance: string; opening_balance_date: string }) => void;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>({
    opening_balance: account.opening_balance ?? "",
    opening_balance_date: account.opening_balance_date ?? "",
  });

  const hasSetup = account.opening_balance !== null && account.opening_balance_date !== null;
  const change = summary ? parseFloat(summary.month_over_month_change) : null;

  function handleSave() {
    if (!form.opening_balance || !form.opening_balance_date) return;
    onSave(account.id, form);
    setEditing(false);
  }

  return (
    <tr>
      <td className={styles.accountName}>{account.name}</td>
      <td>
        {editing ? (
          <div className={styles.editRow}>
            <input
              type="number"
              step="0.01"
              value={form.opening_balance}
              placeholder="0.00"
              className={styles.input}
              onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
            />
            <input
              type="date"
              value={form.opening_balance_date}
              className={styles.input}
              onChange={(e) => setForm((f) => ({ ...f, opening_balance_date: e.target.value }))}
            />
            <button type="button" className={styles.saveBtn} onClick={handleSave}>
              Save
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        ) : hasSetup ? (
          <span className={styles.openingInfo}>
            {formatMoneyString(account.opening_balance!, currency)} as of{" "}
            {account.opening_balance_date}
            <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
              Edit
            </button>
          </span>
        ) : (
          <button type="button" className={styles.setupBtn} onClick={() => setEditing(true)}>
            Set up opening balance
          </button>
        )}
      </td>
      <td className={styles.right}>
        {summary ? formatMoneyString(summary.current_balance, currency) : "—"}
      </td>
      <td
        className={`${styles.right} ${change !== null ? (change >= 0 ? styles.positive : styles.negative) : ""}`}
      >
        {change !== null ? (change >= 0 ? "+" : "") + formatCurrency(change, currency) : "—"}
      </td>
    </tr>
  );
}

export default function NetWorth() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [months, setMonths] = useState<6 | 12 | 24>(12);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState("EUR");

  const { data: report, isLoading: reportLoading, isError } = useNetWorth(months);
  const updateAccount = useUpdateAccount();
  const createAccount = useCreateAccount();

  if (accountsLoading) return <div className={styles.status}>Loading…</div>;
  if (!accounts) return <div className={styles.status}>Failed to load accounts.</div>;

  const currency = report?.currency ?? accounts[0]?.currency ?? "EUR";

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createAccount.mutate(
      { name: newName.trim(), currency: newCurrency.toUpperCase() || "EUR" },
      {
        onSuccess: () => {
          setAddingAccount(false);
          setNewName("");
          setNewCurrency("EUR");
        },
      },
    );
  }
  const summaryMap = Object.fromEntries((report?.accounts ?? []).map((s) => [s.account_id, s]));

  const totalChange = report ? parseFloat(report.month_over_month_change) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Net Worth</h1>
      <p className={styles.subtitle}>
        Computed as opening balance + all non-transfer transactions since that date.
      </p>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Total Net Worth</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.current_total, currency) : "—"}
          </p>
        </div>
        {totalChange !== null && (
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Month-over-month</p>
            <p
              className={`${styles.kpiValue} ${totalChange >= 0 ? styles.positive : styles.negative}`}
            >
              {totalChange >= 0 ? "+" : ""}
              {formatCurrency(totalChange, currency)}
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <span className={styles.chartTitle}>Net Worth Over Time</span>
          <div className={styles.monthToggle}>
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.toggleBtn} ${months === m ? styles.toggleActive : ""}`}
                onClick={() => setMonths(m)}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
        {reportLoading && <div className={styles.status}>Loading chart…</div>}
        {isError && <div className={styles.error}>Failed to load net worth data.</div>}
        {report && report.history.length > 0 && (
          <NetWorthAreaChart
            history={report.history}
            formatValue={(v) => formatCurrency(v, currency)}
          />
        )}
        {report && report.history.length === 0 && (
          <p className={styles.empty}>No data yet. Set an opening balance below to get started.</p>
        )}
      </div>

      {/* Per-account table */}
      <div className={styles.tableSection}>
        <div className={styles.tableTitleRow}>
          <h2 className={styles.tableTitle}>Accounts</h2>
          {!addingAccount && (
            <button
              type="button"
              className={styles.setupBtn}
              onClick={() => setAddingAccount(true)}
            >
              + New Account
            </button>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className={styles.empty}>No accounts yet. Create one below to get started.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Opening Balance</th>
                  <th className={styles.right}>Current Balance</th>
                  <th className={styles.right}>MoM Change</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    summary={summaryMap[acc.id] ?? null}
                    currency={currency}
                    onSave={(id, data) => updateAccount.mutate({ id, data })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {addingAccount && (
          <form className={styles.newAccountForm} onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Account name"
              value={newName}
              className={styles.input}
              maxLength={120}
              required
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="EUR"
              value={newCurrency}
              className={styles.currencyInput}
              maxLength={3}
              onChange={(e) => setNewCurrency(e.target.value)}
            />
            {createAccount.isError && (
              <span className={styles.createError}>Failed to create account.</span>
            )}
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={!newName.trim() || createAccount.isPending}
            >
              {createAccount.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setAddingAccount(false);
                setNewName("");
                setNewCurrency("EUR");
                createAccount.reset();
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
