import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styles from "./EmptyState.module.css";

type Props = {
  message: string;
};

/** Friendly "no accounts yet" replacement that points a fresh install back at the setup wizard. */
export function EmptyState({ message }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <p className={styles.message}>{message}</p>
      <Link to="/welcome" className={styles.cta}>
        {t("common.emptyStateCta")}
      </Link>
    </div>
  );
}
