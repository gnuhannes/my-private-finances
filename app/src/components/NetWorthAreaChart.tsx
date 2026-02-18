import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { NetWorthPoint } from "../lib/api/netWorth";
import styles from "./NetWorthAreaChart.module.css";

type ChartRow = {
  month: string;
  total: number;
};

function toChartData(history: NetWorthPoint[]): ChartRow[] {
  return history.map((p) => ({
    month: p.month,
    total: parseFloat(p.total),
  }));
}

type Props = {
  history: NetWorthPoint[];
  formatValue?: (v: number) => string;
};

export function NetWorthAreaChart({ history, formatValue }: Props) {
  const data = toChartData(history);
  const fmt = formatValue ?? String;

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent, #0070f3)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-accent, #0070f3)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #eee)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis width={90} tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--color-accent, #0070f3)"
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
