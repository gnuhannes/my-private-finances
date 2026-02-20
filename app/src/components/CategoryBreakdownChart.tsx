import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import styles from "./CategoryBreakdownChart.module.css";

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
            <Bar dataKey="amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
