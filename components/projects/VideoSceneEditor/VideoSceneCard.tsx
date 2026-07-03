"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { VideoSceneEditorSceneView } from "@/lib/ai/workflows/videoSceneEditor";
import { DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION } from "@/lib/video-scene-editor/constants";
import {
  MAX_SCENE_DURATION_SECONDS,
  MIN_SCENE_DURATION_SECONDS,
} from "@/lib/video-scene-editor/constants";
import styles from "./VideoSceneEditor.module.css";

interface VideoSceneCardProps {
  projectId: string;
  videoJobId: string;
  scene: VideoSceneEditorSceneView;
  sceneCount: number;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onUpload: (sceneId: string, file: File) => void;
  onSceneVisualMode: (sceneId: string, mode: "ai" | "project_asset") => void;
  onPickSceneProjectAsset: (sceneId: string) => void;
  onRegenerate: (sceneId: string, instruction: string) => void;
  onEditImage: (sceneId: string, instruction: string) => void;
  onInsertBrandAsset: (
    sceneId: string,
    file: File,
    instruction: string,
  ) => void;
  onChooseLibraryBrand: (sceneId: string, instruction: string) => void;
  onPromptSave: (sceneId: string, imagePrompt: string) => void;
  onRestore: (sceneId: string, versionId: string) => void;
  onDurationSave: (sceneId: string, durationSeconds: number) => void;
  onMoveUp: (sceneId: string) => void;
  onMoveDown: (sceneId: string) => void;
  onDuplicate: (sceneId: string) => void;
  onRemove: (sceneId: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  original: "původní",
  upload: "nahrání",
  regenerate: "regenerace",
  image_edit: "úprava obrázku",
  brand_asset_edit: "logo / asset",
  restore: "obnovení",
  prompt_edit: "úprava textu",
};

export function VideoSceneCard({
  projectId,
  videoJobId,
  scene,
  sceneCount,
  isFirst,
  isLast,
  disabled,
  onUpload,
  onSceneVisualMode,
  onPickSceneProjectAsset,
  onRegenerate,
  onEditImage,
  onInsertBrandAsset,
  onChooseLibraryBrand,
  onPromptSave,
  onRestore,
  onDurationSave,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: VideoSceneCardProps) {
  const inputId = useId();
  const brandAssetInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const brandAssetRef = useRef<HTMLInputElement>(null);
  const [generateInstruction, setGenerateInstruction] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [brandAssetInstruction, setBrandAssetInstruction] = useState(
    () =>
      scene.brandAssetInsertInstruction.trim() ||
      DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION,
  );
  const [brandAssetFile, setBrandAssetFile] = useState<File | null>(null);
  const [promptDraft, setPromptDraft] = useState(scene.image_prompt);
  const [durationDraft, setDurationDraft] = useState(String(scene.duration_seconds));
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setDurationDraft(String(scene.duration_seconds));
  }, [scene.duration_seconds, scene.id]);

  useEffect(() => {
    setBrandAssetInstruction(
      scene.brandAssetInsertInstruction.trim() ||
        DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION,
    );
  }, [scene.brandAssetInsertInstruction, scene.id]);

  const downloadHref = (versionId?: string) => {
    const base = `/api/projects/${projectId}/scene-image?jobId=${encodeURIComponent(videoJobId)}&sceneId=${encodeURIComponent(scene.id)}`;
    return versionId ? `${base}&versionId=${encodeURIComponent(versionId)}` : base;
  };

  const promptDirty = promptDraft.trim() !== scene.image_prompt.trim();
  const parsedDuration = Number(durationDraft);
  const durationDirty =
    Number.isFinite(parsedDuration) &&
    Math.round(parsedDuration * 10) / 10 !== scene.duration_seconds;

  return (
    <article className={styles.sceneCard}>
      <header className={styles.sceneHeader}>
        <span className={styles.sceneNumber}>Scéna {scene.sceneNumber}</span>
      </header>

      <div className={styles.timelineRow}>
        <label className={styles.durationLabel}>
          Délka (s)
          <input
            type="number"
            className={styles.durationInput}
            min={MIN_SCENE_DURATION_SECONDS}
            max={MAX_SCENE_DURATION_SECONDS}
            step={0.5}
            value={durationDraft}
            disabled={disabled}
            onChange={(e) => setDurationDraft(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled || !durationDirty}
          onClick={() => onDurationSave(scene.id, parsedDuration)}
        >
          Uložit délku
        </button>
      </div>

      <div className={styles.timelineActions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled || isFirst}
          onClick={() => onMoveUp(scene.id)}
        >
          ↑ Výš
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled || isLast}
          onClick={() => onMoveDown(scene.id)}
        >
          ↓ Níž
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled}
          onClick={() => onDuplicate(scene.id)}
        >
          Duplikovat
        </button>
        <button
          type="button"
          className={styles.dangerBtn}
          disabled={disabled || sceneCount <= 1}
          onClick={() => {
            if (
              window.confirm(
                "Odebrat tuto scénu z časové osy? Po uložení změn spusť re-render.",
              )
            ) {
              onRemove(scene.id);
            }
          }}
        >
          Odebrat
        </button>
      </div>

      <div className={styles.previewWrap}>
        {scene.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img
            src={scene.previewUrl}
            alt={`Náhled scény ${scene.sceneNumber}`}
            className={styles.preview}
          />
        ) : (
          <div className={styles.previewPlaceholder}>Náhled nedostupný</div>
        )}
      </div>

      <fieldset className={styles.visualSourceBlock} disabled={disabled}>
        <legend className={styles.sectionTitle}>Visual</legend>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`scene-visual-${scene.id}`}
            checked={scene.visualMode === "ai"}
            onChange={() => onSceneVisualMode(scene.id, "ai")}
          />
          AI
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name={`scene-visual-${scene.id}`}
            checked={scene.visualMode === "project_asset"}
            onChange={() => onSceneVisualMode(scene.id, "project_asset")}
          />
          Project Asset
        </label>
        {scene.visualMode === "project_asset" ? (
          <div className={styles.visualAssetRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={disabled}
              onClick={() => onPickSceneProjectAsset(scene.id)}
            >
              Choose from Project Assets
            </button>
            {scene.projectAssetTitle ? (
              <span className={styles.fileName}>{scene.projectAssetTitle}</span>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <label className={styles.instructionLabel}>
        Popis obrázku
        <textarea
          className={styles.promptEdit}
          rows={4}
          value={promptDraft}
          disabled={disabled}
          onChange={(e) => setPromptDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={styles.secondaryBtn}
        disabled={disabled || !promptDirty || promptDraft.trim().length === 0}
        onClick={() => onPromptSave(scene.id, promptDraft.trim())}
      >
        Uložit popis obrázku
      </button>

      <div className={styles.actions}>
        <a className={styles.linkBtn} href={downloadHref()} download>
          Stáhnout aktuální obrázek
        </a>
        {scene.originalVersionId ? (
          <a
            className={styles.linkBtn}
            href={downloadHref(scene.originalVersionId)}
            download
          >
            Původní vygenerovaný obrázek
          </a>
        ) : null}
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          Nahrát náhradu
        </button>
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className={styles.hiddenInput}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(scene.id, file);
            event.target.value = "";
          }}
        />
      </div>

      <label className={styles.instructionLabel}>
        Instrukce pro úpravu aktuálního obrázku
        <textarea
          className={styles.instruction}
          rows={2}
          placeholder='např. "udělej notebook červený" nebo "přidej logo na obrazovku"'
          value={editInstruction}
          disabled={disabled}
          onChange={(e) => setEditInstruction(e.target.value)}
        />
      </label>
      <p className={styles.fieldHint}>
        Úprava bez nahraného souboru — změna podle textu; přesné logo nezaručí.
      </p>
      <button
        type="button"
        className={styles.secondaryBtn}
        disabled={disabled || editInstruction.trim().length === 0}
        onClick={() => onEditImage(scene.id, editInstruction)}
      >
        Upravit tento obrázek
      </button>

      <div className={styles.brandAssetBlock}>
        <span className={styles.sectionTitle}>Vložit logo / asset</span>
        <p className={styles.fieldHint}>
          Pro přesné logo nahraj soubor (PNG/JPEG, max 5 MB). Textová instrukce
          sama o sobě přesné logo nezaručí.
        </p>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled}
          onClick={() => brandAssetRef.current?.click()}
        >
          Vybrat logo / asset
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabled || brandAssetInstruction.trim().length === 0}
          onClick={() =>
            onChooseLibraryBrand(scene.id, brandAssetInstruction.trim())
          }
        >
          Choose from Project Assets
        </button>
        {brandAssetFile ? (
          <p className={styles.fileName}>{brandAssetFile.name}</p>
        ) : null}
        <input
          id={brandAssetInputId}
          ref={brandAssetRef}
          type="file"
          accept="image/png,image/jpeg"
          className={styles.hiddenInput}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setBrandAssetFile(file);
            event.target.value = "";
          }}
        />
        <label className={styles.instructionLabel}>
          Instrukce pro vložení
          <textarea
            className={styles.instruction}
            rows={3}
            value={brandAssetInstruction}
            disabled={disabled}
            onChange={(e) => setBrandAssetInstruction(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={
            disabled ||
            !brandAssetFile ||
            brandAssetInstruction.trim().length === 0
          }
          onClick={() => {
            if (brandAssetFile) {
              onInsertBrandAsset(
                scene.id,
                brandAssetFile,
                brandAssetInstruction.trim(),
              );
            }
          }}
        >
          Vložit logo / asset
        </button>
      </div>

      <label className={styles.instructionLabel}>
        Instrukce pro nový obrázek (celá scéna se vygeneruje znovu)
        <textarea
          className={styles.instruction}
          rows={2}
          placeholder='např. "úplně jiná scéna — kancelář v noci"'
          value={generateInstruction}
          disabled={disabled}
          onChange={(e) => setGenerateInstruction(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={styles.primaryBtn}
        disabled={disabled || generateInstruction.trim().length === 0}
        onClick={() => onRegenerate(scene.id, generateInstruction)}
      >
        Vygenerovat nový obrázek
      </button>

      {scene.imageVersions.length > 1 ? (
        <div className={styles.history}>
          <button
            type="button"
            className={styles.historyToggle}
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            Historie verzí ({scene.imageVersions.length})
          </button>
          {historyOpen ? (
            <ul className={styles.historyList}>
              {[...scene.imageVersions].reverse().map((version) => (
                <li key={version.versionId} className={styles.historyItem}>
                  <span className={styles.historyMeta}>
                    {SOURCE_LABEL[version.source] ?? version.source}
                    {version.isOriginal ? " · trvalý originál" : ""}
                  </span>
                  <div className={styles.historyActions}>
                    <a
                      className={styles.linkBtn}
                      href={downloadHref(version.versionId)}
                      download
                    >
                      Stáhnout
                    </a>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={
                          disabled ||
                          (version.image_path === scene.image_path &&
                            version.image_bucket === scene.image_bucket &&
                            version.image_prompt === scene.image_prompt)
                        }
                        onClick={() => onRestore(scene.id, version.versionId)}
                      >
                        Obnovit
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
