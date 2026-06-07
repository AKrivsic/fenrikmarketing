import { WeeklyStrategyPanel } from "@/components/projects/WeeklyStrategyPanel/WeeklyStrategyPanel";
import { getLatestProjectWeeklyStrategy } from "@/lib/api/projects-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface WeeklyStrategyTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function WeeklyStrategyTabPage({
  params,
}: WeeklyStrategyTabPageProps) {
  const { id } = await params;
  const strategy = await getLatestProjectWeeklyStrategy(id);

  return (
    <div className={styles.tab}>
      <WeeklyStrategyPanel strategy={strategy} />
    </div>
  );
}
