import Link from "next/link";
import { NavLink } from "@/components/NavLink/NavLink";
import { FenrikStudioLogo } from "@/components/brand/FenrikStudioLogo/FenrikStudioLogo";
import { NAV_ITEMS } from "@/lib/nav/navItems";
import styles from "./SideNav.module.css";

export function SideNav() {
  return (
    <nav className={styles.nav} aria-label="Hlavní navigace">
      <Link href="/dashboard" className={styles.brandLink}>
        <FenrikStudioLogo variant="nav" />
      </Link>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={item.label} />
          </li>
        ))}
      </ul>
      <form action="/api/admin-logout" method="post" className={styles.logoutForm}>
        <button type="submit" className={styles.logoutBtn}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
