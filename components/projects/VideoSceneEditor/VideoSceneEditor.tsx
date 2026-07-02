"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  insertLibraryAssetIntoVideoScene,
  insertVideoSceneBrandAsset,
  editVideoSceneImage,
  fetchProjectAssetsForPicker,
  fetchVideoSceneEditorState,
  regenerateVideoSceneImage,
  rerenderVideoFromSceneEditor,
  restoreVideoSceneImage,
  updateVideoSceneEditorVoiceover,
  updateVideoSceneImagePrompt,
  setSceneProjectAssetAction,
  setSceneVisualModeAction,
  uploadVideoSceneReplacement,
  type VideoSceneEditorActionResult,
} from "@/app/projects/[id]/videos/actions";
import { ProjectAssetPickerModal } from "@/components/assets/ProjectAssetPickerModal/ProjectAssetPickerModal";
import type { AssetView } from "@/lib/api/assets-admin";
import type { VideoSceneEditorState } from "@/lib/ai/workflows/videoSceneEditor";
import type { SceneVisualMode } from "@/lib/video-scene-editor/videoWorkflowMetadata";
import { VideoSceneCard } from "./VideoSceneCard";
import styles from "./VideoSceneEditor.module.css";

interface VideoSceneEditorProps {
  projectId: string;
  videoJobId: string;
  onRenderActivityChange?: (active: boolean) => void;
}

type PickerContext =
  | { kind: "scene_project_asset"; sceneId: string }
  | { kind: "brand_insert"; sceneId: string; instruction: string };

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
  const [libraryAssets, setLibraryAssets] = useState<AssetView[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContext, setPickerContext] = useState<PickerContext | null>(null);

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

  async function ensureLibraryAssets(): Promise<AssetView[]> {
    if (libraryAssets.length > 0) return libraryAssets;
    const result = await fetchProjectAssetsForPicker(projectId);
    if (!result.ok) {
      setError(result.error);
      return [];
    }
    setLibraryAssets(result.data);
    return result.data;
  }

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

  function openPicker(context: PickerContext): void {
    startTransition(async () => {
      const assets = await ensureLibraryAssets();
      if (assets.length === 0 && context.kind !== "brand_insert") {
        setError("Projekt nemá žádné obrázky v knihovně.");
        return;
      }
      setPickerContext(context);
      setPickerOpen(true);
    });
  }

  function handlePickerConfirm(assetIds: string[]): void {
    const context = pickerContext;
    setPickerOpen(false);
    setPickerContext(null);
    if (!context || assetIds.length === 0) return;

    const assetId = assetIds[0]!;

    if (context.kind === "scene_project_asset") {
      startTransition(async () => {
        const result = await setSceneProjectAssetAction(
          projectId,
          videoJobId,
          context.sceneId,
          assetId,
        );
        applyResult(result);
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      const result = await insertLibraryAssetIntoVideoScene(
        projectId,
        videoJobId,
        context.sceneId,
        assetId,
        context.instruction,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleSceneVisualMode(sceneId: string, mode: SceneVisualMode): void {
    startTransition(async () => {
      const result = await setSceneVisualModeAction(
        projectId,
        videoJobId,
        sceneId,
        mode,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handlePickSceneProjectAsset(sceneId: string): void {
    openPicker({ kind: "scene_project_asset", sceneId });
  }

  function handleChooseLibraryBrand(
    sceneId: string,
    instruction: string,
  ): void {
    openPicker({ kind: "brand_insert", sceneId, instruction });
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

  const pickerMode = "single" as const;

  return (
    <section className={styles.editor} aria-label="Editor video scén">
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Visual Source nastavte nad editorem. U každé scény zvolte AI nebo
          Project Asset. Re-render použije uložená nastavení bez změny promptů.
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
            onSceneVisualMode={handleSceneVisualMode}
            onPickSceneProjectAsset={handlePickSceneProjectAsset}
            onRegenerate={handleRegenerate}
            onEditImage={handleEditImage}
            onInsertBrandAsset={handleInsertBrandAsset}
            onChooseLibraryBrand={handleChooseLibraryBrand}
            onPromptSave={handlePromptSave}
            onRestore={handleRestore}
          />
        ))}
      </div>

      <ProjectAssetPickerModal
        open={pickerOpen}
        assets={libraryAssets}
        mode={pickerMode}
        title="Choose from Project Assets"
        selectedIds={[]}
        onClose={() => {
          setPickerOpen(false);
          setPickerContext(null);
        }}
        onConfirm={handlePickerConfirm}
      />
    </section>
  );
}
