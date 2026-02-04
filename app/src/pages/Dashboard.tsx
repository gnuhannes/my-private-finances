import { useMemo, useState } from "react";
import { useAccounts } from "../hooks/useAccounts";

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

    if (isLoading) return <div>Loading accounts…</div>;
    if (error) return <div>Failed to load accounts.</div>;
    if (!accounts || accounts.length === 0) return <div>No accounts yet.</div>;

    const selectedAccountId = accountId ?? accounts[0].id;

    return (
        <div>
            <h1 style={{ margin: 0 }}>My Private Finances</h1>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
                Local-first dashboard (frontend).
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span>Account</span>
                    <select
                        value={selectedAccountId}
                        onChange={(e) => setAccountId(Number(e.target.value))}
                    >
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

            <div style={{ marginTop: 24 }}>
                <strong>Next:</strong> load monthly report for account {selectedAccountId} /{" "}
                {month}.
            </div>
        </div>
    );
}
