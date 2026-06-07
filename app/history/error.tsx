"use client";

import styles from "./error.module.css";

interface HistoryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HistoryError({ reset }: HistoryErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst historii.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
