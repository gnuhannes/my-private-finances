import { useTranslation } from "react-i18next";
import type { ImportResult as ImportResultType } from "../lib/api";
import styles from "./ImportResult.module.css";

type Props = {
  result: ImportResultType;
};

export function ImportResult({ result }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.kpis}>
        <span className={styles.kpi}>
          <span className={styles.kpiLabel}>{t("importResult.totalRows")}</span>
          <span className={styles.kpiValue}>{result.total_rows}</span>
        </span>
        <span className={`${styles.kpi} ${styles.created}`}>
          <span className={styles.kpiLabel}>{t("importResult.created")}</span>
          <span className={styles.kpiValue}>{result.created}</span>
        </span>
        <span className={`${styles.kpi} ${styles.duplicates}`}>
          <span className={styles.kpiLabel}>{t("importResult.duplicates")}</span>
          <span className={styles.kpiValue}>{result.duplicates}</span>
        </span>
        <span className={`${styles.kpi} ${styles.failed}`}>
          <span className={styles.kpiLabel}>{t("importResult.failed")}</span>
          <span className={styles.kpiValue}>{result.failed}</span>
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className={styles.errors}>
          <strong>{t("importResult.errors")}</strong>
          <ul className={styles.errorList}>
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
