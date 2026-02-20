import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileDropZone } from "../components/FileDropZone";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { restoreSqlite, deleteTransactions, wipeAllData } from "../lib/api/settings";
import styles from "./Settings.module.css";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const restoreMutation = useMutation({
    mutationFn: (file: File) => restoreSqlite(file),
    onSuccess: () => {
      queryClient.clear();
      setRestoreFile(null);
      setRestoreSuccess(true);
    },
  });

  const deleteTransactionsMutation = useMutation({
    mutationFn: deleteTransactions,
    onSuccess: () => {
      queryClient.clear();
      void navigate("/");
    },
  });

  const wipeAllMutation = useMutation({
    mutationFn: wipeAllData,
    onSuccess: () => {
      queryClient.clear();
      void navigate("/");
    },
  });

  function handleDeleteTransactions() {
    if (window.confirm(t("settings.deleteTransactionsConfirm"))) {
      deleteTransactionsMutation.mutate();
    }
  }

  function handleWipeAll() {
    if (window.confirm(t("settings.wipeAllConfirm"))) {
      wipeAllMutation.mutate();
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("settings.title")}</h1>

      {/* Backup & Restore */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("settings.backupTitle")}</h2>
        <p className={styles.sectionSubtitle}>{t("settings.backupSubtitle")}</p>

        <div className={styles.downloadRow}>
          <a href="/api/export/sqlite" download className={styles.downloadBtn}>
            {t("settings.downloadSqlite")}
          </a>
          <a href="/api/export/json" download className={styles.downloadBtn}>
            {t("settings.downloadJson")}
          </a>
        </div>

        <h3 className={styles.subTitle}>{t("settings.restoreTitle")}</h3>
        <p className={styles.warning}>{t("settings.restoreWarning")}</p>

        {restoreSuccess ? (
          <p className={styles.success}>{t("settings.restoreSuccess")}</p>
        ) : (
          <>
            <FileDropZone
              file={restoreFile}
              onFile={(f) => {
                setRestoreFile(f);
                restoreMutation.reset();
              }}
              accept=".sqlite"
              placeholder={t("settings.restorePlaceholder")}
            />
            {restoreFile && (
              <div className={styles.restoreActions}>
                <button
                  type="button"
                  onClick={() => restoreMutation.mutate(restoreFile)}
                  disabled={restoreMutation.isPending}
                >
                  {restoreMutation.isPending ? t("settings.restoring") : t("settings.restoreBtn")}
                </button>
                <button type="button" onClick={() => setRestoreFile(null)}>
                  {t("common.cancel")}
                </button>
              </div>
            )}
            {restoreMutation.isError && (
              <p className={styles.error}>
                {t("settings.restoreError", {
                  error: (restoreMutation.error as Error).message,
                })}
              </p>
            )}
          </>
        )}
      </section>

      {/* Language */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("settings.languageTitle")}</h2>
        <LanguageSwitcher />
      </section>

      {/* Danger Zone */}
      <section className={styles.dangerSection}>
        <h2 className={styles.sectionTitle}>{t("settings.dangerTitle")}</h2>
        <div className={styles.dangerRow}>
          <div className={styles.dangerItem}>
            <span className={styles.dangerLabel}>{t("settings.deleteTransactionsDesc")}</span>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={handleDeleteTransactions}
              disabled={deleteTransactionsMutation.isPending}
            >
              {t("settings.deleteTransactions")}
            </button>
          </div>
          <div className={styles.dangerItem}>
            <span className={styles.dangerLabel}>{t("settings.wipeAllDesc")}</span>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={handleWipeAll}
              disabled={wipeAllMutation.isPending}
            >
              {t("settings.wipeAll")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
