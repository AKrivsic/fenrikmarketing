import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { ReviewCardActions } from "@/components/review/ReviewCardActions/ReviewCardActions";
import type { ReviewQueueItem } from "@/lib/api/review-queue";
import styles from "./ReviewCard.module.css";

interface ReviewCardProps {
  item: ReviewQueueItem;
}

const EMPTY = "—";

export function ReviewCard({ item }: ReviewCardProps) {
  const hasHashtags = item.hashtags.length > 0;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.platform}>{item.platform}</span>
          <span className={styles.format}>{item.format}</span>
        </div>
        <span className={styles.status}>{item.status}</span>
      </header>

      <VideoPreview videoUrl={item.videoUrl} thumbnailUrl={item.thumbnailUrl} />

      <div className={styles.field}>
        <span className={styles.label}>Caption</span>
        <p className={styles.value}>{item.caption ?? EMPTY}</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Hashtags</span>
        {hasHashtags ? (
          <ul className={styles.hashtags}>
            {item.hashtags.map((tag) => (
              <li key={tag} className={styles.hashtag}>
                {tag.startsWith("#") ? tag : `#${tag}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.value}>{EMPTY}</p>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>CTA</span>
        <p className={styles.value}>{item.cta ?? EMPTY}</p>
      </div>

      <ReviewCardActions
        itemId={item.id}
        projectId={item.projectId}
        packageId={item.packageId}
        caption={item.caption}
        hashtags={item.hashtags}
        cta={item.cta}
      />
    </article>
  );
}
