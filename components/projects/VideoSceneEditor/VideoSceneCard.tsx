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
}

export function VideoSceneCard({
  projectId,
  videoJobId,
  scene,
  disabled,
  onUpload,
  onRegenerate,
}: VideoSceneCardProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [instruction, setInstruction] = useState("");

  const downloadHref = `/api/projects/${projectId}/scene-image?jobId=${encodeURIComponent(videoJobId)}&sceneId=${encodeURIComponent(scene.id)}`;

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

      <p className={styles.prompt}>{scene.image_prompt}</p>

      <div className={styles.actions}>
        <a className={styles.linkBtn} href={downloadHref} download>
          Stáhnout obrázek
        </a>
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
        Regenerovat z instrukce
        <textarea
          className={styles.instruction}
          rows={2}
          placeholder='např. "Make laptop red"'
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
        Regenerovat obrázek
      </button>
    </article>
  );
}
