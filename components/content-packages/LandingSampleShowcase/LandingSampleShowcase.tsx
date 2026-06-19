import type { LandingSamplePreview } from "@/lib/api/landing-sample";
import { PublishPlatformOutputs } from "@/components/content-packages/PublishPlatformOutputs/PublishPlatformOutputs";
import styles from "./LandingSampleShowcase.module.css";

interface LandingSampleShowcaseProps {
  sample: LandingSamplePreview;
}

const PLATFORM_SECTIONS: {
  key: keyof Pick<
    LandingSamplePreview,
    "tikTokCaption" | "instagramCaption" | "facebookPost" | "linkedinPost"
  >;
  label: string;
  defaultOpen?: boolean;
}[] = [
  { key: "tikTokCaption", label: "TikTok", defaultOpen: true },
  { key: "instagramCaption", label: "Instagram" },
  { key: "facebookPost", label: "Facebook" },
  { key: "linkedinPost", label: "LinkedIn" },
];

export function LandingSampleShowcase({ sample }: LandingSampleShowcaseProps) {
  const sections = PLATFORM_SECTIONS.map(({ key, label, defaultOpen }) => ({
    label,
    text: sample[key],
    defaultOpen,
  }));

  return (
    <div className={styles.showcase}>
      <div className={styles.media}>
        {sample.videoUrl ? (
          <video
            className={styles.video}
            src={sample.videoUrl}
            poster={sample.posterUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className={styles.videoPlaceholder}>
            <p className={styles.placeholderText}>
              Video preview will appear here once a ready-to-post sample is
              linked from production.
            </p>
          </div>
        )}
      </div>
      <PublishPlatformOutputs sections={sections} />
    </div>
  );
}
