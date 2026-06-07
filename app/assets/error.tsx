"use client";

import styles from "./error.module.css";

interface AssetsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AssetsError({ reset }: AssetsErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst assety.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
