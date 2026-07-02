"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  fetchProjectAssetsForPicker,
  loadVideoWorkflowStateAction,
  saveVideoVisualSourceAction,
} from "@/app/projects/[id]/videos/actions";
import { ProjectAssetPickerModal } from "@/components/assets/ProjectAssetPickerModal/ProjectAssetPickerModal";
import type { AssetView } from "@/lib/api/assets-admin";
import type { VideoVisualSource } from "@/lib/video-scene-editor/videoWorkflowMetadata";
import styles from "./VideoVisualSourcePanel.module.css";

interface VideoVisualSourcePanelProps {
  projectId: string;
  contentItemId: string;
  videoJobId: string;
  disabled?: boolean;
}

const OPTIONS: { value: VideoVisualSource; label: string; hint: string }[] = [
  {
    value: "ai_only",
    label: "AI Only",
    hint: "Bez assetů — stávající AI chování.",
  },
  {
    value: "asset_enabled",
    label: "Asset Enabled",
    hint: "Automatický asset workflow z balíčku při re-renderu.",
  },
  {
    value: "manual_assets",
    label: "Manual Assets",
    hint: "Vyber konkrétní assety z knihovny projektu.",
  },
];

export function VideoVisualSourcePanel({
  projectId,
  contentItemId,
  videoJobId,
  disabled = false,
}: VideoVisualSourcePanelProps) {
  const [visualSource, setVisualSource] = useState<VideoVisualSource | null>(
    null,
  );
  const [manualAssetIds, setManualAssetIds] = useState<string[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<AssetView[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await loadVideoWorkflowStateAction(
        projectId,
        contentItemId,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setVisualSource(result.data.visualSource);
      setManualAssetIds(result.data.manualAssetIds);
    });
  }, [projectId, contentItemId]);

  useEffect(() => {
    load();
  }, [load]);

  function persist(
    source: VideoVisualSource,
    manualIds: string[],
  ): void {
    startTransition(async () => {
      const result = await saveVideoVisualSourceAction(
        projectId,
        videoJobId,
        source,
        manualIds,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setVisualSource(result.data.visualSource);
      setManualAssetIds(result.data.manualAssetIds);
    });
  }

  async function ensureLibraryAssets(): Promise<AssetView[]> {
    if (libraryAssets.length > 0) return libraryAssets;
    const res = await fetchProjectAssetsForPicker(projectId);
    if (res.ok) {
      setLibraryAssets(res.data);
      return res.data;
    }
    return [];
  }

  function handleSourceChange(source: VideoVisualSource): void {
    if (source === "manual_assets") {
      setVisualSource(source);
      void (async () => {
        await ensureLibraryAssets();
        setPickerOpen(true);
      })();
      return;
    }
    persist(source, []);
  }

  return (
    <section className={styles.panel} aria-label="Visual Source">
      <h3 className={styles.title}>Visual Source</h3>
      <div className={styles.options}>
        {OPTIONS.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={`visual-source-${contentItemId}`}
              value={option.value}
              checked={visualSource === option.value}
              disabled={disabled || pending}
              onChange={() => handleSourceChange(option.value)}
            />
            <span className={styles.optionLabel}>{option.label}</span>
            <span className={styles.optionHint}>{option.hint}</span>
          </label>
        ))}
      </div>
      {visualSource === "manual_assets" ? (
        <div className={styles.manualRow}>
          <span className={styles.manualCount}>
            {manualAssetIds.length} asset(s) selected
          </span>
          <button
            type="button"
            className={styles.pickBtn}
            disabled={disabled || pending}
            onClick={() => {
              void (async () => {
                await ensureLibraryAssets();
                setPickerOpen(true);
              })();
            }}
          >
            Select assets
          </button>
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <ProjectAssetPickerModal
        open={pickerOpen}
        assets={libraryAssets}
        mode="multiple"
        title="Manual Assets"
        selectedIds={manualAssetIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          setManualAssetIds(ids);
          persist("manual_assets", ids);
        }}
      />
    </section>
  );
}
