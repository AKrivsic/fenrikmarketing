"use client";

import { useId, useRef, useState } from "react";
import type { VideoSceneEditorSceneView } from "@/lib/ai/workflows/videoSceneEditor";
import styles from "./VideoSceneEditor.module.css";

interface VideoSceneCardProps {
  projectId: string;
  videoJobId: string;
  scene: VideoSceneEditorSceneView;
  disabled: boolean;
  onUpload: (sceneId: string, file: File) => void;
  onRegenerate: (sceneId: string, instruction: string) => void;
  onPromptSave: (sceneId: string, imagePrompt: string) => void;
  onRestore: (sceneId: string, versionId: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  original: "původní",
  upload: "nahrání",
  regenerate: "regenerace",
  restore: "obnovení",
  prompt_edit: "úprava textu",
};

export function VideoSceneCard({
  projectId,
  videoJobId,
  scene,
  disabled,
  onUpload,
  onRegenerate,
  onPromptSave,
  onRestore,
}: VideoSceneCardProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [instruction, setInstruction] = useState("");
  const [promptDraft, setPromptDraft] = useState(scene.image_prompt);
  const [historyOpen, setHistoryOpen] = useState(false);

  const downloadHref = (versionId?: string) => {
    const base = `/api/projects/${projectId}/scene-image?jobId=${encodeURIComponent(videoJobId)}&sceneId=${encodeURIComponent(scene.id)}`;
    return versionId ? `${base}&versionId=${encodeURIComponent(versionId)}` : base;
  };

  const promptDirty = promptDraft.trim() !== scene.image_prompt.trim();

  return (
    <article className={styles.sceneCard}>
      <header className={styles.sceneHeader}>
        <span className={styles.sceneNumber}>Scéna {scene.sceneNumber}</span>
        <span className={styles.sceneDuration}>{scene.duration_seconds}s</span>
      </header>

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
        Instrukce pro nový obrázek (celá scéna se vygeneruje znovu)
        <textarea
          className={styles.instruction}
          rows={2}
          placeholder='např. "červený notebook na stole"'
          value={instruction}
          disabled={disabled}
          onChange={(e) => setInstruction(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={styles.primaryBtn}
        disabled={disabled || instruction.trim().length === 0}
        onClick={() => onRegenerate(scene.id, instruction)}
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
