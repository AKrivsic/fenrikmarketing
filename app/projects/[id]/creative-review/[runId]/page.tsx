import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { loadCreativeReviewPage } from "@/lib/api/creative-review-admin";
import { CreativeReviewWorkspace } from "@/components/creative-review/CreativeReviewWorkspace/CreativeReviewWorkspace";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CreativeReviewPageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function CreativeReviewPage({
  params,
}: CreativeReviewPageProps) {
  const { id, runId } = await params;

  const project = await getProjectForAdmin(id);
  if (!project) {
    notFound();
  }

  const result = await loadCreativeReviewPage({
    projectId: id,
    runId,
    projectName: project.name,
  });

  if (!result.ok) {
    return (
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Link href={`/projects/${id}/production`} className={styles.back}>
            ← Zpět na Content Production
          </Link>
        </div>
        <div className={styles.errorBox} role="alert">
          <h2 className={styles.errorTitle}>Creative Review nedostupné</h2>
          <p className={styles.errorText}>{result.error}</p>
          {result.code === "forbidden_mode" ? (
            <p className={styles.errorHint}>
              Tato stránka je jen pro Manual Review běhy. Production a Sample
              běhy otevřete v běžném Review.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <CreativeReviewWorkspace
        projectId={id}
        runId={runId}
        initialData={result.data}
      />
    </div>
  );
}
