import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../hooks/useLocalStorage";
import styles from "./LanguageSwitcher.module.css";

interface LanguageSwitcherProps {
  /** Called after the language has changed, e.g. to persist it server-side. */
  onChange?: (lang: "en" | "de") => void;
}

export function LanguageSwitcher({ onChange }: LanguageSwitcherProps = {}) {
  const { i18n } = useTranslation();
  const [, setStoredLang] = useLocalStorage<"en" | "de">("pref.language", "en");

  function handleChange(lang: "en" | "de") {
    setStoredLang(lang);
    void i18n.changeLanguage(lang);
    onChange?.(lang);
  }

  const current = i18n.language as "en" | "de";

  return (
    <div className={styles.switcher}>
      {(["en", "de"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          className={`${styles.btn} ${current === lang ? styles.active : ""}`}
          aria-pressed={current === lang}
          onClick={() => handleChange(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
