"use client";

import { useState, useTransition } from "react";
import { editItem } from "@/lib/review/actions";
import styles from "./EditItemForm.module.css";

interface EditItemFormProps {
  itemId: string;
  projectId: string;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  onDone: () => void;
}

export function EditItemForm({
  itemId,
  projectId,
  caption,
  hashtags,
  cta,
  onDone,
}: EditItemFormProps) {
  const [captionValue, setCaptionValue] = useState(caption ?? "");
  const [hashtagsValue, setHashtagsValue] = useState(hashtags.join(" "));
  const [ctaValue, setCtaValue] = useState(cta ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await editItem({
        itemId,
        projectId,
        caption: captionValue,
        hashtags: hashtagsValue,
        cta: ctaValue,
      });
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Caption</span>
        <textarea
          className={styles.textarea}
          value={captionValue}
          onChange={(e) => setCaptionValue(e.target.value)}
          rows={4}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Hashtags</span>
        <input
          className={styles.input}
          type="text"
          value={hashtagsValue}
          onChange={(e) => setHashtagsValue(e.target.value)}
          placeholder="oddělené mezerou nebo čárkou, bez #"
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>CTA</span>
        <input
          className={styles.input}
          type="text"
          value={ctaValue}
          onChange={(e) => setCtaValue(e.target.value)}
          disabled={isPending}
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <button type="submit" className={styles.save} disabled={isPending}>
          {isPending ? "Ukládám…" : "Uložit"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={onDone}
          disabled={isPending}
        >
          Zrušit
        </button>
      </div>
    </form>
  );
}
