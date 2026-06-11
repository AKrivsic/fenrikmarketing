"use client";

import { useState, useTransition } from "react";
import {
  updateProjectBrain,
  type ProjectBrainFormValues,
} from "@/app/projects/[id]/actions";
import {
  GOAL_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  MARKET_SCOPE_OPTIONS,
  PLATFORM_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/projects/fieldOptions";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import {
  projectServiceMix,
  serializeServiceMixInput,
} from "@/lib/projects/serviceMix";
import type { Json, Project } from "@/lib/supabase/types";
import styles from "./ProjectBrainForm.module.css";

interface ProjectBrainFormProps {
  project: Project;
  onDone: () => void;
}

function jsonToText(value: Json): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export function ProjectBrainForm({ project, onDone }: ProjectBrainFormProps) {
  const [values, setValues] = useState<ProjectBrainFormValues>({
    name: project.name,
    type: project.type,
    language: project.language,
    enabledLanguages: project.enabled_languages,
    marketScope: project.market_scope,
    goalType: project.goal_type,
    defaultCta: project.default_cta ?? "",
    websiteUrl: canonicalWebsiteUrl(project) ?? "",
    serviceMix: serializeServiceMixInput(projectServiceMix(project)),
    productIs: project.product_is.join("\n"),
    productIsNot: project.product_is_not.join("\n"),
    productStrengths: project.product_strengths.join("\n"),
    painPoints: project.pain_points.join("\n"),
    forbiddenClaims: project.forbidden_claims.join("\n"),
    platforms: project.platforms,
    targetAudience: jsonToText(project.target_audience),
    toneOfVoice: jsonToText(project.tone_of_voice),
    publishingRules: jsonToText(project.publishing_rules),
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof ProjectBrainFormValues>(
    key: K,
    value: ProjectBrainFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(platform: string, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, platform]
        : prev.platforms.filter((p) => p !== platform),
    }));
  }

  function toggleEnabledLanguage(language: string, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      enabledLanguages: checked
        ? [...prev.enabledLanguages, language]
        : prev.enabledLanguages.filter((l) => l !== language),
    }));
  }

  // When the primary language changes, drop it from the additional variants so
  // the primary is never also listed as a variant.
  function setPrimaryLanguage(language: string) {
    setValues((prev) => ({
      ...prev,
      language,
      enabledLanguages: prev.enabledLanguages.filter((l) => l !== language),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateProjectBrain(project.id, values);
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Název</span>
        <input
          className={styles.input}
          type="text"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={isPending}
        />
        {fieldErrors.name ? (
          <span className={styles.fieldError}>{fieldErrors.name}</span>
        ) : null}
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Typ</span>
          <select
            className={styles.select}
            value={values.type}
            onChange={(e) => setField("type", e.target.value)}
            disabled={isPending}
          >
            {PROJECT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Primary language</span>
          <select
            className={styles.select}
            value={values.language}
            onChange={(e) => setPrimaryLanguage(e.target.value)}
            disabled={isPending}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Market scope</span>
          <select
            className={styles.select}
            value={values.marketScope}
            onChange={(e) => setField("marketScope", e.target.value)}
            disabled={isPending}
          >
            {MARKET_SCOPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Goal</span>
          <select
            className={styles.select}
            value={values.goalType}
            onChange={(e) => setField("goalType", e.target.value)}
            disabled={isPending}
          >
            {GOAL_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className={styles.fieldset} disabled={isPending}>
        <legend className={styles.label}>Additional language variants</legend>
        <div className={styles.checkboxes}>
          {LANGUAGE_OPTIONS.filter((lang) => lang !== values.language).map(
            (language) => (
              <label key={language} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={values.enabledLanguages.includes(language)}
                  onChange={(e) =>
                    toggleEnabledLanguage(language, e.target.checked)
                  }
                />
                {language}
              </label>
            ),
          )}
        </div>
        {fieldErrors.enabledLanguages ? (
          <span className={styles.fieldError}>
            {fieldErrors.enabledLanguages}
          </span>
        ) : null}
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>Website URL</span>
        <input
          className={styles.input}
          type="text"
          value={values.websiteUrl}
          onChange={(e) => setField("websiteUrl", e.target.value)}
          placeholder="např. example.com"
          disabled={isPending}
        />
        {fieldErrors.websiteUrl ? (
          <span className={styles.fieldError}>{fieldErrors.websiteUrl}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Default CTA</span>
        <input
          className={styles.input}
          type="text"
          value={values.defaultCta}
          onChange={(e) => setField("defaultCta", e.target.value)}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>
          Service mix (volitelné, „Služba = 50“ na řádek, součet 100)
        </span>
        <textarea
          className={styles.textarea}
          value={values.serviceMix}
          onChange={(e) => setField("serviceMix", e.target.value)}
          rows={3}
          placeholder={"Airbnb cleaning = 50\nOffice cleaning = 30\nRecurring cleaning = 20"}
          disabled={isPending}
        />
        {fieldErrors.serviceMix ? (
          <span className={styles.fieldError}>{fieldErrors.serviceMix}</span>
        ) : null}
      </label>

      <fieldset className={styles.fieldset} disabled={isPending}>
        <legend className={styles.label}>Platforms</legend>
        <div className={styles.checkboxes}>
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={values.platforms.includes(platform)}
                onChange={(e) => togglePlatform(platform, e.target.checked)}
              />
              {platform}
            </label>
          ))}
        </div>
        {fieldErrors.platforms ? (
          <span className={styles.fieldError}>{fieldErrors.platforms}</span>
        ) : null}
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>Product is (jeden na řádek)</span>
        <textarea
          className={styles.textarea}
          value={values.productIs}
          onChange={(e) => setField("productIs", e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Product is not (jeden na řádek)</span>
        <textarea
          className={styles.textarea}
          value={values.productIsNot}
          onChange={(e) => setField("productIsNot", e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Strengths (jeden na řádek)</span>
        <textarea
          className={styles.textarea}
          value={values.productStrengths}
          onChange={(e) => setField("productStrengths", e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Pain points (jeden na řádek)</span>
        <textarea
          className={styles.textarea}
          value={values.painPoints}
          onChange={(e) => setField("painPoints", e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Forbidden claims (jeden na řádek)</span>
        <textarea
          className={styles.textarea}
          value={values.forbiddenClaims}
          onChange={(e) => setField("forbiddenClaims", e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Target audience (JSON objekt)</span>
        <textarea
          className={styles.code}
          value={values.targetAudience}
          onChange={(e) => setField("targetAudience", e.target.value)}
          rows={5}
          disabled={isPending}
        />
        {fieldErrors.targetAudience ? (
          <span className={styles.fieldError}>{fieldErrors.targetAudience}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Tone of voice (JSON objekt)</span>
        <textarea
          className={styles.code}
          value={values.toneOfVoice}
          onChange={(e) => setField("toneOfVoice", e.target.value)}
          rows={5}
          disabled={isPending}
        />
        {fieldErrors.toneOfVoice ? (
          <span className={styles.fieldError}>{fieldErrors.toneOfVoice}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Publishing rules (JSON objekt)</span>
        <textarea
          className={styles.code}
          value={values.publishingRules}
          onChange={(e) => setField("publishingRules", e.target.value)}
          rows={5}
          disabled={isPending}
        />
        {fieldErrors.publishingRules ? (
          <span className={styles.fieldError}>
            {fieldErrors.publishingRules}
          </span>
        ) : null}
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
