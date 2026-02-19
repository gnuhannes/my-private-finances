import { useState } from "react";
import { useSpendingTrend } from "../hooks/useTrends";
import { TrendBarChart } from "../components/TrendBarChart";
import { formatCurrency, formatMoneyString } from "../utils/money";
import type { CategoryTrendItem } from "../lib/api/trends";
import styles from "./SpendingTrends.module.css";

const LOOKBACK_OPTIONS = [3, 6, 12] as const;

function currentMonthStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type TrendIndicator = "over" | "under" | "on-track";

function getTrend(item: CategoryTrendItem): TrendIndicator {
  const avg = parseFloat(item.avg_monthly);
  const proj = parseFloat(item.projected);
  if (avg === 0) return "on-track";
  const ratio = proj / avg;
  if (ratio >= 1.1) return "over";
  if (ratio <= 0.9) return "under";
  return "on-track";
}

function TrendBadge({ trend }: { trend: TrendIndicator }) {
  const label = trend === "over" ? "over budget" : trend === "under" ? "under budget" : "on track";
  return <span className={`${styles.badge} ${styles[trend]}`}>{label}</span>;
}

export default function SpendingTrends() {
  const [lookback, setLookback] = useState<3 | 6 | 12>(3);
  const month = currentMonthStr();

  const { data: report, isLoading, isError } = useSpendingTrend(lookback, "all", month);

  const currency = report?.currency ?? "EUR";

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Spending Trends</h1>
      <p className={styles.subtitle}>Rolling average vs. current month spend per category.</p>

      {/* Lookback toggle */}
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Lookback:</span>
        <div className={styles.monthToggle}>
          {LOOKBACK_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.toggleBtn} ${lookback === m ? styles.toggleActive : ""}`}
              onClick={() => setLookback(m)}
            >
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Avg Monthly</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_avg_monthly, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>This Month</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_current_month, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Projected</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_projected, currency) : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartSection}>
        <span className={styles.chartTitle}>Top Categories — Avg vs. Actual</span>
        {isLoading && <div className={styles.status}>Loading…</div>}
        {isError && <div className={styles.error}>Failed to load trend data.</div>}
        {report && (
          <TrendBarChart
            categories={report.categories}
            formatValue={(v) => formatCurrency(v, currency)}
          />
        )}
      </div>

      {/* Detail table */}
      {report && report.categories.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className={styles.right}>Avg / Month</th>
                  <th className={styles.right}>This Month</th>
                  <th className={styles.right}>Projected</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((item, i) => {
                  const trend = getTrend(item);
                  return (
                    <tr key={i}>
                      <td className={styles.catName}>{item.category_name ?? "Uncategorized"}</td>
                      <td className={styles.right}>
                        {formatMoneyString(item.avg_monthly, currency)}
                      </td>
                      <td className={styles.right}>
                        {formatMoneyString(item.current_month, currency)}
                      </td>
                      <td className={styles.right}>
                        {formatMoneyString(item.projected, currency)}
                      </td>
                      <td>
                        <TrendBadge trend={trend} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report && report.categories.length === 0 && (
        <p className={styles.empty}>No spending data found. Import transactions to see trends.</p>
      )}
    </div>
  );
}
