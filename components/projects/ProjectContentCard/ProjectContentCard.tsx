import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { ReviewCardActions } from "@/components/review/ReviewCardActions/ReviewCardActions";
import { GenerateVariantsAction } from "@/components/projects/GenerateVariantsAction/GenerateVariantsAction";
import { MarkPublishedButton } from "@/components/review/MarkPublishedButton/MarkPublishedButton";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import { CopyButton } from "@/components/common/CopyButton/CopyButton";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectContentCard.module.css";

const X_MAX_LENGTH = 280;

interface ProjectContentCardProps {
  projectId: string;
  entry: ProjectContentEntry;
  // When true, renders the approve / reject / edit / regenerate / generate-
  // variants controls (reused from the review queue). Off by default so the
  // Approved / Scheduled tabs stay read-only.
  showActions?: boolean;
  // When true, the card stays read-only but exposes ONLY the "Generate language
  // variants" action on eligible primary cards (entry.canGenerateVariants).
  // Used by the Approved tab after Review UX Consolidation V1 removed the queue.
  showVariantAction?: boolean;
  // When true, the inline video preview + download + video-status badge are
  // suppressed because the video is rendered ONCE at the package level (project
  // review V2). Defaults to false so the Approved / Scheduled tabs keep showing
  // each item's video inline.
  hideVideo?: boolean;
  // When true, the package-level actions (Regenerate package + Generate language
  // variants) are NOT rendered on this card — they live in the package header.
  // Per-item Approve / Reject / Edit and per-variant Regenerate stay here.
  packageActionsInHeader?: boolean;
}

const EMPTY = "—";

export function ProjectContentCard({
  projectId,
  entry,
  showActions = false,
  showVariantAction = false,
  hideVideo = false,
  packageActionsInHeader = false,
}: ProjectContentCardProps) {
  const hasHashtags = entry.hashtags.length > 0;
  const languageBadge = `${entry.isLanguageVariant ? "Variant" : "Primary"} · ${entry.language}`;

  // Title+body platforms (youtube, google_business) expose a standalone title
  // copy action; their publishReadyText is the description / body only.
  const hasPublishTitle = entry.publishTitle !== null;
  const bodyLabel =
    entry.platform === "youtube" ? "description" : "body";
  const isX = entry.platform === "x";
  const publishLength = entry.publishReadyText.length;
  const xOverLimit = isX && publishLength > X_MAX_LENGTH;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.tag}>{entry.platform}</span>
          <span className={styles.tag}>{entry.format}</span>
          <span className={styles.tag}>{languageBadge}</span>
        </div>
        <div className={styles.statuses}>
          <span className={styles.workflowStatus}>Workflow: {entry.status}</span>
          {hideVideo ? null : entry.videoStatus ? (
            <span className={styles.videoStatus}>
              Video: {entry.videoStatus}
            </span>
          ) : (
            <span className={styles.videoStatusMuted}>Video: none</span>
          )}
        </div>
      </header>

      <section className={styles.publishBlock}>
        <div className={styles.publishHeader}>
          <span className={styles.publishTitleLabel}>Ready to publish</span>
          {isX ? (
            <span
              className={
                xOverLimit ? styles.charCountWarning : styles.charCount
              }
            >
              {publishLength}/{X_MAX_LENGTH}
            </span>
          ) : null}
        </div>

        {hasPublishTitle ? (
          <div className={styles.publishField}>
            <div className={styles.publishFieldHeader}>
              <span className={styles.label}>Title</span>
              <CopyButton
                text={entry.publishTitle ?? ""}
                label="Copy title"
              />
            </div>
            <p className={styles.publishText}>{entry.publishTitle ?? EMPTY}</p>
          </div>
        ) : null}

        <div className={styles.publishField}>
          {hasPublishTitle ? (
            <div className={styles.publishFieldHeader}>
              <span className={styles.label}>{bodyLabel}</span>
              <CopyButton
                text={entry.publishReadyText}
                label={`Copy ${bodyLabel}`}
              />
            </div>
          ) : (
            <div className={styles.publishFieldHeader}>
              <span className={styles.label}>Text</span>
              <CopyButton text={entry.publishReadyText} label="Copy" />
            </div>
          )}
          <p className={styles.publishText}>
            {entry.publishReadyText.length > 0 ? entry.publishReadyText : EMPTY}
          </p>
          {xOverLimit ? (
            <p className={styles.charWarningText}>
              Exceeds X&rsquo;s {X_MAX_LENGTH}-character limit — trim before
              posting.
            </p>
          ) : null}
        </div>
      </section>

      {entry.title ? <h3 className={styles.title}>{entry.title}</h3> : null}

      {hideVideo ? null : (
        <VideoPreview
          videoUrl={entry.videoUrl}
          thumbnailUrl={entry.thumbnailUrl}
        />
      )}

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>
          Edit fields (caption · hashtags · CTA)
        </summary>

        <div className={styles.field}>
          <span className={styles.label}>Caption</span>
          <p className={styles.value}>{entry.caption ?? EMPTY}</p>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Hashtags</span>
          {hasHashtags ? (
            <ul className={styles.hashtags}>
              {entry.hashtags.map((tag) => (
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
          <p className={styles.value}>{entry.cta ?? EMPTY}</p>
        </div>
      </details>

      {hideVideo ? null : (
        <VideoDownloads
          projectId={projectId}
          jobId={entry.videoJobId}
          hasMp4={entry.videoUrl !== null}
          hasSubtitle={entry.subtitleUrl !== null}
          hasThumbnail={entry.thumbnailUrl !== null}
        />
      )}

      {showActions ? (
        <ReviewCardActions
          itemId={entry.id}
          projectId={projectId}
          packageId={entry.packageId}
          status={entry.status}
          caption={entry.caption}
          hashtags={entry.hashtags}
          cta={entry.cta}
          isLanguageVariant={entry.isLanguageVariant}
          canGenerateVariants={entry.canGenerateVariants}
          variantLanguage={entry.variantLanguage}
          packageActionsInHeader={packageActionsInHeader}
        />
      ) : showVariantAction ? (
        <div className={styles.variantActions}>
          {entry.status === "approved" ? (
            <MarkPublishedButton itemId={entry.id} projectId={projectId} />
          ) : null}
          {entry.canGenerateItemVariants ? (
            <GenerateVariantsAction projectId={projectId} itemId={entry.id} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
