import { AssetGrid } from "@/components/assets/AssetGrid/AssetGrid";
import { listProjectAssets } from "@/lib/api/assets-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ProjectAssetsTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectAssetsTabPage({
  params,
}: ProjectAssetsTabPageProps) {
  const { id } = await params;
  const assets = await listProjectAssets(id);

  return (
    <div className={styles.tab}>
      <AssetGrid
        assets={assets}
        emptyText="Tento projekt zatím nemá žádné assety."
      />
    </div>
  );
}
