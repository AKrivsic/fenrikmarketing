"use client";

import styles from "./error.module.css";

interface PublishingPlanErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublishingPlanError({ reset }: PublishingPlanErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst publikační plán.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
