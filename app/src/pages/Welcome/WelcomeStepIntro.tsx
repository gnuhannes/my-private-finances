import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { useUpdateAppSettings } from "../../hooks/useAppSettings";
import type { AppSettings } from "../../lib/api/appSettings";
import styles from "./WelcomeWizard.module.css";

interface WelcomeStepIntroProps {
  settings: AppSettings;
}

export function WelcomeStepIntro({ settings }: WelcomeStepIntroProps) {
  const { t } = useTranslation();
  const updateSettings = useUpdateAppSettings();
  const [currency, setCurrency] = useState(settings.default_currency);

  function commitCurrency() {
    const normalized = currency.trim().toUpperCase() || "EUR";
    setCurrency(normalized);
    if (normalized !== settings.default_currency) {
      updateSettings.mutate({ default_currency: normalized });
    }
  }

  function handleLanguageChange(lang: "en" | "de") {
    updateSettings.mutate({ locale: lang });
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>{t("welcome.introTitle")}</h2>
      <p className={styles.stepCopy}>{t("welcome.introPrivacy")}</p>

      <div className={styles.form}>
        <label className={styles.field}>
          {t("welcome.languageLabel")}
          <LanguageSwitcher onChange={handleLanguageChange} />
        </label>
        <label className={styles.field}>
          {t("welcome.currencyLabel")}
          <input
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value)}
            onBlur={commitCurrency}
          />
        </label>
      </div>
    </div>
  );
}
