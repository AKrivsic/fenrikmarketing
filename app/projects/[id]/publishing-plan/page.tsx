import { PublishingPlan } from "@/components/projects/PublishingPlan/PublishingPlan";
import { listProjectPublishingPlan } from "@/lib/api/projects-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PublishingPlanTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublishingPlanTabPage({
  params,
}: PublishingPlanTabPageProps) {
  const { id } = await params;
  const entries = await listProjectPublishingPlan(id);

  return (
    <div className={styles.tab}>
      <PublishingPlan entries={entries} />
    </div>
  );
}
