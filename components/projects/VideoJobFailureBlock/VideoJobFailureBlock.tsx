import styles from "./VideoJobFailureBlock.module.css";

interface VideoJobFailureBlockProps {
  headline: string | null;
  detail: string | null;
}

export function VideoJobFailureBlock({
  headline,
  detail,
}: VideoJobFailureBlockProps) {
  if (!headline && !detail) {
    return (
      <p className={styles.headline}>
        Render videa selhal (worker neposlal podrobnou chybu).
      </p>
    );
  }

  return (
    <div className={styles.block}>
      {headline ? <p className={styles.headline}>{headline}</p> : null}
      {detail && detail !== headline ? (
        <details className={styles.details}>
          <summary>Technická zpráva z workeru</summary>
          <pre className={styles.detail}>{detail}</pre>
        </details>
      ) : null}
    </div>
  );
}
