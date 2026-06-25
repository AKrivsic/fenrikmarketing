import { AssetGrid } from "@/components/assets/AssetGrid/AssetGrid";
import { AssetUploadForm } from "@/components/assets/AssetUploadForm/AssetUploadForm";
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
      <AssetUploadForm projectId={id} />
      <AssetGrid
        projectId={id}
        assets={assets}
        emptyText="Tento projekt zatím nemá žádné assety."
      />
    </div>
  );
}
