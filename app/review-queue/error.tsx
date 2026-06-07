"use client";

import styles from "./error.module.css";

interface ReviewQueueErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ReviewQueueError({ reset }: ReviewQueueErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst frontu.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
