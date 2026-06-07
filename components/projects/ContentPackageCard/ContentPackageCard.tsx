import Link from "next/link";
import type { ProjectContentPackage } from "@/lib/api/projects-admin";
import styles from "./ContentPackageCard.module.css";

interface ContentPackageCardProps {
  pkg: ProjectContentPackage;
}

const EMPTY = "—";

export function ContentPackageCard({ pkg }: ContentPackageCardProps) {
  const createdAt = new Date(pkg.createdAt).toLocaleDateString();

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{pkg.title}</h3>
        <span className={styles.status}>{pkg.status}</span>
      </header>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          Funnel: {pkg.funnelStage ?? EMPTY}
        </span>
        <span className={styles.metaItem}>Vytvořeno: {createdAt}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Brief</span>
        <p className={styles.value}>{pkg.briefHook ?? EMPTY}</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Content items: {pkg.itemCount}</span>
        {pkg.platforms.length > 0 ? (
          <ul className={styles.platforms}>
            {pkg.platforms.map((platform) => (
              <li key={platform} className={styles.platform}>
                {platform}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.value}>{EMPTY}</p>
        )}
      </div>

      <footer className={styles.footer}>
        <Link href="/review-queue" className={styles.link}>
          Otevřít Review Queue
        </Link>
      </footer>
    </article>
  );
}
