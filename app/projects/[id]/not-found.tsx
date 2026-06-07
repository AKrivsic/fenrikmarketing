import Link from "next/link";
import styles from "./not-found.module.css";

export default function ProjectNotFound() {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Projekt nenalezen.</p>
      <Link href="/projects" className={styles.link}>
        Zpět na projekty
      </Link>
    </div>
  );
}
