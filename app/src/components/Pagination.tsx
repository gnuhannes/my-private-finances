import styles from "./Pagination.module.css";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function Pagination({ page, totalPages, total, onPrevious, onNext }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button disabled={page <= 1} onClick={onPrevious}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages} ({total} transactions)
      </span>
      <button disabled={page >= totalPages} onClick={onNext}>
        Next
      </button>
    </div>
  );
}
