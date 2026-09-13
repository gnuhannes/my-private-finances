import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "../hooks/useAccounts";
import { useLinkManualTransfer } from "../hooks/useTransferCandidates";
import type { TransactionItem } from "../lib/api/transactions";
import { ApiError } from "../lib/api/client";
import { TransactionPicker } from "./TransactionPicker";
import styles from "./ManualTransferDialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ManualTransferDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: accounts } = useAccounts();
  const mutation = useLinkManualTransfer();

  const [fromAccountId, setFromAccountId] = useState<number | "">("");
  const [fromQuery, setFromQuery] = useState("");
  const [fromSelected, setFromSelected] = useState<TransactionItem | null>(null);

  const [toAccountId, setToAccountId] = useState<number | "">("");
  const [toQuery, setToQuery] = useState("");
  const [toSelected, setToSelected] = useState<TransactionItem | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const resetSelections = () => {
    setFromAccountId("");
    setFromQuery("");
    setFromSelected(null);
    setToAccountId("");
    setToQuery("");
    setToSelected(null);
  };

  const resetForm = () => {
    resetSelections();
    mutation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLinkAnother = () => {
    resetSelections();
    mutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromSelected || !toSelected) return;
    mutation.mutate({
      fromTransactionId: fromSelected.id,
      toTransactionId: toSelected.id,
    });
  };

  const canSubmit =
    fromSelected !== null &&
    toSelected !== null &&
    fromSelected.account_id !== toSelected.account_id &&
    !mutation.isPending;

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t("transfers.manual.title")}</h2>
        <button type="button" className={styles.closeBtn} onClick={handleClose}>
          &times;
        </button>
      </div>

      {mutation.isSuccess ? (
        <div className={styles.body}>
          <p className={styles.success}>{t("transfers.manual.success")}</p>
          <div className={styles.actions}>
            <button type="button" onClick={handleLinkAnother}>
              {t("transfers.manual.linkAnother")}
            </button>
            <button type="button" onClick={handleClose}>
              {t("transfers.manual.close")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.body}>
          <p className={styles.subtitle}>{t("transfers.manual.subtitle")}</p>

          <TransactionPicker
            label={t("transfers.manual.fromLabel")}
            hint={t("transfers.manual.fromHint")}
            polarity="negative"
            accounts={accounts ?? []}
            excludeAccountId={toAccountId === "" ? null : toAccountId}
            accountId={fromAccountId}
            onAccountChange={(id) => {
              setFromAccountId(id);
              setFromSelected(null);
            }}
            query={fromQuery}
            onQueryChange={setFromQuery}
            selected={fromSelected}
            onSelect={setFromSelected}
            otherLeg={toSelected}
          />

          <TransactionPicker
            label={t("transfers.manual.toLabel")}
            hint={t("transfers.manual.toHint")}
            polarity="positive"
            accounts={accounts ?? []}
            excludeAccountId={fromAccountId === "" ? null : fromAccountId}
            accountId={toAccountId}
            onAccountChange={(id) => {
              setToAccountId(id);
              setToSelected(null);
            }}
            query={toQuery}
            onQueryChange={setToQuery}
            selected={toSelected}
            onSelect={setToSelected}
            otherLeg={fromSelected}
          />

          {mutation.isError && (
            <div className={styles.error}>
              {t("transfers.manual.failed", {
                error:
                  mutation.error instanceof ApiError
                    ? ((mutation.error.body as { detail?: string })?.detail ??
                      mutation.error.message)
                    : mutation.error instanceof Error
                      ? mutation.error.message
                      : String(mutation.error),
              })}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={handleClose}>
              {t("transfers.manual.cancel")}
            </button>
            <button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? t("transfers.manual.linking") : t("transfers.manual.submit")}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
