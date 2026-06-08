import { notFound } from "next/navigation";
import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel/KnowledgePanel";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import { listProjectAssets } from "@/lib/api/assets-admin";
import { deriveKnowledgeFromProject } from "@/lib/knowledge/deriveFromProject";
import { parseProjectKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface KnowledgePageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const { id } = await params;
  const project = await getProjectForAdmin(id);

  if (!project) {
    notFound();
  }

  // Task 8: legacy projects have an empty knowledge block. Derive it from the
  // existing Project Brain columns (all cards approved) and persist once.
  let knowledge = parseProjectKnowledge(project.knowledge);
  if (!knowledge) {
    knowledge = deriveKnowledgeFromProject(project);
    await updateProjectForAdmin(id, { knowledge: knowledge as unknown as Json });
  }

  // Resolve source asset titles for the read-only proof statements (Phase 2C).
  const assets = await listProjectAssets(id);
  const assetTitlesById: Record<string, string> = {};
  for (const asset of assets) {
    assetTitlesById[asset.id] = asset.title;
  }

  return (
    <div className={styles.tab}>
      <KnowledgePanel
        projectId={id}
        knowledge={knowledge}
        assetTitlesById={assetTitlesById}
      />
    </div>
  );
}
