"use client";

import { useState, useTransition } from "react";
import { saveEditorLanguageAction } from "@/app/settings/actions";
import {
  EDITOR_LANGUAGE_OPTIONS,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";
import styles from "./EditorLanguageSettings.module.css";

interface EditorLanguageSettingsProps {
  initialLanguage: EditorLanguageCode;
}

export function EditorLanguageSettings({
  initialLanguage,
}: EditorLanguageSettingsProps) {
  const [language, setLanguage] = useState<EditorLanguageCode>(initialLanguage);
  const [savedLanguage, setSavedLanguage] =
    useState<EditorLanguageCode>(initialLanguage);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = language !== savedLanguage;

  function handleSave() {
    setError(null);
    setFlash(false);
    startTransition(async () => {
      const result = await saveEditorLanguageAction(language);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedLanguage(result.preferences.editorLanguage);
      setLanguage(result.preferences.editorLanguage);
      setFlash(true);
    });
  }

  return (
    <section className={styles.card} aria-labelledby="editor-language-title">
      <h2 id="editor-language-title" className={styles.title}>
        Editor Language
      </h2>
      <p className={styles.description}>
        Admin preference for Manual Creative Review. Localized voiceover and
        scene intent are translated into this language before Waiting for
        Creative Review. This is not the project language and not the browser
        locale.
      </p>
      <label className={styles.field}>
        <span className={styles.label}>Language</span>
        <select
          className={styles.select}
          value={language}
          disabled={isPending}
          onChange={(event) => {
            setLanguage(event.target.value as EditorLanguageCode);
            setFlash(false);
          }}
        >
          {EDITOR_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {flash && !dirty ? (
        <p className={styles.success} role="status">
          Saved.
        </p>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.save}
          onClick={handleSave}
          disabled={isPending || !dirty}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
