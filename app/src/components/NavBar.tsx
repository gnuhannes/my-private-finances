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
      <NavLink to="/import" className={({ isActive }) => (isActive ? styles.active : "")}>
        Import
      </NavLink>
    </nav>
  );
}
