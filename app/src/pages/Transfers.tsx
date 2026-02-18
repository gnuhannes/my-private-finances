import {
  useConfirmTransfer,
  useDetectTransfers,
  useDismissTransfer,
  useTransferCandidates,
} from "../hooks/useTransferCandidates";
import { TransferCandidatesTable } from "../components/TransferCandidatesTable";
import styles from "./Transfers.module.css";

export default function Transfers() {
  const pending = useTransferCandidates("pending");
  const confirmed = useTransferCandidates("confirmed");

  const detectMutation = useDetectTransfers();
  const confirmMutation = useConfirmTransfer();
  const dismissMutation = useDismissTransfer();

  const pendingCount = pending.data?.length ?? 0;
  const confirmedCount = confirmed.data?.length ?? 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inter-Account Transfers</h1>
      <p className={styles.subtitle}>
        Identify transfers between your accounts so they are excluded from spending reports.
        Confirmed transfers are hidden from expense totals and category breakdowns.
      </p>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.detectBtn}
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending}
        >
          {detectMutation.isPending ? "Detecting..." : "Detect Transfers"}
        </button>
        {detectMutation.isSuccess && detectMutation.data.length === 0 && (
          <span className={styles.statusMsg}>No new transfer candidates found.</span>
        )}
        {detectMutation.isSuccess && detectMutation.data.length > 0 && (
          <span className={styles.statusMsg}>
            Found {detectMutation.data.length} new candidate
            {detectMutation.data.length !== 1 ? "s" : ""}.
          </span>
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Pending Review
          {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
        </h2>

        {pending.isLoading && <p className={styles.status}>Loading...</p>}
        {pending.isError && <p className={styles.error}>Failed to load candidates.</p>}

        {pending.data && pending.data.length === 0 && (
          <p className={styles.empty}>
            No pending transfer candidates. Click &quot;Detect Transfers&quot; to scan your
            transactions.
          </p>
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
            Confirmed Transfers
            <span className={styles.badge}>{confirmedCount}</span>
          </h2>
          <TransferCandidatesTable items={confirmed.data ?? []} />
        </section>
      )}
    </div>
  );
}
