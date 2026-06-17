"use client";

import { useState } from "react";
import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import { VideoSceneEditor } from "@/components/projects/VideoSceneEditor/VideoSceneEditor";
import type { ProjectVideoEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectVideoList.module.css";

interface ProjectVideoListProps {
  projectId: string;
  entries: ProjectVideoEntry[];
}

const EMPTY = "—";

export function ProjectVideoList({
  projectId,
  entries,
}: ProjectVideoListProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádná videa.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <VideoJobCard key={entry.id} projectId={projectId} entry={entry} />
      ))}
    </div>
  );
}

function VideoJobCard({
  projectId,
  entry,
}: {
  projectId: string;
  entry: ProjectVideoEntry;
}) {
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
            <div className={styles.meta}>
              {entry.platform ? (
                <span className={styles.tag}>{entry.platform}</span>
              ) : null}
              {entry.format ? (
                <span className={styles.tag}>{entry.format}</span>
              ) : null}
              <span className={styles.tag}>{entry.provider}</span>
            </div>
            <span
              className={styles.status}
              data-status={entry.status}
            >
              {entry.status}
            </span>
      </header>

      <p className={styles.title}>{entry.itemTitle ?? EMPTY}</p>

      <VideoPreview
        videoUrl={entry.videoUrl}
        thumbnailUrl={entry.thumbnailUrl}
      />

      {entry.status === "failed" && entry.errorMessage ? (
        <p className={styles.error}>{entry.errorMessage}</p>
      ) : null}

      <VideoDownloads
        projectId={projectId}
        jobId={entry.id}
        hasMp4={entry.hasMp4}
        hasSubtitle={entry.hasSubtitle}
        hasThumbnail={entry.hasThumbnail}
      />

      {entry.canEditScenes ? (
        <div className={styles.editorToggle}>
          <button
            type="button"
            className={styles.editorBtn}
            aria-expanded={editorOpen}
            onClick={() => setEditorOpen((open) => !open)}
          >
            {editorOpen ? "Skrýt editor scén" : "Upravit scény videa"}
          </button>
          {editorOpen ? (
            <VideoSceneEditor projectId={projectId} videoJobId={entry.id} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
