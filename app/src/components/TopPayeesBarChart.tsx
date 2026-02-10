import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
    <div style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>Top Payees</div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="payee" tick={{ fontSize: 12 }} />
            <YAxis
              width={90}
              tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;

                const raw = payload[0]?.value;
                const value = typeof raw === "number" ? raw : Number(raw);

                return (
                  <div
                    style={{
                      background: "white",
                      color: "#111",
                      border: "1px solid rgba(0,0,0,0.2)",
                      borderRadius: 10,
                      padding: 10,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                      minWidth: 160,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {label ? String(label) : "(unknown)"}
                    </div>

                    <div style={{ opacity: 0.85 }}>
                      {Number.isFinite(value)
                        ? formatValue
                          ? formatValue(value)
                          : String(value)
                        : "—"}
                    </div>
                  </div>
                );
              }}
            />

            <Bar dataKey="amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
