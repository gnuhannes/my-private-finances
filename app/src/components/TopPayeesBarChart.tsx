import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import styles from "./TopPayeesBarChart.module.css";

export type TopPayee = {
  payee: string;
  amount: number;
};

type Props = {
  data: TopPayee[];
  formatValue?: (v: number) => string;
};

export function TopPayeesBarChart({ data, formatValue }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>Top Payees</div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis
              dataKey="payee"
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
