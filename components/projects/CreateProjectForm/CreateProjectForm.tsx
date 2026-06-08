"use client";

import { useState, useTransition } from "react";
import {
  createProjectOnboarding,
  type CreateProjectFormValues,
} from "@/app/projects/new/actions";
import { LANGUAGE_OPTIONS } from "@/lib/projects/fieldOptions";
import styles from "./CreateProjectForm.module.css";

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [language, setLanguage] = useState<string>("cs");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const values: CreateProjectFormValues = { name, websiteUrl, language };

    startTransition(async () => {
      // On success the action redirects (throws NEXT_REDIRECT) and never returns
      // a value here; only the failure branch resolves to an ActionResult.
      const result = await createProjectOnboarding(values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Project Name</span>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          autoFocus
        />
        {fieldErrors.name ? (
          <span className={styles.fieldError}>{fieldErrors.name}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Website URL</span>
        <input
          className={styles.input}
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isPending}
        />
        {fieldErrors.websiteUrl ? (
          <span className={styles.fieldError}>{fieldErrors.websiteUrl}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Primary Language</span>
        <select
          className={styles.input}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isPending}
        >
          {LANGUAGE_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? "Vytvářím a analyzuji…" : "Create Project"}
        </button>
      </div>
    </form>
  );
}
