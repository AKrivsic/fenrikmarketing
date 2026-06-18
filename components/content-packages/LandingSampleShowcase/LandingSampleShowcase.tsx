import type { LandingSamplePreview } from "@/lib/api/landing-sample";
import styles from "./LandingSampleShowcase.module.css";

interface LandingSampleShowcaseProps {
  sample: LandingSamplePreview;
}

function SampleCard({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <article className={styles.card}>
      <h3 className={styles.cardLabel}>{label}</h3>
      <p className={styles.cardBody}>{children}</p>
    </article>
  );
}

export function LandingSampleShowcase({ sample }: LandingSampleShowcaseProps) {
  const hashtagLine =
    sample.hashtags.length > 0
      ? sample.hashtags.join(" ")
      : "—";

  return (
    <div className={styles.showcase}>
      <div className={styles.media}>
        {sample.videoUrl ? (
          <video
            className={styles.video}
            src={sample.videoUrl}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          // TODO(landing): Replace placeholder when a published package with a
          // signed video URL is available in production.
          <div className={styles.videoPlaceholder}>
            <p className={styles.placeholderText}>
              Video preview will appear here once a ready-to-post sample is
              linked from production.
            </p>
          </div>
        )}
      </div>
      <div className={styles.cards}>
        <SampleCard label="TikTok caption">{sample.tikTokCaption}</SampleCard>
        <SampleCard label="Instagram caption">
          {sample.instagramCaption}
        </SampleCard>
        <SampleCard label="Facebook post">{sample.facebookPost}</SampleCard>
        <SampleCard label="LinkedIn post">{sample.linkedinPost}</SampleCard>
        <SampleCard label="Hashtags">{hashtagLine}</SampleCard>
      </div>
    </div>
  );
}
