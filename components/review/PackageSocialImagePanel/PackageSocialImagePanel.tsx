"use client";

import type { ReviewSocialImageView } from "@/lib/content-package/socialImageAccess";
import styles from "./PackageSocialImagePanel.module.css";

interface PackageSocialImagePanelProps {
  projectId: string;
  packageId: string;
  socialImage: ReviewSocialImageView;
}

export function PackageSocialImagePanel({
  projectId,
  packageId,
  socialImage,
}: PackageSocialImagePanelProps) {
  const previewSrc = `/api/projects/${projectId}/social-image?packageId=${encodeURIComponent(packageId)}`;
  const downloadHref = `${previewSrc}&download=1`;

  return (
    <section className={styles.panel} aria-label="Facebook and LinkedIn social image">
      <div className={styles.header}>
        <p className={styles.heading}>Social image (Facebook + LinkedIn)</p>
        <span
          className={
            socialImage.status === "ready"
              ? styles.badgeReady
              : socialImage.status === "failed"
                ? styles.badgeFailed
                : styles.badgeMuted
          }
        >
          {socialImage.status}
        </span>
      </div>

      <p className={styles.note}>
        One shared 1:1 image for Facebook and LinkedIn. Not used for Instagram,
        TikTok, YouTube, or X.
      </p>

      {socialImage.hasFile ? (
        <div className={styles.media}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Facebook and LinkedIn social image"
            className={styles.image}
          />
          <a href={downloadHref} className={styles.download}>
            Download image
          </a>
        </div>
      ) : (
        <p className={styles.empty}>
          {socialImage.status === "failed"
            ? `Image generation failed${socialImage.error ? `: ${socialImage.error}` : ""}. Package copy and video were kept.`
            : "Social image not available yet."}
        </p>
      )}

      <dl className={styles.meta}>
        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>Image prompt</dt>
          <dd className={styles.metaValue}>
            {socialImage.imagePrompt || "—"}
          </dd>
        </div>
        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>Text overlay</dt>
          <dd className={styles.metaValue}>
            {socialImage.textOverlay?.trim()
              ? socialImage.textOverlay
              : "None (visual only)"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
