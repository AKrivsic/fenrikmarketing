import { AssetCard } from "@/components/assets/AssetCard/AssetCard";
import type { AssetView } from "@/lib/api/assets-admin";
import styles from "./AssetGrid.module.css";

interface AssetGridProps {
  assets: AssetView[];
  emptyText?: string;
  projectId?: string;
  onPreview?: (asset: AssetView) => void;
}

export function AssetGrid({
  assets,
  emptyText = "Zatím žádné assety.",
  projectId,
  onPreview,
}: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          projectId={projectId}
          asset={asset}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
