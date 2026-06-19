"use client";

import { CopyButton } from "@/components/common/CopyButton/CopyButton";
import styles from "./PublishPlatformOutputs.module.css";

export interface PublishPlatformSection {
  label: string;
  text: string;
  /** Standalone title (e.g. YouTube) copied separately from `text`. */
  publishTitle?: string;
  defaultOpen?: boolean;
}

interface PublishPlatformOutputsProps {
  sections: PublishPlatformSection[];
  title?: string;
}

export function PublishPlatformOutputs({
  sections,
  title = "Ready to copy & post",
}: PublishPlatformOutputsProps) {
  return (
    <div className={styles.root}>
      <p className={styles.title}>{title}</p>
      <div className={styles.blocks}>
        {sections.map(({ label, text, publishTitle, defaultOpen }, index) => {
          const body = text.trim() || "—";
          const titleText = publishTitle?.trim() ?? "";
          return (
            <details
              key={`${label}-${index}`}
              className={styles.details}
              open={defaultOpen}
            >
              <summary className={styles.summary}>{label}</summary>
              <div className={styles.panel}>
                {titleText ? (
                  <>
                    <div className={styles.panelHeader}>
                      <span className={styles.fieldLabel}>Title</span>
                      <CopyButton text={titleText} label="Copy title" />
                    </div>
                    <p className={styles.body}>{titleText}</p>
                    <div className={styles.panelHeader}>
                      <span className={styles.fieldLabel}>Description</span>
                      <CopyButton
                        text={body === "—" ? "" : body}
                        label="Copy description"
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.panelHeader}>
                    <CopyButton text={body === "—" ? "" : body} label="Copy" />
                  </div>
                )}
                <p className={styles.body}>{body}</p>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
