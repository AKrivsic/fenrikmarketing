"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import { FailedVideoJobEditor } from "@/components/projects/FailedVideoJobEditor/FailedVideoJobEditor";
import { RetryVideoRenderButton } from "@/components/review/RetryVideoRenderButton/RetryVideoRenderButton";
import { VideoJobFailureBlock } from "@/components/projects/VideoJobFailureBlock/VideoJobFailureBlock";
import { isSubtitleFallback } from "@/lib/api/content-shared";
import { isOperatorCancelMessage } from "@/lib/api/production-run-cancel";
import type { PackageVideo } from "@/lib/api/project-review-admin";
import styles from "./PackageVideoPanel.module.css";
import editorStyles from "@/components/projects/ProjectVideoList/ProjectVideoList.module.css";

interface PackageVideoPanelProps {
  projectId: string;
  // One entry per resolved language (primary first). Empty for text-only
  // packages. Multilingual-ready: when more than one language is present the
  // panel renders a language switcher; today only the primary is populated.
  videos: PackageVideo[];
}

type Tone = "green" | "yellow" | "red" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  green: styles.toneGreen,
  yellow: styles.toneYellow,
  red: styles.toneRed,
  muted: styles.toneMuted,
};

const LANGUAGE_LABEL: Record<string, string> = {
  cs: "CS",
  en: "EN",
  de: "DE",
  sk: "SK",
  fr: "FR",
  es: "ES",
  it: "IT",
};

// Maps the render job state + diagnostics to the user-facing render status.
function renderStatus(video: PackageVideo): { label: string; tone: Tone } {
  if (!video.jobId || !video.status) {
    return { label: "Bez videa", tone: "muted" };
  }
  if (video.status === "failed") return { label: "Failed", tone: "red" };
  if (video.status === "queued" || video.status === "processing") {
    return { label: "Rendering", tone: "yellow" };
  }
  const debug = video.debug;
  if (
    debug &&
    (debug.render_warning || debug.subtitle_warning || debug.fallback_used)
  ) {
    return { label: "Warning", tone: "yellow" };
  }
  return { label: "Completed", tone: "green" };
}

// Subtitle availability + whether the worker fell back to proportional cues.
function subtitleStatus(video: PackageVideo): { label: string; tone: Tone } {
  if (!video.subtitleUrl) return { label: "Bez titulků", tone: "muted" };
  if (isSubtitleFallback(video.debug)) {
    return { label: "Titulky (fallback)", tone: "yellow" };
  }
  return { label: "Titulky OK", tone: "green" };
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return null;
  }
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function languageLabel(code: string): string {
  return LANGUAGE_LABEL[code] ?? code.toUpperCase();
}

export function PackageVideoPanel({
  projectId,
  videos,
}: PackageVideoPanelProps) {
  const router = useRouter();
  const [activeLanguage, setActiveLanguage] = useState<string | null>(
    videos[0]?.language ?? null,
  );
  const [failedEditorOpen, setFailedEditorOpen] = useState(false);
  const [renderPollActive, setRenderPollActive] = useState(false);

  useEffect(() => {
    if (!renderPollActive) return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [renderPollActive, router]);

  if (videos.length === 0) {
    return (
      <section className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.heading}>Video</span>
        </header>
        <p className={styles.empty}>Tento package nemá video (text-only).</p>
      </section>
    );
  }

  const active =
    videos.find((video) => video.language === activeLanguage) ?? videos[0];
  const render = renderStatus(active);
  const subtitle = subtitleStatus(active);
  const duration = formatDuration(active.debug?.video_duration);

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.heading}>Video</span>
        {videos.length > 1 ? (
          <div className={styles.langTabs} role="tablist">
            {videos.map((video) => (
              <button
                key={video.language}
                type="button"
                role="tab"
                aria-selected={video.language === active.language}
                className={`${styles.langTab} ${
                  video.language === active.language ? styles.langTabActive : ""
                }`}
                onClick={() => setActiveLanguage(video.language)}
              >
                {languageLabel(video.language)}
              </button>
            ))}
          </div>
        ) : (
          <span className={styles.langSingle}>
            {languageLabel(active.language)}
          </span>
        )}
      </header>

      <VideoPreview
        videoUrl={active.videoUrl}
        thumbnailUrl={active.thumbnailUrl}
      />

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Render</span>
          <div>
            <span className={`${styles.badge} ${TONE_CLASS[render.tone]}`}>
              {render.label}
            </span>
          </div>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Titulky</span>
          <div>
            <span className={`${styles.badge} ${TONE_CLASS[subtitle.tone]}`}>
              {subtitle.label}
            </span>
          </div>
        </div>
        {duration ? (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Délka</span>
            <div className={styles.metaValue}>{duration}</div>
          </div>
        ) : null}
        {active.hasChecklistScene ? (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Scéna</span>
            <div className={styles.metaBadgeRow}>
              <span className={`${styles.badge} ${styles.checklistBadge}`}>
                CHECKLIST
              </span>
              {active.presentationAnalyzerWarningCount > 0 ? (
                <span
                  className={`${styles.badge} ${TONE_CLASS.yellow}`}
                  title="Presentation analyzer warnings"
                >
                  {active.presentationAnalyzerWarningCount} warn
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {active.status === "failed" && active.jobId ? (
        <>
          <VideoJobFailureBlock
            headline={active.failureHeadline}
            detail={active.failureDetail}
          />
          <RetryVideoRenderButton
            projectId={projectId}
            videoJobId={active.jobId}
            errorMessage={active.failureDetail}
          />
          {isOperatorCancelMessage(active.failureDetail) ? null : (
          <div className={editorStyles.editorToggle}>
            <button
              type="button"
              className={editorStyles.editorBtn}
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
                videoJobId={active.jobId}
                onRenderActivityChange={setRenderPollActive}
              />
            ) : null}
          </div>
          )}
        </>
      ) : null}

      <VideoDownloads
        projectId={projectId}
        jobId={active.jobId}
        hasMp4={active.videoUrl !== null}
        hasSubtitle={active.subtitleUrl !== null}
        hasThumbnail={active.thumbnailUrl !== null}
      />
    </section>
  );
}
