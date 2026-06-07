"use client";

import styles from "./error.module.css";

interface ProjectAssetsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProjectAssetsError({ reset }: ProjectAssetsErrorProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Nepodařilo se načíst assety.</p>
      <button type="button" className={styles.button} onClick={() => reset()}>
        Zkusit znovu
      </button>
    </div>
  );
}
