"use client";

import styles from "./error.module.css";

interface ContentPackagesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ContentPackagesError({
  reset,
}: ContentPackagesErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst balíčky.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
