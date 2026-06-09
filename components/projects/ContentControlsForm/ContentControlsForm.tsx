"use client";

import { useState, useTransition } from "react";
import {
  updateContentControls,
  type ContentControlsFormValues,
} from "@/app/projects/[id]/actions";
import { LANGUAGE_OPTIONS, PLATFORM_OPTIONS } from "@/lib/projects/fieldOptions";
import {
  CONTENT_TYPE_PLATFORMS,
  CONTENT_TYPE_PLATFORM_LABELS,
  FUNNEL_MIX_PRESET_OPTIONS,
  POSTS_PER_WEEK_MAX,
  POSTS_PER_WEEK_MIN,
  WEEKDAY_OPTIONS,
  funnelMixForPreset,
  type ContentControls,
  type ContentTypePlatform,
  type FunnelMix,
  type FunnelMixPreset,
  type PlatformContentType,
} from "@/lib/projects/contentControls";
import type { FunnelStage } from "@/lib/ai/types";
import type { LanguageCode, PlatformType } from "@/lib/supabase/types";
import styles from "./ContentControlsForm.module.css";

interface ContentControlsFormProps {
  projectId: string;
  primaryLanguage: LanguageCode;
  platforms: PlatformType[];
  enabledLanguages: LanguageCode[];
  controls: ContentControls;
}

const FUNNEL_STAGES: { key: FunnelStage; label: string }[] = [
  { key: "awareness", label: "Awareness" },
  { key: "problem_aware", label: "Problem Aware" },
  { key: "solution_aware", label: "Solution Aware" },
  { key: "conversion", label: "Conversion" },
];

export function ContentControlsForm({
  projectId,
  primaryLanguage,
  platforms,
  enabledLanguages,
  controls,
}: ContentControlsFormProps) {
  const [selectedPlatforms, setSelectedPlatforms] =
    useState<string[]>(platforms);
  const [selectedLanguages, setSelectedLanguages] =
    useState<string[]>(enabledLanguages);
  const [postsPerWeek, setPostsPerWeek] = useState(controls.postsPerWeek);
  const [videosMode, setVideosMode] = useState<"every_package" | "number">(
    controls.videosPerWeek === "every_package" ? "every_package" : "number",
  );
  const [videosPerWeek, setVideosPerWeek] = useState(
    controls.videosPerWeek === "every_package" ? 0 : controls.videosPerWeek,
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    controls.publishingWeekdays,
  );
  const [publishingTime, setPublishingTime] = useState(controls.publishingTime);
  const [preset, setPreset] = useState<FunnelMixPreset>(
    controls.funnelMixPreset,
  );
  const [funnelMix, setFunnelMix] = useState<FunnelMix>(controls.funnelMix);
  const [platformContentTypes, setPlatformContentTypes] = useState<
    Record<ContentTypePlatform, PlatformContentType>
  >(controls.platformContentTypes);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function togglePlatform(platform: string, checked: boolean) {
    setSelectedPlatforms((prev) =>
      checked ? [...prev, platform] : prev.filter((p) => p !== platform),
    );
  }

  function toggleLanguage(language: string, checked: boolean) {
    setSelectedLanguages((prev) =>
      checked ? [...prev, language] : prev.filter((l) => l !== language),
    );
  }

  function toggleWeekday(day: number, checked: boolean) {
    setWeekdays((prev) =>
      checked
        ? [...prev, day].sort((a, b) => a - b)
        : prev.filter((d) => d !== day),
    );
  }

  function selectPreset(value: FunnelMixPreset) {
    setPreset(value);
    if (value !== "custom") {
      setFunnelMix(funnelMixForPreset(value, funnelMix));
    }
  }

  function setMixValue(stage: FunnelStage, value: number) {
    setPreset("custom");
    setFunnelMix((prev) => ({ ...prev, [stage]: value }));
  }

  function setPlatformContentType(
    platform: ContentTypePlatform,
    value: PlatformContentType,
  ) {
    setPlatformContentTypes((prev) => ({ ...prev, [platform]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);

    const values: ContentControlsFormValues = {
      platforms: selectedPlatforms,
      enabledLanguages: selectedLanguages,
      postsPerWeek,
      videosMode,
      videosPerWeek,
      publishingWeekdays: weekdays,
      publishingTime,
      funnelMixPreset: preset,
      funnelMix,
      platformContentTypes,
    };

    startTransition(async () => {
      const result = await updateContentControls(projectId, values);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  const mixTotal =
    funnelMix.awareness +
    funnelMix.problem_aware +
    funnelMix.solution_aware +
    funnelMix.conversion;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* A) Platforms */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Platforms</h2>
        <p className={styles.help}>
          Channels content is generated for. At least one is required.
        </p>
        <div className={styles.checkboxes}>
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform)}
                onChange={(e) => togglePlatform(platform, e.target.checked)}
                disabled={isPending}
              />
              {platform}
            </label>
          ))}
        </div>
        {fieldErrors.platforms ? (
          <span className={styles.fieldError}>{fieldErrors.platforms}</span>
        ) : null}
      </section>

      {/* A2) Platform Content Type */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Platform Content Type</h2>
        <p className={styles.help}>
          Zvolte, zda se pro každou platformu generuje video, nebo pouze text.
          Nastavení se ukládá; generační pipeline jej zatím plně nerespektuje
          (TODO).
        </p>
        <div className={styles.contentTypeGrid}>
          {CONTENT_TYPE_PLATFORMS.map((platform) => (
            <div key={platform} className={styles.contentTypeRow}>
              <span className={styles.contentTypeLabel}>
                {CONTENT_TYPE_PLATFORM_LABELS[platform]}
              </span>
              <div className={styles.contentTypeOptions}>
                <label className={styles.radio}>
                  <input
                    type="radio"
                    name={`content-type-${platform}`}
                    checked={platformContentTypes[platform] === "video"}
                    onChange={() => setPlatformContentType(platform, "video")}
                    disabled={isPending}
                  />
                  Video
                </label>
                <label className={styles.radio}>
                  <input
                    type="radio"
                    name={`content-type-${platform}`}
                    checked={platformContentTypes[platform] === "text_only"}
                    onChange={() =>
                      setPlatformContentType(platform, "text_only")
                    }
                    disabled={isPending}
                  />
                  Text Only
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* B) Volume */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Volume</h2>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Posts per week</span>
            <input
              className={styles.input}
              type="number"
              min={POSTS_PER_WEEK_MIN}
              max={POSTS_PER_WEEK_MAX}
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(Number(e.target.value))}
              disabled={isPending}
            />
            {fieldErrors.postsPerWeek ? (
              <span className={styles.fieldError}>
                {fieldErrors.postsPerWeek}
              </span>
            ) : null}
          </label>

          <fieldset className={styles.field} disabled={isPending}>
            <span className={styles.label}>Videos</span>
            <label className={styles.radio}>
              <input
                type="radio"
                name="videosMode"
                checked={videosMode === "every_package"}
                onChange={() => setVideosMode("every_package")}
              />
              A video for every generated package
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="videosMode"
                checked={videosMode === "number"}
                onChange={() => setVideosMode("number")}
              />
              Fixed number per week
            </label>
            {videosMode === "number" ? (
              <input
                className={styles.input}
                type="number"
                min={0}
                max={postsPerWeek}
                value={videosPerWeek}
                onChange={(e) => setVideosPerWeek(Number(e.target.value))}
              />
            ) : null}
            {fieldErrors.videosPerWeek ? (
              <span className={styles.fieldError}>
                {fieldErrors.videosPerWeek}
              </span>
            ) : null}
          </fieldset>
        </div>
      </section>

      {/* C) Funnel Mix */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Funnel Mix</h2>
        <label className={styles.field}>
          <span className={styles.label}>Preset</span>
          <select
            className={styles.select}
            value={preset}
            onChange={(e) => selectPreset(e.target.value as FunnelMixPreset)}
            disabled={isPending}
          >
            {FUNNEL_MIX_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.mixGrid}>
          {FUNNEL_STAGES.map((stage) => (
            <label key={stage.key} className={styles.field}>
              <span className={styles.label}>{stage.label}</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                value={funnelMix[stage.key]}
                onChange={(e) => setMixValue(stage.key, Number(e.target.value))}
                disabled={isPending}
              />
            </label>
          ))}
        </div>
        <p className={styles.help}>
          Total: {mixTotal}%
          {preset !== "custom"
            ? ` · using "${
                FUNNEL_MIX_PRESET_OPTIONS.find((o) => o.value === preset)?.label
              }" preset`
            : ""}
          . Funnel mix cannot be conversion-only.
        </p>
        {fieldErrors.funnelMix ? (
          <span className={styles.fieldError}>{fieldErrors.funnelMix}</span>
        ) : null}
      </section>

      {/* D) Publishing */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Publishing</h2>
        <span className={styles.label}>Publishing weekdays</span>
        <div className={styles.checkboxes}>
          {WEEKDAY_OPTIONS.map((day) => (
            <label key={day.value} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={weekdays.includes(day.value)}
                onChange={(e) => toggleWeekday(day.value, e.target.checked)}
                disabled={isPending}
              />
              {day.label}
            </label>
          ))}
        </div>
        {fieldErrors.publishingWeekdays ? (
          <span className={styles.fieldError}>
            {fieldErrors.publishingWeekdays}
          </span>
        ) : null}
        <label className={styles.field}>
          <span className={styles.label}>Default time</span>
          <input
            className={styles.input}
            type="time"
            value={publishingTime}
            onChange={(e) => setPublishingTime(e.target.value)}
            disabled={isPending}
          />
          {fieldErrors.publishingTime ? (
            <span className={styles.fieldError}>
              {fieldErrors.publishingTime}
            </span>
          ) : null}
        </label>
      </section>

      {/* E) Language Variant Options */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Language Variant Options</h2>
        <div className={styles.field}>
          <span className={styles.label}>Primary language</span>
          <p className={styles.value}>{primaryLanguage}</p>
        </div>
        <span className={styles.label}>Available variants</span>
        <div className={styles.checkboxes}>
          {LANGUAGE_OPTIONS.filter((lang) => lang !== primaryLanguage).map(
            (language) => (
              <label key={language} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedLanguages.includes(language)}
                  onChange={(e) => toggleLanguage(language, e.target.checked)}
                  disabled={isPending}
                />
                {language}
              </label>
            ),
          )}
        </div>
        <p className={styles.help}>
          Variants are generated only after primary content is approved.
        </p>
        {fieldErrors.enabledLanguages ? (
          <span className={styles.fieldError}>
            {fieldErrors.enabledLanguages}
          </span>
        ) : null}
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {saved ? <p className={styles.saved}>Saved.</p> : null}

      <div className={styles.buttons}>
        <button type="submit" className={styles.save} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
