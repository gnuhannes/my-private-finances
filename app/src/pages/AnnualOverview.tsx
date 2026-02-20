import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnnualReport } from "../hooks/useAnnual";
import { AnnualBarChart } from "../components/AnnualBarChart";
import { formatCurrency, formatMoneyString } from "../utils/money";
import type { MonthSummary } from "../lib/api/annual";
import styles from "./AnnualOverview.module.css";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 5;

function savingsRateClass(rate: number, styles: Record<string, string>): string {
  if (rate >= 20) return styles.positive;
  if (rate < 0) return styles.negative;
  return "";
}

function SavingsRateCell({ rate }: { rate: string }) {
  const n = parseFloat(rate);
  return <td className={`${styles.right} ${savingsRateClass(n, styles)}`}>{n.toFixed(1)}%</td>;
}

function MonthRow({
  summary,
  currency,
  monthLabel,
}: {
  summary: MonthSummary;
  currency: string;
  monthLabel: string;
}) {
  const net = parseFloat(summary.net);
  return (
    <tr>
      <td>{monthLabel}</td>
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
  const { t } = useTranslation();
  const [year, setYear] = useState(CURRENT_YEAR);

  const { data: report, isLoading, isError } = useAnnualReport(year, "all");

  const currency = report?.currency ?? "EUR";

  const monthLabels = [
    t("annual.months.january"),
    t("annual.months.february"),
    t("annual.months.march"),
    t("annual.months.april"),
    t("annual.months.may"),
    t("annual.months.june"),
    t("annual.months.july"),
    t("annual.months.august"),
    t("annual.months.september"),
    t("annual.months.october"),
    t("annual.months.november"),
    t("annual.months.december"),
  ];

  function prevYear() {
    setYear((y) => Math.max(y - 1, MIN_YEAR));
  }
  function nextYear() {
    setYear((y) => Math.min(y + 1, CURRENT_YEAR));
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("annual.title")}</h1>
      <p className={styles.subtitle}>{t("annual.subtitle")}</p>

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
          <p className={styles.kpiLabel}>{t("annual.totalIncome")}</p>
          <p className={`${styles.kpiValue} ${styles.positive}`}>
            {report ? formatMoneyString(report.total_income, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t("annual.totalExpenses")}</p>
          <p className={`${styles.kpiValue} ${styles.negative}`}>
            {report ? formatMoneyString(report.total_expenses, currency) : "—"}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{t("annual.netSavings")}</p>
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
          <p className={styles.kpiLabel}>{t("annual.avgSavingsRate")}</p>
          <p
            className={`${styles.kpiValue} ${report ? savingsRateClass(parseFloat(report.avg_savings_rate), styles) : ""}`}
          >
            {report ? `${parseFloat(report.avg_savings_rate).toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartSection}>
        <span className={styles.chartTitle}>{t("annual.chartTitle")}</span>
        {isLoading && <div className={styles.status}>{t("annual.loading")}</div>}
        {isError && <div className={styles.error}>{t("annual.failed")}</div>}
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
                  <th>{t("annual.tableMonth")}</th>
                  <th className={styles.right}>{t("annual.tableIncome")}</th>
                  <th className={styles.right}>{t("annual.tableExpenses")}</th>
                  <th className={styles.right}>{t("annual.tableNet")}</th>
                  <th className={styles.right}>{t("annual.tableSavingsPct")}</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((m, i) => (
                  <MonthRow
                    key={m.month}
                    summary={m}
                    currency={currency}
                    monthLabel={monthLabels[i] ?? m.month}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
