import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../../hooks/useAccounts";
import { useAppSettings, useUpdateAppSettings } from "../../hooks/useAppSettings";
import { WelcomeStepIntro } from "./WelcomeStepIntro";
import { WelcomeStepAccount } from "./WelcomeStepAccount";
import styles from "./WelcomeWizard.module.css";

/** Full wizard has 5 steps (105-first-run-setup); steps 3-5 land in a later PR. */
const TOTAL_STEPS = 5;

export default function WelcomeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const { data: settings, isLoading } = useAppSettings();
  const { data: accounts } = useAccounts();
  const updateSettings = useUpdateAppSettings();

  const canAdvance = stepIndex === 0 ? true : stepIndex === 1 ? (accounts?.length ?? 0) > 0 : false;

  function handleSkip() {
    updateSettings.mutate(
      { onboarding_completed_at: new Date().toISOString(), onboarding_skipped: true },
      { onSuccess: () => navigate("/") },
    );
  }

  function handleNext() {
    if (!canAdvance) return;
    setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (isLoading || !settings) {
    return <p className={styles.status}>{t("common.loading")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.progress}>
          {t("welcome.stepProgress", { current: stepIndex + 1, total: TOTAL_STEPS })}
        </span>
        <button
          type="button"
          className={styles.skipBtn}
          onClick={handleSkip}
          disabled={updateSettings.isPending}
        >
          {t("welcome.skip")}
        </button>
      </div>

      <div className={styles.content}>
        {stepIndex === 0 && <WelcomeStepIntro settings={settings} />}
        {stepIndex === 1 && <WelcomeStepAccount defaultCurrency={settings.default_currency} />}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={handleBack}
          disabled={stepIndex === 0}
        >
          {t("welcome.back")}
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleNext}
          disabled={!canAdvance}
        >
          {t("welcome.next")}
        </button>
      </div>
    </div>
  );
}
