import { PageHeader } from "@/components/PageHeader/PageHeader";
import { AssetGrid } from "@/components/assets/AssetGrid/AssetGrid";
import { listAssetsForAdmin } from "@/lib/api/assets-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await listAssetsForAdmin();

  return (
    <div className={styles.page}>
      <PageHeader title="Assets" description="Knihovna podkladů a výstupů." />
      <AssetGrid assets={assets} />
    </div>
  );
}
