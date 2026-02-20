import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "../hooks/useAccounts";
import { useImportCsv } from "../hooks/useImportCsv";
import { FileDropZone } from "./FileDropZone";
import { ImportResult } from "./ImportResult";
import styles from "./ImportDialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: accounts } = useAccounts();
  const mutation = useImportCsv();

  const [accountId, setAccountId] = useState<number | "">("");
  const [delimiter, setDelimiter] = useState(",");
  const [dateFormat, setDateFormat] = useState("iso");
  const [decimalComma, setDecimalComma] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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
    setAccountId("");
    setDelimiter(",");
    setDateFormat("iso");
    setDecimalComma(false);
    setFile(null);
    mutation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImportAnother = () => {
    setFile(null);
    mutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || accountId === "") return;

    mutation.mutate({
      file,
      accountId: Number(accountId),
      delimiter,
      dateFormat,
      decimalComma,
    });
  };

  const canSubmit = file !== null && accountId !== "" && !mutation.isPending;

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
          <ImportResult result={mutation.data} />
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
        <form onSubmit={handleSubmit} className={styles.body}>
          <label className={styles.field}>
            <span>{t("importDialog.account")}</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">{t("importDialog.selectAccount")}</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} — {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </label>

          <div className={styles.optionsRow}>
            <label className={styles.field}>
              <span>{t("importDialog.delimiter")}</span>
              <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                <option value=",">,</option>
                <option value=";">;</option>
                <option value="&#9;">{t("importDialog.delimiterTab")}</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>{t("importDialog.dateFormat")}</span>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                <option value="iso">{t("importDialog.dateFormatIso")}</option>
                <option value="dmy">{t("importDialog.dateFormatDmy")}</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>{t("importDialog.decimalComma")}</span>
              <input
                type="checkbox"
                checked={decimalComma}
                onChange={(e) => setDecimalComma(e.target.checked)}
              />
            </label>
          </div>

          <FileDropZone onFile={setFile} file={file} />

          {mutation.isError && (
            <div className={styles.error}>
              {t("importDialog.failedImport", { error: (mutation.error as Error).message })}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={handleClose}>
              {t("importDialog.cancel")}
            </button>
            <button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? t("importDialog.importing") : t("importDialog.import")}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
