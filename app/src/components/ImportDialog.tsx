import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImportCsv } from "../hooks/useImportCsv";
import { ImportForm } from "./ImportForm";
import { ImportResult, type ImportContext } from "./ImportResult";
import styles from "./ImportDialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mutation = useImportCsv();

  const [importContext, setImportContext] = useState<ImportContext | undefined>(undefined);
  const [formResetKey, setFormResetKey] = useState(0);

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

  const resetForm = () => {
    setImportContext(undefined);
    setFormResetKey((k) => k + 1);
    mutation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImportAnother = () => {
    setFormResetKey((k) => k + 1);
    mutation.reset();
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t("importDialog.title")}</h2>
        <button type="button" className={styles.closeBtn} onClick={handleClose}>
          &times;
        </button>
      </div>

      {mutation.isSuccess ? (
        <div className={styles.body}>
          <ImportResult result={mutation.data} importContext={importContext} />
          <div className={styles.actions}>
            <button type="button" onClick={handleImportAnother}>
              {t("importDialog.importAnother")}
            </button>
            <button type="button" onClick={handleClose}>
              {t("importDialog.close")}
            </button>
          </div>
        </div>
      ) : (
        <ImportForm
          key={formResetKey}
          mutation={mutation}
          onSubmit={setImportContext}
          renderActions={({ canSubmit, isPending }) => (
            <div className={styles.actions}>
              <button type="button" onClick={handleClose}>
                {t("importDialog.cancel")}
              </button>
              <button type="submit" disabled={!canSubmit}>
                {isPending ? t("importDialog.importing") : t("importDialog.import")}
              </button>
            </div>
          )}
        />
      )}
    </dialog>
  );
}
