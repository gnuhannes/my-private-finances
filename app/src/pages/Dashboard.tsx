import { useMemo, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAccounts } from "../hooks/useAccounts";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { useBudgetVsActual } from "../hooks/useBudgetVsActual";
import { useFixedVsVariable } from "../hooks/useFixedVsVariable";
import { useRecurringSummary } from "../hooks/useRecurringPatterns";
import { formatMoneyString, formatCurrency } from "../utils/money";
import { KpiCard } from "../components/KpiCard";
import { TopPayeesBarChart } from "../components/TopPayeesBarChart";
import { CategoryBreakdownChart } from "../components/CategoryBreakdownChart";
import { TopSpendingsTable } from "../components/TopSpendingsTable";
import { BudgetVsActualTable } from "../components/BudgetVsActualTable";
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
  const [accountId, setAccountId] = useLocalStorage<"all" | number>(
    "pref.dashboard.accountId",
    "all",
  );
  const [month, setMonth] = useState<string>(months[0]);

  const isAllAccounts = accountId === "all";

  // Currency: use selected account's currency, or EUR when aggregating
  const currency =
    typeof accountId === "number"
      ? (accounts?.find((a) => a.id === accountId)?.currency ?? "EUR")
      : "EUR";

  const report = useMonthlyReport(accountId, month);
  const budgetReport = useBudgetVsActual(accountId, month);
  const fixedVsVariable = useFixedVsVariable(accountId, month);
  // Recurring summary is per-account only — disabled in "All Accounts" mode
  const recurringSummaryAccountId = typeof accountId === "number" ? accountId : null;
  const recurringSummary = useRecurringSummary(recurringSummaryAccountId);

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
            value={accountId}
            onChange={(e) => {
              const v = e.target.value;
              setAccountId(v === "all" ? "all" : Number(v));
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
              value={formatMoneyString(report.data.income_total, currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label={isAllAccounts ? "Expenses (excl. transfers)" : "Expenses"}
              value={formatMoneyString(report.data.expense_total, currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label="Net"
              value={formatMoneyString(report.data.net_total, currency)}
              loading={report.isLoading}
            />
            <KpiCard
              label="Transactions"
              value={String(report.data.transactions_count)}
              loading={report.isLoading}
            />
            {fixedVsVariable.data && (
              <>
                <KpiCard
                  label="Fixed Costs"
                  value={formatMoneyString(fixedVsVariable.data.fixed_total, currency)}
                  loading={fixedVsVariable.isLoading}
                />
                <KpiCard
                  label="Variable Costs"
                  value={formatMoneyString(fixedVsVariable.data.variable_total, currency)}
                  loading={fixedVsVariable.isLoading}
                />
              </>
            )}
            {recurringSummary.data && (
              <KpiCard
                label="Monthly Recurring"
                value={formatMoneyString(recurringSummary.data.total_monthly_recurring, currency)}
                loading={recurringSummary.isLoading}
              />
            )}
          </div>

          <div className={styles.chartsRow}>
            {report.data.top_payees.length > 0 ? (
              <TopPayeesBarChart
                data={mapTopPayeesForChart(report.data.top_payees)}
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <div className={styles.muted}>No top payees for this month.</div>
            )}

            {report.data.category_breakdown.length > 0 ? (
              <CategoryBreakdownChart
                data={mapCategoryBreakdownForChart(report.data.category_breakdown)}
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <div className={styles.muted}>No category breakdown for this month.</div>
            )}
          </div>

          {report.data.top_spendings.length > 0 ? (
            <TopSpendingsTable
              items={report.data.top_spendings}
              formatAmount={(v) => formatMoneyString(v, currency)}
            />
          ) : (
            <div className={styles.muted}>No spendings for this month.</div>
          )}

          {budgetReport.data && budgetReport.data.length > 0 && (
            <BudgetVsActualTable
              items={budgetReport.data}
              formatAmount={(v) => formatMoneyString(v, currency)}
            />
          )}
        </div>
      )}
    </div>
  );
}
