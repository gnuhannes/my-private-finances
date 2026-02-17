import { useMemo, useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { formatMoneyString, formatCurrency } from "../utils/money";
import { KpiCard } from "../components/KpiCard";
import { TopPayeesBarChart } from "../components/TopPayeesBarChart";
import { CategoryBreakdownChart } from "../components/CategoryBreakdownChart";
import { mapTopPayeesForChart, mapCategoryBreakdownForChart } from "../domain/reports";
import styles from "./Dashboard.module.css";

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export default function Dashboard() {
  const { data: accounts, isLoading, error } = useAccounts();

  const months = useMemo(() => lastNMonths(24), []);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [month, setMonth] = useState<string>(months[0]);

  const selectedAccountId = accountId ?? (accounts && accounts.length > 0 ? accounts[0].id : null);

  const report = useMonthlyReport(selectedAccountId, month);

  if (isLoading) return <div>Loading accounts…</div>;
  if (error) return <div>Failed to load accounts.</div>;
  if (!accounts || accounts.length === 0) return <div>No accounts yet.</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Private Finances</h1>
      <p className={styles.subtitle}>Local-first dashboard.</p>

      <div className={styles.controlsRow}>
        <label className={styles.control}>
          <span>Account</span>
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setAccountId(v === "" ? null : Number(v));
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
          <span>Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {report.isLoading && <div className={styles.status}>Loading report…</div>}

      {report.isError && (
        <div className={styles.error}>Failed to load report: {(report.error as Error).message}</div>
      )}

      {report.data && (
        <div className={styles.section}>
          <div className={styles.kpiGrid}>
            <KpiCard
              label="Income"
              value={formatMoneyString(report.data.income_total, report.data.currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label="Expenses"
              value={formatMoneyString(report.data.expense_total, report.data.currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label="Net"
              value={formatMoneyString(report.data.net_total, report.data.currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label="Transactions"
              value={String(report.data.transactions_count)}
              loading={report.isLoading}
            />
          </div>

          <div className={styles.chartsRow}>
            {report.data.top_payees.length > 0 ? (
              <TopPayeesBarChart
                data={mapTopPayeesForChart(report.data.top_payees)}
                formatValue={(v) => formatCurrency(v, report.data.currency)}
              />
            ) : (
              <div className={styles.muted}>No top payees for this month.</div>
            )}

            {report.data.category_breakdown.length > 0 ? (
              <CategoryBreakdownChart
                data={mapCategoryBreakdownForChart(report.data.category_breakdown)}
                formatValue={(v) => formatCurrency(v, report.data.currency)}
              />
            ) : (
              <div className={styles.muted}>No category breakdown for this month.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
