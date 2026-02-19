import { useState } from "react";
import { useAnnualReport } from "../hooks/useAnnual";
import { AnnualBarChart } from "../components/AnnualBarChart";
import { formatCurrency, formatMoneyString } from "../utils/money";
import type { MonthSummary } from "../lib/api/annual";
import styles from "./AnnualOverview.module.css";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 5;

function savingsRateClass(rate: number): string {
  if (rate >= 20) return styles.positive;
  if (rate < 0) return styles.negative;
  return "";
}

function SavingsRateCell({ rate }: { rate: string }) {
  const n = parseFloat(rate);
  return <td className={`${styles.right} ${savingsRateClass(n)}`}>{n.toFixed(1)}%</td>;
}

function MonthRow({
  summary,
  currency,
  index,
}: {
  summary: MonthSummary;
  currency: string;
  index: number;
}) {
  const net = parseFloat(summary.net);
  return (
    <tr>
      <td>{MONTH_LABELS[index]}</td>
      <td className={styles.right}>{formatMoneyString(summary.income, currency)}</td>
      <td className={styles.right}>{formatMoneyString(summary.expenses, currency)}</td>
      <td className={`${styles.right} ${net >= 0 ? styles.positive : styles.negative}`}>
        {net >= 0 ? "+" : ""}
        {formatCurrency(net, currency)}
      </td>
      <SavingsRateCell rate={summary.savings_rate} />
    </tr>
  );
}

export default function AnnualOverview() {
  const [year, setYear] = useState(CURRENT_YEAR);

  const { data: report, isLoading, isError } = useAnnualReport(year, "all");

  const currency = report?.currency ?? "EUR";

  function prevYear() {
    setYear((y) => Math.max(y - 1, MIN_YEAR));
  }
  function nextYear() {
    setYear((y) => Math.min(y + 1, CURRENT_YEAR));
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Annual Overview</h1>
      <p className={styles.subtitle}>Income vs expenses across all 12 months.</p>

      {/* Year selector */}
      <div className={styles.yearSelector}>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={prevYear}
          disabled={year <= MIN_YEAR}
        >
          ←
        </button>
        <span className={styles.yearLabel}>{year}</span>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={nextYear}
          disabled={year >= CURRENT_YEAR}
        >
          →
        </button>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Total Income</p>
          <p className={`${styles.kpiValue} ${styles.positive}`}>
            {report ? formatMoneyString(report.total_income, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Total Expenses</p>
          <p className={`${styles.kpiValue} ${styles.negative}`}>
            {report ? formatMoneyString(report.total_expenses, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Net Savings</p>
          <p
            className={`${styles.kpiValue} ${report && parseFloat(report.total_net) >= 0 ? styles.positive : styles.negative}`}
          >
            {report
              ? (parseFloat(report.total_net) >= 0 ? "+" : "") +
                formatCurrency(parseFloat(report.total_net), currency)
              : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Avg Savings Rate</p>
          <p
            className={`${styles.kpiValue} ${report ? savingsRateClass(parseFloat(report.avg_savings_rate)) : ""}`}
          >
            {report ? `${parseFloat(report.avg_savings_rate).toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartSection}>
        <span className={styles.chartTitle}>Income vs Expenses by Month</span>
        {isLoading && <div className={styles.status}>Loading…</div>}
        {isError && <div className={styles.error}>Failed to load annual data.</div>}
        {report && (
          <AnnualBarChart months={report.months} formatValue={(v) => formatCurrency(v, currency)} />
        )}
      </div>

      {/* Month table */}
      {report && (
        <div className={styles.tableSection}>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.right}>Income</th>
                  <th className={styles.right}>Expenses</th>
                  <th className={styles.right}>Net</th>
                  <th className={styles.right}>Savings %</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((m, i) => (
                  <MonthRow key={m.month} summary={m} currency={currency} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
