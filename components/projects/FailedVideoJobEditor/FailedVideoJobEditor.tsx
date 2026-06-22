"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  fetchFailedVideoJobEditorState,
  rerenderFailedVideoJob,
  updateFailedVideoJobEditorVoiceover,
  type VideoSceneEditorActionResult,
} from "@/app/projects/[id]/videos/actions";
import type { FailedVideoJobEditorState } from "@/lib/ai/workflows/failedVideoJobEditor";
import styles from "@/components/projects/VideoSceneEditor/VideoSceneEditor.module.css";

interface FailedVideoJobEditorProps {
  projectId: string;
  videoJobId: string;
  onRenderActivityChange?: (active: boolean) => void;
}

export function FailedVideoJobEditor({
  projectId,
  videoJobId,
  onRenderActivityChange,
}: FailedVideoJobEditorProps) {
  const router = useRouter();
  const [state, setState] = useState<FailedVideoJobEditorState | null>(null);
  const [voiceoverDraft, setVoiceoverDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchFailedVideoJobEditorState(projectId, videoJobId);
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
    result: VideoSceneEditorActionResult<FailedVideoJobEditorState>,
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

  function handleSave(): void {
    startTransition(async () => {
      const result = await updateFailedVideoJobEditorVoiceover(
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
      const result = await rerenderFailedVideoJob(
        projectId,
        videoJobId,
        voiceoverDraft,
      );
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
    return <p className={styles.muted}>Načítám voiceover…</p>;
  }

  const voiceoverDirty =
    voiceoverDraft.trim() !== state.voiceoverText.trim();
  const textChangedFromOriginal =
    voiceoverDraft.trim() !== state.baselineVoiceoverText.trim();

  const rerenderDisabled =
    pending || state.activeRenderInFlight || voiceoverDraft.trim().length === 0;

  return (
    <section className={styles.editor} aria-label="Editor voiceoveru (failed)">
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Text je ze vstupu video jobu (stejný, který poslal worker). Uprav ho a
          spusť nový render — vznikne nová verze jobu, starý failed zůstane v
          historii.
        </p>
        <button
          type="button"
          className={styles.rerenderBtn}
          disabled={rerenderDisabled}
          onClick={handleRerender}
        >
          Spustit render s tímto textem
        </button>
      </div>

      {state.activeRenderInFlight ? (
        <p className={styles.notice}>
          Probíhá render videa — preview se po dokončení obnoví automaticky…
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.voiceoverBlock}>
        <label className={styles.instructionLabel}>
          Text voiceoveru
          <textarea
            className={styles.promptEdit}
            rows={6}
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
          onClick={handleSave}
        >
          Uložit koncept
        </button>
        {textChangedFromOriginal ? (
          <p className={styles.notice}>
            Text se liší od původního jobu — render použije upravenou verzi.
          </p>
        ) : null}
      </div>
    </section>
  );
}
