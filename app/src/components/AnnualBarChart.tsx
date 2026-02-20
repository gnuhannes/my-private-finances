import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MonthSummary } from "../lib/api/annual";
import styles from "./AnnualBarChart.module.css";

type ChartRow = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savings_rate: number;
};

function toChartData(months: MonthSummary[], monthLabels: string[]): ChartRow[] {
  return months.map((m, i) => ({
    month: monthLabels[i] ?? m.month,
    income: parseFloat(m.income),
    expenses: parseFloat(m.expenses),
    net: parseFloat(m.net),
    savings_rate: parseFloat(m.savings_rate),
  }));
}

type Props = {
  months: MonthSummary[];
  formatValue?: (v: number) => string;
};

export function AnnualBarChart({ months, formatValue }: Props) {
  const { t } = useTranslation();
  const monthLabels = [
    t("annual.monthsShort.jan"),
    t("annual.monthsShort.feb"),
    t("annual.monthsShort.mar"),
    t("annual.monthsShort.apr"),
    t("annual.monthsShort.may"),
    t("annual.monthsShort.jun"),
    t("annual.monthsShort.jul"),
    t("annual.monthsShort.aug"),
    t("annual.monthsShort.sep"),
    t("annual.monthsShort.oct"),
    t("annual.monthsShort.nov"),
    t("annual.monthsShort.dec"),
  ];
  const data = toChartData(months, monthLabels);
  const fmt = formatValue ?? String;

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border, #eee)"
          />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis width={90} tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v, name) => [fmt(Number(v)), name]}
            labelFormatter={(label) => label}
          />
          <Legend />
          <Bar
            dataKey="income"
            name={t("annualChart.income")}
            fill="var(--color-success, #28a745)"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name={t("annualChart.expenses")}
            fill="var(--color-danger, #dc3545)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
