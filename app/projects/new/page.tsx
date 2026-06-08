import { PageHeader } from "@/components/PageHeader/PageHeader";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm/CreateProjectForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// Task 1 — the create-project Server Action runs knowledge extraction (URL
// fetch + AI) inline; raise the page-level Server Action budget accordingly.
export const maxDuration = 120;

export default function NewProjectPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Nový projekt"
        description="Zadej web a jazyk. AI z webu navrhne knowledge karty ke schválení."
      />
      <CreateProjectForm />
    </div>
  );
}
