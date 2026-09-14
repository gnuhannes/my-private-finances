import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { useTransactions } from "../../hooks/useTransactions";
import { useUpdateAppSettings } from "../../hooks/useAppSettings";
import { formatCurrency } from "../../utils/money";
import styles from "./WelcomeWizard.module.css";

type WelcomeStepDoneProps = {
  defaultCurrency: string;
};

export function WelcomeStepDone({ defaultCurrency }: WelcomeStepDoneProps) {
  const { t } = useTranslation();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: transactionsPage } = useTransactions({ accountId: "all", limit: 1 });
  const updateSettings = useUpdateAppSettings();

  const totalBalance = (accounts ?? []).reduce(
    (sum, a) => sum + (a.opening_balance ? Number(a.opening_balance) : 0),
    0,
  );

  function finish() {
    updateSettings.mutate({ onboarding_completed_at: new Date().toISOString() });
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>{t("welcome.doneTitle")}</h2>
      <p className={styles.stepCopy}>
        {t("welcome.doneSummary", {
          accounts: accounts?.length ?? 0,
          balance: formatCurrency(totalBalance, defaultCurrency),
          categories: categories?.length ?? 0,
          transactions: transactionsPage?.total ?? 0,
        })}
      </p>

      <div className={styles.doneLinks}>
        <Link to="/" onClick={finish} className={styles.doneLink}>
          {t("welcome.goToDashboard")}
        </Link>
        <Link to="/import" onClick={finish} className={styles.doneLink}>
          {t("welcome.goToImport")}
        </Link>
        <Link to="/rules" onClick={finish} className={styles.doneLink}>
          {t("welcome.goToRules")}
        </Link>
      </div>
    </div>
  );
}
