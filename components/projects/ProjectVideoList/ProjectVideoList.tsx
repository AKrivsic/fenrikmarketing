"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteVideoVersion,
  loadSceneEditorFromVideoVersion,
} from "@/app/projects/[id]/videos/actions";
import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import { VideoSceneEditor } from "@/components/projects/VideoSceneEditor/VideoSceneEditor";
import { VideoVisualSourcePanel } from "@/components/projects/VideoVisualSourcePanel/VideoVisualSourcePanel";
import { FailedVideoJobEditor } from "@/components/projects/FailedVideoJobEditor/FailedVideoJobEditor";
import { VideoJobFailureBlock } from "@/components/projects/VideoJobFailureBlock/VideoJobFailureBlock";
import { RetryVideoRenderButton } from "@/components/review/RetryVideoRenderButton/RetryVideoRenderButton";
import type { ProjectVideoGroup } from "@/lib/api/project-content-admin";
import styles from "./ProjectVideoList.module.css";

interface ProjectVideoListProps {
  projectId: string;
  groups: ProjectVideoGroup[];
}

const EMPTY = "—";

export function ProjectVideoList({
  projectId,
  groups,
}: ProjectVideoListProps) {
  if (groups.length === 0) {
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
      {groups.map((group) => (
        <VideoGroupCard
          key={`${group.groupKey}-${group.displayJobId}-${group.versions.length}-${group.activeRenderInFlight}`}
          projectId={projectId}
          group={group}
        />
      ))}
    </div>
  );
}

function VideoGroupCard({
  projectId,
  group,
}: {
  projectId: string;
  group: ProjectVideoGroup;
}) {
  const router = useRouter();
  const [failedEditorOpen, setFailedEditorOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(group.displayJobId);
  const [editorRenderActive, setEditorRenderActive] = useState(false);
  const [versionActionError, setVersionActionError] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const [failedEditorRenderActive, setFailedEditorRenderActive] = useState(false);

  const rendering =
    group.activeRenderInFlight ||
    editorRenderActive ||
    failedEditorRenderActive;

  useEffect(() => {
    setSelectedJobId(group.displayJobId);
  }, [group.displayJobId]);

  useEffect(() => {
    if (!rendering) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [rendering, router]);

  const selected =
    group.versions.find((v) => v.jobId === selectedJobId) ?? group.versions[0]!;

  const previewVersion = resolvePreviewVersion(group, selected);

  const editorSourceVersion = group.editorSourceJobId
    ? group.versions.find((v) => v.jobId === group.editorSourceJobId)
    : undefined;
  const editorDiffersFromPicker =
    group.editorSourceJobId != null &&
    selectedJobId !== group.editorSourceJobId &&
    selected.status === "completed";

  function handleLoadEditorFromSelected(): void {
    if (
      !window.confirm(
        "Načíst scény a voiceover z vybrané verze do editoru? Rozpracovaný draft se přepíše.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      setVersionActionError(null);
      const result = await loadSceneEditorFromVideoVersion(
        projectId,
        selected.jobId,
      );
      if (!result.ok) {
        setVersionActionError(result.error);
        return;
      }
      setEditorOpen(true);
      router.refresh();
    });
  }

  function handleDeleteSelectedVersion(): void {
    if (
      !window.confirm(
        "Smazat vybranou verzi videa? Soubory renderu zůstanou ve storage, záznam jobu se odstraní.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      setVersionActionError(null);
      const result = await deleteVideoVersion(projectId, selected.jobId);
      if (!result.ok) {
        setVersionActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.meta}>
          {group.platform ? (
            <span className={styles.tag}>{group.platform}</span>
          ) : null}
          {group.format ? (
            <span className={styles.tag}>{group.format}</span>
          ) : null}
          <span className={styles.tag}>{group.provider}</span>
          {group.versions.length > 1 ? (
            <span className={styles.tag}>{group.versions.length} verzí</span>
          ) : null}
          {group.displayHasChecklistScene ? (
            <span className={styles.checklistTag}>CHECKLIST</span>
          ) : null}
        </div>
        <span
          className={styles.status}
          data-status={group.displayStatus}
        >
          {group.displayStatus}
        </span>
      </header>

      <p className={styles.title}>{group.itemTitle ?? EMPTY}</p>

      {group.versions.length > 1 ? (
        <label className={styles.versionPicker}>
          Verze videa
          <select
            className={styles.versionSelect}
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            {group.versions.map((version) => (
              <option key={version.jobId} value={version.jobId}>
                {version.versionLabel} · {version.status}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {group.versions.length > 1 && selected.status === "completed" ? (
        <div className={styles.versionActions}>
          {editorDiffersFromPicker ? (
            <p className={styles.versionNotice}>
              Editor scén je navázaný na{" "}
              {editorSourceVersion?.versionLabel ?? "jinou verzi"}, ne na
              vybranou {selected.versionLabel}. Re-render tedy nevychází z
              náhledu výše.
            </p>
          ) : null}
          <div className={styles.versionActionRow}>
            <button
              type="button"
              className={styles.editorBtn}
              disabled={pending || rendering}
              onClick={handleLoadEditorFromSelected}
            >
              Načíst tuto verzi do editoru
            </button>
            <button
              type="button"
              className={styles.deleteVersionBtn}
              disabled={
                pending || rendering || group.versions.length <= 1
              }
              onClick={handleDeleteSelectedVersion}
            >
              Smazat tuto verzi
            </button>
          </div>
          {versionActionError ? (
            <p className={styles.error}>{versionActionError}</p>
          ) : null}
        </div>
      ) : null}

      <VideoPreview
        key={selectedJobId}
        videoUrl={previewVersion.videoUrl}
        thumbnailUrl={previewVersion.thumbnailUrl}
      />

      {selected.status === "failed" ? (
        <>
          <VideoJobFailureBlock
            headline={selected.failureHeadline}
            detail={selected.failureDetail}
          />
          <RetryVideoRenderButton
            projectId={projectId}
            videoJobId={selected.jobId}
          />
          <div className={styles.editorToggle}>
            <button
              type="button"
              className={styles.editorBtn}
              aria-expanded={failedEditorOpen}
              onClick={() => setFailedEditorOpen((open) => !open)}
            >
              {failedEditorOpen
                ? "Skrýt úpravu voiceoveru"
                : "Upravit voiceover a znovu renderovat"}
            </button>
            {failedEditorOpen ? (
              <FailedVideoJobEditor
                projectId={projectId}
                videoJobId={selected.jobId}
                onRenderActivityChange={setFailedEditorRenderActive}
              />
            ) : null}
          </div>
        </>
      ) : null}

      <VideoDownloads
        projectId={projectId}
        jobId={selected.jobId}
        hasMp4={selected.hasMp4}
        hasSubtitle={selected.hasSubtitle}
        hasThumbnail={selected.hasThumbnail}
      />

      {group.contentItemId &&
      group.editorSourceJobId &&
      selected.status === "completed" ? (
        <VideoVisualSourcePanel
          projectId={projectId}
          contentItemId={group.contentItemId}
          videoJobId={group.editorSourceJobId}
          disabled={rendering}
        />
      ) : null}

      {group.canEditScenes && group.editorSourceJobId ? (
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
            <VideoSceneEditor
              projectId={projectId}
              videoJobId={group.editorSourceJobId}
              onRenderActivityChange={setEditorRenderActive}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Show the picker selection when it has MP4; else fall back to display / any completed render. */
function resolvePreviewVersion(
  group: ProjectVideoGroup,
  selected: ProjectVideoGroup["versions"][number],
): ProjectVideoGroup["versions"][number] {
  if (selected.videoUrl) return selected;
  const display =
    group.versions.find((v) => v.jobId === group.displayJobId) ?? selected;
  if (display.videoUrl) return display;
  const withVideo = group.versions.find((v) => v.videoUrl != null);
  return withVideo ?? selected;
}
