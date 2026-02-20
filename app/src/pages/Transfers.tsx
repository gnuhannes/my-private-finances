import { useTranslation } from "react-i18next";
import {
  useConfirmTransfer,
  useDetectTransfers,
  useDismissTransfer,
  useTransferCandidates,
} from "../hooks/useTransferCandidates";
import { TransferCandidatesTable } from "../components/TransferCandidatesTable";
import styles from "./Transfers.module.css";

export default function Transfers() {
  const { t } = useTranslation();
  const pending = useTransferCandidates("pending");
  const confirmed = useTransferCandidates("confirmed");

  const detectMutation = useDetectTransfers();
  const confirmMutation = useConfirmTransfer();
  const dismissMutation = useDismissTransfer();

  const pendingCount = pending.data?.length ?? 0;
  const confirmedCount = confirmed.data?.length ?? 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("transfers.title")}</h1>
      <p className={styles.subtitle}>{t("transfers.subtitle")}</p>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.detectBtn}
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending}
        >
          {detectMutation.isPending ? t("transfers.detecting") : t("transfers.detectTransfers")}
        </button>
        {detectMutation.isSuccess && detectMutation.data.length === 0 && (
          <span className={styles.statusMsg}>{t("transfers.noNewCandidates")}</span>
        )}
        {detectMutation.isSuccess && detectMutation.data.length > 0 && (
          <span className={styles.statusMsg}>
            {t("transfers.foundCandidates", { count: detectMutation.data.length })}
          </span>
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {t("transfers.pendingReview")}
          {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
        </h2>

        {pending.isLoading && <p className={styles.status}>{t("transfers.loading")}</p>}
        {pending.isError && <p className={styles.error}>{t("transfers.failed")}</p>}

        {pending.data && pending.data.length === 0 && (
          <p className={styles.empty}>{t("transfers.noPending")}</p>
        )}

        {pending.data && pending.data.length > 0 && (
          <TransferCandidatesTable
            items={pending.data}
            onConfirm={(id) => confirmMutation.mutate(id)}
            onDismiss={(id) => dismissMutation.mutate(id)}
          />
        )}
      </section>

      {confirmedCount > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t("transfers.confirmedTransfers")}
            <span className={styles.badge}>{confirmedCount}</span>
          </h2>
          <TransferCandidatesTable items={confirmed.data ?? []} />
        </section>
      )}
    </div>
  );
}
