import styles from "./PlaceholderSection.module.css";

interface PlaceholderSectionProps {
  message?: string;
}

export function PlaceholderSection({
  message = "Tato sekce je připravená pro další implementaci.",
}: PlaceholderSectionProps) {
  return (
    <section className={styles.section}>
      <p className={styles.message}>{message}</p>
    </section>
  );
}
