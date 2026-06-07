import { ContentPackageList } from "@/components/projects/ContentPackageList/ContentPackageList";
import { listProjectContentPackages } from "@/lib/api/projects-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ContentPackagesTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentPackagesTabPage({
  params,
}: ContentPackagesTabPageProps) {
  const { id } = await params;
  const packages = await listProjectContentPackages(id);

  return (
    <div className={styles.tab}>
      <ContentPackageList packages={packages} />
    </div>
  );
}
