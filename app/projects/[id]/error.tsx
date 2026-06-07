"use client";

import styles from "./error.module.css";

interface ProjectDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProjectDetailError({ reset }: ProjectDetailErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst projekt.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
