import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "../../hooks/useAccounts";
import { useCreateAccount } from "../../hooks/useNetWorth";
import type { Account } from "../../lib/api/accounts";
import styles from "./WelcomeWizard.module.css";

interface WelcomeStepAccountProps {
  defaultCurrency: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WelcomeStepAccount({ defaultCurrency }: WelcomeStepAccountProps) {
  const { t } = useTranslation();
  const { data: accounts } = useAccounts();
  const createAccount = useCreateAccount();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [balance, setBalance] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [justAdded, setJustAdded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setJustAdded(false);
    const hasBalance = balance.trim() !== "";
    createAccount.mutate(
      {
        name: trimmedName,
        currency: currency.trim().toUpperCase() || "EUR",
        account_type: "bank",
        opening_balance: hasBalance ? balance.trim() : undefined,
        opening_balance_date: hasBalance ? asOfDate : undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setBalance("");
          setCurrency(defaultCurrency);
          setAsOfDate(todayIso());
          setJustAdded(true);
        },
      },
    );
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>{t("welcome.accountTitle")}</h2>
      <p className={styles.stepCopy}>{t("welcome.accountCopy")}</p>

      {accounts && accounts.length > 0 && (
        <ul className={styles.accountList}>
          {accounts.map((account: Account) => (
            <li key={account.id} className={styles.accountItem}>
              <span>{account.name}</span>
              <span>{account.currency}</span>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          {t("common.name")}
          <input value={name} maxLength={120} required onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          {t("welcome.currencyLabel")}
          <input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value)} />
        </label>
        <label className={styles.field}>
          {t("welcome.startingBalanceLabel")}
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {t("welcome.asOfDateLabel")}
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </label>
        <div className={styles.stepActions}>
          <button type="submit" disabled={createAccount.isPending}>
            {t("welcome.addAccount")}
          </button>
          {justAdded && <span className={styles.confirmation}>{t("welcome.accountAdded")}</span>}
        </div>
      </form>
    </div>
  );
}
