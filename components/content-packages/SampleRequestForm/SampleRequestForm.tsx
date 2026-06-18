"use client";

import { useState, useTransition } from "react";
import { submitSampleRequest } from "@/app/content-packages/actions";
import styles from "./SampleRequestForm.module.css";

const BUSINESS_TYPE_OPTIONS = [
  "SaaS",
  "AI Tool",
  "Agency",
  "Consultant",
  "Ecommerce",
  "Local Business",
  "Freelancer",
  "Other",
] as const;

const REVENUE_OPTIONS = [
  "Pre-revenue",
  "Under $1k / month",
  "$1k–10k / month",
  "$10k–50k / month",
  "$50k+ / month",
] as const;

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
          Thanks — we will review your website and prepare a free sample content
          package. We will email you when it is ready.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} action={onSubmit}>
      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Company website URL
          <input
            type="text"
            name="company_website_url"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
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
        Website URL *
        <input
          name="websiteUrl"
          type="text"
          required
          className={styles.input}
          placeholder="example.com or https://example.com"
          autoComplete="url"
        />
        {fieldErrors.websiteUrl ? (
          <span className={styles.fieldError}>{fieldErrors.websiteUrl}</span>
        ) : null}
      </label>
      <label className={styles.label}>
        Business Type *
        <select name="businessType" required className={styles.input} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {BUSINESS_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {fieldErrors.businessType ? (
          <span className={styles.fieldError}>{fieldErrors.businessType}</span>
        ) : null}
      </label>
      <label className={styles.label}>
        Monthly Revenue *
        <select name="monthlyRevenue" required className={styles.input} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {REVENUE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {fieldErrors.monthlyRevenue ? (
          <span className={styles.fieldError}>{fieldErrors.monthlyRevenue}</span>
        ) : null}
      </label>
      <label className={styles.label}>
        Notes / What do you sell? *
        <textarea name="notes" rows={4} required className={styles.textarea} />
        {fieldErrors.notes ? (
          <span className={styles.fieldError}>{fieldErrors.notes}</span>
        ) : null}
      </label>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Sending…" : "Get My Free Sample"}
      </button>
    </form>
  );
}
