import { useMemo, useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { formatMoneyString, formatCurrency } from "../utils/money";
import { KpiCard } from "../components/KpiCard";
import { TopPayeesBarChart, type TopPayee } from "../components/TopPayeesBarChart";

function monthKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function lastNMonths(n: number): string[] {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(monthKey(d));
    }
    return out;
}

export default function Dashboard() {
    const { data: accounts, isLoading, error } = useAccounts();

    const months = useMemo(() => lastNMonths(24), []);
    const [accountId, setAccountId] = useState<number | null>(null);
    const [month, setMonth] = useState<string>(months[0]);

    const selectedAccountId =
        accountId ?? (accounts && accounts.length > 0 ? accounts[0].id : null);

    const report = useMonthlyReport(selectedAccountId, month);

    if (isLoading) return <div>Loading accounts…</div>;
    if (error) return <div>Failed to load accounts.</div>;
    if (!accounts || accounts.length === 0) return <div>No accounts yet.</div>;

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ margin: 0 }}>My Private Finances</h1>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
                Local-first dashboard (frontend).
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span>Account</span>
                    <select
                        value={selectedAccountId ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            setAccountId(v === "" ? null : Number(v));
                        }}
                    >
                        <option value="">Select account…</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                #{a.id} — {a.name} ({a.currency})
                            </option>
                        ))}
                    </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span>Month</span>
                    <select value={month} onChange={(e) => setMonth(e.target.value)}>
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {report.isLoading && <div style={{ marginTop: 16 }}>Loading report…</div>}

            {report.isError && (
                <div style={{ marginTop: 16, color: "crimson" }}>
                    Failed to load report: {(report.error as Error).message}
                </div>
            )}

            {report.data && (
                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <KpiCard
                            label="Income"
                            value={formatMoneyString(report.data.income_total, report.data.currency)}
                            loading={report.isLoading}
                        />
                        <KpiCard
                            label="Expenses"
                            value={formatMoneyString(report.data.expense_total, report.data.currency)}
                            loading={report.isLoading}
                        />
                        <KpiCard
                            label="Net"
                            value={formatMoneyString(report.data.net_total, report.data.currency)}
                            loading={report.isLoading}
                        />
                        <KpiCard
                            label="Transactions"
                            value={String(report.data.transactions_count)}
                            loading={report.isLoading}
                        />
                    </div>

                    {report.data.top_payees.length > 0 ? (
                        <TopPayeesBarChart
                            data={report.data.top_payees
                                .map((p) => {
                                    const payee = p.payee ?? "(unknown)";
                                    const amount = Math.abs(Number(p.total));

                                    if (!Number.isFinite(amount)) {
                                        return null;
                                    }

                                    return { payee, amount } satisfies TopPayee;
                                })
                                .filter((x): x is TopPayee => x !== null)}
                            formatValue={(v) => formatCurrency(v, report.data.currency)}
                        />
                    ) : (
                        <div style={{ opacity: 0.7 }}>No top payees for this month.</div>
                    )}
                </div>
            )}
        </div>
    );
}
