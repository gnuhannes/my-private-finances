import { useTranslation } from "react-i18next";
import styles from "./KpiCard.module.css";

type Props = {
  label: string;
  value: string;
  loading?: boolean;
};

export function KpiCard({ label, value, loading }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{loading ? t("kpiCard.loading") : value}</div>
    </div>
  );
}
