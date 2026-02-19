import { NavLink } from "react-router-dom";
import styles from "./NavBar.module.css";

export function NavBar() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : "")} end>
        Dashboard
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => (isActive ? styles.active : "")}>
        Transactions
      </NavLink>
      <NavLink to="/categories" className={({ isActive }) => (isActive ? styles.active : "")}>
        Categories
      </NavLink>
      <NavLink to="/budgets" className={({ isActive }) => (isActive ? styles.active : "")}>
        Budgets
      </NavLink>
      <NavLink to="/recurring" className={({ isActive }) => (isActive ? styles.active : "")}>
        Recurring
      </NavLink>
      <NavLink to="/transfers" className={({ isActive }) => (isActive ? styles.active : "")}>
        Transfers
      </NavLink>
      <NavLink to="/net-worth" className={({ isActive }) => (isActive ? styles.active : "")}>
        Net Worth
      </NavLink>
      <NavLink to="/spending-trends" className={({ isActive }) => (isActive ? styles.active : "")}>
        Trends
      </NavLink>
      <NavLink to="/annual" className={({ isActive }) => (isActive ? styles.active : "")}>
        Annual
      </NavLink>
      <NavLink to="/rules" className={({ isActive }) => (isActive ? styles.active : "")}>
        Rules
      </NavLink>
      <NavLink to="/import" className={({ isActive }) => (isActive ? styles.active : "")}>
        Import
      </NavLink>
    </nav>
  );
}
