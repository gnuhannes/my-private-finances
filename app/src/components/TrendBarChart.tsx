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
import type { CategoryTrendItem } from "../lib/api/trends";
import styles from "./TrendBarChart.module.css";

type ChartRow = {
  name: string;
  avg: number;
  actual: number;
};

function toChartData(categories: CategoryTrendItem[], uncategorizedLabel: string): ChartRow[] {
  return categories.slice(0, 15).map((c) => ({
    name: c.category_name ?? uncategorizedLabel,
    avg: parseFloat(c.avg_monthly),
    actual: parseFloat(c.current_month),
  }));
}

type Props = {
  categories: CategoryTrendItem[];
  lookback: number;
  formatValue?: (v: number) => string;
};

export function TrendBarChart({ categories, lookback, formatValue }: Props) {
  const { t } = useTranslation();
  const data = toChartData(categories, t("common.uncategorized"));
  const fmt = formatValue ?? String;

  if (data.length === 0) {
    return <p className={styles.empty}>{t("trendChart.noData")}</p>;
  }

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--color-border, #eee)"
          />
          <XAxis type="number" tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend />
          <Bar
            dataKey="avg"
            name={t("trendChart.avgLabel", { lookback })}
            fill="var(--color-text-muted, #aaa)"
            radius={[0, 2, 2, 0]}
          />
          <Bar
            dataKey="actual"
            name={t("trendChart.thisMonth")}
            fill="var(--color-accent, #0070f3)"
            radius={[0, 2, 2, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
