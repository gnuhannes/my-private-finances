import { useTranslation } from "react-i18next";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import styles from "./CategoryBreakdownChart.module.css";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export type CategoryBreakdownItem = {
  category: string;
  amount: number;
};

type Props = {
  data: CategoryBreakdownItem[];
  formatValue?: (v: number) => string;
};

export function CategoryBreakdownChart({ data, formatValue }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <div className={styles.title}>{t("categoryBreakdown.title")}</div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis
              dataKey="category"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={70}
            />
            <YAxis
              width={90}
              tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
            />
            <Tooltip formatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))} />
            <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
