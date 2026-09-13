import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useImportCsv } from "../../hooks/useImportCsv";
import { ImportForm } from "../../components/ImportForm";
import { applyRules, type ApplyResult } from "../../lib/api/categorization-rules";
import styles from "./WelcomeWizard.module.css";
import importStyles from "../../components/ImportDialog.module.css";

type WelcomeStepImportProps = {
  onSkip: () => void;
};

export function WelcomeStepImport({ onSkip }: WelcomeStepImportProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = useImportCsv();
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const appliedRef = useRef(false);

  const applyMutation = useMutation({
    mutationFn: applyRules,
    onSuccess: (result) => {
      setApplyResult(result);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  useEffect(() => {
    if (mutation.isSuccess && !appliedRef.current) {
      appliedRef.current = true;
      applyMutation.mutate();
    }
    // applyMutation is stable across renders; only re-run when the import itself succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess]);

  if (mutation.isSuccess) {
    return (
      <div>
        <h2 className={styles.stepTitle}>{t("welcome.importTitle")}</h2>
        <p className={styles.stepCopy}>
          {t("welcome.importSuccess", {
            count: mutation.data.created,
            categorized: applyResult?.categorized ?? 0,
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>{t("welcome.importTitle")}</h2>
      <p className={styles.stepCopy}>{t("welcome.importCopy")}</p>

      <ImportForm
        mutation={mutation}
        renderActions={({ canSubmit, isPending }) => (
          <div className={importStyles.actions}>
            <button type="button" onClick={onSkip}>
              {t("welcome.importLater")}
            </button>
            <button type="submit" disabled={!canSubmit}>
              {isPending ? t("importDialog.importing") : t("importDialog.import")}
            </button>
          </div>
        )}
      />
    </div>
  );
}
