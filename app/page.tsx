import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Fenrik Marketing</h1>
      <p className={styles.lead}>
        Content packages for social media and internal tools for your team.
      </p>
      <ul className={styles.links}>
        <li>
          <Link href="/content-packages">Content packages (public)</Link>
        </li>
        <li>
          <Link href="/admin-login">Admin sign in</Link>
        </li>
      </ul>
    </div>
  );
}
