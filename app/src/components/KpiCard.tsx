import styles from "./KpiCard.module.css";

type Props = {
  label: string;
  value: string;
  loading?: boolean;
};

export function KpiCard({ label, value, loading }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{loading ? "…" : value}</div>
    </div>
  );
}
