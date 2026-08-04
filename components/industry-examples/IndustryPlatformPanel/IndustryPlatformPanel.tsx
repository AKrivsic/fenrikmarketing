"use client";

import { useState } from "react";
import { CopyButton } from "@/components/common/CopyButton/CopyButton";
import type {
  IndustryExamplePackage,
  IndustryExamplePlatform,
} from "@/lib/industry-examples/types";
import {
  INDUSTRY_PLATFORM_META,
  INDUSTRY_PLATFORM_ORDER,
} from "@/lib/industry-examples/types";
import styles from "./IndustryPlatformPanel.module.css";

interface IndustryPlatformPanelProps {
  pkg: IndustryExamplePackage;
}

export function IndustryPlatformPanel({ pkg }: IndustryPlatformPanelProps) {
  const [active, setActive] = useState<IndustryExamplePlatform>("instagram");
  const meta = INDUSTRY_PLATFORM_META[active];

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <p className={styles.title}>Ready to copy &amp; post</p>
        <span className={styles.deliveryBadge}>{meta.deliveryNote}</span>
      </div>

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Platform outputs"
      >
        {INDUSTRY_PLATFORM_ORDER.map((platform) => {
          const isActive = platform === active;
          return (
            <button
              key={platform}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
              }
              onClick={() => setActive(platform)}
            >
              {INDUSTRY_PLATFORM_META[platform].label}
            </button>
          );
        })}
      </div>

      <div className={styles.panel} role="tabpanel">
        {active === "youtube" ? (
          <YoutubePanel output={pkg.platforms.youtube} />
        ) : active === "x" ? (
          <XPostsPanel posts={pkg.platforms.x} />
        ) : (
          <TextPanel
            text={
              active === "instagram"
                ? pkg.platforms.instagram
                : active === "tiktok"
                  ? pkg.platforms.tiktok
                  : active === "facebook"
                    ? pkg.platforms.facebook
                    : pkg.platforms.linkedin
            }
          />
        )}
      </div>
    </div>
  );
}

function TextPanel({ text }: { text: string }) {
  const body = text.trim() || "—";
  return (
    <div>
      <div className={styles.panelHeader}>
        <CopyButton text={body === "—" ? "" : body} label="Copy" />
      </div>
      <p className={styles.body}>{body}</p>
    </div>
  );
}

function YoutubePanel({
  output,
}: {
  output: IndustryExamplePackage["platforms"]["youtube"];
}) {
  const title = output.title.trim();
  const description = output.description.trim() || "—";
  return (
    <div>
      <div className={styles.panelHeader}>
        <span className={styles.fieldLabel}>Title</span>
        <CopyButton text={title} label="Copy title" />
      </div>
      <p className={styles.body}>{title || "—"}</p>
      <div className={styles.panelHeader}>
        <span className={styles.fieldLabel}>Description</span>
        <CopyButton
          text={description === "—" ? "" : description}
          label="Copy description"
        />
      </div>
      <p className={styles.body}>{description}</p>
    </div>
  );
}

function XPostsPanel({ posts }: { posts: string[] }) {
  return (
    <div className={styles.xList}>
      {posts.map((post, index) => {
        const body = post.trim() || "—";
        return (
          <article key={`${index}-${body.slice(0, 24)}`} className={styles.xCard}>
            <div className={styles.panelHeader}>
              <span className={styles.fieldLabel}>Post {index + 1}</span>
              <CopyButton text={body === "—" ? "" : body} label="Copy" />
            </div>
            <p className={styles.body}>{body}</p>
          </article>
        );
      })}
    </div>
  );
}
