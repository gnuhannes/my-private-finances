import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import styles from "./NavBar.module.css";

export function NavBar() {
  const { t } = useTranslation();
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : "")} end>
        {t("nav.dashboard")}
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.transactions")}
      </NavLink>
      <NavLink to="/categories" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.categories")}
      </NavLink>
      <NavLink to="/budgets" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.budgets")}
      </NavLink>
      <NavLink to="/recurring" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.recurring")}
      </NavLink>
      <NavLink to="/transfers" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.transfers")}
      </NavLink>
      <NavLink to="/net-worth" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.netWorth")}
      </NavLink>
      <NavLink to="/spending-trends" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.trends")}
      </NavLink>
      <NavLink to="/annual" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.annual")}
      </NavLink>
      <NavLink to="/rules" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.rules")}
      </NavLink>
      <NavLink to="/import" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.import")}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.active : "")}>
        {t("nav.settings")}
      </NavLink>
      <LanguageSwitcher />
    </nav>
  );
}
