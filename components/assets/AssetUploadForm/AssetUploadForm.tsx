"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadProjectAsset } from "@/app/projects/[id]/assets/actions";
import styles from "./AssetUploadForm.module.css";

interface AssetUploadFormProps {
  projectId: string;
}

const ASSET_CLASS_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "editable", label: "Editable" },
  { value: "reference", label: "Reference" },
];

export function AssetUploadForm({ projectId }: AssetUploadFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [assetClass, setAssetClass] = useState("static");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const file = fileRef.current?.files?.[0] ?? null;
    if (!file) {
      setFieldErrors({ file: "Vyber soubor." });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title);
    formData.set("assetClass", assetClass);

    startTransition(async () => {
      const result = await uploadProjectAsset(projectId, formData);
      if (result.ok) {
        setTitle("");
        setAssetClass("static");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Soubor</span>
          <input
            ref={fileRef}
            className={styles.input}
            type="file"
            disabled={isPending}
          />
          {fieldErrors.file ? (
            <span className={styles.fieldError}>{fieldErrors.file}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Název</span>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="(volitelné — jinak název souboru)"
            disabled={isPending}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Mode</span>
          <select
            className={styles.input}
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value)}
            disabled={isPending}
          >
            {ASSET_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? "Nahrávám…" : "Nahrát asset"}
        </button>
      </div>
    </form>
  );
}
