type Props = {
    label: string;
    value: string;
    loading?: boolean;
};

export function KpiCard({ label, value, loading }: Props) {
    return (
        <div
            style={{
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 12,
                padding: 14,
                minWidth: 180,
            }}
        >
            <div style={{ fontSize: 13, opacity: 0.75 }}>{label}</div>
            <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {loading ? "…" : value}
            </div>
        </div>
    );
}
