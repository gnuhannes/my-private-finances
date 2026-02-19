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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type ChartRow = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savings_rate: number;
};

function toChartData(months: MonthSummary[]): ChartRow[] {
  return months.map((m, i) => ({
    month: MONTH_LABELS[i] ?? m.month,
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
  const data = toChartData(months);
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
            name="Income"
            fill="var(--color-success, #28a745)"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="var(--color-danger, #dc3545)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
