"use client";

import { useState, useTransition } from "react";
import { submitSampleRequest } from "@/app/content-packages/actions";
import styles from "./SampleRequestForm.module.css";

export function SampleRequestForm() {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitSampleRequest(formData);
      if (result.ok) {
        setSuccess(true);
        return;
      }
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  if (success) {
    return (
      <div className={styles.success} role="status">
        <h2 className={styles.successTitle}>Request received</h2>
        <p className={styles.successText}>
          Thanks — we will review your details and prepare a free sample content
          package. We will email you when it is ready.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} action={onSubmit}>
      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      <label className={styles.label}>
        Name *
        <input name="name" type="text" required className={styles.input} />
        {fieldErrors.name ? (
          <span className={styles.fieldError}>{fieldErrors.name}</span>
        ) : null}
      </label>
      <label className={styles.label}>
        Email *
        <input name="email" type="email" required className={styles.input} />
        {fieldErrors.email ? (
          <span className={styles.fieldError}>{fieldErrors.email}</span>
        ) : null}
      </label>
      <label className={styles.label}>
        Company
        <input name="company" type="text" className={styles.input} />
      </label>
      <label className={styles.label}>
        Website URL
        <input name="websiteUrl" type="url" className={styles.input} placeholder="https://" />
      </label>
      <label className={styles.label}>
        Notes
        <textarea name="notes" rows={4} className={styles.textarea} />
      </label>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Sending…" : "Create My Sample"}
      </button>
    </form>
  );
}
