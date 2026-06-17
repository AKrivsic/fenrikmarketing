"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  insertVideoSceneBrandAsset,
  editVideoSceneImage,
  fetchVideoSceneEditorState,
  regenerateVideoSceneImage,
  rerenderVideoFromSceneEditor,
  restoreVideoSceneImage,
  updateVideoSceneEditorVoiceover,
  updateVideoSceneImagePrompt,
  uploadVideoSceneReplacement,
  type VideoSceneEditorActionResult,
} from "@/app/projects/[id]/videos/actions";
import type { VideoSceneEditorState } from "@/lib/ai/workflows/videoSceneEditor";
import { VideoSceneCard } from "./VideoSceneCard";
import styles from "./VideoSceneEditor.module.css";

interface VideoSceneEditorProps {
  projectId: string;
  videoJobId: string;
  onRenderActivityChange?: (active: boolean) => void;
}

export function VideoSceneEditor({
  projectId,
  videoJobId,
  onRenderActivityChange,
}: VideoSceneEditorProps) {
  const router = useRouter();
  const [state, setState] = useState<VideoSceneEditorState | null>(null);
  const [voiceoverDraft, setVoiceoverDraft] = useState("");
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
      setVoiceoverDraft(result.data.voiceoverText);
      onRenderActivityChange?.(result.data.activeRenderInFlight);
    });
  }, [projectId, videoJobId, onRenderActivityChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!state?.activeRenderInFlight) return;
    const interval = setInterval(() => {
      load();
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [state?.activeRenderInFlight, load, router]);

  function applyResult(
    result: VideoSceneEditorActionResult<VideoSceneEditorState>,
  ): void {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setState(result.data);
    setVoiceoverDraft(result.data.voiceoverText);
    onRenderActivityChange?.(result.data.activeRenderInFlight);
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
      router.refresh();
    });
  }

  function handleInsertBrandAsset(
    sceneId: string,
    file: File,
    instruction: string,
  ): void {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("instruction", instruction);
    startTransition(async () => {
      const result = await insertVideoSceneBrandAsset(
        projectId,
        videoJobId,
        sceneId,
        formData,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleEditImage(sceneId: string, instruction: string): void {
    startTransition(async () => {
      const result = await editVideoSceneImage(
        projectId,
        videoJobId,
        sceneId,
        instruction,
      );
      applyResult(result);
      router.refresh();
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
      router.refresh();
    });
  }

  function handlePromptSave(sceneId: string, imagePrompt: string): void {
    startTransition(async () => {
      const result = await updateVideoSceneImagePrompt(
        projectId,
        videoJobId,
        sceneId,
        imagePrompt,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleRestore(sceneId: string, versionId: string): void {
    startTransition(async () => {
      const result = await restoreVideoSceneImage(
        projectId,
        videoJobId,
        sceneId,
        versionId,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleVoiceoverSave(): void {
    startTransition(async () => {
      const result = await updateVideoSceneEditorVoiceover(
        projectId,
        videoJobId,
        voiceoverDraft,
      );
      applyResult(result);
      router.refresh();
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
      onRenderActivityChange?.(true);
      load();
      router.refresh();
    });
  }

  if (error && !state) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!state) {
    return <p className={styles.muted}>Načítám scény…</p>;
  }

  const voiceoverDirty =
    voiceoverDraft.trim() !== state.voiceoverText.trim();

  const rerenderDisabled =
    pending ||
    !state.hasDraftChanges ||
    state.activeRenderInFlight;

  return (
    <section className={styles.editor} aria-label="Editor video scén">
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Popis obrázku ovlivňuje still scény. Text voiceoveru ovlivňuje mluvené
          slovo a titulky po re-renderu. Původní stills zůstávají v historii
          verzí.
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
          Probíhá render videa — stav se obnovuje automaticky…
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.voiceoverBlock}>
        <label className={styles.instructionLabel}>
          Text voiceoveru
          <textarea
            className={styles.promptEdit}
            rows={5}
            value={voiceoverDraft}
            disabled={pending || state.activeRenderInFlight}
            onChange={(e) => setVoiceoverDraft(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={
            pending ||
            state.activeRenderInFlight ||
            !voiceoverDirty ||
            voiceoverDraft.trim().length === 0
          }
          onClick={handleVoiceoverSave}
        >
          Uložit text voiceoveru
        </button>
      </div>

      <div className={styles.sceneList}>
        {state.scenes.map((scene) => (
          <VideoSceneCard
            key={`${scene.id}-${scene.image_path}-${scene.image_prompt}`}
            projectId={projectId}
            videoJobId={videoJobId}
            scene={scene}
            disabled={pending || state.activeRenderInFlight}
            onUpload={handleUpload}
            onRegenerate={handleRegenerate}
            onEditImage={handleEditImage}
            onInsertBrandAsset={handleInsertBrandAsset}
            onPromptSave={handlePromptSave}
            onRestore={handleRestore}
          />
        ))}
      </div>
    </section>
  );
}
