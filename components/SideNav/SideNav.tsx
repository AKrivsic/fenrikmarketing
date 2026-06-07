import { NavLink } from "@/components/NavLink/NavLink";
import { NAV_ITEMS } from "@/lib/nav/navItems";
import styles from "./SideNav.module.css";

export function SideNav() {
  return (
    <nav className={styles.nav} aria-label="Hlavní navigace">
      <div className={styles.brand}>AI Content Manager</div>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={item.label} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
