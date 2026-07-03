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
  updateVideoSceneDuration,
  removeVideoScene,
  moveVideoScene,
  duplicateVideoScene,
  addVideoSceneWithUpload,
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
import { DEFAULT_SCENE_DURATION_SECONDS } from "@/lib/video-scene-editor/constants";
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
  const [newScenePrompt, setNewScenePrompt] = useState("");
  const [newSceneDuration, setNewSceneDuration] = useState(
    String(DEFAULT_SCENE_DURATION_SECONDS),
  );
  const [newSceneFile, setNewSceneFile] = useState<File | null>(null);
  const addSceneInputId = "add-video-scene-file";

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

  function handleDurationSave(sceneId: string, durationSeconds: number): void {
    startTransition(async () => {
      const result = await updateVideoSceneDuration(
        projectId,
        videoJobId,
        sceneId,
        durationSeconds,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleMoveScene(sceneId: string, direction: "up" | "down"): void {
    startTransition(async () => {
      const result = await moveVideoScene(
        projectId,
        videoJobId,
        sceneId,
        direction,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleDuplicateScene(sceneId: string): void {
    startTransition(async () => {
      const result = await duplicateVideoScene(
        projectId,
        videoJobId,
        sceneId,
      );
      applyResult(result);
      router.refresh();
    });
  }

  function handleRemoveScene(sceneId: string): void {
    startTransition(async () => {
      const result = await removeVideoScene(projectId, videoJobId, sceneId);
      applyResult(result);
      router.refresh();
    });
  }

  function handleAddScene(): void {
    if (!newSceneFile) {
      setError("Vyber obrázek pro novou scénu.");
      return;
    }
    const formData = new FormData();
    formData.set("file", newSceneFile);
    formData.set("imagePrompt", newScenePrompt.trim());
    formData.set("durationSeconds", newSceneDuration.trim());
    startTransition(async () => {
      const result = await addVideoSceneWithUpload(
        projectId,
        videoJobId,
        formData,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setNewSceneFile(null);
      setNewScenePrompt("");
      setNewSceneDuration(String(DEFAULT_SCENE_DURATION_SECONDS));
      setState(result.data);
      setVoiceoverDraft(result.data.voiceoverText);
      onRenderActivityChange?.(result.data.activeRenderInFlight);
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
          Project Asset. Délku, pořadí a počet scén upravíte níže — re-render
          použije uloženou časovou osu a nastavení vizuálů.
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
        {state.scenes.map((scene, index) => (
          <VideoSceneCard
            key={`${scene.id}-${scene.image_path}-${scene.image_prompt}-${index}`}
            projectId={projectId}
            videoJobId={videoJobId}
            scene={scene}
            sceneCount={state.scenes.length}
            isFirst={index === 0}
            isLast={index === state.scenes.length - 1}
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
            onDurationSave={handleDurationSave}
            onMoveUp={(id) => handleMoveScene(id, "up")}
            onMoveDown={(id) => handleMoveScene(id, "down")}
            onDuplicate={handleDuplicateScene}
            onRemove={handleRemoveScene}
          />
        ))}
      </div>

      <div className={styles.addSceneBlock}>
        <h3 className={styles.addSceneTitle}>Přidat scénu na konec</h3>
        <p className={styles.fieldHint}>
          Nahraj obrázek (PNG/JPEG), popis a délku. Po přidání uprav voiceover
          podle potřeby a spusť re-render.
        </p>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={pending || state.activeRenderInFlight}
          onClick={() => document.getElementById(addSceneInputId)?.click()}
        >
          Vybrat obrázek
        </button>
        {newSceneFile ? (
          <p className={styles.fileName}>{newSceneFile.name}</p>
        ) : null}
        <input
          id={addSceneInputId}
          type="file"
          accept="image/png,image/jpeg"
          className={styles.hiddenInput}
          disabled={pending || state.activeRenderInFlight}
          onChange={(event) => {
            setNewSceneFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <label className={styles.instructionLabel}>
          Popis obrázku
          <textarea
            className={styles.promptEdit}
            rows={3}
            value={newScenePrompt}
            disabled={pending || state.activeRenderInFlight}
            onChange={(e) => setNewScenePrompt(e.target.value)}
          />
        </label>
        <label className={styles.durationLabel}>
          Délka (s)
          <input
            type="number"
            className={styles.durationInput}
            min={1}
            max={30}
            step={0.5}
            value={newSceneDuration}
            disabled={pending || state.activeRenderInFlight}
            onChange={(e) => setNewSceneDuration(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={
            pending ||
            state.activeRenderInFlight ||
            !newSceneFile ||
            newScenePrompt.trim().length === 0
          }
          onClick={handleAddScene}
        >
          Přidat scénu
        </button>
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
