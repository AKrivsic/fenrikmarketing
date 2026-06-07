import { ContentPackageCard } from "@/components/projects/ContentPackageCard/ContentPackageCard";
import type { ProjectContentPackage } from "@/lib/api/projects-admin";
import styles from "./ContentPackageList.module.css";

interface ContentPackageListProps {
  packages: ProjectContentPackage[];
}

export function ContentPackageList({ packages }: ContentPackageListProps) {
  if (packages.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádné balíčky.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {packages.map((pkg) => (
        <ContentPackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}
