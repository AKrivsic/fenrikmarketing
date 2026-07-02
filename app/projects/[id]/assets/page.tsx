import { ProjectAssetsLibrary } from "@/components/assets/ProjectAssetsLibrary/ProjectAssetsLibrary";
import { AssetUploadForm } from "@/components/assets/AssetUploadForm/AssetUploadForm";
import { FetchWebsiteAssetsButton } from "@/components/assets/FetchWebsiteAssetsButton/FetchWebsiteAssetsButton";
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
      <FetchWebsiteAssetsButton projectId={id} />
      <AssetUploadForm projectId={id} />
      <ProjectAssetsLibrary
        projectId={id}
        assets={assets}
        emptyText="Tento projekt zatím nemá žádné assety."
      />
    </div>
  );
}
