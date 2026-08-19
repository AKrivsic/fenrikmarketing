import { PageHeader } from "@/components/PageHeader/PageHeader";
import { AiMediaBenchmarkPanel } from "@/components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel";
import { listProjectsForAdmin } from "@/lib/api/projects-admin";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function AiMediaBenchmarkPage() {
  const projects = await listProjectsForAdmin();
  return (
    <div className={styles.page}>
      <PageHeader
        title="AI Media Benchmark Lab"
        description="Interní srovnání video modelů, hlasů a zvuku. Jeden placený request po druhém. Neovlivňuje produkci."
      />
      <p className={styles.back}>
        <a href="/settings">← Settings</a>
      </p>
      <AiMediaBenchmarkPanel
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
