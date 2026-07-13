"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectAssetFields } from "@/app/projects/[id]/assets/actions";
import type { AssetView } from "@/lib/api/assets-admin";
import {
  formatAnalysisStatusLabel,
  formatAssetQualityLabel,
  formatCaptureViewportLabel,
  formatOrientationLabel,
  formatPreferredVideoUsageLabel,
  formatTechnicalDisplayValue,
  formatVideoSuitabilityLabel,
  preferredVideoUsageHintForMode,
} from "@/lib/assets/assetAdminDisplay";
import {
  CAPTURE_VIEWPORT_EDIT_VALUES,
  CAPTURE_VIEWPORT_LABELS,
  VIDEO_USAGE_ADMIN_LABELS,
} from "@/lib/assets/assetAdminOptions";
import { VIDEO_USAGE_RENDER_VALUES } from "@/lib/assets/preferredVideoUsage";
import {
  PRODUCT_ROLE_LABELS,
  PRODUCT_ROLES,
} from "@/lib/assets/productRole";
import styles from "./AssetEditForm.module.css";

const ASSET_CLASS_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "editable", label: "Editable" },
  { value: "reference", label: "Reference" },
];

type FieldMode = "automatic" | "manual";

interface AssetEditFormProps {
  projectId: string;
  asset: AssetView;
  onDone: () => void;
}

function initialTextMode(
  asset: AssetView,
  field: "ai_description" | "suggested_usage",
): FieldMode {
  return asset.manualOverrides[field] === true ? "manual" : "automatic";
}

export function AssetEditForm({ projectId, asset, onDone }: AssetEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(asset.title);
  const [assetClass, setAssetClass] = useState<string>(asset.assetClass);
  const [productRole, setProductRole] = useState(asset.productRole ?? "");

  const [aiDescriptionMode, setAiDescriptionMode] = useState<FieldMode>(() =>
    initialTextMode(asset, "ai_description"),
  );
  const [aiDescription, setAiDescription] = useState(asset.aiDescription ?? "");

  const [suggestedUsageMode, setSuggestedUsageMode] = useState<FieldMode>(() =>
    initialTextMode(asset, "suggested_usage"),
  );
  const [suggestedUsage, setSuggestedUsage] = useState(asset.suggestedUsage ?? "");

  const [captureViewportMode, setCaptureViewportMode] = useState<FieldMode>(
    asset.captureViewportAutomatic ? "automatic" : "manual",
  );
  const [captureViewport, setCaptureViewport] = useState(
    asset.captureViewport ?? CAPTURE_VIEWPORT_EDIT_VALUES[0],
  );

  const [preferredVideoUsageMode, setPreferredVideoUsageMode] = useState<FieldMode>(
    asset.preferredVideoUsageAutomatic ? "automatic" : "manual",
  );
  const [preferredVideoUsage, setPreferredVideoUsage] = useState(
    asset.storedPreferredVideoUsage ?? VIDEO_USAGE_RENDER_VALUES[0],
  );

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const preferredHint = useMemo(
    () =>
      preferredVideoUsageHintForMode({
        mode: preferredVideoUsageMode,
        computedUsage: asset.preferredVideoUsage,
        manualUsage: preferredVideoUsage,
      }),
    [
      preferredVideoUsageMode,
      preferredVideoUsage,
      asset.preferredVideoUsage,
    ],
  );

  function appendMetadataFields(formData: FormData) {
    formData.set("aiDescriptionMode", aiDescriptionMode);
    if (aiDescriptionMode === "manual") {
      formData.set("aiDescription", aiDescription);
    }
    formData.set("suggestedUsageMode", suggestedUsageMode);
    if (suggestedUsageMode === "manual") {
      formData.set("suggestedUsage", suggestedUsage);
    }
    formData.set("captureViewportMode", captureViewportMode);
    if (captureViewportMode === "manual") {
      formData.set("captureViewport", captureViewport);
    }
    formData.set("preferredVideoUsageMode", preferredVideoUsageMode);
    if (preferredVideoUsageMode === "manual") {
      formData.set("preferredVideoUsage", preferredVideoUsage);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("title", title);
    formData.set("assetClass", assetClass);
    formData.set("productRole", productRole);
    appendMetadataFields(formData);

    startTransition(async () => {
      const result = await updateProjectAssetFields(projectId, asset.id, formData);
      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Identifikace</h4>
        <label className={styles.field}>
          <span className={styles.label}>Název</span>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            autoComplete="off"
          />
          {fieldErrors.title ? (
            <span className={styles.fieldError}>{fieldErrors.title}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Třída assetu</span>
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
          {fieldErrors.assetClass ? (
            <span className={styles.fieldError}>{fieldErrors.assetClass}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Product role</span>
          <select
            className={styles.input}
            value={productRole}
            onChange={(e) => setProductRole(e.target.value)}
            disabled={isPending}
          >
            <option value="">—</option>
            {PRODUCT_ROLES.map((role) => (
              <option key={role} value={role}>
                {PRODUCT_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          {asset.productRoleLocked ? (
            <span className={styles.hint}>Role je uzamčena po ruční volbě.</span>
          ) : null}
          {fieldErrors.productRole ? (
            <span className={styles.fieldError}>{fieldErrors.productRole}</span>
          ) : null}
        </label>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>AI pochopení</h4>
        <p className={styles.sectionIntro}>
          Ovlivňuje, jak generátor asset chápe a kdy ho může vybrat.
        </p>

        <ModeToggle
          fieldKey="ai-description"
          label="AI popis"
          mode={aiDescriptionMode}
          onModeChange={setAiDescriptionMode}
          disabled={isPending}
        />
        {aiDescriptionMode === "manual" ? (
          <label className={styles.field}>
            <span className={styles.srOnly}>AI popis</span>
            <textarea
              className={styles.textarea}
              rows={4}
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              disabled={isPending}
              placeholder="Co je na assetu skutečně vidět"
            />
          </label>
        ) : (
          <AutomaticTextHint
            currentValue={asset.aiDescription}
            emptyHint="Hodnotu doplní AI analýza (nebo zůstane prázdná, dokud neproběhne)."
          />
        )}

        <ModeToggle
          fieldKey="suggested-usage"
          label="Doporučené použití"
          mode={suggestedUsageMode}
          onModeChange={setSuggestedUsageMode}
          disabled={isPending}
        />
        {suggestedUsageMode === "manual" ? (
          <label className={styles.field}>
            <span className={styles.srOnly}>Doporučené použití</span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={suggestedUsage}
              onChange={(e) => setSuggestedUsage(e.target.value)}
              disabled={isPending}
              placeholder="Jak asset použít v obsahu nebo ve videu"
            />
          </label>
        ) : (
          <AutomaticTextHint
            currentValue={asset.suggestedUsage}
            emptyHint="Doporučení doplní AI analýza."
          />
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Prezentace ve videu</h4>

        <ModeToggle
          fieldKey="capture-viewport"
          label="Zachycený viewport"
          mode={captureViewportMode}
          onModeChange={setCaptureViewportMode}
          disabled={isPending}
        />
        {captureViewportMode === "manual" ? (
          <label className={styles.field}>
            <span className={styles.srOnly}>Zachycený viewport</span>
            <select
              className={styles.input}
              value={captureViewport}
              onChange={(e) => setCaptureViewport(e.target.value)}
              disabled={isPending}
            >
              {CAPTURE_VIEWPORT_EDIT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CAPTURE_VIEWPORT_LABELS[value]}
                </option>
              ))}
            </select>
            {fieldErrors.captureViewport ? (
              <span className={styles.fieldError}>{fieldErrors.captureViewport}</span>
            ) : null}
          </label>
        ) : (
          <p className={styles.hint}>
            {asset.captureViewport
              ? `Auto inferred: ${formatCaptureViewportLabel(asset.captureViewport) ?? asset.captureViewport}`
              : "Auto inferred: empty (not a UI screenshot or insufficient signals)"}
          </p>
        )}
        <p className={styles.hint}>
          Product UI is shown large (UI Hero) by default — no extra phone frame unless the scene asks for it.
        </p>
        {asset.presentationTemplateLabel ? (
          <p className={styles.hint}>
            Resolved layout: {asset.presentationTemplateLabel}
            {asset.presentationGuardNote ? ` — ${asset.presentationGuardNote}` : ""}
          </p>
        ) : null}

        <ModeToggle
          fieldKey="preferred-video-usage"
          label="Preferované použití ve videu"
          mode={preferredVideoUsageMode}
          onModeChange={setPreferredVideoUsageMode}
          disabled={isPending}
        />
        {preferredVideoUsageMode === "manual" ? (
          <label className={styles.field}>
            <span className={styles.srOnly}>Preferované použití ve videu</span>
            <select
              className={styles.input}
              value={preferredVideoUsage}
              onChange={(e) => setPreferredVideoUsage(e.target.value)}
              disabled={isPending}
            >
              {VIDEO_USAGE_RENDER_VALUES.map((value) => (
                <option key={value} value={value}>
                  {VIDEO_USAGE_ADMIN_LABELS[value]}
                </option>
              ))}
            </select>
            {fieldErrors.preferredVideoUsage ? (
              <span className={styles.fieldError}>
                {fieldErrors.preferredVideoUsage}
              </span>
            ) : null}
          </label>
        ) : null}
        <p className={styles.hint}>
          {preferredVideoUsageMode === "manual"
            ? `Manual override: ${formatPreferredVideoUsageLabel(preferredVideoUsage) ?? preferredVideoUsage}`
            : `Resolved automatically: ${formatPreferredVideoUsageLabel(asset.preferredVideoUsage) ?? asset.preferredVideoUsage}`}
        </p>
        {preferredHint ? <p className={styles.hint}>{preferredHint}</p> : null}
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Technické informace</h4>
        <p className={styles.sectionIntro}>Pouze pro čtení.</p>
        <dl className={styles.readOnlyList}>
          <ReadOnlyRow label="Rozměry" value={asset.dimensionsLabel} />
          <ReadOnlyRow
            label="Orientace"
            value={formatTechnicalDisplayValue(
              asset.orientation,
              formatOrientationLabel(asset.orientation),
            )}
          />
          <ReadOnlyRow
            label="Poměr stran"
            value={
              asset.aspectRatio !== null && asset.aspectRatio !== undefined
                ? String(asset.aspectRatio)
                : null
            }
          />
          <ReadOnlyRow
            label="Stav analýzy"
            value={formatTechnicalDisplayValue(
              asset.analysisStatus,
              formatAnalysisStatusLabel(asset.analysisStatus),
            )}
          />
          <ReadOnlyRow
            label="Kvalita assetu"
            value={formatTechnicalDisplayValue(
              asset.assetQuality,
              formatAssetQualityLabel(asset.assetQuality),
            )}
          />
          <ReadOnlyRow label="Zdroj" value={asset.sourceLabel} />
          <ReadOnlyRow
            label="Vhodnost pro video"
            value={formatTechnicalDisplayValue(
              asset.videoSuitability,
              formatVideoSuitabilityLabel(asset.videoSuitability),
            )}
          />
        </dl>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onDone} disabled={isPending}>
          Zrušit
        </button>
        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </form>
  );
}

function AutomaticTextHint({
  currentValue,
  emptyHint,
}: {
  currentValue: string | null;
  emptyHint: string;
}) {
  const trimmed = currentValue?.trim();
  if (!trimmed) {
    return <p className={styles.hint}>{emptyHint}</p>;
  }
  return (
    <p className={styles.hint}>
      <span className={styles.hintLabel}>Aktuální hodnota:</span>{" "}
      <span className={styles.hintValue}>{trimmed}</span>
      <span className={styles.hintMuted}>
        {" "}
        (v automatickém režimu ji může přepsat další AI analýza.)
      </span>
    </p>
  );
}

function ModeToggle({
  fieldKey,
  label,
  mode,
  onModeChange,
  disabled,
}: {
  fieldKey: string;
  label: string;
  mode: FieldMode;
  onModeChange: (mode: FieldMode) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className={styles.modeRow} disabled={disabled}>
      <legend className={styles.label}>{label}</legend>
      <div className={styles.modeToggle}>
        <label className={styles.modeOption}>
          <input
            type="radio"
            name={`${fieldKey}-mode`}
            checked={mode === "automatic"}
            onChange={() => onModeChange("automatic")}
            disabled={disabled}
          />
          Automaticky
        </label>
        <label className={styles.modeOption}>
          <input
            type="radio"
            name={`${fieldKey}-mode`}
            checked={mode === "manual"}
            onChange={() => onModeChange("manual")}
            disabled={disabled}
          />
          Ručně
        </label>
      </div>
    </fieldset>
  );
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className={styles.readOnlyRow}>
      <dt className={styles.readOnlyLabel}>{label}</dt>
      <dd className={styles.readOnlyValue}>{value?.trim() ? value : "—"}</dd>
    </div>
  );
}
