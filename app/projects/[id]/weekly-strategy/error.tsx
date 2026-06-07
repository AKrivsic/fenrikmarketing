"use client";

import styles from "./error.module.css";

interface WeeklyStrategyErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WeeklyStrategyError({
  reset,
}: WeeklyStrategyErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst týdenní strategii.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
