import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import de from "./de.json";

function getInitialLanguage(): string {
  try {
    const s = localStorage.getItem("pref.language");
    if (s) {
      const p = JSON.parse(s) as string;
      if (p === "en" || p === "de") return p;
    }
  } catch {
    // ignore
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    // React already escapes values — no double-escaping needed
    escapeValue: false,
  },
});

export default i18n;
