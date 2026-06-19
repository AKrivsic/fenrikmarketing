"use client";

import { CopyButton } from "@/components/common/CopyButton/CopyButton";
import styles from "./PublishPlatformOutputs.module.css";

export interface PublishPlatformSection {
  label: string;
  text: string;
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
        {sections.map(({ label, text, defaultOpen }) => {
          const body = text.trim() || "—";
          return (
            <details
              key={label}
              className={styles.details}
              open={defaultOpen}
            >
              <summary className={styles.summary}>{label}</summary>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <CopyButton text={body === "—" ? "" : body} label="Copy" />
                </div>
                <p className={styles.body}>{body}</p>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
