"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  fetchVideoSceneEditorState,
  regenerateVideoSceneImage,
  rerenderVideoFromSceneEditor,
  uploadVideoSceneReplacement,
  type VideoSceneEditorActionResult,
} from "@/app/projects/[id]/videos/actions";
import type { VideoSceneEditorState } from "@/lib/ai/workflows/videoSceneEditor";
import { VideoSceneCard } from "./VideoSceneCard";
import styles from "./VideoSceneEditor.module.css";

interface VideoSceneEditorProps {
  projectId: string;
  videoJobId: string;
}

export function VideoSceneEditor({
  projectId,
  videoJobId,
}: VideoSceneEditorProps) {
  const [state, setState] = useState<VideoSceneEditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchVideoSceneEditorState(projectId, videoJobId);
      if (!result.ok) {
        setError(result.error);
        setState(null);
        return;
      }
      setError(null);
      setState(result.data);
    });
  }, [projectId, videoJobId]);

  useEffect(() => {
    load();
  }, [load]);

  function applyResult(
    result: VideoSceneEditorActionResult<VideoSceneEditorState>,
  ): void {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setState(result.data);
  }

  function handleUpload(sceneId: string, file: File): void {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadVideoSceneReplacement(
        projectId,
        videoJobId,
        sceneId,
        formData,
      );
      applyResult(result);
    });
  }

  function handleRegenerate(sceneId: string, instruction: string): void {
    startTransition(async () => {
      const result = await regenerateVideoSceneImage(
        projectId,
        videoJobId,
        sceneId,
        instruction,
      );
      applyResult(result);
    });
  }

  function handleRerender(): void {
    startTransition(async () => {
      const result = await rerenderVideoFromSceneEditor(projectId, videoJobId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      load();
    });
  }

  if (error && !state) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!state) {
    return <p className={styles.muted}>Načítám scény…</p>;
  }

  const rerenderDisabled =
    pending ||
    !state.hasDraftChanges ||
    state.activeRenderInFlight;

  return (
    <section className={styles.editor} aria-label="Editor video scén">
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Upravte jednotlivé scény. Původní dokončené video zůstává zachované
          do re-renderu.
        </p>
        <button
          type="button"
          className={styles.rerenderBtn}
          disabled={rerenderDisabled}
          onClick={handleRerender}
        >
          Re-render video
        </button>
      </div>

      {state.activeRenderInFlight ? (
        <p className={styles.notice}>
          Probíhá render videa — úpravy scén jsou dočasně pozastaveny.
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.sceneList}>
        {state.scenes.map((scene) => (
          <VideoSceneCard
            key={scene.id}
            projectId={projectId}
            videoJobId={videoJobId}
            scene={scene}
            disabled={pending || state.activeRenderInFlight}
            onUpload={handleUpload}
            onRegenerate={handleRegenerate}
          />
        ))}
      </div>
    </section>
  );
}
