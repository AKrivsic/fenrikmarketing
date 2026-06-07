import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  configured: boolean;
}

export function StatusBadge({ configured }: StatusBadgeProps) {
  return (
    <span
      className={configured ? `${styles.badge} ${styles.ok}` : `${styles.badge} ${styles.missing}`}
    >
      {configured ? "Configured" : "Missing"}
    </span>
  );
}
