import { useTranslation } from "react-i18next";
import styles from "./Pagination.module.css";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pagination({ page, totalPages, total, onPrevious, onNext }: Props) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button disabled={page <= 1} onClick={onPrevious}>
        {t("pagination.previous")}
      </button>
      <span>{t("pagination.pageInfo", { page, totalPages, total })}</span>
      <button disabled={page >= totalPages} onClick={onNext}>
        {t("pagination.next")}
      </button>
    </div>
  );
}
