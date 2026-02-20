import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccounts } from "../hooks/useAccounts";
import { useRecurringPatterns, useRecurringSummary } from "../hooks/useRecurringPatterns";
import { detectRecurringPatterns, updateRecurringPattern } from "../lib/api/recurringPatterns";
import { formatMoneyString } from "../utils/money";
import { RecurringPatternsTable } from "../components/RecurringPatternsTable";
import styles from "./Recurring.module.css";

export default function Recurring() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [accountId, setAccountId] = useLocalStorage<number | null>(
    "pref.recurring.accountId",
    null,
  );
  const [showInactive, setShowInactive] = useLocalStorage<boolean>(
    "pref.recurring.showInactive",
    false,
  );

  const selectedAccountId = accountId ?? (accounts && accounts.length > 0 ? accounts[0].id : null);
  const currency = accounts?.find((a) => a.id === selectedAccountId)?.currency ?? "EUR";

  const patterns = useRecurringPatterns(selectedAccountId, showInactive);
  const summary = useRecurringSummary(selectedAccountId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring-patterns"] });
  };

  const detectMutation = useMutation({
    mutationFn: () => detectRecurringPatterns(selectedAccountId!),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { is_active?: boolean; user_confirmed?: boolean };
    }) => updateRecurringPattern(id, data),
    onSuccess: invalidate,
  });

  if (accountsLoading) return <div className={styles.status}>{t("recurring.loading")}</div>;
  if (!accounts || accounts.length === 0)
    return <div className={styles.status}>{t("common.noAccountsYet")}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("recurring.title")}</h1>
      <p className={styles.subtitle}>{t("recurring.subtitle")}</p>

      <div className={styles.controls}>
        <div className={styles.field}>
          <label>{t("common.account")}</label>
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setAccountId(e.target.value === "" ? null : Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
        <button
          className={styles.detectBtn}
          type="button"
          onClick={() => detectMutation.mutate()}
          disabled={!selectedAccountId || detectMutation.isPending}
        >
          {detectMutation.isPending ? t("recurring.detecting") : t("recurring.detectPatterns")}
        </button>
        <label>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />{" "}
          {t("recurring.showInactive")}
        </label>
      </div>

      {summary.data && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>{t("recurring.monthlyRecurring")}</p>
            <p className={styles.summaryValue}>
              {formatMoneyString(summary.data.total_monthly_recurring, currency)}
            </p>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>{t("recurring.patternsFound")}</p>
            <p className={styles.summaryValue}>{summary.data.pattern_count}</p>
          </div>
        </div>
      )}

      {patterns.isLoading && <div className={styles.status}>{t("recurring.loadingPatterns")}</div>}
      {patterns.isError && <div className={styles.error}>{t("recurring.failedPatterns")}</div>}

      {patterns.data && patterns.data.length === 0 && (
        <p className={styles.empty}>{t("recurring.noPatterns")}</p>
      )}

      {patterns.data && patterns.data.length > 0 && (
        <RecurringPatternsTable
          items={patterns.data}
          formatAmount={(v) => formatMoneyString(v, currency)}
          onToggleActive={(id, isActive) =>
            updateMutation.mutate({ id, data: { is_active: isActive } })
          }
          onToggleConfirmed={(id, confirmed) =>
            updateMutation.mutate({
              id,
              data: { user_confirmed: confirmed },
            })
          }
        />
      )}
    </div>
  );
}
