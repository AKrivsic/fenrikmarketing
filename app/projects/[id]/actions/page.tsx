import { notFound } from "next/navigation";
import { CurrentRunPanel } from "@/components/projects/CurrentRunPanel/CurrentRunPanel";
import {
  ProjectActionsPanel,
  type PrepareWeekSummary,
} from "@/components/projects/ProjectActionsPanel/ProjectActionsPanel";
import { ContentFlow } from "@/components/projects/ContentFlow/ContentFlow";
import { getLatestProjectActionRun } from "@/lib/api/project-action-runs";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  getProjectContentFlow,
  getProjectCurrentWeekStatus,
  getProjectWorkflowStatus,
} from "@/lib/api/project-workflow-admin";
import {
  CONTENT_TYPE_PLATFORM_LABELS,
  WEEKDAY_OPTIONS,
  computeGenerationPlan,
  parseContentControls,
} from "@/lib/projects/contentControls";
import { currentWeekStartUtc, formatCurrentWeekLabel } from "@/lib/datetime/week";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ActionsTabPageProps {
  params: Promise<{ id: string }>;
}

function platformLabel(platform: string): string {
  return (
    (CONTENT_TYPE_PLATFORM_LABELS as Record<string, string>)[platform] ??
    platform
  );
}

function weekdayLabels(weekdays: number[]): string {
  if (weekdays.length === 0) return "—";
  return weekdays
    .map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.label ?? "")
    .filter(Boolean)
    .join("/");
}

export default async function ActionsTabPage({ params }: ActionsTabPageProps) {
  const { id } = await params;
  const weekStart = currentWeekStartUtc();

  const project = await getProjectForAdmin(id);
  if (!project) {
    notFound();
  }

  const [status, flow, currentWeek, actionRun] = await Promise.all([
    getProjectWorkflowStatus(id),
    getProjectContentFlow(id),
    getProjectCurrentWeekStatus(id, weekStart),
    getLatestProjectActionRun(id, weekStart),
  ]);

  const controls = parseContentControls(project.publishing_rules);
  const plan = computeGenerationPlan(
    controls,
    project.platforms,
    project.enabled_languages,
  );

  const summary: PrepareWeekSummary = {
    platforms: plan.platformTargets.map((e) => platformLabel(e.platform)),
    totalOutputs: plan.totalOutputs,
    videoOutputs: plan.videoOutputs,
    textOutputs: plan.textOutputs,
    videoPlatforms: plan.platformTargets
      .filter((e) => e.contentType === "video")
      .map((e) => platformLabel(e.platform)),
    textPlatforms: plan.platformTargets
      .filter((e) => e.contentType === "text_only")
      .map((e) => platformLabel(e.platform)),
    publishing: `${weekdayLabels(plan.publishingWeekdays)} ${plan.publishingTime}`,
    languages: plan.languagesAvailable.map((l) => l.toUpperCase()),
    weekStart,
    weekLabel: formatCurrentWeekLabel(weekStart),
  };

  return (
    <div className={styles.tab}>
      <section className={styles.block}>
        <CurrentRunPanel
          projectId={id}
          weekStart={weekStart}
          initialRun={actionRun}
        />
      </section>

      <section className={styles.block}>
        <h2 className={styles.title}>Prepare content for this project</h2>
        <p className={styles.note}>
          Připravte obsah pro aktuální týden krok za krokem. Každý krok spustí
          existující n8n workflow; spuštění je asynchronní — n8n zpracuje a
          nahlásí výsledek, který se projeví ve stavech a v záložkách obsahu.
        </p>
        <ProjectActionsPanel
          projectId={id}
          status={status}
          currentWeek={currentWeek}
          summary={summary}
        />
      </section>

      <section className={styles.block}>
        <h2 className={styles.title}>Content Flow</h2>
        <p className={styles.note}>
          Kde se obsah nachází. Klikněte na fázi pro zobrazení obsahu.
        </p>
        <ContentFlow projectId={id} counts={flow} />
      </section>
    </div>
  );
}
