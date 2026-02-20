import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../hooks/useLocalStorage";
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
  const { t } = useTranslation();
  const label =
    trend === "over"
      ? t("trends.overBudget")
      : trend === "under"
        ? t("trends.underBudget")
        : t("trends.onTrack");
  return <span className={`${styles.badge} ${styles[trend]}`}>{label}</span>;
}

export default function SpendingTrends() {
  const { t } = useTranslation();
  const [lookback, setLookback] = useLocalStorage<3 | 6 | 12>("pref.spendingTrends.lookback", 3);
  const month = currentMonthStr();

  const { data: report, isLoading, isError } = useSpendingTrend(lookback, "all", month);

  const currency = report?.currency ?? "EUR";

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("trends.title")}</h1>
      <p className={styles.subtitle}>{t("trends.subtitle")}</p>

      {/* Lookback toggle */}
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>{t("trends.lookback")}</span>
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
          <p className={styles.kpiLabel}>{t("trends.avgMonthly")}</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_avg_monthly, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t("trends.thisMonth")}</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_current_month, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t("trends.projected")}</p>
          <p className={styles.kpiValue}>
            {report ? formatMoneyString(report.total_projected, currency) : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartSection}>
        <span className={styles.chartTitle}>{t("trends.chartTitle")}</span>
        {isLoading && <div className={styles.status}>{t("trends.loading")}</div>}
        {isError && <div className={styles.error}>{t("trends.failed")}</div>}
        {report && (
          <TrendBarChart
            categories={report.categories}
            lookback={lookback}
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
                  <th>{t("trends.tableCategory")}</th>
                  <th className={styles.right}>{t("trends.tableAvgMonth")}</th>
                  <th className={styles.right}>{t("trends.tableThisMonth")}</th>
                  <th className={styles.right}>{t("trends.tableProjected")}</th>
                  <th>{t("trends.tableTrend")}</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((item, i) => {
                  const trend = getTrend(item);
                  return (
                    <tr key={i}>
                      <td className={styles.catName}>
                        {item.category_name ?? t("common.uncategorized")}
                      </td>
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
        <p className={styles.empty}>{t("trends.noData")}</p>
      )}
    </div>
  );
}
